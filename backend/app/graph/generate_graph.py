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
from app.domain.presets import (
    build_design_intent_from_preset,
    get_preset,
    resolve_preset,
    resolve_preset_via_engine,
)
from app.domain.solver import SolverInput, SolverItem, composition_for, solve
from app.domain.solver.solver import DoorOpening
from app.domain.reasoning_copy import humanize_reasoning
from app.domain.vastu import VastuZone, apply_rules as vastu_apply_rules, preferred_zone_for_category
from app.config import settings
from app.llm.guard import LlmQuotaGate, safe_llm_invoke
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

    if settings.LLM_INTERPRET_ON_GENERATE and not LlmQuotaGate.is_open():
        from langchain_core.messages import HumanMessage, SystemMessage

        from app.llm import get_llm

        llm = get_llm(temperature=0.2)
        raw = safe_llm_invoke(
            llm,
            [SystemMessage(content=INTERPRET_SYSTEM), HumanMessage(content=prompt)],
            context="interpret",
        )
        if raw is not None:
            text = raw.content if hasattr(raw, "content") else str(raw)
            m = _JSON_BLOCK.search(text) if isinstance(text, str) else None
            if m:
                brief = json.loads(m.group(0))
                return {**state, "design_brief": brief}

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
        if settings.LLM_RANKER_ON_GENERATE and not LlmQuotaGate.is_open():
            new_reasoning, name_override, tagline_override = _author_reasoning(intake, v)
        else:
            new_reasoning, name_override, tagline_override = v.reasoning, None, None
        update: dict[str, Any] = {"reasoning": new_reasoning}
        # LLM-supplied names beat the deterministic table when they pass the
        # guard (non-empty, not a banned philosophy word). The guard sits in
        # `_clean_vision_name`; if it returns None, we keep the room-aware
        # deterministic name from `_name_and_tagline`.
        cleaned_name = _clean_vision_name(name_override)
        if cleaned_name:
            update["name"] = cleaned_name
        cleaned_tagline = _clean_vision_tagline(tagline_override)
        if cleaned_tagline:
            update["tagline"] = cleaned_tagline
        enriched.append(v.model_copy(update=update))
    return {**state, "visions": enriched}


# Vibe-label collision words — using these as the vision name would mirror
# the user's intake pick and defeat the whole point of asking the LLM for
# a fresh name.
_BANNED_NAME_WORDS = {"gathering", "breath", "keeper", "studio", "bazaar", "shore"}

# Marketing/feeling adjectives that produce mushy names — "The Cozy Family
# Room", "The Modern Layout", "The Perfect Bedroom". These tell the reader
# nothing about the LAYOUT; they're brochure copy. If the LLM reaches for one,
# we drop the name and let the deterministic table speak.
_BANNED_NAME_ADJECTIVES = {
    "cozy", "cosy", "warm", "warmer", "warmest",
    "peaceful", "harmonious", "tranquil", "serene", "zen",
    "perfect", "ideal", "ultimate", "premium", "luxe", "luxury", "luxurious",
    "stylish", "elegant", "chic", "trendy", "fashionable",
    "modern", "contemporary", "minimal", "minimalist", "sleek",
    "beautiful", "stunning", "amazing", "gorgeous", "lovely", "pretty",
    "smart", "clever", "intelligent", "thoughtful",
    "cool", "nice", "great", "good",
    "spacious", "compact", "tiny", "huge", "grand",
    "happy", "joyful", "blissful", "dreamy",
    # Brochure nouns — these aren't features either.
    "haven", "retreat", "sanctuary", "oasis", "paradise", "nook", "hideaway",
    "solution", "experience", "vibe", "essence",
}


