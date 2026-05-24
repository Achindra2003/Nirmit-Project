"""Post-placement composition pass.

Called by resolve_preset_via_engine AFTER engine placement, BEFORE returning
PlacedItem[]. Applies 6 designer rules that the engine's wall-snap logic can't
enforce because they require cross-item awareness:

  1. Coffee-table conversation distance (400–700mm from sofa front).
  2. TV-sofa x-axis alignment.
  3. Side-tables flank bed at headboard height.
  4. Bookshelf keeps clear of windows.
  5. Symmetric wardrobe pairs equidistant from room centre.
  6. Lounge-chair angled toward sofa (15–30°).

All shifts are capped at 200mm and re-checked for room containment.
"""
from __future__ import annotations

import math
from typing import Sequence

from app.schemas.state import Dimensions, Intake, Opening, PlacedItem, Position

_MAX_SHIFT_MM = 200   # hard cap per rule application
_WALL_INSET_MM = 150  # minimum clearance from any wall

# ── Helpers ──────────────────────────────────────────────────────────────────


def _clamp(val: float, lo: float, hi: float) -> float:
    return max(lo, min(val, hi))


def _rot_deg(item: PlacedItem) -> float:
    return float(item.position.rotation_deg)


def _shift(item: PlacedItem, dx: float, dz: float, room_w: int, room_d: int) -> PlacedItem:
    """Return item with position shifted by (dx, dz), clamped to room bounds."""
    hw = item.dimensions.width_mm / 2
    hd = item.dimensions.depth_mm / 2
    new_x = _clamp(item.position.x_mm + dx, _WALL_INSET_MM + hw, room_w - _WALL_INSET_MM - hw)
    new_z = _clamp(item.position.z_mm + dz, _WALL_INSET_MM + hd, room_d - _WALL_INSET_MM - hd)
    new_pos = item.position.model_copy(update={"x_mm": int(round(new_x)), "z_mm": int(round(new_z))})
    return item.model_copy(update={"position": new_pos})


def _category_matches(item: PlacedItem, *patterns: str) -> bool:
    cat = item.category.lower()
    name = item.name_en.lower()
    return any(p in cat or p in name for p in patterns)


def _find_first(items: list[PlacedItem], *patterns: str) -> PlacedItem | None:
    return next((i for i in items if _category_matches(i, *patterns)), None)


def _find_all(items: list[PlacedItem], *patterns: str) -> list[PlacedItem]:
    return [i for i in items if _category_matches(i, *patterns)]


# ── Rule implementations ─────────────────────────────────────────────────────


def _rule1_coffee_table_distance(items: list[PlacedItem], room_w: int, room_d: int) -> list[PlacedItem]:
    """Coffee table should sit 400–700mm in front of sofa."""
    sofa = _find_first(items, "sofa", "couch")
    coffee = _find_first(items, "coffee")
    if sofa is None or coffee is None:
        return items

    rot = _rot_deg(sofa)
    # Determine sofa's "front" edge centre and preferred direction for coffee table.
    # rotation 0 → back S, front faces +z; 180 → back N, front faces -z;
    # 90 → back W, front faces +x;  270 → back E, front faces -x.
    if rot == 0:
        front_z = sofa.position.z_mm + sofa.dimensions.depth_mm / 2
        target_z = front_z + coffee.dimensions.depth_mm / 2 + 500  # 500mm gap
        target_x = sofa.position.x_mm
        dz = _clamp(target_z - coffee.position.z_mm, -_MAX_SHIFT_MM, _MAX_SHIFT_MM)
        dx = _clamp(target_x - coffee.position.x_mm, -_MAX_SHIFT_MM, _MAX_SHIFT_MM)
    elif rot == 180:
        front_z = sofa.position.z_mm - sofa.dimensions.depth_mm / 2
        target_z = front_z - coffee.dimensions.depth_mm / 2 - 500
        target_x = sofa.position.x_mm
        dz = _clamp(target_z - coffee.position.z_mm, -_MAX_SHIFT_MM, _MAX_SHIFT_MM)
        dx = _clamp(target_x - coffee.position.x_mm, -_MAX_SHIFT_MM, _MAX_SHIFT_MM)
    elif rot == 90:
        front_x = sofa.position.x_mm + sofa.dimensions.depth_mm / 2
        target_x = front_x + coffee.dimensions.width_mm / 2 + 500
        target_z = sofa.position.z_mm
        dx = _clamp(target_x - coffee.position.x_mm, -_MAX_SHIFT_MM, _MAX_SHIFT_MM)
        dz = _clamp(target_z - coffee.position.z_mm, -_MAX_SHIFT_MM, _MAX_SHIFT_MM)
    else:  # 270
        front_x = sofa.position.x_mm - sofa.dimensions.depth_mm / 2
        target_x = front_x - coffee.dimensions.width_mm / 2 - 500
        target_z = sofa.position.z_mm
        dx = _clamp(target_x - coffee.position.x_mm, -_MAX_SHIFT_MM, _MAX_SHIFT_MM)
        dz = _clamp(target_z - coffee.position.z_mm, -_MAX_SHIFT_MM, _MAX_SHIFT_MM)

    return [_shift(i, dx, dz, room_w, room_d) if i is coffee else i for i in items]


