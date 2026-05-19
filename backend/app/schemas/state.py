"""The State Contract — the JSON shape that flows between Brain and Face.

This file is the single source of truth for the API surface. Every endpoint
reads and writes models defined here. TypeScript types for the frontend are
generated from these schemas (see shared/contracts/).

Spatial integrity: all dimensions are millimeters. Non-mm values are rejected
at the schema boundary, not deeper in the code.
"""
from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=False)


class RoomType(str, Enum):
    LIVING = "living"
    BEDROOM = "bedroom"
    KITCHEN = "kitchen"
    DINING = "dining"
    POOJA = "pooja"
    STUDY = "study"
    BATHROOM = "bathroom"
    KIDS = "kids"


class Vibe(str, Enum):
    """Vibe is selected via image, not label. The id maps to a tap on a real photograph."""

    WARM_TRADITIONAL = "warm_traditional"
    MODERN_MINIMAL = "modern_minimal"
    EARTHY_CRAFTED = "earthy_crafted"
    LIGHT_AIRY = "light_airy"
    MAXIMALIST = "maximalist"
    COASTAL = "coastal"


class Direction(str, Enum):
    """Cardinal directions for Vastu reasoning. Stored on the room and on items that face."""

    N = "N"
    NE = "NE"
    E = "E"
    SE = "SE"
    S = "S"
    SW = "SW"
    W = "W"
    NW = "NW"


class Dimensions(StrictModel):
    """All values in millimeters."""

    width_mm: int = Field(gt=0, description="X-axis extent")
    depth_mm: int = Field(gt=0, description="Z-axis extent")
    height_mm: int = Field(default=2700, gt=0, description="Y-axis extent; defaults to standard 9ft ceiling")


class Position(StrictModel):
    """Position of the item's footprint CENTRE inside the room, in room-local mm.

    Convention: room coordinates run 0..width_mm on x and 0..depth_mm on z.
    (x_mm, z_mm) is the centre of the item's footprint; `rotation_deg` rotates
    the footprint about that centre. The frontend renders the room centred on
    the world origin and places each item at (x_mm - width/2, z_mm - depth/2)
    within that frame.
    """

    x_mm: int
    z_mm: int
    rotation_deg: float = Field(
        default=0.0, ge=-360.0, le=360.0, description="Clockwise rotation about Y, around the footprint centre"
    )


class Opening(StrictModel):
    """A door or window opening in a wall. Used by the frontend to render gaps
    and by the solver to enforce entrance clearance."""

    wall: Direction
    center_frac: float = Field(default=0.5, ge=0.0, le=1.0, description="0=left edge of wall, 1=right edge")
    width_mm: int = Field(gt=0)
    height_mm: int = Field(gt=0)
    kind: Literal["door", "window"]
    sill_mm: int = Field(default=0, ge=0, description="Floor-to-bottom of opening (0 for doors, ~900 for windows)")


class CatalogRef(StrictModel):
    """A reference to an item in the catalog. Resolved by the catalog service."""

    sku: str
    asset_url: str = Field(description="Path under frontend /models/, e.g. 'sofa_3seat.glb'")
    tint_hex: str | None = Field(
        default=None,
        description="Hex color the renderer should tint the GLB with — drives material variation",
    )
    roughness_hint: float | None = Field(
        default=None,
        description="0..1 roughness override for the renderer; matches the finish",
    )
    size_label: str | None = None
    material_label: str | None = None
    finish_label: str | None = None


class PlacedItem(StrictModel):
    """A piece of furniture placed in the room."""

    id: str = Field(description="Stable id within this RoomState — frontend uses this for selection")
    catalog: CatalogRef
    name_en: str
    name_hi: str | None = None
    category: str = Field(description="sofa, bed, wardrobe, mandir, ...")
    dimensions: Dimensions
    position: Position
    facing: Direction | None = None
    is_buy: bool = Field(
        default=True,
        description="True = ready product (Pepperfry/etc), False = carpenter build",
    )
    price_inr: int = Field(ge=0, description="Final price in rupees, no decimals")
    build_price_inr: int | None = Field(
        default=None,
        description="Carpenter-built equivalent price, if a build path exists",
    )


