"""GET /catalog — lightweight catalog browser for the frontend furniture drawer.

Returns hero catalog items filtered by room_type and optionally vibe.
Designed to be called on CatalogueDrawer open so the user sees real items,
not a hardcoded static list.
"""
from __future__ import annotations

from fastapi import APIRouter, Query

from app.domain.catalog import get_catalog
from app.domain.catalog.model import CatalogQuery
from app.schemas.state import RoomType, Vibe

router = APIRouter()


@router.get("/catalog")
async def catalog_items(
    room_type: RoomType = Query(default=RoomType.LIVING),
    vibe: Vibe | None = Query(default=None),
    limit: int = Query(default=60, ge=1, le=200),
) -> dict:
    repo = get_catalog()
    q = CatalogQuery(room=room_type, vibe=vibe, limit=limit)
    items = repo.query(q)
    # If vibe filtering returns too few, relax to all-vibe for that room.
    if len(items) < 6:
        q_relaxed = CatalogQuery(room=room_type, limit=limit)
        items = repo.query(q_relaxed)
    return {
        "items": [
            {
                "sku": i.sku,
                "name_en": i.name_en,
                "sub_category": i.sub_category,
                "category": i.category,
                "price_inr": i.price_inr,
                "build_price_inr": i.build_price_inr,
                "dimensions": {
                    "width_mm": i.dimensions.width_mm,
                    "depth_mm": i.dimensions.depth_mm,
                    "height_mm": i.dimensions.height_mm,
                },
                "asset_url": i.asset_url,
                "materials": i.materials,
                "size_label": i.size_label,
                "material_label": i.material_label,
            }
            for i in items
        ]
    }
