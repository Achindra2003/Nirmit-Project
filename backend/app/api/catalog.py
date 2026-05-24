"""GET /catalog — furniture menu for the planner's "add" drawer.

When `philosophy` is supplied alongside `room_type`, returns the curated menu
for that (room, philosophy) pair — the 8–16 sub_categories a designer would
reach for in a room of that character. Without `philosophy`, falls back to the
global hero catalog filtered by `room_type` (the legacy behaviour).

The drawer should always pass `philosophy` so the user sees a curated swatch
book instead of every sofa in the warehouse.
"""
from __future__ import annotations

from fastapi import APIRouter, Query

from app.domain.catalog import get_catalog
from app.domain.catalog.model import CatalogQuery
from app.domain.catalog.presets import get_menu
from app.schemas.state import RoomType, Vibe, VisionPhilosophy

router = APIRouter()


def _serialize(item) -> dict:
    return {
        "sku": item.sku,
        "name_en": item.name_en,
        "sub_category": item.sub_category,
        "category": item.category,
        "price_inr": item.price_inr,
        "build_price_inr": item.build_price_inr,
        "dimensions": {
            "width_mm": item.dimensions.width_mm,
            "depth_mm": item.dimensions.depth_mm,
            "height_mm": item.dimensions.height_mm,
        },
        "asset_url": item.asset_url,
        "materials": item.materials,
        "size_label": item.size_label,
        "material_label": item.material_label,
    }


@router.get("/catalog")
async def catalog_items(
    room_type: RoomType = Query(default=RoomType.LIVING),
    vibe: Vibe | None = Query(default=None),
    philosophy: VisionPhilosophy | None = Query(default=None),
    limit: int = Query(default=60, ge=1, le=200),
) -> dict:
    # ── Curated path: per-philosophy menu, ordered as declared in menus.py ──
    if philosophy is not None:
        menu = get_menu(room_type.value, philosophy.value)
        if menu:
            items = list(menu.values())[:limit]
            return {"items": [_serialize(i) for i in items], "source": "curated"}

    # ── Fallback: legacy hero catalog filtered by room_type (+ vibe) ──
    repo = get_catalog()
    q = CatalogQuery(room=room_type, vibe=vibe, limit=limit)
    items = repo.query(q)
    if len(items) < 6:
        items = repo.query(CatalogQuery(room=room_type, limit=limit))
    return {"items": [_serialize(i) for i in items], "source": "hero"}