# ---------- Intake ----------


class Intake(StrictModel):
    """The four-question intake (VISION.md: 'Less Is the Answer').

    Everything else gets discovered through the design, not asked upfront.
    """

    room_type: RoomType
    room_dimensions: Dimensions
    entrance_direction: Direction = Field(
        description="Which wall the entrance is on — needed for Vastu and the reveal angle"
    )
    who_lives_here: str = Field(
        min_length=2,
        max_length=400,
        description="Free-text, one open question. e.g. 'family with kids and grandmother visits often'",
    )
    vibe: Vibe = Field(description="Tapped from a 4-image grid")
    budget_inr: int = Field(ge=10_000, le=50_000_000)
    keep_existing: str | None = Field(
        default=None,
        max_length=400,
        description="Optional: 'one thing in your current home you love and want to keep'",
    )
    vastu_matters: bool = Field(
        default=False,
        description="Single bool — the AI surfaces Vastu reasoning when true",
    )
    city: str = Field(
        default="Mumbai",
        description="City for BOQ labour-rate lookup (Mumbai, Bangalore, Delhi, etc.)",
    )

    @field_validator("room_dimensions")
    @classmethod
    def _reject_unrealistic_room(cls, v: Dimensions) -> Dimensions:
        if v.width_mm < 1500 or v.depth_mm < 1500:
            raise ValueError("Room is too small (<1.5m on a side). Did you pass meters by mistake?")
        if v.width_mm > 30_000 or v.depth_mm > 30_000:
            raise ValueError("Room is over 30m on a side. Likely a unit error.")
        return v


# ---------- Room State ----------


class RoomState(StrictModel):
    """The complete description of a designed room. The frontend renders this verbatim."""

    id: str
    intake: Intake
    items: list[PlacedItem] = Field(default_factory=list)
    palette: dict[str, str] = Field(
        default_factory=dict,
        description="Color tokens — wall, floor, accent. Hex strings.",
    )
    flooring: str | None = None
    wall_finish: str | None = None
    lighting_kelvin: int = Field(
        default=3200,
        ge=2200,
        le=6500,
        description="Lighting colour temperature in Kelvin. Drives the 3D scene's sun warmth.",
    )

    @field_validator("lighting_kelvin", mode="before")
    @classmethod
    def _coerce_kelvin(cls, v: object) -> int:
        if isinstance(v, float):
            return int(round(v))
        return v  # type: ignore[return-value]
    openings: list[Opening] = Field(
        default_factory=list,
        description="Door and window openings in the room walls. Drives 3D gap rendering and solver clearance.",
    )


# ---------- Reasoning ----------


class Reasoning(StrictModel):
    """The 'why this was made for you' explanation that ships with every vision."""

    headline: str = Field(description="One warm line, e.g. 'Built for your family's evenings together'")
    bullets: list[str] = Field(
        default_factory=list,
        description="3-5 specific reasons referencing user's intake. e.g. 'We put the mandir in the NE corner because Vastu matters to your family.'",
    )
    vastu_notes: list[str] = Field(default_factory=list)
    accessibility_notes: list[str] = Field(
        default_factory=list,
        description="e.g. arms on the chair for the grandmother",
    )


# ---------- Cost ----------


class CostLineItem(StrictModel):
    item_id: str
    name: str
    category: str
    price_inr: int
    build_alternative_inr: int | None = None
    is_buy: bool


class BudgetStory(StrictModel):
    """Cost framed as a story, not a meter (VISION.md: 'A Companion, Not a Meter')."""

    total_inr: int
    budget_inr: int
    remaining_inr: int = Field(description="Negative if over budget")
    livspace_comparison_pct: int = Field(
        description="Approximate percentage of a comparable Livspace quote — anchor reference"
    )
    headline: str = Field(description="Warm one-liner — never red, never alarming")


