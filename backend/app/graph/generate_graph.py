"""LangGraph workflow that turns an Intake into up to three Visions.

Pipeline:

  Intake
    │
    ▼
  Interpret  (parse who_lives_here for elderly/kids signals; build design brief)
    │
    ▼
  Generate-per-philosophy  (3 parallel branches — Gathering, Breath, Keeper)
       Selector (catalog → required items)
       Solver   (place items, mm + Vastu)
       Apply Vastu reasoning
    │
    ▼
  Rank + Explain  (LLM-backed: writes the why-this-was-made-for-you copy
                   per vision; falls back to deterministic copy if no API key)
    │
    ▼
  GenerateResponse
"""
from __future__ import annotations

import json
import logging
import re
import uuid
from typing import Any, TypedDict

from langgraph.graph import END, StateGraph

from app.domain.catalog import get_catalog
from app.domain.catalog.selector import SelectedItem, select_items
from app.domain.costing import build_cost_breakdown
from app.domain.solver import SolverInput, SolverItem, composition_for, solve
from app.domain.vastu import apply_rules as vastu_apply_rules
from app.prompts import RANKER_SYSTEM, build_ranker_prompt
from app.schemas.state import (
    CatalogRef,
    Dimensions,
    Direction,
    Intake,
    PlacedItem,
    Position,
    Reasoning,
    RoomState,
    Vision,
    VisionPhilosophy,
)

log = logging.getLogger(__name__)


class GenerateState(TypedDict, total=False):
    intake: Intake
    design_brief: dict[str, Any]
    visions: list[Vision]


# ---------- Node: Interpret ----------


def _interpret(state: GenerateState) -> GenerateState:
    intake = state["intake"]
    text = intake.who_lives_here.lower()
    has_kids = any(k in text for k in ("kid", "child", "son", "daughter", "baby", "toddler"))
    has_elderly = any(
        k in text
        for k in ("mother-in-law", "mother in law", "grand", "elder", "parents", "father-in-law")
    )
    return {
        **state,
        "design_brief": {
            "has_kids": has_kids,
            "has_elderly": has_elderly,
            "vibe": intake.vibe.value,
            "vastu_enabled": intake.vastu_matters,
        },
    }


# ---------- Node: Layout ----------


def _layout(state: GenerateState) -> GenerateState:
    intake = state["intake"]
    visions: list[Vision] = []
    for philosophy in (
        VisionPhilosophy.GATHERING,
        VisionPhilosophy.BREATH,
        VisionPhilosophy.KEEPER,
    ):
        try:
            v = _build_vision(intake, philosophy, state.get("design_brief", {}))
        except Exception:
            log.exception("vision generation failed for %s", philosophy)
            continue
        if v is not None:
            visions.append(v)
    if not visions:
        # Last-resort: fall back to a single empty room so the API does not
        # return a 500 — the frontend can show an error gracefully.
        visions = [_empty_vision(intake, VisionPhilosophy.GATHERING)]
    return {**state, "visions": visions}


# ---------- Node: Rank + Explain (LLM-backed) ----------


def _rank_and_explain(state: GenerateState) -> GenerateState:
    intake = state["intake"]
    visions = state["visions"]
    enriched: list[Vision] = []
    for v in visions:
        try:
            new_reasoning = _author_reasoning(intake, v)
        except Exception:
            log.warning("LLM ranker failed for %s; using deterministic fallback", v.name, exc_info=True)
            new_reasoning = v.reasoning
        enriched.append(v.model_copy(update={"reasoning": new_reasoning}))
    return {**state, "visions": enriched}


# ---------- Graph wiring ----------


def build_generate_graph():
    g = StateGraph(GenerateState)
    g.add_node("interpret", _interpret)
    g.add_node("layout", _layout)
    g.add_node("rank", _rank_and_explain)
    g.set_entry_point("interpret")
    g.add_edge("interpret", "layout")
    g.add_edge("layout", "rank")
    g.add_edge("rank", END)
    return g.compile()


# ---------- Vision construction ----------