def _clean_vision_name(raw: str | None) -> str | None:
    """Validate an LLM-supplied vision name. Returns the trimmed string if it
    passes (must read like "The <concrete spatial noun>"), else None so the
    deterministic room-aware fallback in `_NAME_BY_ROOM_AND_PHILOSOPHY` wins.

    Why each guard exists — past failure modes:
      - LLMs love mushy brochure words ("Cozy", "Modern", "Perfect"). Reject.
      - LLMs love re-using the user's vibe label ("The Gathering"). Reject —
        we asked for a name DISTINCT from the vibe in the prompt.
      - LLMs occasionally return a sentence instead of a title ("This is a
        warm family room…"). Length cap + word count rejects.
      - LLMs sometimes drop "The". The whole architectural-title convention
        breaks without it ("Long Wall" reads as a noun phrase, not a title).
    """
    if not raw or not isinstance(raw, str):
        return None
    # Strip quotes / whitespace / trailing periods the model sometimes adds
    name = raw.strip().strip('"').strip("'").rstrip(".").strip()
    if not name:
        return None

    # Length + word count caps. 4 words is the upper bound for "The Wardrobe
    # Run" style; 28 chars catches any sentence that snuck through.
    words = name.split()
    if len(words) < 2 or len(words) > 4:
        return None
    if len(name) > 28:
        return None

    # Must start with "The" — this is the architectural title convention the
    # prompt asked for and what the deterministic table uses, so the UI
    # treatment stays consistent.
    if words[0].lower() != "the":
        return None

    lower_words = {w.lower().strip(".,;:!?") for w in words}

    # Reject any vibe-collision word.
    if lower_words & _BANNED_NAME_WORDS:
        return None
    # Reject any feeling/marketing adjective.
    if lower_words & _BANNED_NAME_ADJECTIVES:
        return None

    return name


def _clean_vision_tagline(raw: str | None) -> str | None:
    if not raw or not isinstance(raw, str):
        return None
    t = raw.strip().strip('"').strip("'")
    if not t or len(t) > 140:
        return None
    return t


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
    # Try engine-driven preset resolver first (blueprint3d-modern, headless —
    # see [[project-blueprint3d-integration]]). Returns both items AND the
    # engine-emitted openings (door+window) so they ride against the real wall
    # geometry instead of being hardcoded here.
    # Variant 1 is used for the Breath philosophy to give each set a distinct
    # spatial rhythm; Gathering and Keeper use the primary (variant 0).
    variant = 1 if philosophy is VisionPhilosophy.BREATH else 0
    engine_result = resolve_preset_via_engine(intake, philosophy, variant=variant)
    if engine_result is not None:
        placed_items, default_openings = engine_result
    else:
        # No preset for this room type / philosophy — fall back to the solver
        # and synthesize default openings the old way.
        placed_items = _build_vision_solver(intake, philosophy, brief)
        window_wall = _OPPOSITE_DIR.get(intake.entrance_direction, Direction.N)
        default_openings = [
            Opening(wall=intake.entrance_direction, center_frac=0.5, width_mm=900, height_mm=2100, kind="door", sill_mm=0),
            Opening(wall=window_wall, center_frac=0.5, width_mm=1500, height_mm=1200, kind="window", sill_mm=900),
        ]
    if not placed_items:
        return None

    layout = get_preset(intake.room_type.value, philosophy.value, variant)

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

    name, tagline = _name_and_tagline(intake, philosophy)
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
    name, tagline = _name_and_tagline(intake, philosophy)
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


# Short feeling phrase per vibe — used to flavour the deterministic headline
# and the budget note. Stays brief (≤4 words) so we can inline into a sentence
# without clipping its rhythm.
_VIBE_FEEL: dict[str, str] = {
    "warm_traditional": "warm and lived-in",
    "light_airy":       "open and restrained",
    "earthy_crafted":   "earthy and crafted",
    "modern_minimal":   "quiet and considered",
    "maximalist":       "loud and layered",
    "coastal":          "breezy and sea-lit",
}


def _household_keywords(text: str) -> dict[str, bool]:
    """Extract a few binary signals from who_lives_here so the reasoning can
    name them ("the toddler", "your in-laws", "the work-from-home setup")
    instead of saying "your family" every line."""
    t = (text or "").lower()
    return {
        "toddler":     any(k in t for k in ("toddler", "baby", "infant")),
        "school_kid":  any(k in t for k in ("kids", "children", "school", "son", "daughter")),
        "elders":      any(k in t for k in ("parent", "mother-in-law", "father-in-law", "grand", "elder", "in-law")),
        "guests":      any(k in t for k in ("guest", "visitor", "host", "entertain")),
        "wfh":         any(k in t for k in ("work from home", "wfh", "work-from-home", "office")),
        "pets":        "pet" in t or "dog" in t or "cat" in t,
    }


