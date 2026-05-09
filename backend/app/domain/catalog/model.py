"""Catalog domain types. Independent of the API contract — these are internal."""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.state import Dimensions, RoomType, Vibe


class CatalogItem(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

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
