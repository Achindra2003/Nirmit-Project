"""The layout solver — anchor-then-relate placement, footprint-CENTRE coords.

Coordinate convention (matches the legacy planner):
  * Room coords run 0..width_mm on x, 0..depth_mm on z.
  * A Placement's (x_mm, z_mm) is the CENTRE of the item's footprint.
  * rotation_deg rotates the footprint about that centre.

For each zone in the composition:
  1. Place the anchor against a preferred wall (Vastu-biased if enabled).
  2. Sight-line pass: rotate the seating anchor so it faces the TV anchor.
  3. Place each member relative to the (possibly rotated) anchor — coffee
     table in front of the sofa, lounge chair angled, etc.
  4. Fill remaining items (decor) in any free spot.

Result: rooms that read as designed — the sofa faces the TV, the coffee
table sits between them, the centre stays clear, the mandir is in the NE.
"""
from __future__ import annotations

import math
import random
from dataclasses import dataclass

from app.domain.solver.partition import Rect, partition_room
from app.domain.solver.zones import RelativePlacement, ZoneTemplate
from app.domain.vastu import VastuZone, point_zone, preferred_zone_for_category
from app.schemas.state import Direction


@dataclass(frozen=True)
class SolverItem:
    """A placeable piece of furniture. Dimensions in mm."""

    id: str
    category: str
    sub_category: str
    width_mm: int
    depth_mm: int
    height_mm: int
    rotations_deg: tuple[int, ...] = (0, 90, 180, 270)
    against_wall: bool = False
    catalog_sku: str = ""
    front_clearance_mm: int = 600


@dataclass(frozen=True)
class DoorOpening:
    wall: Direction
    position_frac: float = 0.5
    width_mm: int = 900


@dataclass(frozen=True)
class SolverInput:
    width_mm: int
    depth_mm: int
    entrance: Direction
    items: tuple[SolverItem, ...]
    zones: tuple[ZoneTemplate, ...] = ()
    doors: tuple[DoorOpening, ...] = ()
    vastu_enabled: bool = False
    room_type: str = "living"
    walkway_min_mm: int = 600


@dataclass(frozen=True)
class Placement:
    """item_id at footprint-CENTRE (x_mm, z_mm), rotated rotation_deg."""

    item_id: str
    x_mm: int
    z_mm: int
    rotation_deg: int
    score: float
    zone_id: str | None = None
    vastu_zone: str | None = None
    near_wall: str | None = None
    sight_line_target_id: str | None = None


@dataclass(frozen=True)
class PlacementFailure:
    item_id: str
    reason: str


@dataclass(frozen=True)
class SolverResult:
    placements: tuple[Placement, ...]
    failures: tuple[PlacementFailure, ...]
    total_score: float

    @property
    def avg_score(self) -> float:
        if not self.placements:
            return 0.0
        return self.total_score / len(self.placements)


# ---------- Geometry helpers (all in footprint-centre coords) ----------


def _eff_extent(w: int, d: int, rot_deg: int) -> tuple[float, float]:
    """Axis-aligned bounding-box extent of a (w × d) rect rotated rot_deg."""
    rad = math.radians(rot_deg)
    return (
        abs(w * math.cos(rad)) + abs(d * math.sin(rad)),
        abs(w * math.sin(rad)) + abs(d * math.cos(rad)),
    )


def _aabb_overlap(
    a_cx: float, a_cz: float, a_w: float, a_d: float,
    b_cx: float, b_cz: float, b_w: float, b_d: float,
) -> bool:
    """Centre-based AABB overlap test."""
    return (
        abs(a_cx - b_cx) < (a_w + b_w) / 2
        and abs(a_cz - b_cz) < (a_d + b_d) / 2
    )


def _door_centre_mm(door: DoorOpening, *, width_mm: int, depth_mm: int) -> tuple[float, float]:
    if door.wall is Direction.S:
        return width_mm * door.position_frac, 0.0
    if door.wall is Direction.N:
        return width_mm * door.position_frac, float(depth_mm)
    if door.wall is Direction.W:
        return 0.0, depth_mm * door.position_frac
    if door.wall is Direction.E:
        return float(width_mm), depth_mm * door.position_frac
    return width_mm * 0.5, 0.0


