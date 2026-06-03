"""The collaborator's failure replies must stay in Nirmit's designer voice —
never leaking error types, HTTP codes, or "check the logs" at the homeowner,
and never mutating the room on a failed turn.
"""
from __future__ import annotations

import pytest

from app.graph.collaborator_graph import _deterministic_fallback
from app.schemas.state import (
    Dimensions,
    Direction,
    Intake,
    RoomState,
    RoomType,
    Vibe,
)

# Tokens that betray the machinery — none of these belong in a chat reply.
_LEAK_TOKENS = (
    "error", "exception", "traceback", "429", "http", "stack",
    "ratelimit", "backend", "server", "json", "parse", "null", "none",
)


def _room(room_type: RoomType = RoomType.LIVING) -> RoomState:
    return RoomState(
        id="room_test",
        intake=Intake(
            room_type=room_type,
            room_dimensions=Dimensions(width_mm=4000, depth_mm=3500, height_mm=2700),
            entrance_direction=Direction.S,
            who_lives_here="a couple",
            vibe=Vibe.MODERN_MINIMAL,
            budget_inr=200_000,
        ),
    )


@pytest.mark.parametrize("reason", ["rate_limit", "error", "garbled"])
def test_fallback_never_leaks_machinery(reason: str):
    state = {"room_state": _room(), "message": "move the sofa to the north wall"}
    out = _deterministic_fallback(state, reason=reason)
    low = out["reply"].lower()
    for token in _LEAK_TOKENS:
        assert token not in low, f"reason={reason} leaked {token!r}: {out['reply']}"


@pytest.mark.parametrize("reason", ["rate_limit", "error", "garbled"])
def test_fallback_never_mutates_room(reason: str):
    state = {"room_state": _room(), "message": "anything"}
    out = _deterministic_fallback(state, reason=reason)
    assert out["intents"] == []
    assert out["cost_delta_inr"] == 0


def test_fallback_is_grounded_in_the_room():
    state = {"room_state": _room(RoomType.BEDROOM), "message": "warmer please"}
    assert "bedroom" in _deterministic_fallback(state, reason="error")["reply"].lower()


def test_room_label_never_doubles_the_noun():
    # "bedroom room" / "kitchen room" would read awkwardly.
    for rt in RoomType:
        state = {"room_state": _room(rt), "message": "x"}
        reply = _deterministic_fallback(state, reason="error")["reply"].lower()
        assert "room room" not in reply


def test_retry_of_same_message_is_stable():
    # A user re-sending the exact text shouldn't see the wording flip around.
    state = {"room_state": _room(), "message": "add a reading lamp"}
    a = _deterministic_fallback(state, reason="rate_limit")["reply"]
    b = _deterministic_fallback(state, reason="rate_limit")["reply"]
    assert a == b


def test_unknown_reason_defaults_to_garbled_voice():
    state = {"room_state": _room(), "message": "x"}
    out = _deterministic_fallback(state, reason="something_new")
    assert out["reply"]  # non-empty, no KeyError
    assert out["intents"] == []