def _rule2_tv_sofa_alignment(items: list[PlacedItem], room_w: int, room_d: int) -> list[PlacedItem]:
    """TV unit centre should align with sofa centre on the parallel axis."""
    sofa = _find_first(items, "sofa", "couch")
    tv = _find_first(items, "tv_unit", "tv unit", "television")
    if sofa is None or tv is None:
        return items

    rot = _rot_deg(sofa)
    if rot in (0, 180):  # sofa runs along x → align tv x to sofa x
        dx = _clamp(sofa.position.x_mm - tv.position.x_mm, -_MAX_SHIFT_MM, _MAX_SHIFT_MM)
        dz = 0.0
    else:  # sofa runs along z → align tv z to sofa z
        dx = 0.0
        dz = _clamp(sofa.position.z_mm - tv.position.z_mm, -_MAX_SHIFT_MM, _MAX_SHIFT_MM)

    return [_shift(i, dx, dz, room_w, room_d) if i is tv else i for i in items]


def _rule3_side_tables_flank_bed(items: list[PlacedItem], room_w: int, room_d: int) -> list[PlacedItem]:
    """Side tables snap to the left and right of the bed's headboard end."""
    bed = _find_first(items, "sleeping", "bed")
    side_tables = _find_all(items, "side_table", "bedside", "nightstand")
    if bed is None or not side_tables:
        return items

    rot = _rot_deg(bed)
    GAP = 50  # mm

    if rot == 0:
        # Headboard at z = bed.z − depth/2. Left = -x, Right = +x.
        head_z = bed.position.z_mm - bed.dimensions.depth_mm / 2
        positions = [
            (bed.position.x_mm - bed.dimensions.width_mm / 2 - side_tables[0].dimensions.width_mm / 2 - GAP,
             head_z + side_tables[0].dimensions.depth_mm / 2),
        ]
        if len(side_tables) > 1:
            positions.append(
                (bed.position.x_mm + bed.dimensions.width_mm / 2 + side_tables[1].dimensions.width_mm / 2 + GAP,
                 head_z + side_tables[1].dimensions.depth_mm / 2),
            )
    elif rot == 180:
        head_z = bed.position.z_mm + bed.dimensions.depth_mm / 2
        positions = [
            (bed.position.x_mm - bed.dimensions.width_mm / 2 - side_tables[0].dimensions.width_mm / 2 - GAP,
             head_z - side_tables[0].dimensions.depth_mm / 2),
        ]
        if len(side_tables) > 1:
            positions.append(
                (bed.position.x_mm + bed.dimensions.width_mm / 2 + side_tables[1].dimensions.width_mm / 2 + GAP,
                 head_z - side_tables[1].dimensions.depth_mm / 2),
            )
    elif rot == 90:
        head_x = bed.position.x_mm - bed.dimensions.depth_mm / 2
        positions = [
            (head_x + side_tables[0].dimensions.width_mm / 2,
             bed.position.z_mm - bed.dimensions.width_mm / 2 - side_tables[0].dimensions.depth_mm / 2 - GAP),
        ]
        if len(side_tables) > 1:
            positions.append(
                (head_x + side_tables[1].dimensions.width_mm / 2,
                 bed.position.z_mm + bed.dimensions.width_mm / 2 + side_tables[1].dimensions.depth_mm / 2 + GAP),
            )
    else:  # 270
        head_x = bed.position.x_mm + bed.dimensions.depth_mm / 2
        positions = [
            (head_x - side_tables[0].dimensions.width_mm / 2,
             bed.position.z_mm - bed.dimensions.width_mm / 2 - side_tables[0].dimensions.depth_mm / 2 - GAP),
        ]
        if len(side_tables) > 1:
            positions.append(
                (head_x - side_tables[1].dimensions.width_mm / 2,
                 bed.position.z_mm + bed.dimensions.width_mm / 2 + side_tables[1].dimensions.depth_mm / 2 + GAP),
            )

    result = list(items)
    for idx, st in enumerate(side_tables[:len(positions)]):
        tx, tz = positions[idx]
        dx = _clamp(tx - st.position.x_mm, -_MAX_SHIFT_MM, _MAX_SHIFT_MM)
        dz = _clamp(tz - st.position.z_mm, -_MAX_SHIFT_MM, _MAX_SHIFT_MM)
        result = [_shift(i, dx, dz, room_w, room_d) if i is st else i for i in result]
    return result