def _facing_vector(rotation_deg: int) -> tuple[float, float]:
    """The +z axis of an item rotated by rotation_deg — its "front"."""
    rad = math.radians(rotation_deg)
    return -math.sin(rad), math.cos(rad)


def _eff_extent_for(inp: SolverInput, item_id: str, rot: int) -> tuple[float, float]:
    for src in inp.items:
        if src.id == item_id:
            return _eff_extent(src.width_mm, src.depth_mm, rot)
    return (0.0, 0.0)


def _item_for(inp: SolverInput, item_id: str) -> SolverItem | None:
    for src in inp.items:
        if src.id == item_id:
            return src
    return None


# Overlay items don't compete with floor furniture for space — rugs go UNDER
# the coffee table, ceiling fans hang above the room, wall mirrors mount flat
# on walls, small plants sit on tabletops. Treating them as "solid" obstacles
# would force the coffee-table-on-rug arrangement (the entire point of a rug)
# to fail collision and drop the rug.
_OVERLAY_SUBCATEGORIES: frozenset[str] = frozenset({
    "rug", "ceiling_fan", "mirror", "plant_small",
})


def _is_overlay(sub_category: str) -> bool:
    return sub_category in _OVERLAY_SUBCATEGORIES


# ---------- Wall detection ----------


def _detect_near_wall(cx: float, cz: float, eff_w: float, eff_d: float, inp: SolverInput) -> str | None:
    """Return the wall label (N/S/E/W) the item footprint is closest to, or None if floating."""
    gaps = {
        "S": cz - eff_d / 2,
        "N": inp.depth_mm - (cz + eff_d / 2),
        "W": cx - eff_w / 2,
        "E": inp.width_mm - (cx + eff_w / 2),
    }
    min_wall = min(gaps, key=lambda k: gaps[k])
    return min_wall if gaps[min_wall] < 200 else None


# ---------- Validity ----------


def _is_valid(
    cx: float,
    cz: float,
    eff_w: float,
    eff_d: float,
    inp: SolverInput,
    placed: list[Placement],
    *,
    ignore_walkway: bool = False,
    new_item_sub_category: str | None = None,
) -> bool:
    # Inside the room (the visual footprint must fit)
    if cx - eff_w / 2 < -1 or cz - eff_d / 2 < -1:
        return False
    if cx + eff_w / 2 > inp.width_mm + 1 or cz + eff_d / 2 > inp.depth_mm + 1:
        return False
    # Overlay items (rug, ceiling fan, mirror, tabletop plant) only need to
    # fit inside the room — they never collide with the floor furniture.
    if new_item_sub_category and _is_overlay(new_item_sub_category):
        return True
    # Don't overlap placed items (with a walkway pad around the new item)
    pad = 0.0 if ignore_walkway else inp.walkway_min_mm * 0.5
    for p in placed:
        # Skip the overlay items we've already placed (rugs/fans don't block).
        placed_item = _item_for(inp, p.item_id)
        if placed_item and _is_overlay(placed_item.sub_category):
            continue
        pw, pd = _eff_extent_for(inp, p.item_id, p.rotation_deg)
        if _aabb_overlap(cx, cz, eff_w + pad, eff_d + pad, p.x_mm, p.z_mm, pw, pd):
            return False
        # Front-clearance check (FittingPlacer / Ringqvist 2018): the space in
        # front of a placed item must remain free for the declared clearance depth.
        if not ignore_walkway and placed_item and placed_item.front_clearance_mm > inp.walkway_min_mm:
            extra = placed_item.front_clearance_mm - inp.walkway_min_mm
            fx, fz = _facing_vector(p.rotation_deg)
            zone_cx = p.x_mm + fx * (pw / 2 + extra / 2)
            zone_cz = p.z_mm + fz * (pd / 2 + extra / 2)
            zone_w = pw + pad
            zone_d = extra
            if _aabb_overlap(cx, cz, eff_w, eff_d, zone_cx, zone_cz, zone_w, zone_d):
                return False
    # Door breathing room
    for door in inp.doors:
        dx, dz = _door_centre_mm(door, width_mm=inp.width_mm, depth_mm=inp.depth_mm)
        if math.hypot(cx - dx, cz - dz) < inp.walkway_min_mm + max(eff_w, eff_d) / 2:
            return False
    return True


