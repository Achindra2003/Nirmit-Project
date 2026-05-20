"""POST /chat — collaborator turn.

The collaborator graph: LLM → parsed intents → applied to room → cost delta.
"""
from __future__ import annotations

from fastapi import APIRouter

from app.graph.collaborator_graph import build_collaborator_graph
from app.schemas.state import ChatRequest, ChatResponse

router = APIRouter()
_graph = build_collaborator_graph()


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    result = await _graph.ainvoke(
        {
            "room_state": req.room_state,
            "previous_room_state": getattr(req, "previous_room_state", None),
            "history": req.history,
            "message": req.message,
            "available_visions": req.available_visions,
        }
    )
    return result["response"]


@router.post("/chat/first-look", response_model=ChatResponse)
async def chat_first_look(req: ChatRequest) -> ChatResponse:
    """Fire on PlannerRoute mount. Returns 3 opinionated suggestions but does NOT apply them."""
    result = await _graph.ainvoke(
        {
            "room_state": req.room_state,
            "history": [],
            "message": "__FIRST_LOOK__",
            "available_visions": req.available_visions,
            "first_look_mode": True,
        }
    )
    return result["response"]
