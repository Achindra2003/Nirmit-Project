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


def test_change_style_swaps_to_a_different_peer_sku():
    """Style swap on a sofa should return a different sofa, not the same one
    and not a wholly unrelated category. Empty parameters — the planner's
    ⇄ Style button sends no payload, so the executor must infer the swap
    target from the current item alone."""
    room = _seed_room()
    sofa = next(i for i in room.items if i.category == "seating")
    new = apply_intents(
        room,
        [Intent(kind=IntentKind.CHANGE_STYLE, target_item_id=sofa.id, parameters={})],
    )
    assert new is not None, "change_style with empty params must still swap"
    swapped = next(i for i in new.items if i.id == sofa.id)
    assert swapped.catalog.sku != sofa.catalog.sku, "SKU must change — same SKU is a no-op"
    # Should land on another seating item, not a completely unrelated category.
    assert swapped.category == sofa.category


def test_change_style_falls_back_to_category_for_singletons():
    """Items whose primary tag has no other entries in the curated menu (a
    coffee table is the only thing tagged 'coffee_table', a diwan the only
    one tagged 'diwan') used to no-op. The category-fallback tier rescues
    them by swapping within the broader category."""
    room = _seed_room()
    # Every placed item in the seed should have *some* swap target — tag or
    # category fallback. Iterate them all; if even one is still a no-op, the
    # planner's ⇄ Style button will silently fail for that piece.
    no_swap = []
    for piece in room.items:
        out = apply_intents(
            room,
            [Intent(kind=IntentKind.CHANGE_STYLE, target_item_id=piece.id, parameters={})],
        )
        if out is None:
            no_swap.append((piece.category, piece.name_en))
            continue
        swapped = next(i for i in out.items if i.id == piece.id)
        if swapped.catalog.sku == piece.catalog.sku:
            no_swap.append((piece.category, piece.name_en))
    # We accept a small number of true singletons (e.g. a unique mandir or
    # ceiling fan), but the majority of pieces must be swappable.
    swap_rate = 1 - len(no_swap) / max(1, len(room.items))
    assert swap_rate >= 0.7, f"Too many silent no-ops ({swap_rate:.0%}): {no_swap}"