# ---------- Scoring ----------


def _score(
    item: SolverItem,
    cx: float,
    cz: float,
    rot: int,
    eff_w: float,
    eff_d: float,
    inp: SolverInput,
    pref_zones: tuple[VastuZone, ...],
) -> float:
    score = 50.0

    # Wall hug — distance from the item's nearest edge to the nearest wall.
    wall_gap = min(
        cx - eff_w / 2,
        cz - eff_d / 2,
        inp.width_mm - (cx + eff_w / 2),
        inp.depth_mm - (cz + eff_d / 2),
    )
    if item.against_wall:
        if wall_gap < 150:
            score += 20   # near wall preferred, but not forced flush
        elif wall_gap < 400:
            score += 10
        else:
            score -= 8
    else:
        # Non-wall items: prefer to not be jammed against a wall.
        if wall_gap < 150:
            score -= 8

    # Compass-zone preference (Vastu / zone template), weighted by list order.
    if pref_zones:
        zone = point_zone(
            x_mm=int(cx), z_mm=int(cz),
            width_mm=inp.width_mm, depth_mm=inp.depth_mm,
            entrance=inp.entrance,
        )
        if zone in pref_zones:
            score += max(60 - pref_zones.index(zone) * 18, 12)

    # Keep the centre (Brahmasthana) clear.
    rcx, rcz = inp.width_mm / 2, inp.depth_mm / 2
    diag = math.hypot(inp.width_mm, inp.depth_mm)
    centre_dist = math.hypot(cx - rcx, cz - rcz)
    if item.against_wall and centre_dist < diag * 0.18:
        score -= 22

    # Face into the room — prefer rotations whose front points toward the centre.
    fx, fz = _facing_vector(rot)
    to_centre = (rcx - cx, rcz - cz)
    norm = math.hypot(*to_centre) or 1
    score += ((fx * to_centre[0] + fz * to_centre[1]) / norm) * 8

    # Prefer rectangular items aligned with the long room axis.
    if item.width_mm != item.depth_mm:
        room_long_x = inp.width_mm >= inp.depth_mm
        item_long_x = (rot % 180 == 0) == (item.width_mm > item.depth_mm)
        if room_long_x == item_long_x:
            score += 4

    # Never put against-wall items against the entrance wall — blocks entry view.
    if item.against_wall:
        if inp.entrance == Direction.S:
            dist_from_entrance = cz - eff_d / 2
        elif inp.entrance == Direction.N:
            dist_from_entrance = (inp.depth_mm - cz) - eff_d / 2
        elif inp.entrance == Direction.W:
            dist_from_entrance = cx - eff_w / 2
        else:  # E
            dist_from_entrance = (inp.width_mm - cx) - eff_w / 2
        if dist_from_entrance < 800:
            score -= 55

    # TV unit prefers the back wall (opposite entrance) — creates the natural sofa↔TV axis.
    if item.sub_category == "tv_unit":
        if inp.entrance == Direction.S:
            back_prox = inp.depth_mm - (cz + eff_d / 2)
        elif inp.entrance == Direction.N:
            back_prox = cz - eff_d / 2
        elif inp.entrance == Direction.W:
            back_prox = inp.width_mm - (cx + eff_w / 2)
        else:  # E
            back_prox = cx - eff_w / 2
        if back_prox < 200:
            score += 30

    return score


# ---------- Anchor placement ----------

_GRID_STEP_MM = 100   # finer grid → less asymmetric layouts
_WALL_INSET_MM = 80   # minimum gap between item edge and room wall (buffers GLB mesh asymmetry)


