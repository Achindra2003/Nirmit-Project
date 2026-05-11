"""POST /apply — apply a list of structured Intents to a RoomState.

This is the deterministic counterpart to /chat: the collaborator emits the
intents, the user (or the collaborator on the user's behalf) applies them.
"""
from __future__ import annotations

from typing import List

from fastapi import APIRouter
from pydantic import Field

from app.domain.costing import build_cost_breakdown
from app.domain.intent import apply_intents
from app.schemas.state import ApplyRequest, ApplyResponse, RoomState, StrictModel, Vision, Intent

router = APIRouter()


class ExtendedApplyRequest(StrictModel):
    """Same as ApplyRequest but allows callers to thread `available_visions`
    so the `mix_from_vision` intent can resolve sibling visions."""

    room_state: RoomState
    intents: List[Intent] = Field(default_factory=list)
    available_visions: List[Vision] = Field(default_factory=list)


@router.post("/apply", response_model=ApplyResponse)
async def apply(req: ExtendedApplyRequest) -> ApplyResponse:
    new_room = apply_intents(
        req.room_state,
        list(req.intents),
        available_visions=list(req.available_visions or []),
    )
    if new_room is None:
        new_room = req.room_state
    return ApplyResponse(room_state=new_room, cost=build_cost_breakdown(new_room))
