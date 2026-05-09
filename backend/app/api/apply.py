"""POST /apply — apply a list of intents to a RoomState. Stub for Phase 1."""
from __future__ import annotations

from fastapi import APIRouter

from app.domain.costing import build_cost_breakdown
from app.schemas.state import ApplyRequest, ApplyResponse

router = APIRouter()


@router.post("/apply", response_model=ApplyResponse)
async def apply(req: ApplyRequest) -> ApplyResponse:
    # Phase 1 stub: returns the room unchanged with a recomputed cost breakdown.
    # Real intent execution lives in app/domain/solver/ once the solver lands.
    return ApplyResponse(room_state=req.room_state, cost=build_cost_breakdown(req.room_state))
