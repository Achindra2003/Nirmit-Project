"""Static C2 collision scan — exercise all 24 presets through the engine and
report which ones have AABB overlaps, wall clipping, or engine warnings.

Output: a ranked shortlist of presets that need visual QA. Clean presets are
skipped so you only spend time on the actual problems.
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import NamedTuple

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.domain.presets.engine import default_room_dims  # noqa: E402
from app.domain.presets.layouts import ALL_PRESETS  # noqa: E402
from app.domain.presets.resolver import resolve_preset_via_engine  # noqa: E402
from app.schemas.state import (  # noqa: E402
    Dimensions,
    Direction,
    Intake,
    PlacedItem,
    RoomType,
    Vibe,
    VisionPhilosophy,
)

OVERLAP_MARGIN_MM = 0       # any AABB overlap is a hit
WALL_CLIP_MARGIN_MM = 100   # item extent past wall by 100mm+ = clip
WALK_GAP_MM = 200           # neighbors closer than 200mm = bumping
ROOM_HEIGHT_MM = 2700

# Composition-rule expected ranges (mirrors compose.py rules but as audits).
COFFEE_SOFA_GAP_RANGE = (400, 800)   # 400–800mm in front of sofa
BED_WALL_MAX_MM = 250                # bed should sit within 250mm of a wall
SIDE_TABLE_BED_MAX_MM = 200          # side table should hug the bed's headboard


def _eff_extent(w: int, d: int, rot_deg: float) -> tuple[int, int]:
    """Effective AABB extent after Y rotation (item-local → world)."""
    rot = int(rot_deg) % 360
    if rot in (90, 270):
        return d, w
    return w, d


class Hit(NamedTuple):
    kind: str    # 'overlap' | 'clip' | 'engine-warn'
    detail: str


def _find(items: list[PlacedItem], *needles: str) -> PlacedItem | None:
    for it in items:
        haystack = f"{it.category} {it.name_en}".lower()
        if any(n in haystack for n in needles):
            return it
    return None


def _find_all(items: list[PlacedItem], *needles: str) -> list[PlacedItem]:
    return [it for it in items if any(n in f"{it.category} {it.name_en}".lower() for n in needles)]


def _composition_hits(items: list[PlacedItem], room_w: int, room_d: int) -> list[Hit]:
    hits: list[Hit] = []
    sofa = _find(items, "sofa", "couch")
    coffee = _find(items, "coffee")
    tv = _find(items, "tv_unit", "tv unit", "television")
    bed = _find(items, "sleeping", "bed")
    side_tables = _find_all(items, "side_table", "bedside", "nightstand")

    # 1. Coffee table — 400–800mm in front of sofa (rotation-aware "front")
    if sofa and coffee:
        rot = int(sofa.position.rotation_deg) % 360
        sw, sd = _eff_extent(sofa.dimensions.width_mm, sofa.dimensions.depth_mm, rot)
        cw, cd = _eff_extent(coffee.dimensions.width_mm, coffee.dimensions.depth_mm, coffee.position.rotation_deg)
        if rot in (0, 180):
            # Sofa runs along x. Front direction is +z for rot=0, -z for rot=180.
            front_sign = 1 if rot == 0 else -1
            front_edge = sofa.position.z_mm + front_sign * sd / 2
            coffee_near_edge = coffee.position.z_mm - front_sign * cd / 2
            gap = (coffee_near_edge - front_edge) * front_sign
        else:
            # Sofa runs along z. Front direction is +x for rot=90, -x for rot=270.
            # The x-extent of the sofa is `sw` (eff-width along x for rot=90/270);
            # similarly the coffee table's x-extent is `cw`.
            front_sign = 1 if rot == 90 else -1
            front_edge = sofa.position.x_mm + front_sign * sw / 2
            coffee_near_edge = coffee.position.x_mm - front_sign * cw / 2
            gap = (coffee_near_edge - front_edge) * front_sign
        lo, hi = COFFEE_SOFA_GAP_RANGE
        if gap < lo:
            hits.append(Hit("composition", f"coffee table only {int(gap)}mm from sofa front (want {lo}–{hi}mm)"))
        elif gap > hi:
            hits.append(Hit("composition", f"coffee table {int(gap)}mm from sofa front — too far (want {lo}–{hi}mm)"))

    # 2. TV unit aligned with sofa's parallel axis
    if sofa and tv:
        rot = int(sofa.position.rotation_deg) % 360
        if rot in (0, 180):
            misalign = abs(tv.position.x_mm - sofa.position.x_mm)
            axis = "x"
        else:
            misalign = abs(tv.position.z_mm - sofa.position.z_mm)
            axis = "z"
        if misalign > 400:
            hits.append(Hit("composition", f"tv_unit off-axis from sofa by {int(misalign)}mm on {axis} (want <400mm)"))

    # 3. Bed should hug a wall
    if bed:
        bw, bd = _eff_extent(bed.dimensions.width_mm, bed.dimensions.depth_mm, bed.position.rotation_deg)
        wall_dist = min(
            bed.position.x_mm - bw / 2,
            room_w - (bed.position.x_mm + bw / 2),
            bed.position.z_mm - bd / 2,
            room_d - (bed.position.z_mm + bd / 2),
        )
        if wall_dist > BED_WALL_MAX_MM:
            hits.append(Hit("composition", f"bed sits {int(wall_dist)}mm off nearest wall (want <{BED_WALL_MAX_MM}mm)"))

    # 4. Side tables snug to bed's headboard end
    if bed and side_tables:
        bw, bd = _eff_extent(bed.dimensions.width_mm, bed.dimensions.depth_mm, bed.position.rotation_deg)
        for st in side_tables:
            tw, td = _eff_extent(st.dimensions.width_mm, st.dimensions.depth_mm, st.position.rotation_deg)
            dx_gap = abs(st.position.x_mm - bed.position.x_mm) - (bw + tw) / 2
            dz_gap = abs(st.position.z_mm - bed.position.z_mm) - (bd + td) / 2
            min_gap = max(dx_gap, dz_gap)  # adjacency = smaller of the two axes
            if min_gap > SIDE_TABLE_BED_MAX_MM:
                hits.append(Hit("composition", f"{st.name_en} sits {int(min_gap)}mm from bed (want <{SIDE_TABLE_BED_MAX_MM}mm)"))
    return hits


def scan_one(preset_id_parts: tuple[str, str, int]) -> tuple[list[PlacedItem], list[Hit]]:
    room_type, philosophy, variant = preset_id_parts
    w, d = default_room_dims(room_type)
    intake = Intake(
        room_type=RoomType(room_type),
        room_dimensions=Dimensions(width_mm=w, depth_mm=d, height_mm=ROOM_HEIGHT_MM),
        entrance_direction=Direction.S,
        who_lives_here="audit-synthetic",
        vibe=Vibe.WARM_TRADITIONAL,
        budget_inr=1_000_000,
        vastu_matters=False,
        city="Mumbai",
    )
    result = resolve_preset_via_engine(intake, VisionPhilosophy(philosophy), variant=variant)
    if result is None:
        return [], [Hit("engine-warn", "resolve_preset_via_engine returned None")]
    items, _openings = result
    hits: list[Hit] = []

    # 1. Pairwise AABB overlap — but skip expected "tucking" pairs.
    # A chair tucked under a desk/dining table is designed behaviour; their
    # AABBs overlap by design. Flag only pairs that aren't a known tuck.
    def _is_expected_tuck(it1: PlacedItem, it2: PlacedItem) -> bool:
        ids = {it1.category, it2.category}
        names = (it1.name_en + " " + it2.name_en).lower()
        if "desk_chair" in (it1.id.split("-")[0], it2.id.split("-")[0]) and "desk" in names:
            return True
        if "dining_chair" in (it1.id.split("-")[0], it2.id.split("-")[0]) and "dining table" in names:
            return True
        return False

    for i, a in enumerate(items):
        aw, ad = _eff_extent(a.dimensions.width_mm, a.dimensions.depth_mm, a.position.rotation_deg)
        for b in items[i + 1:]:
            if _is_expected_tuck(a, b):
                continue
            bw, bd = _eff_extent(b.dimensions.width_mm, b.dimensions.depth_mm, b.position.rotation_deg)
            dx_gap = abs(a.position.x_mm - b.position.x_mm) - (aw + bw) / 2
            dz_gap = abs(a.position.z_mm - b.position.z_mm) - (ad + bd) / 2
            if dx_gap < -OVERLAP_MARGIN_MM and dz_gap < -OVERLAP_MARGIN_MM:
                hits.append(Hit(
                    "overlap",
                    f"{a.name_en}({a.id}) vs {b.name_en}({b.id}) "
                    f"gap x={int(dx_gap)}mm z={int(dz_gap)}mm",
                ))

    # 2. Wall clipping
    for it in items:
        iw, id_ = _eff_extent(it.dimensions.width_mm, it.dimensions.depth_mm, it.position.rotation_deg)
        x_min = it.position.x_mm - iw / 2
        x_max = it.position.x_mm + iw / 2
        z_min = it.position.z_mm - id_ / 2
        z_max = it.position.z_mm + id_ / 2
        if x_min < -WALL_CLIP_MARGIN_MM:
            hits.append(Hit("clip", f"{it.name_en} extends {int(-x_min)}mm beyond west wall"))
        if x_max > w + WALL_CLIP_MARGIN_MM:
            hits.append(Hit("clip", f"{it.name_en} extends {int(x_max - w)}mm beyond east wall"))
        if z_min < -WALL_CLIP_MARGIN_MM:
            hits.append(Hit("clip", f"{it.name_en} extends {int(-z_min)}mm beyond south wall"))
        if z_max > d + WALL_CLIP_MARGIN_MM:
            hits.append(Hit("clip", f"{it.name_en} extends {int(z_max - d)}mm beyond north wall"))

    # 3. Composition violations (designer-rule misses)
    hits.extend(_composition_hits(items, w, d))

    return items, hits


def main() -> None:
    keys = sorted(ALL_PRESETS.keys())
    results: list[tuple[str, int, int, list[Hit]]] = []
    for key in keys:
        layout = ALL_PRESETS[key]
        try:
            items, hits = scan_one(key)
        except Exception as exc:  # noqa: BLE001
            results.append((layout.id, 0, 0, [Hit("error", str(exc)[:200])]))
            continue
        results.append((layout.id, len(items), len(hits), hits))

    results.sort(key=lambda r: (-r[2], r[0]))   # worst-first

    print(f"{'PRESET':<28} {'ITEMS':>5} {'HITS':>5}  ISSUES")
    print("-" * 100)
    for pid, n_items, n_hits, hits in results:
        if n_hits == 0:
            continue
        print(f"{pid:<28} {n_items:>5} {n_hits:>5}")
        for h in hits:
            print(f"  - {h.kind:<11} {h.detail}")
        print()

    clean = [pid for pid, _, n, _ in results if n == 0]
    bad   = [pid for pid, _, n, _ in results if n > 0]
    print("=" * 100)
    print(f"Clean presets ({len(clean)}/24): {', '.join(clean)}")
    print(f"Needs visual QA ({len(bad)}/24): {', '.join(bad)}")


if __name__ == "__main__":
    main()
