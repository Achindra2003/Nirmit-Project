"""POST /cost — RoomState → CostBreakdown. Pure call-through to the costing engine."""
from __future__ import annotations

from fastapi import APIRouter

from app.domain.costing import build_cost_breakdown
from app.schemas.state import CostBreakdown, CostRequest

router = APIRouter()


@router.post("/cost", response_model=CostBreakdown)
async def cost(req: CostRequest) -> CostBreakdown:
    return build_cost_breakdown(req.room_state)