def _grid(lo: float, hi: float) -> list[float]:
    if hi < lo:
        return [lo]
    out = [lo + i * _GRID_STEP_MM for i in range(int((hi - lo) // _GRID_STEP_MM) + 1)]
    if not out or out[-1] != hi:
        out.append(hi)
    return out


def _place_anchor(
    item: SolverItem,
    inp: SolverInput,
    placed: list[Placement],
    preferred_zones: tuple[VastuZone, ...] = (),
    rng: random.Random | None = None,
    bounds: Rect | None = None,
) -> Placement | None:
    candidates: list[Placement] = []
    for rot in item.rotations_deg:
        eff_w, eff_d = _eff_extent(item.width_mm, item.depth_mm, rot)
        if eff_w > inp.width_mm or eff_d > inp.depth_mm:
            continue
        lo_cx = eff_w / 2 + _WALL_INSET_MM
        hi_cx = inp.width_mm - eff_w / 2 - _WALL_INSET_MM
        lo_cz = eff_d / 2 + _WALL_INSET_MM
        hi_cz = inp.depth_mm - eff_d / 2 - _WALL_INSET_MM
        if bounds is not None:
            lo_cx = max(lo_cx, bounds.x_min + eff_w / 2)
            hi_cx = min(hi_cx, bounds.x_max - eff_w / 2)
            lo_cz = max(lo_cz, bounds.z_min + eff_d / 2)
            hi_cz = min(hi_cz, bounds.z_max - eff_d / 2)
        if hi_cx < lo_cx or hi_cz < lo_cz:
            continue
        for cx in _grid(lo_cx, hi_cx):
            for cz in _grid(lo_cz, hi_cz):
                if not _is_valid(cx, cz, eff_w, eff_d, inp, placed,
                                 new_item_sub_category=item.sub_category):
                    continue
                s = _score(item, cx, cz, rot, eff_w, eff_d, inp, preferred_zones)
                candidates.append(Placement(item.id, int(round(cx)), int(round(cz)), rot, s))
    if not candidates:
        return None
    candidates.sort(key=lambda p: p.score, reverse=True)
    # Sample from the top-5 so equal-quality rooms look different across visions.
    top = candidates[:5]
    if rng is None or len(top) == 1:
        winner = top[0]
    else:
        floor_score = top[-1].score
        weights = [max(p.score - floor_score + 1.0, 0.1) for p in top]
        winner = rng.choices(top, weights=weights, k=1)[0]
    # Enrich winner with Vastu zone and wall proximity.
    eff_w, eff_d = _eff_extent(item.width_mm, item.depth_mm, winner.rotation_deg)
    vastu_z = point_zone(winner.x_mm, winner.z_mm, width_mm=inp.width_mm, depth_mm=inp.depth_mm, entrance=inp.entrance).value
    near = _detect_near_wall(winner.x_mm, winner.z_mm, eff_w, eff_d, inp)
    return Placement(winner.item_id, winner.x_mm, winner.z_mm, winner.rotation_deg, winner.score, winner.zone_id, vastu_z, near)


# ---------- Member placement (relative to an anchor) ----------


def _place_member(
    member: SolverItem,
    rel: RelativePlacement,
    anchor: Placement,
    inp: SolverInput,
    placed: list[Placement],
) -> Placement | None:
    fx, fz = _facing_vector(anchor.rotation_deg)
    lx, lz = fz, -fx  # lateral = facing rotated 90° CW
    member_rot = (anchor.rotation_deg + rel.rotation_relative_deg) % 360
    eff_w, eff_d = _eff_extent(member.width_mm, member.depth_mm, member_rot)

    target_cx = anchor.x_mm + rel.offset_axial_mm * fx + rel.offset_lateral_mm * lx
    target_cz = anchor.z_mm + rel.offset_axial_mm * fz + rel.offset_lateral_mm * lz

    # Clamp to room with wall inset.
    m_lo_cx = eff_w / 2 + _WALL_INSET_MM
    m_hi_cx = inp.width_mm - eff_w / 2 - _WALL_INSET_MM
    m_lo_cz = eff_d / 2 + _WALL_INSET_MM
    m_hi_cz = inp.depth_mm - eff_d / 2 - _WALL_INSET_MM
    target_cx = max(m_lo_cx, min(target_cx, m_hi_cx))
    target_cz = max(m_lo_cz, min(target_cz, m_hi_cz))

    candidates: list[tuple[float, float]] = [(target_cx, target_cz)]
    for r in (150, 300, 500, 750, 1000):
        for dx, dz in ((r, 0), (-r, 0), (0, r), (0, -r), (r, r), (-r, -r), (r, -r), (-r, r)):
            ccx = max(m_lo_cx, min(target_cx + dx, m_hi_cx))
            ccz = max(m_lo_cz, min(target_cz + dz, m_hi_cz))
            candidates.append((ccx, ccz))

    # Zone members are INTENDED to be close to their anchor (coffee table 450mm
    # from sofa, dining chair 900mm from table). The 600mm walkway pad + the
    # 900–1800mm front-clearance zones would push them away — disable both for
    # member placement (anchor-to-anchor placement still enforces full clearance).
    for ccx, ccz in candidates:
        if _is_valid(ccx, ccz, eff_w, eff_d, inp, placed,
                     ignore_walkway=True, new_item_sub_category=member.sub_category):
            drift = math.hypot(ccx - target_cx, ccz - target_cz)
            return Placement(member.id, int(round(ccx)), int(round(ccz)), member_rot, 62.0 - drift / 120.0)
    return None


# ---------- Sight-line ----------


def _enforce_sight_line(
    seating: Placement,
    target: Placement,
    seating_item: SolverItem,
    inp: SolverInput,
) -> Placement:
    """Rotate the seating anchor so its front points at the target anchor,
    BUT only if the new rotation still lets it stay against its wall.

    The original implementation just re-clamped centre to fit the room after
    rotation, which pushed a sofa from the W-wall (rot=90) to the middle of
    the room (rot=0). We now (1) skip the rotation if the current facing is
    already within ±45° of the target — a small head-turn is fine, and
    (2) abort the change if the rotated footprint would not fit within
    `wall_inset` of any wall (it would float)."""
    dx, dz = target.x_mm - seating.x_mm, target.z_mm - seating.z_mm
    if abs(dx) < 1 and abs(dz) < 1:
        return seating
    norm = math.hypot(dx, dz) or 1
    # If already within ~45° of facing the target, leave it alone — a slight
    # head-turn is more natural than a sofa pulled off the wall.
    cur_fx, cur_fz = _facing_vector(seating.rotation_deg)
    if (cur_fx * dx + cur_fz * dz) / norm > 0.707:
        return seating
    best_rot, best_cos = seating.rotation_deg, -2.0
    for rot in (0, 90, 180, 270):
        fx, fz = _facing_vector(rot)
        cos = (fx * dx + fz * dz) / norm
        if cos > best_cos:
            best_cos, best_rot = cos, rot
    if best_rot == seating.rotation_deg:
        return seating
    eff_w, eff_d = _eff_extent(seating_item.width_mm, seating_item.depth_mm, best_rot)
    # If the rotated footprint cannot stay near a wall at the current centre,
    # don't move it — sit-with-back-to-wall beats sit-floating-in-room.
    if seating_item.against_wall:
        wall_gap = min(
            seating.x_mm - eff_w / 2,
            seating.z_mm - eff_d / 2,
            inp.width_mm - (seating.x_mm + eff_w / 2),
            inp.depth_mm - (seating.z_mm + eff_d / 2),
        )
        if wall_gap > 350:  # > 350mm from every wall = floating
            return seating
    cx = _clamp(seating.x_mm, eff_w / 2, inp.width_mm - eff_w / 2)
    cz = _clamp(seating.z_mm, eff_d / 2, inp.depth_mm - eff_d / 2)
    return Placement(seating.item_id, int(round(cx)), int(round(cz)), best_rot, seating.score + 6, seating.zone_id)


def _clamp(v: float, lo: float, hi: float) -> float:
    if hi < lo:
        return (lo + hi) / 2
    return max(lo, min(v, hi))


def _clamp_placement_to_room(p: Placement, inp: SolverInput) -> Placement:
    """Final safety: nudge a placement so its rotated footprint stays inside with wall inset."""
    eff_w, eff_d = _eff_extent_for(inp, p.item_id, p.rotation_deg)
    cx = _clamp(p.x_mm, eff_w / 2 + _WALL_INSET_MM, inp.width_mm - eff_w / 2 - _WALL_INSET_MM)
    cz = _clamp(p.z_mm, eff_d / 2 + _WALL_INSET_MM, inp.depth_mm - eff_d / 2 - _WALL_INSET_MM)
    if int(round(cx)) == p.x_mm and int(round(cz)) == p.z_mm:
        return p
    return Placement(p.item_id, int(round(cx)), int(round(cz)), p.rotation_deg, p.score, p.zone_id)


# ---------- Main entry point ----------


def solve(inp: SolverInput, seed: int = 0) -> SolverResult:
    rng = random.Random(seed)
    if not inp.zones:
        return _solve_flat(inp, rng)
    return _solve_zones(inp, rng)


def _solve_zones(inp: SolverInput, rng: random.Random | None = None) -> SolverResult:
    by_sub: dict[str, list[SolverItem]] = {}
    for item in inp.items:
        by_sub.setdefault(item.sub_category, []).append(item)

    # Squarified treemap partitioning (Bruls et al. 2000 / Procedural-Building-Generator).
    # For large open-plan rooms (short side ≥ 4500 mm) with ≥ 2 zones, divide the floor
    # plate into zone-specific rectangular bounds proportional to each zone's furniture
    # footprint area. Anchors are then constrained to their zone's rectangle so the room
    # reads as zoned rather than clustering everything against one wall.
    zone_weights: list[tuple[str, float]] = []
    for zone in inp.zones:
        pool = by_sub.get(zone.anchor_sub_category, [])
        if not pool:
            continue
        a = pool[0]
        w = float(a.width_mm * a.depth_mm)
        for rel in zone.members:
            mp = by_sub.get(rel.sub_category, [])
            if mp:
                w += float(mp[0].width_mm * mp[0].depth_mm)
        zone_weights.append((zone.id, w))
    zone_rects: dict[str, Rect] = {}
    if min(inp.width_mm, inp.depth_mm) >= 4500 and len(zone_weights) >= 2:
        zone_rects = partition_room(inp.width_mm, inp.depth_mm, zone_weights)

    placements: list[Placement] = []
    failures: list[PlacementFailure] = []
    zone_anchors: dict[str, Placement] = {}
    # Tracks which anchor item_id sight-lines to which target item_id.
    sight_targets: dict[str, str] = {}

    # Pass 1 — anchors. Place wall-zone anchors first so the seating zone
    # (which needs a wall the TV is also against) lands well.
    for zone in inp.zones:
        pool = by_sub.get(zone.anchor_sub_category, [])
        if not pool:
            continue
        anchor_item = pool[0]
        pref = tuple(VastuZone(z) for z in zone.preferred_compass_zones)
        p = _place_anchor(anchor_item, inp, placements, preferred_zones=pref, rng=rng, bounds=zone_rects.get(zone.id))
        if p is None:
            failures.append(PlacementFailure(item_id=anchor_item.id, reason="no valid anchor position"))
            continue
        p = Placement(p.item_id, p.x_mm, p.z_mm, p.rotation_deg, p.score, zone.id)
        zone_anchors[zone.id] = p
        placements.append(p)

    # Pass 2 — sight-lines: rotate seating anchor toward its target zone's anchor.
    for zone in inp.zones:
        if zone.id not in zone_anchors or not zone.sight_line_target_zone:
            continue
        target = zone_anchors.get(zone.sight_line_target_zone)
        if target is None:
            continue
        old = zone_anchors[zone.id]
        seating_item = by_sub.get(zone.anchor_sub_category, [None])[0]
        if seating_item is None:
            continue
        new = _enforce_sight_line(old, target, seating_item, inp)
        if new is not old:
            zone_anchors[zone.id] = new
            placements = [pl for pl in placements if pl.item_id != old.item_id] + [new]
        # Record the sight-line relationship regardless of whether rotation changed.
        sight_targets[zone_anchors[zone.id].item_id] = target.item_id

    # Pass 3 — members, relative to each (possibly rotated) anchor.
    for zone in inp.zones:
        anchor = zone_anchors.get(zone.id)
        if anchor is None:
            continue
        for rel in zone.members:
            pool = by_sub.get(rel.sub_category, [])
            if not pool:
                continue
            member = next((m for m in pool if all(pl.item_id != m.id for pl in placements)), None)
            if member is None:
                continue
            p = _place_member(member, rel, anchor, inp, placements)
            if p is None:
                if not rel.optional:
                    failures.append(PlacementFailure(item_id=member.id, reason=f"could not place member of {zone.id}"))
                continue
            p = Placement(p.item_id, p.x_mm, p.z_mm, p.rotation_deg, p.score, zone.id)
            placements.append(p)

    # Pass 4 — fill remaining items (decor, lamps not in any zone).
    placed_ids = {pl.item_id for pl in placements}
    for item in sorted(inp.items, key=lambda i: -(i.width_mm * i.depth_mm)):
        if item.id in placed_ids:
            continue
        pref = preferred_zone_for_category(category=item.category, room_type=inp.room_type, vastu_enabled=inp.vastu_enabled)
        p = _place_anchor(item, inp, placements, preferred_zones=pref, rng=rng)
        if p is None:
            failures.append(PlacementFailure(item_id=item.id, reason="no valid free placement"))
            continue
        placements.append(p)

    placements = [_clamp_placement_to_room(p, inp) for p in placements]
    # Attach sight_line_target_id to anchors that have a sight-line partner.
    placements = [
        Placement(p.item_id, p.x_mm, p.z_mm, p.rotation_deg, p.score, p.zone_id, p.vastu_zone, p.near_wall, sight_targets.get(p.item_id))
        if p.item_id in sight_targets else p
        for p in placements
    ]
    return SolverResult(tuple(placements), tuple(failures), sum(pl.score for pl in placements))


def _solve_flat(inp: SolverInput, rng: random.Random | None = None) -> SolverResult:
    """No-zones path — independent placement, wall items first, largest first."""
    placements: list[Placement] = []
    failures: list[PlacementFailure] = []
    for item in sorted(inp.items, key=lambda i: (0 if i.against_wall else 1, -(i.width_mm * i.depth_mm), i.id)):
        pref = preferred_zone_for_category(category=item.category, room_type=inp.room_type, vastu_enabled=inp.vastu_enabled)
        p = _place_anchor(item, inp, placements, preferred_zones=pref, rng=rng)
        if p is None:
            failures.append(PlacementFailure(item_id=item.id, reason="no valid position found"))
            continue
        placements.append(p)
    placements = [_clamp_placement_to_room(p, inp) for p in placements]
    return SolverResult(tuple(placements), tuple(failures), sum(pl.score for pl in placements))


# ---------- Public validity checker ----------


@dataclass(frozen=True)
class CollisionReport:
    """Result of validate_placements — lists item IDs that have problems."""

    colliding_ids: tuple[str, ...]
    out_of_bounds_ids: tuple[str, ...]


def validate_placements(
    placed: list[Placement],
    items: tuple[SolverItem, ...],
    inp: SolverInput,
) -> CollisionReport:
    """Check a list of already-placed items for collision/walkway/boundary violations.

    Used by the validate endpoint when the user drags furniture manually.
    Overlay items (rugs, ceiling fans) are exempt from collision checks.
    """
    item_map = {s.id: s for s in items}
    colliding: list[str] = []
    out_of_bounds: list[str] = []

    for i, p in enumerate(placed):
        si = item_map.get(p.item_id)
        if si is None or _is_overlay(si.sub_category):
            continue
        eff_w, eff_d = _eff_extent(si.width_mm, si.depth_mm, p.rotation_deg)
        # Boundary check
        if (
            p.x_mm - eff_w / 2 < -1
            or p.z_mm - eff_d / 2 < -1
            or p.x_mm + eff_w / 2 > inp.width_mm + 1
            or p.z_mm + eff_d / 2 > inp.depth_mm + 1
        ):
            out_of_bounds.append(p.item_id)
            continue
        # Collision + walkway check against all other placed items
        others = [pl for j, pl in enumerate(placed) if j != i]
        if not _is_valid(
            p.x_mm, p.z_mm, eff_w, eff_d, inp, others,
            ignore_walkway=False, new_item_sub_category=si.sub_category,
        ):
            colliding.append(p.item_id)

    return CollisionReport(
        colliding_ids=tuple(colliding),
        out_of_bounds_ids=tuple(out_of_bounds),
    )
