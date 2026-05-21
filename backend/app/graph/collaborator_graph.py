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

from app.domain.catalog import get_catalog
from app.domain.catalog.model import CatalogQuery
from app.domain.costing import build_cost_breakdown
from app.domain.intent import IntentExecutionError, apply_intents
from app.llm import get_llm
from app.prompts import COLLABORATOR_SYSTEM, build_collaborator_prompt, build_diff_context
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
    previous_room_state: RoomState | None
    history: list[dict[str, str]]
    message: str
    available_visions: list
    first_look_mode: bool
    raw_llm_text: str
    parsed: dict[str, Any]
    response: ChatResponse


# ---------- Nodes ----------


def _generate(state: CollabState) -> CollabState:
    intake = state["room_state"].intake
    catalog = get_catalog()
    catalog_items = catalog.query(CatalogQuery(room=intake.room_type, limit=30))
    diff_context = build_diff_context(
        previous=state.get("previous_room_state"),
        current=state["room_state"],
    )
    msgs = [
        SystemMessage(content=COLLABORATOR_SYSTEM),
        HumanMessage(
            content=build_collaborator_prompt(
                intake=intake,
                room=state["room_state"],
                history=state.get("history", []),
                user_message=state["message"],
                catalog_snapshot=catalog_items,
                diff_context=diff_context,
            )
        ),
    ]
    try:
        llm = get_llm(temperature=0.55, json_mode=True)
        raw = llm.invoke(msgs)
        text = raw.content if hasattr(raw, "content") else str(raw)
        if not isinstance(text, str):
            text = str(text)
    except Exception as exc:
        log.error(
            "LLM call failed in collaborator (%s: %s) — falling back to stub",
            type(exc).__name__, exc,
            exc_info=True,
        )
        text = json.dumps(_deterministic_fallback(state, error=exc))
    return {**state, "raw_llm_text": text}


def _parse(state: CollabState) -> CollabState:
    text = state.get("raw_llm_text", "")
    log.debug("collaborator raw LLM text: %s", text[:500])
    parsed: dict[str, Any]
    m = _JSON_BLOCK.search(text)
    if not m:
        log.error("collaborator: no JSON block in LLM response — raw: %r", text[:300])
        parsed = _deterministic_fallback(state)
    else:
        try:
            parsed = json.loads(m.group(0))
        except json.JSONDecodeError as exc:
            log.error("collaborator: JSON decode failed (%s) — raw: %r", exc, text[:300])
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

    proposed: RoomState | None = None
    cost_delta = 0
    # In first-look mode intents are suggestions only — do not apply them
    if intents and not state.get("first_look_mode"):
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


def _deterministic_fallback(state: CollabState, *, error: Exception | None = None) -> dict[str, Any]:
    """Used when the LLM is unavailable or returns garbage."""
    msg = state.get("message", "")
    if error is not None:
        reason = f"{type(error).__name__}: {error}"
        reply = (
            f"I hit a snag trying to respond — the AI backend returned an error ({reason}). "
            f"Check the server logs for details. Your request was: '{msg}'."
        )
    else:
        reply = (
            "I couldn't parse the AI response for your request. "
            f"The backend logs will show what the model returned. Your request was: '{msg}'."
        )
    return {"reply": reply, "intents": [], "cost_delta_inr": 0}
