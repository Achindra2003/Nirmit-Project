"""Catalog repository — the source of truth for items the solver can place.

Switched from the procedurally-expanded `data/catalog.json` (3,628 SKUs auto-
generated with names like "Compact 2-Seater Sofa" whose dimensions actually
describe a 3-seater) to the curated `hero_catalog.HERO_ITEMS` list. The hero
items have:

  * dimensions measured directly from their GLB bounding boxes so the
    renderer's auto-fit produces a clean uniform scale (no stretching);
  * per-item `front_clearance_mm` reflecting real ergonomics (TV 1800 mm,
    sofa 900 mm, desk 1000 mm) instead of a flat 600 mm pad;
  * dining tables with their dedicated GLBs (dining_4.glb, dining_6.glb).

The big expanded catalog remains on disk as a research artefact but is no
longer the runtime source — the visual coherence of three reveal visions
matters more than 3,628 SKU variations.
"""
from __future__ import annotations

from functools import lru_cache

from app.domain.catalog.model import CatalogItem, CatalogQuery


class CatalogRepository:
    def __init__(self, items: list[CatalogItem]) -> None:
        self._items = items
        self._by_sku = {i.sku: i for i in items}

    def __len__(self) -> int:
        return len(self._items)

    def get(self, sku: str) -> CatalogItem | None:
        return self._by_sku.get(sku)

    def query(self, q: CatalogQuery) -> list[CatalogItem]:
        out: list[CatalogItem] = []
        for item in self._items:
            if q.category and item.category != q.category:
                continue
            if q.room and q.room not in item.rooms:
                continue
            if q.vibe and q.vibe not in item.vibes:
                continue
            if q.max_price_inr is not None and item.price_inr > q.max_price_inr:
                continue
            if q.max_width_mm is not None and item.dimensions.width_mm > q.max_width_mm:
                continue
            if q.max_depth_mm is not None and item.dimensions.depth_mm > q.max_depth_mm:
                continue
            if q.tags_any:
                searchable = set(item.tags)
                if item.sub_category:
                    searchable.add(item.sub_category)
                if not (set(q.tags_any) & searchable):
                    continue
            out.append(item)
            if len(out) >= q.limit:
                break
        return out


@lru_cache(maxsize=1)
def get_catalog() -> CatalogRepository:
    # Import inside the function so circular-import order doesn't matter at
    # module load time (hero_catalog imports from app.domain.catalog.model too).
    from app.domain.catalog.hero_catalog import HERO_ITEMS
    return CatalogRepository(items=list(HERO_ITEMS))
