"""Intent execution unit tests. Pure logic — no LLM."""
from __future__ import annotations

import asyncio

from app.domain.intent import apply_intents
from app.graph.generate_graph import build_generate_graph
from app.schemas.state import (
    Dimensions,
    Direction,
    Intake,
    Intent,
    IntentKind,
    RoomType,
    Vibe,
)


def _seed_room():
    intake = Intake(
        room_type=RoomType.LIVING,
        room_dimensions=Dimensions(width_mm=4200, depth_mm=3600, height_mm=3000),
        entrance_direction=Direction.S,
        who_lives_here="family",
        vibe=Vibe.WARM_TRADITIONAL,
        budget_inr=300_000,
        vastu_matters=True,
    )
    g = build_generate_graph()
    res = asyncio.run(g.ainvoke({"intake": intake}))
    return res["visions"][0].room_state


def test_apply_remove_intent_drops_the_target_item():
    room = _seed_room()
    target = room.items[0]
    new = apply_intents(room, [Intent(kind=IntentKind.REMOVE, target_item_id=target.id, parameters={})])
    assert new is not None
    assert all(i.id != target.id for i in new.items)


def test_apply_make_bigger_scales_dimensions():
    room = _seed_room()
    target = next(i for i in room.items if i.category == "seating")
    original_w = target.dimensions.width_mm
    new = apply_intents(room, [Intent(kind=IntentKind.MAKE_BIGGER, target_item_id=target.id, parameters={})])
    assert new is not None
    new_target = next(i for i in new.items if i.id == target.id)
    assert new_target.dimensions.width_mm > original_w


def test_apply_recolor_room_updates_palette():
    room = _seed_room()
    new = apply_intents(
        room,
        [Intent(kind=IntentKind.RECOLOR_ROOM, target_item_id=None, parameters={"wall": "#222222"})],
    )
    assert new is not None
    assert new.palette["wall"] == "#222222"


def test_apply_unknown_target_returns_none():
    room = _seed_room()
    out = apply_intents(
        room,
        [Intent(kind=IntentKind.REMOVE, target_item_id="nonexistent", parameters={})],
    )
    # No applied changes -> returns None per contract
    assert out is None
