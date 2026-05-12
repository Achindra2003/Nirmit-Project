"""LangGraph workflow for the AI collaborator chat turn.

Pipeline:

  ChatRequest
    │
    ▼
  Compose      (build prompt with room state + history + voice rules)
    │
    ▼
  Generate     (LLM produces reply + structured intents)
    │
    ▼
  Apply        (intents executed against the room state via app.domain.intent)
    │
    ▼
  Cost-delta   (compute new vs. old)
    │
    ▼
  ChatResponse
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph

from app.domain.costing import build_cost_breakdown
from app.domain.intent import IntentExecutionError, apply_intents
from app.llm import get_llm
from app.prompts import COLLABORATOR_SYSTEM, build_collaborator_prompt
from app.schemas.state import (
    ChatResponse,
    Intent,
    IntentKind,
    RoomState,
)

log = logging.getLogger(__name__)

_JSON_BLOCK = re.compile(r"\{[\s\S]*\}", re.MULTILINE)


class CollabState(TypedDict, total=False):
    room_state: RoomState
    history: list[dict[str, str]]
    message: str
    available_visions: list
    raw_llm_text: str
    parsed: dict[str, Any]
    response: ChatResponse


# ---------- Nodes ----------


def _generate(state: CollabState) -> CollabState:
    intake = state["room_state"].intake
    msgs = [
        SystemMessage(content=COLLABORATOR_SYSTEM),
        HumanMessage(
            content=build_collaborator_prompt(
                intake=intake,
                room=state["room_state"],
                history=state.get("history", []),
                user_message=state["message"],
            )
        ),
    ]
    try:
        llm = get_llm(temperature=0.55)
        raw = llm.invoke(msgs)
        text = raw.content if hasattr(raw, "content") else str(raw)
        if not isinstance(text, str):
            text = str(text)
    except Exception:
        log.warning("LLM unavailable in collaborator; falling back to deterministic stub", exc_info=True)
        text = json.dumps(_deterministic_fallback(state))
    return {**state, "raw_llm_text": text}


def _parse(state: CollabState) -> CollabState:
    text = state.get("raw_llm_text", "")
    m = _JSON_BLOCK.search(text)
    parsed: dict[str, Any]
    if not m:
        parsed = _deterministic_fallback(state)
    else:
        try:
            parsed = json.loads(m.group(0))
        except json.JSONDecodeError:
            parsed = _deterministic_fallback(state)
    return {**state, "parsed": parsed}


def _apply(state: CollabState) -> CollabState:
    parsed = state["parsed"]
    raw_intents = parsed.get("intents") or []
    intents: list[Intent] = []
    for raw in raw_intents:
        try:
            intents.append(_coerce_intent(raw))
        except (ValueError, KeyError):
            continue

    # Positions are owned by the layout engine; the AI must not teleport items.
    _BLOCKED = {IntentKind.MOVE, IntentKind.ROTATE}
    intents = [i for i in intents if i.kind not in _BLOCKED]

    proposed: RoomState | None = None
    cost_delta = 0
    if intents:
        try:
            proposed = apply_intents(
                state["room_state"],
                intents,
                available_visions=state.get("available_visions") or [],
            )
        except IntentExecutionError as e:
            log.info("intent execution refused: %s", e)
            proposed = None
        if proposed is not None:
            old_total = build_cost_breakdown(state["room_state"]).story.total_inr
            new_total = build_cost_breakdown(proposed).story.total_inr
            cost_delta = new_total - old_total

    response = ChatResponse(
        reply=str(parsed.get("reply") or "").strip()
        or "I have a take coming on this — give me a moment.",
        intents=intents,
        proposed_room_state=proposed,
        cost_delta_inr=cost_delta,
    )
    return {**state, "response": response}


# ---------- Graph wiring ----------


def build_collaborator_graph():
    g = StateGraph(CollabState)
    g.add_node("generate", _generate)
    g.add_node("parse", _parse)
    g.add_node("apply", _apply)
    g.set_entry_point("generate")
    g.add_edge("generate", "parse")
    g.add_edge("parse", "apply")
    g.add_edge("apply", END)
    return g.compile()


# ---------- Helpers ----------


def _coerce_intent(raw: dict[str, Any]) -> Intent:
    kind = str(raw.get("kind", "")).strip()
    if kind not in IntentKind._value2member_map_:
        raise ValueError(f"unknown intent kind: {kind}")
    target = raw.get("target_item_id")
    if target is not None and not isinstance(target, str):
        target = str(target)
    params = raw.get("parameters") or {}
    if not isinstance(params, dict):
        params = {}
    # Pydantic forbids extras; coerce values to allowed scalar types.
    cleaned: dict[str, Any] = {}
    for k, v in params.items():
        if isinstance(v, (str, int, float, bool)):
            cleaned[str(k)] = v
        else:
            cleaned[str(k)] = str(v)
    return Intent(kind=IntentKind(kind), target_item_id=target, parameters=cleaned)


def _deterministic_fallback(state: CollabState) -> dict[str, Any]:
    """Used when the LLM is unavailable or returns garbage. Honest, opinionated,
    explicitly says the brain isn't fully wired. Better than echo / silence."""
    msg = state.get("message", "")
    return {
        "reply": (
            "I'd love to make a real call on that, but my brain isn't wired into the LLM right now — "
            f"so I can hear '{msg}' but I can't act on it yet. Set GROQ_API_KEY and I'll have a take."
        ),
        "intents": [],
        "cost_delta_inr": 0,
    }
