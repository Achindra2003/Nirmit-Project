"""Smoke test: the generate graph runs end-to-end and returns at least one
vision with a non-empty room. No LLM is invoked in this test — Phase 1 nodes
are pure Python."""
from __future__ import annotations

import asyncio

from app.graph.generate_graph import build_generate_graph
from app.schemas.state import (
    Dimensions,
    Direction,
    Intake,
    RoomType,
    Vibe,
)


def _sample_intake() -> Intake:
    return Intake(
        room_type=RoomType.LIVING,
        room_dimensions=Dimensions(width_mm=4200, depth_mm=3600, height_mm=3000),
        entrance_direction=Direction.S,
        who_lives_here="family with kids and grandmother visits often",
        vibe=Vibe.WARM_TRADITIONAL,
        budget_inr=300_000,
        keep_existing="my brass diya from grandmother",
        vastu_matters=True,
    )


def test_generate_graph_returns_vision():
    graph = build_generate_graph()
    result = asyncio.run(graph.ainvoke({"intake": _sample_intake()}))
    visions = result["visions"]
    assert len(visions) >= 1
    first = visions[0]
    assert first.room_state.items, "vision should have placed items"
    assert first.cost.story.budget_inr == 300_000
    # Vastu reasoning was requested — expect at least one vastu note in the fixture
    assert first.reasoning.vastu_notes, "vastu_matters=True should surface a vastu note"


def test_intake_rejects_meter_sized_dimensions():
    """If a caller accidentally passes meters instead of mm, fail at the boundary."""
    import pytest

    with pytest.raises(ValueError):
        Intake(
            room_type=RoomType.LIVING,
            room_dimensions=Dimensions(width_mm=4, depth_mm=3, height_mm=3),
            entrance_direction=Direction.S,
            who_lives_here="me",
            vibe=Vibe.MODERN_MINIMAL,
            budget_inr=100_000,
        )
