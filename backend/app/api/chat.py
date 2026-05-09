"""POST /chat — collaborator turn. Stub for Phase 1."""
from __future__ import annotations

from fastapi import APIRouter

from app.schemas.state import ChatRequest, ChatResponse

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    # Phase 1 stub: echo with an opinionated stand-in until the collaborator graph lands.
    return ChatResponse(
        reply=(
            "I hear you. I'll have a real take on this once the collaborator graph is wired — "
            "for now the brain is in scaffolding mode."
        ),
        intents=[],
        proposed_room_state=None,
        cost_delta_inr=0,
    )
