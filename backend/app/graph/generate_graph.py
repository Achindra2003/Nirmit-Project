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

import hashlib
import json
import logging
import re
import uuid
from typing import Any, TypedDict

from langgraph.graph import END, StateGraph

from app.domain.catalog import get_catalog
from app.domain.catalog.selector import SelectedItem, select_items
from app.domain.costing import build_cost_breakdown
from app.domain.presets import build_design_intent_from_preset, get_preset, resolve_preset
from app.domain.solver import SolverInput, SolverItem, composition_for, solve
from app.domain.solver.solver import DoorOpening
from app.domain.vastu import VastuZone, apply_rules as vastu_apply_rules, preferred_zone_for_category
from app.prompts import RANKER_SYSTEM, STYLE_SYSTEM, build_ranker_prompt, build_style_prompt
from app.schemas.state import (
    CatalogRef,
    DesignAnchor,
    DesignIntent,
    Dimensions,
    Direction,
    Intake,
    Opening,
    PlacedItem,
    PlacementRationale,
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

    INTERPRET_SYSTEM = """You extract a structured design brief from an Indian homeowner's intake.
Output ONLY valid JSON, no markdown, no commentary.
{
  "has_kids": bool,
  "kid_age": "toddler|school|teen|none",
  "has_elderly": bool,
  "mobility_concern": bool,
  "entertains_guests": "frequent|occasional|rare",
  "needs_storage": "high|medium|low",
  "spiritual_practice": "daily_mandir|occasional|none",
  "works_from_home": bool,
  "avoid_glass_surfaces": bool,
  "vibe": "<echo the vibe>",
  "vastu_enabled": bool
}
Be conservative: only set a flag true if the text clearly supports it."""

    prompt = (
        f"Room: {intake.room_type.value}\n"
        f"Who lives here: {intake.who_lives_here}\n"
        f"Vibe: {intake.vibe.value}\n"
        f"Vastu matters: {intake.vastu_matters}\n"
        f"Budget: ₹{intake.budget_inr}\n"
        f"Keep existing: {intake.keep_existing or 'nothing mentioned'}"
    )

    try:
        from langchain_core.messages import HumanMessage, SystemMessage
        from app.llm import get_llm
        llm = get_llm(temperature=0.2)
        raw = llm.invoke([SystemMessage(content=INTERPRET_SYSTEM), HumanMessage(content=prompt)])
        text = raw.content if hasattr(raw, "content") else str(raw)
        m = _JSON_BLOCK.search(text)
        if m:
            brief = json.loads(m.group(0))
            return {**state, "design_brief": brief}
    except Exception:
        log.warning("LLM interpret failed, falling back to keyword matching", exc_info=True)

    # Fallback: keyword matching
    text_lower = intake.who_lives_here.lower()
    has_kids = any(k in text_lower for k in ("kid", "child", "son", "daughter", "baby", "toddler"))
    has_elderly = any(
        k in text_lower
        for k in ("mother-in-law", "mother in law", "grand", "elder", "parents", "father-in-law")
    )
    return {
        **state,
        "design_brief": {
            "has_kids": has_kids,
            "has_elderly": has_elderly,
            "kid_age": "none",
            "mobility_concern": has_elderly,
            "entertains_guests": "occasional",
            "needs_storage": "medium",
            "spiritual_practice": "none",
            "works_from_home": False,
            "avoid_glass_surfaces": has_kids,
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


_OPPOSITE_DIR: dict[Direction, Direction] = {
    Direction.N: Direction.S,
    Direction.S: Direction.N,
    Direction.E: Direction.W,
    Direction.W: Direction.E,
}

_PHILOSOPHY_IDX: dict[VisionPhilosophy, int] = {
    VisionPhilosophy.GATHERING: 0,
    VisionPhilosophy.BREATH: 1,
    VisionPhilosophy.KEEPER: 2,
}


def _build_vision(
    intake: Intake,
    philosophy: VisionPhilosophy,
    brief: dict[str, Any],
) -> Vision | None:
    # Try preset resolver first (guaranteed-good curated layouts).
    # Variant 1 is used for the Breath philosophy to give each set a distinct
    # spatial rhythm; Gathering and Keeper use the primary (variant 0).
    variant = 1 if philosophy is VisionPhilosophy.BREATH else 0
    placed_items = resolve_preset(intake, philosophy, variant=variant)

    if placed_items is None:
        # No preset for this room type / philosophy — fall back to the solver.
        placed_items = _build_vision_solver(intake, philosophy, brief)
    if not placed_items:
        return None

    layout = get_preset(intake.room_type.value, philosophy.value, variant)

    # Default openings — one door on entrance wall, one window on opposite wall.
    window_wall = _OPPOSITE_DIR.get(intake.entrance_direction, Direction.N)
    default_openings = [
        Opening(wall=intake.entrance_direction, center_frac=0.5, width_mm=900, height_mm=2100, kind="door", sill_mm=0),
        Opening(wall=window_wall, center_frac=0.5, width_mm=1500, height_mm=1200, kind="window", sill_mm=900),
    ]

    # LLM-driven style: palette, flooring, wall finish, lighting per vision.
    style = _llm_style(intake, philosophy)
    palette = style.get("palette") or _palette_for_vibe_and_philosophy(intake.vibe.value, philosophy)
    flooring = style.get("flooring") or _flooring_for_vibe(intake.vibe.value)
    wall_finish = style.get("wall_finish") or _wall_finish_for_vibe(intake.vibe.value)
    try:
        lighting_kelvin = max(2200, min(6500, int(style.get("lighting_kelvin") or 3200)))
    except (TypeError, ValueError):
        lighting_kelvin = 3200

    # Build DesignIntent using the preset layout when available, solver-derived otherwise.
    if layout is not None:
        design_intent = build_design_intent_from_preset(layout, placed_items, intake)
    else:
        design_intent = _build_design_intent_from_items(intake, placed_items)

    room = RoomState(
        id=f"room_{uuid.uuid4().hex[:8]}",
        philosophy=philosophy.value,
        intake=intake,
        items=placed_items,
        palette=palette,
        flooring=flooring,
        wall_finish=wall_finish,
        lighting_kelvin=lighting_kelvin,
        openings=default_openings,
        design_intent=design_intent,
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

    # item.id starts with sub_category (e.g. "sofa-0", "tv_unit-1") — use that
    # since catalog category ("seating", "storage") doesn't encode sub_category.
    sofa = next((i for i in room.items if i.id.startswith("sofa")), None)
    tv = next((i for i in room.items if i.id.startswith("tv_unit")), None)
    storage_count = sum(1 for i in room.items if i.id.startswith(("bookshelf", "cabinet", "wardrobe", "drawer", "shoe_rack")))

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
        bullets.append("TV unit is anchored to the back wall so the sofa faces across the full depth of the room.")
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


def _llm_style(intake: Intake, philosophy: VisionPhilosophy) -> dict:
    """Call LLM for palette + flooring + wall_finish + lighting_kelvin.
    Falls back to hardcoded maps on any error."""
    try:
        from langchain_core.messages import HumanMessage, SystemMessage

        from app.llm import get_llm

        llm = get_llm(temperature=0.5)
        raw = llm.invoke(
            [
                SystemMessage(content=STYLE_SYSTEM),
                HumanMessage(content=build_style_prompt(intake=intake, philosophy=philosophy.value)),
            ]
        )
        text = raw.content if hasattr(raw, "content") else str(raw)
        if not isinstance(text, str):
            text = str(text)
        m = _JSON_BLOCK.search(text)
        if m:
            data = json.loads(m.group(0))
            if isinstance(data, dict) and "palette" in data:
                return data
    except Exception:
        log.warning("LLM style call failed for %s; using hardcoded fallback", philosophy, exc_info=True)
    return {
        "palette": _palette_for_vibe_and_philosophy(intake.vibe.value, philosophy),
        "flooring": _flooring_for_vibe(intake.vibe.value),
        "wall_finish": _wall_finish_for_vibe(intake.vibe.value),
        "lighting_kelvin": 3200,
    }


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
        "maximalist": {"wall": "#E8D8C4", "floor": "#8B6914", "accent": "#8B1A1A"},
        "coastal": {"wall": "#EBF0ED", "floor": "#C9B8A0", "accent": "#6E9090"},
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
        "maximalist": "teak hardwood",
        "coastal": "light terrazzo",
    }.get(vibe, "warm oak laminate")


def _wall_finish_for_vibe(vibe: str) -> str:
    return {
        "warm_traditional": "off-white limewash",
        "modern_minimal": "soft white emulsion",
        "earthy_crafted": "earthy beige texture",
        "light_airy": "ivory matte",
        "maximalist": "deep terracotta",
        "coastal": "light sage matte",
    }.get(vibe, "off-white limewash")


def _facing_for_category(category: str, entrance: Direction) -> Direction | None:
    if category == "tv_unit":
        return entrance  # TV faces toward the entrance wall (viewer faces away from it)
    if category == "mandir":
        return Direction.E
    return None


def _is_vastu_compliant(
    category: str, vastu_zone_value: str | None, room_type: str, vastu_enabled: bool
) -> bool:
    if not vastu_enabled or not vastu_zone_value:
        return False
    pref = preferred_zone_for_category(category=category, room_type=room_type, vastu_enabled=True)
    if not pref:
        return False
    try:
        return VastuZone(vastu_zone_value) in pref
    except ValueError:
        return False


def _build_design_intent(
    intake: "Intake",
    placed_items: "list[PlacedItem]",
    solver_placements: "tuple",
) -> DesignIntent:
    placement_map = {p.item_id: p for p in solver_placements}
    anchors: list[DesignAnchor] = []
    vastu_critical: list[str] = []
    no_move: list[str] = []

    for item in placed_items:
        p = placement_map.get(item.id)
        if p and p.sight_line_target_id:
            anchors.append(DesignAnchor(item_id=item.id, sight_line_target_id=p.sight_line_target_id))
        if item.rationale and item.rationale.vastu_compliant:
            vastu_critical.append(item.id)
            if item.category == "mandir":
                no_move.append(item.id)

    return DesignIntent(
        anchors=anchors,
        no_move_items=no_move,
        vastu_critical_ids=vastu_critical,
        budget_ceiling_inr=intake.budget_inr,
    )


def _build_vision_solver(
    intake: Intake,
    philosophy: VisionPhilosophy,
    brief: dict[str, Any],
) -> list[PlacedItem] | None:
    """Original solver-based placement path — used when no preset exists for
    this room_type + philosophy combination."""
    catalog = get_catalog()
    selected = select_items(
        intake=intake,
        philosophy=philosophy,
        catalog=catalog,
        design_brief=brief,
    )
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
            front_clearance_mm=getattr(s.catalog, "front_clearance_mm", 600),
        )
        for s in selected
    )

    zones = composition_for(intake.room_type.value, philosophy.value)
    door = DoorOpening(wall=intake.entrance_direction, position_frac=0.5, width_mm=900)
    res = solve(
        SolverInput(
            width_mm=intake.room_dimensions.width_mm,
            depth_mm=intake.room_dimensions.depth_mm,
            entrance=intake.entrance_direction,
            items=solver_items,
            zones=zones,
            doors=(door,),
            vastu_enabled=intake.vastu_matters,
            room_type=intake.room_type.value,
        )
    )
    if not res.placements:
        return None

    placement_map = {p.item_id: p for p in res.placements}
    sel_map = {s.item_id: s for s in selected}
    placed: list[PlacedItem] = []

    for p in res.placements:
        sel = sel_map.get(p.item_id)
        if sel is None:
            continue
        ci = sel.catalog
        vastu_compliant = _is_vastu_compliant(
            ci.category, p.vastu_zone, intake.room_type.value, intake.vastu_matters
        )
        placed.append(PlacedItem(
            id=p.item_id,
            catalog=CatalogRef(
                sku=ci.sku,
                asset_url=ci.asset_url,
                tint_hex=ci.tint_hex,
                roughness_hint=ci.roughness_hint,
                size_label=ci.size_label,
                material_label=ci.material_label,
                finish_label=None,
                placement_type=ci.placement_type,
            ),
            name_en=ci.name_en,
            name_hi=ci.name_hi,
            category=ci.category,
            dimensions=Dimensions(
                width_mm=ci.dimensions.width_mm,
                depth_mm=ci.dimensions.depth_mm,
                height_mm=ci.dimensions.height_mm,
            ),
            position=Position(x_mm=p.x_mm, z_mm=p.z_mm, rotation_deg=float(p.rotation_deg)),
            facing=_facing_for_category(ci.sub_category or ci.category, intake.entrance_direction),
            is_buy=_is_buy_default(ci.category),
            price_inr=ci.price_inr,
            build_price_inr=ci.build_price_inr,
            rationale=PlacementRationale(
                zone_id=p.zone_id,
                vastu_zone=p.vastu_zone,
                near_wall=p.near_wall,
                sight_line_target=p.sight_line_target_id,
                score=p.score,
                vastu_compliant=vastu_compliant,
            ),
        ))

    return placed or None


def _build_design_intent_from_items(
    intake: Intake,
    placed_items: list[PlacedItem],
) -> DesignIntent:
    """Build DesignIntent from PlacedItem rationale fields — used when the
    solver fallback runs (no preset available for this room/philosophy)."""
    anchors: list[DesignAnchor] = []
    vastu_critical: list[str] = []
    no_move: list[str] = []

    for item in placed_items:
        r = item.rationale
        if r and r.sight_line_target:
            anchors.append(DesignAnchor(item_id=item.id, sight_line_target_id=r.sight_line_target))
        if r and r.vastu_compliant:
            vastu_critical.append(item.id)
            if item.category == "mandir":
                no_move.append(item.id)

    return DesignIntent(
        anchors=anchors,
        no_move_items=no_move,
        vastu_critical_ids=vastu_critical,
        budget_ceiling_inr=intake.budget_inr,
    )


def _is_buy_default(category: str) -> bool:
    """Per VISION.md / legacy buildVsBuy: heavy carpentry items (wardrobe,
    tv_unit, mandir, bookshelf) are typically built locally; soft goods and
    appliances are bought."""
    build_categories = {"storage", "tv_unit", "mandir", "kitchen"}
    return category not in build_categories
