"""Squarified treemap zone partitioner.

Transliterated from wojtryb/Procedural-Building-Generator (MIT licence).
Splits a room rectangle into rectangular zone bounds proportional to area
weights. Used by the solver when a room has multiple distinct functional zones
that should not compete for the same floor space (e.g. living-dining, study).

Algorithm (squarified treemaps, Bruls et al. 2000):
  1. Sort zones by weight descending.
  2. Try adding items to the current row; keep going while the row's "worst
     aspect ratio" (max/min of height vs. width of cells) improves.
  3. When adding the next item would make the row worse, commit the row and
     start a new one on the remaining rectangle.

Result: every zone gets a `Rect` — a (x_min, z_min, x_max, z_max) bounding
box in room-local mm (origin = room SW corner at (0,0)).
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Rect:
    x_min: int
    z_min: int
    x_max: int
    z_max: int

    @property
    def width(self) -> int:
        return self.x_max - self.x_min

    @property
    def depth(self) -> int:
        return self.z_max - self.z_min

    @property
    def area(self) -> int:
        return self.width * self.depth

    def shorter_side(self) -> int:
        return min(self.width, self.depth)


def _worst_ratio(row_areas: list[float], row_length: float, total_area: float) -> float:
    if not row_areas or row_length <= 0 or total_area <= 0:
        return float("inf")
    row_sum = sum(row_areas)
    row_w = row_sum / row_length  # width of the row strip
    ratios = [
        max(row_length * a / row_sum, row_sum / (row_length * a))
        for a in row_areas
    ]
    return max(ratios)


def _layout_row(
    row: list[tuple[str, float]],
    rect: Rect,
    total_area: float,
    horizontal: bool,
) -> dict[str, Rect]:
    """Place a committed row of (zone_id, norm_area) items into `rect`."""
    result: dict[str, Rect] = {}
    row_sum = sum(a for _, a in row)
    side = rect.shorter_side()
    strip_w = int(round(row_sum / total_area * (rect.width if horizontal else rect.depth)))

    cursor = rect.z_min if horizontal else rect.x_min
    for zone_id, area in row:
        frac = area / row_sum
        if horizontal:
            z0 = cursor
            z1 = cursor + int(round(frac * (rect.depth if horizontal else rect.width)))
            result[zone_id] = Rect(rect.x_min, z0, rect.x_min + strip_w, z1)
            cursor = z1
        else:
            x0 = cursor
            x1 = cursor + int(round(frac * rect.width))
            result[zone_id] = Rect(x0, rect.z_min, x1, rect.z_min + strip_w)
            cursor = x1
    return result


def partition_room(
    room_width_mm: int,
    room_depth_mm: int,
    zones: list[tuple[str, float]],
) -> dict[str, Rect]:
    """Partition a room into rectangular zones using the squarified treemap algorithm.

    Args:
        room_width_mm: Room width on the x-axis.
        room_depth_mm: Room depth on the z-axis.
        zones: List of (zone_id, relative_weight) — weights need not sum to 1.

    Returns:
        dict mapping zone_id → Rect in room-local mm.

    If only 1 zone is given, it gets the full room. If the room is "standard"
    (shorter side ≤ 4300 mm) the algorithm degenerates gracefully to simple
    horizontal strips — the caller can decide whether to use partitioning at all.
    """
    if not zones:
        return {}

    # Normalise weights to sum = 1.
    total_w = sum(w for _, w in zones)
    if total_w <= 0:
        equal = 1.0 / len(zones)
        norm = [(z, equal) for z, _ in zones]
    else:
        norm = [(z, w / total_w) for z, w in zones]

    total_area = float(room_width_mm * room_depth_mm)
    norm_areas = [(z, w * total_area) for z, w in norm]

    # Sort descending by area for squarified layout.
    norm_areas.sort(key=lambda x: x[1], reverse=True)

    result: dict[str, Rect] = {}
    remaining_rect = Rect(0, 0, room_width_mm, room_depth_mm)
    remaining_items = norm_areas[:]

    while remaining_items and remaining_rect.area > 0:
        horizontal = remaining_rect.depth >= remaining_rect.width
        row_length = float(remaining_rect.shorter_side())
        total_remaining = sum(a for _, a in remaining_items)

        row: list[tuple[str, float]] = []
        for i, item in enumerate(remaining_items):
            candidate_row = row + [item]
            if _worst_ratio([a for _, a in candidate_row], row_length, total_remaining) <= \
               _worst_ratio([a for _, a in row], row_length, total_remaining) if row else True:
                row = candidate_row
            else:
                break
        else:
            # All remaining items consumed — commit as one row.
            row = remaining_items[:]

        # Lay out the committed row.
        row_sum = sum(a for _, a in row)
        if horizontal:
            strip_depth = int(round(row_sum / total_remaining * remaining_rect.depth))
            strip_rect = Rect(
                remaining_rect.x_min,
                remaining_rect.z_min,
                remaining_rect.x_max,
                remaining_rect.z_min + strip_depth,
            )
        else:
            strip_width = int(round(row_sum / total_remaining * remaining_rect.width))
            strip_rect = Rect(
                remaining_rect.x_min,
                remaining_rect.z_min,
                remaining_rect.x_min + strip_width,
                remaining_rect.z_max,
            )

        # Assign each zone in the row a sub-rectangle within the strip.
        cursor_x = strip_rect.x_min
        cursor_z = strip_rect.z_min
        for zone_id, area in row:
            frac = area / row_sum
            if horizontal:
                z1 = cursor_z + int(round(frac * strip_rect.depth))
                result[zone_id] = Rect(strip_rect.x_min, cursor_z, strip_rect.x_max, z1)
                cursor_z = z1
            else:
                x1 = cursor_x + int(round(frac * strip_rect.width))
                result[zone_id] = Rect(cursor_x, strip_rect.z_min, x1, strip_rect.z_max)
                cursor_x = x1

        # Shrink the remaining rectangle.
        if horizontal:
            remaining_rect = Rect(
                remaining_rect.x_min,
                remaining_rect.z_min + strip_depth,
                remaining_rect.x_max,
                remaining_rect.z_max,
            )
        else:
            remaining_rect = Rect(
                remaining_rect.x_min + strip_width,
                remaining_rect.z_min,
                remaining_rect.x_max,
                remaining_rect.z_max,
            )

        remaining_items = [i for i in remaining_items if i[0] not in result]

    return result
