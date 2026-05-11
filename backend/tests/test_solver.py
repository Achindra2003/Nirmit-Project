"""Solver unit tests. Geometry only — no LLM, no IO."""
from __future__ import annotations

from app.domain.solver import DoorOpening, SolverInput, SolverItem, solve
from app.schemas.state import Direction


def _living_room(items: list[SolverItem], **kw) -> SolverInput:
    return SolverInput(
        width_mm=4200,
        depth_mm=3600,
        entrance=Direction.S,
        items=tuple(items),
        doors=(DoorOpening(wall=Direction.S, position_frac=0.5, width_mm=900),),
        **kw,
    )


def test_solver_places_a_single_sofa_against_a_wall():
    sofa = SolverItem(
        id="sofa", category="seating", sub_category="sofa", width_mm=2100, depth_mm=900, height_mm=850,
        against_wall=True, rotations_deg=(0, 180),
    )
    res = solve(_living_room([sofa]))
    assert len(res.placements) == 1
    assert not res.failures
    p = res.placements[0]
    centre_x = p.x_mm + 2100 / 2
    centre_z = p.z_mm + 900 / 2
    # Should be near *some* wall
    walls = (centre_x, centre_z, 4200 - centre_x, 3600 - centre_z)
    assert min(walls) < 700  # within ~70cm of a wall


def test_solver_does_not_overlap_two_items():
    sofa = SolverItem(
        id="sofa", category="seating", sub_category="sofa", width_mm=2100, depth_mm=900, height_mm=850,
        against_wall=True, rotations_deg=(0, 180),
    )
    coffee = SolverItem(
        id="coffee", category="dining", sub_category="coffee_table", width_mm=1100, depth_mm=550, height_mm=400,
    )
    tv = SolverItem(
        id="tv", category="tv_unit", sub_category="tv_unit", width_mm=1600, depth_mm=450, height_mm=550,
        against_wall=True, rotations_deg=(0, 180),
    )
    res = solve(_living_room([sofa, coffee, tv]))
    assert len(res.placements) == 3
    # No overlapping bounding boxes (with some walkway slack already in solver)
    boxes = []
    for p in res.placements:
        item = next(i for i in res.placements if i.item_id == p.item_id)
        # use original dims
        match p.item_id:
            case "sofa": w, d = 2100, 900
            case "coffee": w, d = 1100, 550
            case "tv": w, d = 1600, 450
        boxes.append((p.x_mm, p.z_mm, w, d))
    for i in range(len(boxes)):
        for j in range(i + 1, len(boxes)):
            ax, az, aw, ad = boxes[i]
            bx, bz, bw, bd = boxes[j]
            overlap = ax < bx + bw and ax + aw > bx and az < bz + bd and az + ad > bz
            assert not overlap, f"{boxes[i]} overlaps {boxes[j]}"


def test_solver_with_vastu_places_mandir_in_NE_when_entrance_is_south():
    mandir = SolverItem(
        id="mandir", category="mandir", sub_category="mandir_wall", width_mm=600, depth_mm=300, height_mm=900,
        against_wall=True,
    )
    res = solve(_living_room([mandir], vastu_enabled=True, room_type="living"))
    assert len(res.placements) == 1
    p = res.placements[0]
    centre_x = p.x_mm + 600 / 2
    centre_z = p.z_mm + 300 / 2
    # NE for a south-entrance room is the (max_x, max_z) corner
    assert centre_x > 4200 * 0.5
    assert centre_z > 3600 * 0.5


def test_solver_reports_failure_for_oversized_item():
    monster = SolverItem(
        id="monster", category="seating", sub_category="sofa", width_mm=99_000, depth_mm=99_000, height_mm=99_000,
    )
    res = solve(_living_room([monster]))
    assert not res.placements
    assert len(res.failures) == 1
    assert res.failures[0].item_id == "monster"
