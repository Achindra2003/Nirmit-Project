"""Catalog domain types. Independent of the API contract — these are internal."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.state import Dimensions, RoomType, Vibe


class CatalogItem(BaseModel):
    model_config = ConfigDict(extra="ignore", frozen=True)

    sku: str
    asset_url: str
    name_en: str
    name_hi: str | None = None
    category: str
    sub_category: str | None = None
    rooms: list[RoomType] = Field(default_factory=list)
    vibes: list[Vibe] = Field(default_factory=list)
    dimensions: Dimensions
    price_inr: int = Field(ge=0)
    build_price_inr: int | None = None
    materials: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    # Render hints carried through to the frontend so a single .glb can be
    # tinted / surfaced differently per SKU (catalog of 3k items, ~80 actual
    # 3D meshes — variants share the GLB and differentiate via material/tint).
    tint_hex: str | None = None
    size_label: str | None = None
    material_label: str | None = None
    finish_label: str | None = None
    roughness_hint: float | None = None
    front_clearance_mm: int = 600
    # How the renderer should position the item on the Y axis.
    # "floor"   — bottom of mesh sits on y=0 (the floor). Default.
    # "ceiling" — bottom sits at roomHeight - itemHeight (hangs from ceiling).
    # "wall"    — bottom sits at assetTuning.yNudge metres above the floor
    #             (yNudge encodes the mount height for each wall item).
    placement_type: Literal["floor", "wall", "ceiling"] = "floor"


class CatalogQuery(BaseModel):
    """A structured catalog query emitted by the Furniture Selector node."""

    model_config = ConfigDict(extra="forbid")

    category: str | None = None
    room: RoomType | None = None
    vibe: Vibe | None = None
    max_price_inr: int | None = None
    max_width_mm: int | None = None
    max_depth_mm: int | None = None
    tags_any: list[str] = Field(default_factory=list)
    limit: int = 12