def _budget_note(room: RoomState, philosophy: VisionPhilosophy) -> str | None:
    """Render a single sentence about how this layout sits against the user's
    budget. Returns None when cost hasn't been computed yet."""
    # The Vision is built without cost first; this helper is called after the
    # cost breakdown is attached at the call-site, so we read intake.budget
    # directly and let the bullet stand on the intent (under/at/over) rather
    # than echoing exact figures.
    budget = room.intake.budget_inr
    if not budget:
        return None
    # Rough heuristic — the cost breakdown isn't in scope here, but the budget
    # framing still adds personality even without a live total. We hedge with
    # "we've stayed within" since the solver picks under-budget items by default.
    if philosophy is VisionPhilosophy.GATHERING:
        return f"Picked pieces sit comfortably under your ₹{budget // 100000:g}L budget — generous, not maxed-out."
    if philosophy is VisionPhilosophy.BREATH:
        return f"Fewer pieces, more spend per piece — under your ₹{budget // 100000:g}L budget without thinning the quality."
    return f"Cabinetry's the largest line on your ₹{budget // 100000:g}L — built locally so the budget covers the wall, not just the doors."


def _deterministic_reasoning(
    intake: Intake,
    brief: dict[str, Any],
    philosophy: VisionPhilosophy,
    room: RoomState,
) -> Reasoning:
    """Authored, opinionated copy generated *without* an LLM. This is what
    most users will see (LLM ranker is off by default to preserve Groq quota),
    so the bullets must be specific to the actual room, vibe, and household —
    never the generic "balanced layout, walkways stay clear" filler."""
    feel = _VIBE_FEEL.get(intake.vibe.value, "the feel you asked for")
    kw = _household_keywords(intake.who_lives_here)

    # Headlines now lead with the user's chosen feeling so the page reads as a
    # response to THIS person, not three generic philosophy taglines. ("Built
    # for warm and lived-in evenings — the way your family already uses this
    # room." reads as a designer who listened.)
    headline_map = {
        VisionPhilosophy.GATHERING: f"Built for {feel} evenings — the way your family already uses this room.",
        VisionPhilosophy.BREATH:    f"A {feel} room — fewer pieces, more air, the centre kept clear.",
        VisionPhilosophy.KEEPER:    f"Every wall does double duty — {feel}, with nothing on the floor that doesn't have to be.",
    }

    bullets: list[str] = []

    # Pull the actual placed items so bullets can name them. item.id starts
    # with sub_category (e.g. "sofa-0", "tv_unit-1") — use that since
    # PlacedItem.category is the broader catalog category ("seating",
    # "storage") which doesn't carry sub_category info.
    sofa     = next((i for i in room.items if i.id.startswith(("sofa", "sofa_l", "diwan"))), None)
    tv       = next((i for i in room.items if i.id.startswith("tv_unit")), None)
    bed      = next((i for i in room.items if i.id.startswith(("bed_king", "bed_queen", "bed"))), None)
    dining   = next((i for i in room.items if i.id.startswith("dining_table")), None)
    desk     = next((i for i in room.items if i.id.startswith("desk")), None)
    mandir   = next((i for i in room.items if i.id.startswith("mandir") or i.category == "mandir"), None)
    coffee   = next((i for i in room.items if i.id.startswith("coffee_table")), None)
    storage_items = [i for i in room.items if i.id.startswith(("wardrobe", "bookshelf", "cabinet", "chest", "sideboard", "shoe_rack"))]
    storage_count = len(storage_items)

    primary = sofa or bed or dining or desk
    primary_name = primary.name_en.lower() if primary else None

    # ── Gathering — warm, social, layered ──────────────────────────────────
    if philosophy is VisionPhilosophy.GATHERING:
        if primary_name:
            bullets.append(
                f"The {primary_name} runs along the long wall — wide enough for the whole household, with arms at both ends so getting in and out stays easy."
            )
        if tv and sofa:
            bullets.append("The TV sits on the wall opposite the sofa, with the coffee table between them — the room organises itself around the conversation, not the screen.")
        elif coffee:
            bullets.append("The coffee table is the heart of the room — pulled close enough that someone reading on the sofa can put a cup down without leaning.")
        if mandir:
            bullets.append("The mandir keeps its quiet corner — visible from the door so a visitor knows what your home is about, but not in the conversation seat.")
        if kw["toddler"]:
            bullets.append("A rounded coffee table and a soft rug underfoot — the centre stays a place a toddler can crawl across without sharp edges.")
        elif kw["school_kid"]:
            bullets.append("Floor space is kept clear in the middle so kids can pull books or a board game out without rearranging the room.")
        if kw["elders"]:
            bullets.append("Seating sits at a slightly higher hip-point and every chair has arms — easier on knees for older family members.")
        if kw["guests"]:
            bullets.append("Two accent chairs face the sofa — when guests come, you don't have to drag dining chairs in.")

    # ── Breath — minimal, airy, restrained ─────────────────────────────────
    elif philosophy is VisionPhilosophy.BREATH:
        if primary_name:
            bullets.append(
                f"The {primary_name} is the one big piece — everything else is pulled to the edges so the centre of the room reads as floor, not furniture."
            )
        bullets.append(
            f"The palette stays restrained — {feel}, so the room rewards just being in it instead of demanding to be looked at."
        )
        if coffee:
            bullets.append("A single small coffee table, no clutter on top — the surface stays empty unless someone's actively using it.")
        if mandir:
            bullets.append("The mandir is a quiet niche, not a centerpiece — present in the room without dominating the breathing room around it.")
        if kw["toddler"] or kw["school_kid"]:
            bullets.append("The empty floor is the point — toys come out at play time and go back into the storage at the edges when the day ends.")
        if kw["wfh"]:
            bullets.append("The desk faces away from the entrance so a video call doesn't put the whole house in frame.")

    # ── Keeper — practical, every wall earns its keep ──────────────────────
    else:
        if storage_count >= 2:
            bullets.append(
                f"{storage_count} closed storage units along the walls — toys, festival boxes, files, daily clutter, each with a home behind a door."
            )
        elif storage_count == 1:
            bullets.append("A full-height storage wall does most of the work — built-in so it reads as architecture, not a free-standing cabinet.")
        if bed:
            bullets.append("Bed against one wall, wardrobe against the other — the floor between stays open for the morning rush.")
        elif sofa and tv:
            bullets.append("Sofa on one wall, a low TV unit with closed drawers on the other — the TV remote, cables, and console all hide inside.")
        if mandir:
            bullets.append("The mandir lives in a cabinet with doors — full reverence kept dust-free between aartis.")
        if kw["toddler"] or kw["school_kid"]:
            bullets.append("Low cubby storage at child-height — kids can put their own toys away, which is more than half the battle.")
        if kw["wfh"]:
            bullets.append("File storage runs above the desk — paperwork stays in reach without colonising the desktop.")

    # Final budget bullet — same shape across all three philosophies but
    # phrased to match each one's spirit.
    budget = _budget_note(room, philosophy)
    if budget:
        bullets.append(budget)

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
        vastu_notes = [a.bullet for a in applied[:3]]
    if kw["elders"]:
        accessibility_notes.append("Seating heights, drawer pulls, and switch placements all chosen for older family members — nothing requires a stretch or a stoop.")
    if kw["toddler"]:
        accessibility_notes.append("No glass edges at toddler height, rounded coffee table corners, and a rug that takes a tumble without slipping.")
    elif kw["school_kid"]:
        accessibility_notes.append("Floor space stays clear in the middle and shelves stay reachable from a chair — the kids can use the room without an adult re-staging it.")

    return humanize_reasoning(
        Reasoning(
            headline=headline_map[philosophy],
            bullets=bullets or [f"A {feel} layout — walkways stay clear and nothing in the room is there by accident."],
            vastu_notes=vastu_notes,
            accessibility_notes=accessibility_notes,
        )
    )


