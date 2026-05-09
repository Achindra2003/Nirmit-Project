"""LangGraph workflow that turns an Intake into up to three Visions.

Nodes (per VISION.md "The Backend — LangChain / LangGraph"):

  Room Interpreter  →  Furniture Selector  →  Layout Generator  →  Ranker + Explainer

Each node is testable in isolation. The graph state is a single TypedDict so
intermediate values stay introspectable. Phase 1 ships skeleton implementations
that return realistic mock data; the real selector and solver are filled in
during Phase 2.
"""
from __future__ import annotations

import uuid
from typing import TypedDict

from langgraph.graph import END, StateGraph

from app.domain.costing import build_cost_breakdown
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


class GenerateState(TypedDict, total=False):
    intake: Intake
    design_brief: dict
    candidate_skus: list[str]
    visions: list[Vision]


# ---------- Nodes ----------


def _interpret(state: GenerateState) -> GenerateState:
    """Read intake, build a structured design brief.

    Phase 1: trivial pass-through. Phase 2: LLM-backed inference of unstated
    constraints (e.g. parse `who_lives_here` for elderly / kids markers).
    """
    intake = state["intake"]
    return {
        **state,
        "design_brief": {
            "room_type": intake.room_type.value,
            "vibe": intake.vibe.value,
            "budget_inr": intake.budget_inr,
            "vastu_matters": intake.vastu_matters,
        },
    }


def _select(state: GenerateState) -> GenerateState:
    """Filter the catalog to candidate items.

    Phase 1: empty list — visions are constructed from inline fixtures below.
    Phase 2: real catalog query via app.domain.catalog.repository.
    """
    return {**state, "candidate_skus": []}


def _layout(state: GenerateState) -> GenerateState:
    """Place items in the room, producing 3 visions with distinct philosophies.

    Phase 1: returns one fixture vision so the frontend can render. The solver
    plumbing in app/domain/solver/ is filled in next.
    """
    intake = state["intake"]
    visions = [_fixture_vision(intake, VisionPhilosophy.GATHERING)]
    return {**state, "visions": visions}


def _rank_and_explain(state: GenerateState) -> GenerateState:
    """Score visions, generate the 'why this was made for you' text.

    Phase 1: pass-through. Phase 2: LLM-backed reasoning that references the
    user's specific intake answers.
    """
    return state


# ---------- Graph wiring ----------


def build_generate_graph():
    g = StateGraph(GenerateState)
    g.add_node("interpret", _interpret)
    g.add_node("select", _select)
    g.add_node("layout", _layout)
    g.add_node("rank", _rank_and_explain)
    g.set_entry_point("interpret")
    g.add_edge("interpret", "select")
    g.add_edge("select", "layout")
    g.add_edge("layout", "rank")
    g.add_edge("rank", END)
    return g.compile()


# ---------- Phase 1 fixture ----------


def _fixture_vision(intake: Intake, philosophy: VisionPhilosophy) -> Vision:
    """A single hand-crafted vision so the frontend has something real to render."""
    room_id = f"room_{uuid.uuid4().hex[:8]}"

    sofa = PlacedItem(
        id="sofa-1",
        catalog=CatalogRef(sku="SOFA-3SEAT-LIN", asset_url="sofa_3seat.glb"),
        name_en="3-Seater Sofa",
        name_hi="तीन-सीटर सोफा",
        category="sofa",
        dimensions=Dimensions(width_mm=2100, depth_mm=900, height_mm=850),
        position=Position(x_mm=600, z_mm=intake.room_dimensions.depth_mm - 1100, rotation_deg=0),
        facing=Direction.N,
        is_buy=True,
        price_inr=42_000,
        build_price_inr=28_000,
    )
    coffee = PlacedItem(
        id="coffee-1",
        catalog=CatalogRef(sku="COFFEE-RECT-TEAK", asset_url="bench.glb"),
        name_en="Coffee Table",
        name_hi="कॉफी टेबल",
        category="coffee_table",
        dimensions=Dimensions(width_mm=1100, depth_mm=550, height_mm=400),
        position=Position(
            x_mm=1100,
            z_mm=intake.room_dimensions.depth_mm - 2200,
            rotation_deg=0,
        ),
        is_buy=False,
        price_inr=9_000,
        build_price_inr=9_000,
    )
    tv_unit = PlacedItem(
        id="tv-1",
        catalog=CatalogRef(sku="TV-UNIT-160", asset_url="tv_unit.glb"),
        name_en="TV Unit",
        name_hi="टीवी यूनिट",
        category="tv_unit",
        dimensions=Dimensions(width_mm=1600, depth_mm=450, height_mm=550),
        position=Position(x_mm=600, z_mm=200, rotation_deg=180),
        is_buy=False,
        price_inr=14_000,
        build_price_inr=9_000,
    )
    mandir = PlacedItem(
        id="mandir-1",
        catalog=CatalogRef(sku="POOJA-WALL-NE", asset_url="pooja_wall.glb"),
        name_en="Pooja Unit",
        name_hi="पूजा स्थान",
        category="mandir",
        dimensions=Dimensions(width_mm=600, depth_mm=300, height_mm=900),
        position=Position(x_mm=intake.room_dimensions.width_mm - 800, z_mm=300, rotation_deg=90),
        facing=Direction.E,
        is_buy=False,
        price_inr=11_000,
        build_price_inr=7_500,
    )

    items = [sofa, coffee, tv_unit, mandir]
    room = RoomState(
        id=room_id,
        intake=intake,
        items=items,
        palette={"wall": "#EDE6D8", "floor": "#B89B7A", "accent": "#7A5C3A"},
        flooring="warm oak",
        wall_finish="off-white limewash",
    )
    cost = build_cost_breakdown(room)
    reasoning = Reasoning(
        headline="Built for your family's evenings together.",
        bullets=[
            "Sofa anchors the long wall so the whole family can fit on movie nights.",
            "TV unit sits on the entrance wall — clean entrance view for guests.",
            "Coffee table is small and rounded so your four-year-old has clear floor space."
            if "kid" in intake.who_lives_here.lower()
            else "Coffee table is small and rounded — easy circulation around the sofa.",
        ],
        vastu_notes=(
            ["Mandir placed in the northeast corner facing east, where it gets morning light."]
            if intake.vastu_matters
            else []
        ),
        accessibility_notes=(
            ["Sofa height is 850mm with arms on both sides — easy stand-up for older guests."]
            if "mother" in intake.who_lives_here.lower() or "grand" in intake.who_lives_here.lower()
            else []
        ),
    )
    return Vision(
        id=f"vision_{uuid.uuid4().hex[:8]}",
        philosophy=philosophy,
        name="The Gathering",
        tagline="Built for your family's evenings together.",
        room_state=room,
        reasoning=reasoning,
        cost=cost,
    )
