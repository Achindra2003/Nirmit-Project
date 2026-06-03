"""Placement-safety tests for the intent executor.

These pin the fix for the "AI move clips furniture through the wall / drops it
on top of another piece" complaint. Every in-place edit (move/scale/rotate/
duplicate) must leave the room with all footprints inside the walls and with
no item straddling another's centre region.
"""
from __future__ import annotations

import asyncio

from app.domain.intent import apply_intents
from app.domain.intent.executor import _aabb_overlaps, _effective_footprint
from app.graph.generate_graph import build_generate_graph
from app.schemas.state import (
    Dimensions,
    Direction,
    Intake,
    Intent,
    IntentKind,
    RoomState,
    RoomType,
    Vibe,
)


def _sample_room() -> RoomState:
    intake = Intake(
        room_type=RoomType.LIVING,
        room_dimensions=Dimensions(width_mm=4200, depth_mm=3600, height_mm=3000),
        entrance_direction=Direction.S,
        who_lives_here="family with kids",
        vibe=Vibe.WARM_TRADITIONAL,
        budget_inr=300_000,
        vastu_matters=False,
    )
    graph = build_generate_graph()
    result = asyncio.run(graph.ainvoke({"intake": intake}))
    return result["visions"][0].room_state


def _assert_in_bounds(room: RoomState) -> None:
    rw = room.intake.room_dimensions.width_mm
    rd = room.intake.room_dimensions.depth_mm
    for it in room.items:
        ew, ed = _effective_footprint(
            it.dimensions.width_mm, it.dimensions.depth_mm, it.position.rotation_deg
        )
        # A piece literally larger than the room on an axis can't fit — the
        # best we can do (and what the clamp does) is centre it on that axis.
        # Only assert true containment on axes where the piece actually fits.
        if ew <= rw:
            assert it.position.x_mm - ew / 2 >= -1, f"{it.id} clips W wall"
            assert it.position.x_mm + ew / 2 <= rw + 1, f"{it.id} clips E wall"
        else:
            assert abs(it.position.x_mm - rw / 2) <= 1, f"{it.id} oversized on x but not centred"
        if ed <= rd:
            assert it.position.z_mm - ed / 2 >= -1, f"{it.id} clips S wall"
            assert it.position.z_mm + ed / 2 <= rd + 1, f"{it.id} clips N wall"
        else:
            assert abs(it.position.z_mm - rd / 2) <= 1, f"{it.id} oversized on z but not centred"


def _assert_no_overlap(room: RoomState) -> None:
    items = room.items
    for a_idx, a in enumerate(items):
        aw, ad = _effective_footprint(
            a.dimensions.width_mm, a.dimensions.depth_mm, a.position.rotation_deg
        )
        for b in items[a_idx + 1:]:
            bw, bd = _effective_footprint(
                b.dimensions.width_mm, b.dimensions.depth_mm, b.position.rotation_deg
            )
            # margin=0: we only forbid true footprint overlap, not the comfort gap.
            assert not _aabb_overlaps(
                a.position.x_mm, a.position.z_mm, aw, ad,
                b.position.x_mm, b.position.z_mm, bw, bd,
                margin=0,
            ), f"{a.id} overlaps {b.id}"


def test_move_out_of_bounds_is_clamped_inside():
    room = _sample_room()
    target = room.items[0]
    # Ask to dump it far outside the room on both axes.
    out = apply_intents(
        room,
        [Intent(kind=IntentKind.MOVE, target_item_id=target.id,
                parameters={"x_mm": 99999, "z_mm": -99999})],
    )
    assert out is not None
    _assert_in_bounds(out)


def test_move_onto_another_item_slides_clear():
    room = _sample_room()
    assert len(room.items) >= 2
    mover, victim = room.items[0], room.items[1]
    # Ask to move mover exactly onto victim's centre.
    out = apply_intents(
        room,
        [Intent(kind=IntentKind.MOVE, target_item_id=mover.id,
                parameters={"x_mm": victim.position.x_mm, "z_mm": victim.position.z_mm})],
    )
    assert out is not None
    _assert_in_bounds(out)
    _assert_no_overlap(out)


def test_move_to_wall_snaps_flush():
    room = _sample_room()
    target = room.items[0]
    out = apply_intents(
        room,
        [Intent(kind=IntentKind.MOVE, target_item_id=target.id, parameters={"wall": "N"})],
    )
    assert out is not None
    _assert_in_bounds(out)
    moved = next(i for i in out.items if i.id == target.id)
    # Flush to the north wall => far side of the room on z.
    rd = room.intake.room_dimensions.depth_mm
    assert moved.position.z_mm > rd / 2, "item should sit toward the north wall"


def test_grow_near_wall_stays_in_bounds():
    room = _sample_room()
    out = room
    target_id = room.items[0].id
    # Grow the same piece several times — eventually it would clip without the clamp.
    for _ in range(4):
        nxt = apply_intents(
            out, [Intent(kind=IntentKind.MAKE_BIGGER, target_item_id=target_id, parameters={})]
        )
        if nxt is not None:
            out = nxt
    _assert_in_bounds(out)


def test_rotate_long_piece_stays_in_bounds():
    room = _sample_room()
    # Rotate every item 90° — long pieces flush to a wall would otherwise poke through.
    intents = [
        Intent(kind=IntentKind.ROTATE, target_item_id=i.id, parameters={"delta_deg": 90})
        for i in room.items
    ]
    out = apply_intents(room, intents)
    assert out is not None
    _assert_in_bounds(out)
