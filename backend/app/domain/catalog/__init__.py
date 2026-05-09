"""Furniture catalog domain. Pure logic, no LLM.

The catalog is a queryable knowledge base: "find me a 3-seater sofa under
₹40,000 that fits in 2400×900 with a warm-traditional vibe." It returns
catalog references that the layout solver places into the room.

The catalog data lives in backend/data/catalog.json and is loaded once at
startup. Schema is enforced by `CatalogItem`.
"""
from app.domain.catalog.model import CatalogItem, CatalogQuery
from app.domain.catalog.repository import CatalogRepository, get_catalog

__all__ = ["CatalogItem", "CatalogQuery", "CatalogRepository", "get_catalog"]