class CostBreakdown(StrictModel):
    story: BudgetStory
    line_items: list[CostLineItem]


# ---------- Visions ----------


class VisionPhilosophy(str, Enum):
    GATHERING = "gathering"
    BREATH = "breath"
    KEEPER = "keeper"


class Vision(StrictModel):
    """One of the (up to) three named visions returned from /generate."""

    id: str
    philosophy: VisionPhilosophy
    name: str = Field(description="e.g. 'The Gathering'")
    tagline: str = Field(description="One philosophy line shown under the room")
    room_state: RoomState
    reasoning: Reasoning
    cost: CostBreakdown


# ---------- API contracts ----------


class GenerateRequest(StrictModel):
    intake: Intake


class GenerateResponse(StrictModel):
    visions: list[Vision] = Field(min_length=1, max_length=3)


# ---------- Chat / Collaborator ----------


class IntentKind(str, Enum):
    """Coarse-grained user intents the collaborator can act on."""

    MAKE_BIGGER = "make_bigger"
    MAKE_SMALLER = "make_smaller"
    CHANGE_FABRIC = "change_fabric"
    CHANGE_FINISH = "change_finish"
    CHANGE_STYLE = "change_style"
    REMOVE = "remove"
    ADD = "add"
    MOVE = "move"
    ROTATE = "rotate"
    DUPLICATE = "duplicate"
    REPLACE = "replace"
    RECOLOR_ROOM = "recolor_room"
    MIX_FROM_VISION = "mix_from_vision"
    FREE_TEXT = "free_text"


class Intent(StrictModel):
    """A structured intent emitted by the collaborator and applied by /apply."""

    kind: IntentKind
    target_item_id: str | None = None
    parameters: dict[str, str | int | float | bool] = Field(default_factory=dict)


class ChatRequest(StrictModel):
    room_state: RoomState
    history: list[dict[str, str]] = Field(
        default_factory=list,
        description="[{role:'user'|'assistant', content:'...'}] — last ~10 turns",
    )
    message: str
    # `available_visions` is appended below the Vision class is defined.


class ChatResponse(StrictModel):
    reply: str = Field(description="The collaborator's worded response — opinionated, specific")
    intents: list[Intent] = Field(
        default_factory=list,
        description="Structured changes the collaborator wants to apply",
    )
    proposed_room_state: RoomState | None = Field(
        default=None,
        description="If the change was previewed, the new state — else null",
    )
    cost_delta_inr: int = Field(
        default=0, description="Cost change associated with proposed_room_state"
    )


# ---------- Apply ----------


class ApplyRequest(StrictModel):
    room_state: RoomState
    intents: list[Intent]


class ApplyResponse(StrictModel):
    room_state: RoomState
    cost: CostBreakdown


# ---------- Cost ----------


class CostRequest(StrictModel):
    room_state: RoomState


# ---------- Export ----------


class ExportFormat(str, Enum):
    PDF = "pdf"
    JSON = "json"


class ExportRequest(StrictModel):
    room_state: RoomState
    format: Literal["pdf", "json"] = "pdf"
    include_hindi_section: bool = True
    vision_name: str | None = None
    vision_tagline: str | None = None
    philosophy: str | None = None


class ExportResponse(StrictModel):
    """The /export endpoint returns binary PDF as a streamed response in practice;
    this model documents the JSON metadata returned alongside or as a fallback."""

    download_url: str | None = None
    bytes_b64: str | None = None
    valid_for_days: int = 30


# Wire `available_visions` after Vision is defined.
ChatRequest.model_fields["available_visions"] = ChatRequest.model_fields.get(
    "available_visions"
)
# Pydantic v2 doesn't allow late field addition; instead, redeclare via a subclass
# pattern below for clarity.


class ChatRequestWithVisions(ChatRequest):
    available_visions: list[Vision] = Field(default_factory=list)


# Re-export under the original name so downstream typing stays stable.
ChatRequest = ChatRequestWithVisions  # type: ignore[misc, assignment]