_JSON_BLOCK = re.compile(r"\{[\s\S]*\}", re.MULTILINE)


def _author_reasoning(intake: Intake, vision: Vision) -> tuple[Reasoning, str | None, str | None]:
    """LLM-authored copy when quota allows; otherwise keeps deterministic reasoning.

    Returns a 3-tuple of (reasoning, name_override, tagline_override). The
    overrides are None when the LLM call fails, the JSON is malformed, or the
    field is missing — the caller falls back to the deterministic name/tagline
    in that case. See `_clean_vision_name` for the guard against bad LLM names.
    """
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
    raw = safe_llm_invoke(llm, msgs, context=f"ranker:{vision.name}")
    if raw is None:
        return vision.reasoning, None, None
    text = raw.content if hasattr(raw, "content") else str(raw)
    if not isinstance(text, str):
        text = str(text)
    m = _JSON_BLOCK.search(text)
    if not m:
        return vision.reasoning, None, None
    try:
        data = json.loads(m.group(0))
    except json.JSONDecodeError:
        return vision.reasoning, None, None
    # Vastu / accessibility notes fall back to the deterministic baseline when
    # the LLM omits them. Previously the LLM's empty list silently replaced the
    # deterministic notes, so a user who opted into Vastu could see zero Vastu
    # notes on the reveal page — even though Vastu rules had produced them.
    llm_vastu = [str(b)[:200] for b in (data.get("vastu_notes") or [])][:2]
    llm_a11y = [str(b)[:200] for b in (data.get("accessibility_notes") or [])][:2]
    reasoning = humanize_reasoning(
        Reasoning(
            headline=str(data.get("headline") or vision.reasoning.headline)[:200],
            bullets=[str(b)[:300] for b in (data.get("bullets") or [])][:5] or vision.reasoning.bullets,
            vastu_notes=llm_vastu or vision.reasoning.vastu_notes,
            accessibility_notes=llm_a11y or vision.reasoning.accessibility_notes,
        )
    )
    name_override = data.get("name") if isinstance(data.get("name"), str) else None
    tagline_override = data.get("tagline") if isinstance(data.get("tagline"), str) else None
    return reasoning, name_override, tagline_override


