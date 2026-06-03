"""POST /chat — collaborator turn.

The collaborator graph: LLM → parsed intents → applied to room → cost delta.
"""
from __future__ import annotations

from fastapi import APIRouter

from app.domain.suggest import suggest_for_room
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
    """Fire on PlannerRoute mount. Returns up to 3 cross-sell / up-sell ideas
    (does NOT apply them). Deterministic — rules over the room + household +
    all-in budget headroom — so it never hangs on an LLM rate limit, and never
    suggests anything that breaks budget or doesn't suit the family."""
    suggestions = suggest_for_room(req.room_state)
    reply = (
        "A couple of ways to finish the room — all within your budget:"
        if suggestions
        else "This room's looking complete to me — but tell me what you'd change."
    )
    return ChatResponse(
        reply=reply,
        intents=[s.intent for s in suggestions],
        proposed_room_state=None,
        cost_delta_inr=0,
    )