def _build_vision(
    intake: Intake,
    philosophy: VisionPhilosophy,
    brief: dict[str, Any],
) -> Vision | None:
    catalog = get_catalog()
    selected = select_items(intake=intake, philosophy=philosophy, catalog=catalog)
    if not selected:
        return None

    solver_items = tuple(
        SolverItem(
            id=s.item_id,
            category=s.catalog.category,
            sub_category=s.catalog.sub_category or s.catalog.category,
            width_mm=s.catalog.dimensions.width_mm,
            depth_mm=s.catalog.dimensions.depth_mm,
            height_mm=s.catalog.dimensions.height_mm,
            against_wall=s.against_wall,
            catalog_sku=s.catalog.sku,
        )
        for s in selected
    )
    zones = composition_for(intake.room_type.value, philosophy.value)
    res = solve(
        SolverInput(
            width_mm=intake.room_dimensions.width_mm,
            depth_mm=intake.room_dimensions.depth_mm,
            entrance=intake.entrance_direction,
            items=solver_items,
            zones=zones,
            vastu_enabled=intake.vastu_matters,
            room_type=intake.room_type.value,
            walkway_min_mm=600,
        )
    )

    by_id = {s.item_id: s for s in selected}
    placed_items: list[PlacedItem] = []
    for p in res.placements:
        s = by_id[p.item_id]
        placed_items.append(
            PlacedItem(
                id=p.item_id,
                catalog=CatalogRef(
                    sku=s.catalog.sku,
                    asset_url=s.catalog.asset_url,
                    tint_hex=s.catalog.tint_hex,
                    roughness_hint=s.catalog.roughness_hint,
                    size_label=s.catalog.size_label,
                    material_label=s.catalog.material_label,
                    finish_label=s.catalog.finish_label,
                ),
                name_en=s.catalog.name_en,
                name_hi=s.catalog.name_hi,
                category=s.catalog.category,
                dimensions=Dimensions(
                    width_mm=s.catalog.dimensions.width_mm,
                    depth_mm=s.catalog.dimensions.depth_mm,
                    height_mm=s.catalog.dimensions.height_mm,
                ),
                position=Position(x_mm=p.x_mm, z_mm=p.z_mm, rotation_deg=float(p.rotation_deg)),
                facing=_facing_for_category(s.catalog.category, intake.entrance_direction),
                is_buy=_is_buy_default(s.catalog.category),
                price_inr=s.catalog.price_inr,
                build_price_inr=s.catalog.build_price_inr,
            )
        )

    if not placed_items:
        return None

    palette = _palette_for_vibe_and_philosophy(intake.vibe.value, philosophy)
    room = RoomState(
        id=f"room_{uuid.uuid4().hex[:8]}",
        intake=intake,
        items=placed_items,
        palette=palette,
        flooring=_flooring_for_vibe(intake.vibe.value),
        wall_finish=_wall_finish_for_vibe(intake.vibe.value),
    )
    cost = build_cost_breakdown(room)

    name, tagline = _name_and_tagline(philosophy)
    reasoning = _deterministic_reasoning(intake, brief, philosophy, room)
    return Vision(
        id=f"vision_{uuid.uuid4().hex[:8]}",
        philosophy=philosophy,
        name=name,
        tagline=tagline,
        room_state=room,
        reasoning=reasoning,
        cost=cost,
    )


def _empty_vision(intake: Intake, philosophy: VisionPhilosophy) -> Vision:
    name, tagline = _name_and_tagline(philosophy)
    room = RoomState(
        id=f"room_{uuid.uuid4().hex[:8]}",
        intake=intake,
        items=[],
        palette=_palette_for_vibe_and_philosophy(intake.vibe.value, philosophy),
    )
    return Vision(
        id=f"vision_{uuid.uuid4().hex[:8]}",
        philosophy=philosophy,
        name=name,
        tagline=tagline,
        room_state=room,
        reasoning=Reasoning(
            headline="The catalog couldn't fit a vision for this room yet.",
            bullets=["The catalog is missing items in this size/style. Try widening the budget or relaxing the vibe."],
        ),
        cost=build_cost_breakdown(room),
    )


# ---------- Reasoning ----------


def _deterministic_reasoning(
    intake: Intake,
    brief: dict[str, Any],
    philosophy: VisionPhilosophy,
    room: RoomState,
) -> Reasoning:
    """Authored, opinionated copy generated *without* an LLM — used as the
    default and as a fallback when the LLM call fails."""
    headline_map = {
        VisionPhilosophy.GATHERING: "Built for your family's evenings together.",
        VisionPhilosophy.BREATH: "Built for the breath of an open room.",
        VisionPhilosophy.KEEPER: "Built so every wall earns its keep.",
    }
    bullets: list[str] = []

    sofa = next((i for i in room.items if i.category == "seating"), None)
    tv = next((i for i in room.items if i.category == "tv_unit"), None)
    storage_count = sum(1 for i in room.items if i.category == "storage")

    if philosophy is VisionPhilosophy.GATHERING and sofa:
        bullets.append(
            f"Sofa anchors the long wall ({sofa.dimensions.width_mm}mm wide) so the whole family fits on movie nights."
        )
    if philosophy is VisionPhilosophy.BREATH and sofa:
        bullets.append(
            "Centre of the room stays clear — the gaze from the entrance reaches all the way to the far wall."
        )
    if philosophy is VisionPhilosophy.KEEPER and storage_count >= 2:
        bullets.append(
            f"{storage_count} pieces of closed storage line the walls — toys, festival boxes, daily clutter all have a home."
        )
    if tv:
        bullets.append("TV unit on the entrance wall keeps the room's centre open and the entrance view clean.")
    if brief.get("has_kids"):
        bullets.append("Coffee table is small and rounded — clear floor space for a four-year-old to play.")
    if brief.get("has_elderly"):
        bullets.append("Sofa height is 850mm with arms on both sides — easy stand-up for older guests.")

    vastu_notes = []
    accessibility_notes = []
    if intake.vastu_matters:
        applied = vastu_apply_rules(
            # Position.x_mm/z_mm is already the footprint CENTRE — pass directly.
            items=[(i.id, i.category, i.position.x_mm, i.position.z_mm) for i in room.items],
            width_mm=intake.room_dimensions.width_mm,
            depth_mm=intake.room_dimensions.depth_mm,
            entrance=intake.entrance_direction,
            room_type=intake.room_type.value,
            vastu_enabled=True,
        )
        vastu_notes = [a.bullet for a in applied[:2]]
    if brief.get("has_elderly"):
        accessibility_notes.append("All seating is at least 450mm tall — easy on hips and knees for older family members.")
    if brief.get("has_kids"):
        accessibility_notes.append("No sharp glass edges. The coffee table is rounded; the rug softens any falls.")

    return Reasoning(
        headline=headline_map[philosophy],
        bullets=bullets or ["A balanced layout for this room — no items too close, walkways clear."],
        vastu_notes=vastu_notes,
        accessibility_notes=accessibility_notes,
    )