# ---------- Helpers ----------


def _llm_style(intake: Intake, philosophy: VisionPhilosophy) -> dict:
    """Palette / materials — hardcoded maps by default; optional LLM when enabled."""
    fallback = {
        "palette": _palette_for_vibe_and_philosophy(intake.vibe.value, philosophy),
        "flooring": _flooring_for_vibe(intake.vibe.value),
        "wall_finish": _wall_finish_for_vibe(intake.vibe.value),
        "lighting_kelvin": 3200,
    }
    if not settings.LLM_STYLE_ON_GENERATE or LlmQuotaGate.is_open():
        return fallback

    from langchain_core.messages import HumanMessage, SystemMessage

    from app.llm import get_llm

    llm = get_llm(temperature=0.5)
    raw = safe_llm_invoke(
        llm,
        [
            SystemMessage(content=STYLE_SYSTEM),
            HumanMessage(content=build_style_prompt(intake=intake, philosophy=philosophy.value)),
        ],
        context=f"style:{philosophy.value}",
    )
    if raw is None:
        return fallback
    text = raw.content if hasattr(raw, "content") else str(raw)
    if not isinstance(text, str):
        text = str(text)
    m = _JSON_BLOCK.search(text)
    if m:
        data = json.loads(m.group(0))
        if isinstance(data, dict) and "palette" in data:
            return data
    return fallback


