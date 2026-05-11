"""SQLite-backed persistence — the 'Your Home' concept.

Store user designs in a local SQLite file (zero-cost, no managed DB needed
for the capstone). Each design is a snapshot of a RoomState plus metadata
(name, philosophy, created_at, updated_at). Versioning is left to higher
layers (each save creates a new row; the latest is current).

Anonymous users get a per-browser session id that travels in headers;
authenticated users get a real user_id. Both share the same schema.
"""
from app.domain.persistence.repository import (
    DesignRecord,
    DesignsRepository,
    init_db,
    repo,
)

__all__ = ["DesignRecord", "DesignsRepository", "init_db", "repo"]
