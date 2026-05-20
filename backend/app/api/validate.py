"""POST /validate — check a RoomState for spatial and Vastu violations.

Called by the frontend on every drag-end and by the collaborator before
committing a move intent. Returns structured violations so the collaborator
can explain them without re-running the solver.
"""
from __future__ import annotations

from fastapi import APIRouter

from app.domain.solver import (
    Placement,
    SolverInput,
    SolverItem,
    validate_placements,
)
from app.domain.vastu import preferred_zone_for_category
from app.domain.vastu.rules import RULES, point_zone
from app.schemas.state import (
    ValidateRequest,
    ValidateResponse,
    Violation,
    ViolationKind,
)

router = APIRouter()


@router.post("/validate", response_model=ValidateResponse)
async def validate(req: ValidateRequest) -> ValidateResponse:
    room = req.room_state
    intake = room.intake
    violations: list[Violation] = []

    # Build solver-compatible structures
    solver_items = tuple(
        SolverItem(
            id=i.id,
            category=i.category,
            sub_category=i.id.split("-")[0] if "-" in i.id else i.category,
            width_mm=i.dimensions.width_mm,
            depth_mm=i.dimensions.depth_mm,
            height_mm=i.dimensions.height_mm,
            against_wall=i.category in {"seating", "sleeping", "storage", "tv_unit", "mandir"},
        )
        for i in room.items
    )
    placed = [
        Placement(i.id, i.position.x_mm, i.position.z_mm, int(i.position.rotation_deg), 0.0)
        for i in room.items
    ]
    inp = SolverInput(
        width_mm=intake.room_dimensions.width_mm,
        depth_mm=intake.room_dimensions.depth_mm,
        entrance=intake.entrance_direction,
        items=solver_items,
        vastu_enabled=intake.vastu_matters,
        room_type=intake.room_type.value,
        walkway_min_mm=600,
    )

    # Geometric violations (collision, walkway, boundary)
    report = validate_placements(placed, solver_items, inp)

    item_map = {i.id: i for i in room.items}

    for item_id in report.out_of_bounds_ids:
        pi = item_map[item_id]
        violations.append(Violation(
            item_id=item_id,
            item_name=pi.name_en,
            kind=ViolationKind.ROOM_BOUNDARY,
            description=f"{pi.name_en} is outside the room boundary.",
            severity="error",
        ))

    for item_id in report.colliding_ids:
        pi = item_map[item_id]
        violations.append(Violation(
            item_id=item_id,
            item_name=pi.name_en,
            kind=ViolationKind.COLLISION,
            description=f"{pi.name_en} overlaps another item or the 600mm walkway clearance is broken.",
            severity="error",
        ))

    # Vastu violations (only when vastu_matters is True)
    if intake.vastu_matters:
        for pi in room.items:
            pref_zones = preferred_zone_for_category(
                category=pi.category,
                room_type=intake.room_type.value,
                vastu_enabled=True,
            )
            if not pref_zones:
                continue
            actual_zone = point_zone(
                pi.position.x_mm,
                pi.position.z_mm,
                width_mm=intake.room_dimensions.width_mm,
                depth_mm=intake.room_dimensions.depth_mm,
                entrance=intake.entrance_direction,
            )
            if actual_zone not in pref_zones:
                rule = next(
                    (r for r in RULES if pi.category in r.categories and intake.room_type.value in r.rooms),
                    None,
                )
                description = rule.description if rule else (
                    f"{pi.name_en} is not in its preferred Vastu zone "
                    f"(currently {actual_zone.value}, preferred {'/'.join(z.value for z in pref_zones)})."
                )
                violations.append(Violation(
                    item_id=pi.id,
                    item_name=pi.name_en,
                    kind=ViolationKind.VASTU,
                    description=description,
                    severity="warning",
                ))

    return ValidateResponse(
        violations=violations,
        is_valid=not any(v.severity == "error" for v in violations),
    )