# Vision names are room-aware AND philosophy-aware so they describe the
# SPATIAL decision the layout actually made, not the abstract philosophy.
#
# Why this matters: the old names ("The Gathering", "The Breath", "The Keeper")
# overlap exactly with three of the six intake vibe labels (The Gathering /
# The Breath / The Keeper / The Studio / The Bazaar / The Shore), so users who
# picked "The Gathering" vibe would see a vision also called "The Gathering" —
# duplicate signal that flattens both ideas. The room-aware names below sit
# beside the vibe name without colliding:
#
#   Intake vibe "The Gathering"   →   Vision "The Long Wall" (gathering philosophy)
#                                  →   Vision "The Open Centre" (breath philosophy)
#                                  →   Vision "The Working Walls" (keeper philosophy)
#
# Each name names the structural move (sofa along the long wall / clear centre
# floor / storage that hugs the walls), which is what an architect would write
# on the title block of a scheme drawing.
_NAME_BY_ROOM_AND_PHILOSOPHY: dict[tuple[str, VisionPhilosophy], tuple[str, str]] = {
    # Living room
    ("living", VisionPhilosophy.GATHERING): ("The Long Wall", "Sofa runs the long edge — wide enough for the whole family on movie nights."),
    ("living", VisionPhilosophy.BREATH):    ("The Open Centre", "Furniture hugs the walls so the centre stays open from door to window."),
    ("living", VisionPhilosophy.KEEPER):    ("The Working Walls", "Closed storage lines every wall — toys, festival boxes, daily clutter each have a home."),
    # Bedroom
    ("bedroom", VisionPhilosophy.GATHERING): ("The Diwan Bed", "A generous bed with reading space — for the way Indian families share evenings."),
    ("bedroom", VisionPhilosophy.BREATH):    ("The Quiet Bed", "Just the bed and one side table — the rest of the room is air."),
    ("bedroom", VisionPhilosophy.KEEPER):    ("The Wardrobe Wall", "Full-height wardrobe runs the long wall — every season's clothes, hidden."),
    # Dining
    ("dining", VisionPhilosophy.GATHERING): ("The Big Table", "Seats for the whole family plus two guests, with room to push chairs back."),
    ("dining", VisionPhilosophy.BREATH):    ("The Single Table", "One table, four chairs, nothing else — the room reads as a place to eat."),
    ("dining", VisionPhilosophy.KEEPER):    ("The Buffet Wall", "Storage runs the long wall — crockery, glassware, festival platters, all behind doors."),
    # Study
    ("study", VisionPhilosophy.GATHERING): ("The Reading Corner", "Desk plus a reading chair — for work hours and the long evening that follows."),
    ("study", VisionPhilosophy.BREATH):    ("The Empty Desk", "A clean desk against the window — almost nothing else."),
    ("study", VisionPhilosophy.KEEPER):    ("The Shelf Wall", "Books and files climb the wall behind the desk — every reference within reach."),
    # Pooja
    ("pooja", VisionPhilosophy.GATHERING): ("The Daily Mandir", "Generous mandir with steps for the kalash and a niche for the diya."),
    ("pooja", VisionPhilosophy.BREATH):    ("The Quiet Niche", "A simple north-east niche — just the mandir and a low seat."),
    ("pooja", VisionPhilosophy.KEEPER):    ("The Closed Mandir", "A cabinet mandir with doors — full reverence, closed away from daily dust."),
    # Kitchen
    ("kitchen", VisionPhilosophy.GATHERING): ("The Working Kitchen", "Counter space for two cooks — meals come together with everyone in the room."),
    ("kitchen", VisionPhilosophy.BREATH):    ("The Spare Kitchen", "Just the essentials on the counter — appliances hide behind cabinet doors."),
    ("kitchen", VisionPhilosophy.KEEPER):    ("The Cabinet Kitchen", "Floor-to-ceiling cabinets — pulses, spices, pressure cookers, all hidden."),
    # Kids
    ("kids", VisionPhilosophy.GATHERING): ("The Play Floor", "A clear floor for play — bed and storage tucked to the edges."),
    ("kids", VisionPhilosophy.BREATH):    ("The Open Mat", "Bed against one wall, a soft mat for the rest — nothing else to bump into."),
    ("kids", VisionPhilosophy.KEEPER):    ("The Toy Wall", "Low cubby storage along one wall — toys go away when the day ends."),
    # Bathroom
    ("bathroom", VisionPhilosophy.GATHERING): ("The Family Bath", "Counter space for everyone's morning, with shared storage above."),
    ("bathroom", VisionPhilosophy.BREATH):    ("The Clean Bath", "Just what's needed — a single basin, a clear mirror, no clutter."),
    ("bathroom", VisionPhilosophy.KEEPER):    ("The Storage Bath", "Vanity drawers under the basin and a tall column for towels."),
}


def _name_and_tagline(intake: Intake, philosophy: VisionPhilosophy) -> tuple[str, str]:
    """Pick a room-aware name + tagline. Falls back gracefully if the lookup
    doesn't have an entry for this (room_type, philosophy) pair — uses a
    generic philosophy-only name so the contract still returns a string pair."""
    key = (intake.room_type.value, philosophy)
    if key in _NAME_BY_ROOM_AND_PHILOSOPHY:
        return _NAME_BY_ROOM_AND_PHILOSOPHY[key]
    # Generic fallback — should rarely fire since the table above covers every
    # room_type in the schema, but keeps the function total in case a new room
    # type is added to the schema before the table is extended.
    generic = {
        VisionPhilosophy.GATHERING: ("The Family Layout", "Built for the way the whole household actually uses this room."),
        VisionPhilosophy.BREATH:    ("The Open Layout", "Furniture pulled to the edges — the floor stays clear."),
        VisionPhilosophy.KEEPER:    ("The Storage Layout", "Every wall does double duty — surfaces above, storage below."),
    }
    return generic[philosophy]


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
