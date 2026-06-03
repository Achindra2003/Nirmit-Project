"""Finishing curation + the cost path for material selection.

Covers the dept-head feedback that (a) wall/floor finishes weren't specific to
the room and (b) changing them didn't move the cost. Pure logic, no LLM — the
room is hand-built so these stay fast.
"""
from __future__ import annotations

from app.domain.boq.boq import build_boq
from app.domain.costing.engine import build_cost_breakdown, materials_cost
from app.domain.finishing import curated_flooring, curated_paints
from app.domain.intent import apply_intents
from app.schemas.state import (
    CatalogRef,
    Dimensions,
    Direction,
    Intake,
    Intent,
    IntentKind,
    PlacedItem,
    Position,
    RoomState,
    RoomType,
    Vibe,
)


def _room(room_type: RoomType = RoomType.LIVING, **room_overrides) -> RoomState:
    intake = Intake(
        room_type=room_type,
        room_dimensions=Dimensions(width_mm=4200, depth_mm=3600, height_mm=3000),
        entrance_direction=Direction.S,
        who_lives_here="family",
        vibe=Vibe.WARM_TRADITIONAL,
        budget_inr=600_000,
    )
    item = PlacedItem(
        id="sofa-1",
        catalog=CatalogRef(sku="sofa", asset_url="sofa.glb"),
        name_en="3-Seater Sofa",
        category="seating",
        dimensions=Dimensions(width_mm=2000, depth_mm=900, height_mm=800),
        position=Position(x_mm=2100, z_mm=1800),
        price_inr=45_000,
        is_buy=True,
    )
    return RoomState(
        id="r1",
        intake=intake,
        items=[item],
        palette={"wall": "#EFE0CD", "floor": "#B89B7A"},
        **room_overrides,
    )


# ---- Curation is room-aware ----


def test_bedroom_palette_is_darker_than_living():
    living = curated_paints("living", None)
    bedroom = curated_paints("bedroom", None)
    avg_living = sum(s.tone for s in living) / len(living)
    avg_bedroom = sum(s.tone for s in bedroom) / len(bedroom)
    assert avg_bedroom > avg_living


def test_curation_changes_with_room_type():
    living_ids = {s.id for s in curated_paints("living", None)}
    bedroom_ids = {s.id for s in curated_paints("bedroom", None)}
    # Curated sets should differ — not one global list served to every room.
    assert living_ids != bedroom_ids


def test_flooring_curated_and_priced():
    floors = curated_flooring("living", "gathering")
    assert floors, "expected at least one curated floor"
    assert all(f.rate_inr_sqft > 0 for f in floors)


# ---- Selection moves the cost ----


def test_materials_cost_tracks_selected_floor_rate():
    cheap = _room(floor_rate_inr_sqft=70)
    pricey = _room(floor_rate_inr_sqft=380)
    assert materials_cost(pricey) > materials_cost(cheap)


def test_total_includes_materials():
    room = _room(wall_finish_rate_inr_sqft=50, floor_rate_inr_sqft=135)
    cost = build_cost_breakdown(room)
    furniture = sum(li.price_inr for li in cost.line_items)
    assert cost.materials_inr > 0
    assert cost.story.total_inr == furniture + cost.materials_inr


def test_recolor_stores_rate_and_moves_cost():
    room = _room()
    before = build_cost_breakdown(room).story.total_inr
    out = apply_intents(
        room,
        [
            Intent(
                kind=IntentKind.RECOLOR_ROOM,
                target_item_id=None,
                parameters={
                    "floor": "#F4F0E8",
                    "flooring": "Italian Marble (Statuario White)",
                    "floor_rate_inr_sqft": 380,
                },
            )
        ],
    )
    assert out is not None
    assert out.floor_rate_inr_sqft == 380
    after = build_cost_breakdown(out).story.total_inr
    assert after > before


def test_boq_uses_selected_floor_rate():
    room = _room(floor_rate_inr_sqft=380)
    boq = build_boq(room, city="Mumbai")
    floor_line = next(l for l in boq.materials if l.description.startswith("Flooring"))
    assert floor_line.rate_inr == 380


def test_recolor_stores_light_direction():
    room = _room()
    assert room.light_direction is None
    out = apply_intents(
        room,
        [Intent(kind=IntentKind.RECOLOR_ROOM, target_item_id=None, parameters={"light_direction": "E"})],
    )
    assert out is not None
    assert out.light_direction == "E"


def test_recolor_rejects_bad_light_direction():
    room = _room()
    out = apply_intents(
        room,
        [Intent(kind=IntentKind.RECOLOR_ROOM, target_item_id=None, parameters={"light_direction": "UP"})],
    )
    # Invalid value is ignored, not stored — and with no other change the intent
    # is a no-op (apply_intents returns None when nothing applied).
    assert out is None or out.light_direction is None
