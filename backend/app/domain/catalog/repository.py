"""Catalog repository — loads the JSON file once and serves typed queries.

The actual data file is populated by the catalog migration step (task #6).
For Phase 1 a tiny seed catalog is shipped so the vertical slice runs without
the migration being complete.
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from app.domain.catalog.model import CatalogItem, CatalogQuery

DATA_PATH = Path(__file__).resolve().parents[3] / "data" / "catalog.json"


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
            if q.tags_any and not (set(q.tags_any) & set(item.tags)):
                continue
            out.append(item)
            if len(out) >= q.limit:
                break
        return out


@lru_cache(maxsize=1)
def get_catalog() -> CatalogRepository:
    if not DATA_PATH.exists():
        # Phase 1: empty repo is acceptable; the mock /generate uses inline fixtures.
        return CatalogRepository(items=[])
    raw = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    items = [CatalogItem.model_validate(x) for x in raw]
    return CatalogRepository(items=items)
