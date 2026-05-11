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
from dataclasses import dataclass

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
) -> bool:
    # Inside the room (the visual footprint must fit)
    if cx - eff_w / 2 < -1 or cz - eff_d / 2 < -1:
        return False
    if cx + eff_w / 2 > inp.width_mm + 1 or cz + eff_d / 2 > inp.depth_mm + 1:
        return False
    # Don't overlap placed items (with a walkway pad around the new item)
    pad = 0.0 if ignore_walkway else inp.walkway_min_mm * 0.5
    for p in placed:
        pw, pd = _eff_extent_for(inp, p.item_id, p.rotation_deg)
        if _aabb_overlap(cx, cz, eff_w + pad, eff_d + pad, p.x_mm, p.z_mm, pw, pd):
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
        if wall_gap < 60:
            score += 45
        elif wall_gap < 180:
            score += 28
        elif wall_gap < 400:
            score += 10
        else:
            score -= 12
    else:
        # Non-wall items: mild preference to NOT be jammed against a wall.
        if wall_gap < 100:
            score -= 4

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

    return score


# ---------- Anchor placement ----------

_GRID_STEP_MM = 150


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
) -> Placement | None:
    best: Placement | None = None
    for rot in item.rotations_deg:
        eff_w, eff_d = _eff_extent(item.width_mm, item.depth_mm, rot)
        if eff_w > inp.width_mm or eff_d > inp.depth_mm:
            continue
        for cx in _grid(eff_w / 2, inp.width_mm - eff_w / 2):
            for cz in _grid(eff_d / 2, inp.depth_mm - eff_d / 2):
                if not _is_valid(cx, cz, eff_w, eff_d, inp, placed):
                    continue
                s = _score(item, cx, cz, rot, eff_w, eff_d, inp, preferred_zones)
                if best is None or s > best.score:
                    best = Placement(item.id, int(round(cx)), int(round(cz)), rot, s)
    return best


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

    # Clamp to room.
    target_cx = max(eff_w / 2, min(target_cx, inp.width_mm - eff_w / 2))
    target_cz = max(eff_d / 2, min(target_cz, inp.depth_mm - eff_d / 2))

    candidates: list[tuple[float, float]] = [(target_cx, target_cz)]
    for r in (150, 300, 500, 750, 1000):
        for dx, dz in ((r, 0), (-r, 0), (0, r), (0, -r), (r, r), (-r, -r), (r, -r), (-r, r)):
            ccx = max(eff_w / 2, min(target_cx + dx, inp.width_mm - eff_w / 2))
            ccz = max(eff_d / 2, min(target_cz + dz, inp.depth_mm - eff_d / 2))
            candidates.append((ccx, ccz))

    for ccx, ccz in candidates:
        if _is_valid(ccx, ccz, eff_w, eff_d, inp, placed):
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
    then re-clamp the centre so the rotated footprint still fits the room."""
    dx, dz = target.x_mm - seating.x_mm, target.z_mm - seating.z_mm
    if abs(dx) < 1 and abs(dz) < 1:
        return seating
    best_rot, best_cos = seating.rotation_deg, -2.0
    norm = math.hypot(dx, dz) or 1
    for rot in (0, 90, 180, 270):
        fx, fz = _facing_vector(rot)
        cos = (fx * dx + fz * dz) / norm
        if cos > best_cos:
            best_cos, best_rot = cos, rot
    if best_rot == seating.rotation_deg:
        return seating
    eff_w, eff_d = _eff_extent(seating_item.width_mm, seating_item.depth_mm, best_rot)
    cx = _clamp(seating.x_mm, eff_w / 2, inp.width_mm - eff_w / 2)
    cz = _clamp(seating.z_mm, eff_d / 2, inp.depth_mm - eff_d / 2)
    return Placement(seating.item_id, int(round(cx)), int(round(cz)), best_rot, seating.score + 6, seating.zone_id)


def _clamp(v: float, lo: float, hi: float) -> float:
    if hi < lo:
        return (lo + hi) / 2
    return max(lo, min(v, hi))


def _clamp_placement_to_room(p: Placement, inp: SolverInput) -> Placement:
    """Final safety: nudge a placement so its rotated footprint stays inside."""
    eff_w, eff_d = _eff_extent_for(inp, p.item_id, p.rotation_deg)
    cx = _clamp(p.x_mm, eff_w / 2, inp.width_mm - eff_w / 2)
    cz = _clamp(p.z_mm, eff_d / 2, inp.depth_mm - eff_d / 2)
    if int(round(cx)) == p.x_mm and int(round(cz)) == p.z_mm:
        return p
    return Placement(p.item_id, int(round(cx)), int(round(cz)), p.rotation_deg, p.score, p.zone_id)


# ---------- Main entry point ----------


def solve(inp: SolverInput) -> SolverResult:
    if not inp.zones:
        return _solve_flat(inp)
    return _solve_zones(inp)


def _solve_zones(inp: SolverInput) -> SolverResult:
    by_sub: dict[str, list[SolverItem]] = {}
    for item in inp.items:
        by_sub.setdefault(item.sub_category, []).append(item)

    placements: list[Placement] = []
    failures: list[PlacementFailure] = []
    zone_anchors: dict[str, Placement] = {}

    # Pass 1 — anchors. Place wall-zone anchors first so the seating zone
    # (which needs a wall the TV is also against) lands well.
    for zone in inp.zones:
        pool = by_sub.get(zone.anchor_sub_category, [])
        if not pool:
            continue
        anchor_item = pool[0]
        pref = tuple(VastuZone(z) for z in zone.preferred_compass_zones)
        p = _place_anchor(anchor_item, inp, placements, preferred_zones=pref)
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
        p = _place_anchor(item, inp, placements, preferred_zones=pref)
        if p is None:
            failures.append(PlacementFailure(item_id=item.id, reason="no valid free placement"))
            continue
        placements.append(p)

    placements = [_clamp_placement_to_room(p, inp) for p in placements]
    return SolverResult(tuple(placements), tuple(failures), sum(pl.score for pl in placements))


def _solve_flat(inp: SolverInput) -> SolverResult:
    """No-zones path — independent placement, wall items first, largest first."""
    placements: list[Placement] = []
    failures: list[PlacementFailure] = []
    for item in sorted(inp.items, key=lambda i: (0 if i.against_wall else 1, -(i.width_mm * i.depth_mm), i.id)):
        pref = preferred_zone_for_category(category=item.category, room_type=inp.room_type, vastu_enabled=inp.vastu_enabled)
        p = _place_anchor(item, inp, placements, preferred_zones=pref)
        if p is None:
            failures.append(PlacementFailure(item_id=item.id, reason="no valid position found"))
            continue
        placements.append(p)
    placements = [_clamp_placement_to_room(p, inp) for p in placements]
    return SolverResult(tuple(placements), tuple(failures), sum(pl.score for pl in placements))