_JSON_BLOCK = re.compile(r"\{[\s\S]*\}", re.MULTILINE)


def _author_reasoning(intake: Intake, vision: Vision) -> Reasoning:
    """Use the LLM to author personal, opinionated copy. Falls back silently
    on any error — the deterministic Reasoning is already attached."""
    from langchain_core.messages import HumanMessage, SystemMessage

    from app.llm import get_llm

    llm = get_llm(temperature=0.6)
    msgs = [
        SystemMessage(content=RANKER_SYSTEM),
        HumanMessage(
            content=build_ranker_prompt(
                intake=intake, room=vision.room_state, philosophy=vision.philosophy.value
            )
        ),
    ]
    raw = llm.invoke(msgs)
    text = raw.content if hasattr(raw, "content") else str(raw)
    if not isinstance(text, str):
        text = str(text)
    m = _JSON_BLOCK.search(text)
    if not m:
        return vision.reasoning
    try:
        data = json.loads(m.group(0))
    except json.JSONDecodeError:
        return vision.reasoning
    return Reasoning(
        headline=str(data.get("headline") or vision.reasoning.headline)[:200],
        bullets=[str(b)[:300] for b in (data.get("bullets") or [])][:5] or vision.reasoning.bullets,
        vastu_notes=[str(b)[:200] for b in (data.get("vastu_notes") or [])][:2],
        accessibility_notes=[str(b)[:200] for b in (data.get("accessibility_notes") or [])][:2],
    )


# ---------- Helpers ----------


def _name_and_tagline(p: VisionPhilosophy) -> tuple[str, str]:
    if p is VisionPhilosophy.GATHERING:
        return "The Gathering", "Warm, dense, made for evenings together."
    if p is VisionPhilosophy.BREATH:
        return "The Breath", "Open, minimal, made for peace and space."
    return "The Keeper", "Storage-first. Every wall earns its keep."


def _palette_for_vibe_and_philosophy(vibe: str, philosophy: VisionPhilosophy) -> dict[str, str]:
    base = {
        "warm_traditional": {"wall": "#EDE6D8", "floor": "#B89B7A", "accent": "#7A5C3A"},
        "modern_minimal": {"wall": "#F2EFEA", "floor": "#A89A8C", "accent": "#3F3A33"},
        "earthy_crafted": {"wall": "#E5DDD0", "floor": "#9C7E5C", "accent": "#5C4632"},
        "light_airy": {"wall": "#F8F4ED", "floor": "#C9B89D", "accent": "#6E8388"},
    }.get(vibe, {"wall": "#EDE6D8", "floor": "#B89B7A", "accent": "#7A5C3A"})
    if philosophy is VisionPhilosophy.BREATH:
        base = {**base, "wall": "#F8F4ED"}
    return base


def _flooring_for_vibe(vibe: str) -> str:
    return {
        "warm_traditional": "warm oak laminate",
        "modern_minimal": "matte grey vitrified",
        "earthy_crafted": "kota stone",
        "light_airy": "pale oak laminate",
    }.get(vibe, "warm oak laminate")


def _wall_finish_for_vibe(vibe: str) -> str:
    return {
        "warm_traditional": "off-white limewash",
        "modern_minimal": "soft white emulsion",
        "earthy_crafted": "earthy beige texture",
        "light_airy": "ivory matte",
    }.get(vibe, "off-white limewash")


def _facing_for_category(category: str, entrance: Direction) -> Direction | None:
    if category == "tv_unit":
        return entrance  # TV faces toward the entrance wall (viewer faces away from it)
    if category == "mandir":
        return Direction.E
    return None


def _is_buy_default(category: str) -> bool:
    """Per VISION.md / legacy buildVsBuy: heavy carpentry items (wardrobe,
    tv_unit, mandir, bookshelf) are typically built locally; soft goods and
    appliances are bought."""
    build_categories = {"storage", "tv_unit", "mandir", "kitchen"}
    return category not in build_categories