def _rule4_bookshelf_clear_window(
    items: list[PlacedItem],
    openings: Sequence,
    room_w: int,
    room_d: int,
) -> list[PlacedItem]:
    """Shift any bookshelf away from window openings along the wall."""
    bookshelves = _find_all(items, "bookshelf", "bookcase", "shelf")
    if not bookshelves:
        return items
    windows = [o for o in openings if o.kind == "window"]
    if not windows:
        return items

    result = list(items)
    for bs in bookshelves:
        for win in windows:
            is_ns = win.wall in ("N", "S")
            win_len = win.width_mm
            win_centre_along = (room_w if is_ns else room_d) * win.center_frac
            win_lo = win_centre_along - win_len / 2
            win_hi = win_centre_along + win_len / 2

            bs_along = bs.position.x_mm if is_ns else bs.position.z_mm
            bs_half = (bs.dimensions.width_mm if is_ns else bs.dimensions.depth_mm) / 2
            bs_lo = bs_along - bs_half
            bs_hi = bs_along + bs_half

            # Check same wall
            bs_wall = _wall_of(bs, room_w, room_d)
            if bs_wall != win.wall:
                continue

            overlap = bs_lo < win_hi and bs_hi > win_lo
            if not overlap:
                continue

            # Shift bs toward the nearer clear end of the window.
            gap_left = bs_along - (win_lo - bs_half - 50)
            gap_right = (win_hi + bs_half + 50) - bs_along
            shift_amount = min(gap_left, gap_right, _MAX_SHIFT_MM)
            direction = -1 if gap_left <= gap_right else 1
            delta = direction * shift_amount
            if is_ns:
                dx, dz = delta, 0.0
            else:
                dx, dz = 0.0, delta
            result = [_shift(i, dx, dz, room_w, room_d) if i is bs else i for i in result]
    return result


def _rule5_symmetric_pairs(items: list[PlacedItem], room_w: int, room_d: int) -> list[PlacedItem]:
    """Tighten symmetric wardrobe pairs so they're equidistant from room centre."""
    wardrobes = _find_all(items, "wardrobe", "almirah", "armoire")
    if len(wardrobes) < 2:
        return items

    # Work on first two wardrobes only.
    a, b = wardrobes[0], wardrobes[1]
    centre_x = room_w / 2

    # Determine their primary axis (if they're on N/S wall → vary along x).
    w_a = _wall_of(a, room_w, room_d)
    w_b = _wall_of(b, room_w, room_d)
    if w_a not in ("N", "S") or w_b not in ("N", "S"):
        return items

    # Current offsets from room centre
    mid_x = (a.position.x_mm + b.position.x_mm) / 2
    radius = abs(a.position.x_mm - b.position.x_mm) / 2
    # Shift both so they're symmetric around room centre (within 200mm cap).
    target_a = centre_x - radius
    target_b = centre_x + radius
    dx_a = _clamp(target_a - a.position.x_mm, -_MAX_SHIFT_MM, _MAX_SHIFT_MM)
    dx_b = _clamp(target_b - b.position.x_mm, -_MAX_SHIFT_MM, _MAX_SHIFT_MM)
    result = list(items)
    result = [_shift(i, dx_a, 0, room_w, room_d) if i is a else i for i in result]
    result = [_shift(i, dx_b, 0, room_w, room_d) if i is b else i for i in result]
    return result


def _rule6_lounge_chair_angle(items: list[PlacedItem]) -> list[PlacedItem]:
    """Rotate lounge chair 15–25° toward the sofa it accompanies."""
    sofa = _find_first(items, "sofa", "couch")
    chair = _find_first(items, "lounge_chair", "lounge chair", "armchair")
    if sofa is None or chair is None:
        return items

    dx = sofa.position.x_mm - chair.position.x_mm
    dz = sofa.position.z_mm - chair.position.z_mm
    angle_to_sofa_deg = math.degrees(math.atan2(dx, dz))

    cur = _rot_deg(chair) % 360
    diff = (angle_to_sofa_deg - cur + 360) % 360
    if diff > 180:
        diff -= 360  # shortest path

    # Apply only a partial rotation (20°) toward sofa — keeps it a "lean" not a full turn.
    partial_deg = max(-25.0, min(25.0, diff * 0.35))
    new_rot = (cur + partial_deg) % 360
    new_pos = chair.position.model_copy(update={"rotation_deg": new_rot})
    return [i.model_copy(update={"position": new_pos}) if i is chair else i for i in items]


# ── Wall-of helper ────────────────────────────────────────────────────────────


def _wall_of(item: PlacedItem, room_w: int, room_d: int) -> str:
    """Infer which wall the item is closest to based on position."""
    x, z = item.position.x_mm, item.position.z_mm
    dist_s = z
    dist_n = room_d - z
    dist_w = x
    dist_e = room_w - x
    return min(("S", dist_s), ("N", dist_n), ("W", dist_w), ("E", dist_e), key=lambda t: t[1])[0]


# ── Public entry point ────────────────────────────────────────────────────────


def apply_composition_rules(
    placed: list[PlacedItem],
    intake: Intake,
    openings: Sequence,
) -> list[PlacedItem]:
    """Apply all 6 designer composition rules in order. Returns adjusted items."""
    rw = intake.room_dimensions.width_mm
    rd = intake.room_dimensions.depth_mm
    items = list(placed)
    items = _rule1_coffee_table_distance(items, rw, rd)
    items = _rule2_tv_sofa_alignment(items, rw, rd)
    items = _rule3_side_tables_flank_bed(items, rw, rd)
    items = _rule4_bookshelf_clear_window(items, openings, rw, rd)
    items = _rule5_symmetric_pairs(items, rw, rd)
    items = _rule6_lounge_chair_angle(items)
    return items
