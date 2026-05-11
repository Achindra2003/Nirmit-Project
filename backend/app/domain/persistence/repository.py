"""SQLite repository for designs. Async via aiosqlite, schema via SQLAlchemy
core (no ORM mapper — RoomState is stored as JSON text)."""
from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

import aiosqlite

DB_PATH = Path(__file__).resolve().parents[3] / "data" / "nirmit.sqlite"


@dataclass
class DesignRecord:
    id: str
    session_id: str
    name: str
    philosophy: str | None
    room_state_json: str
    created_at: str
    updated_at: str

    @property
    def room_state(self) -> dict:
        return json.loads(self.room_state_json)


_INIT_SQL = """
CREATE TABLE IF NOT EXISTS designs (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    name TEXT NOT NULL,
    philosophy TEXT,
    room_state_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_designs_session ON designs(session_id);
CREATE INDEX IF NOT EXISTS idx_designs_updated ON designs(updated_at DESC);
"""


async def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.executescript(_INIT_SQL)
        await db.commit()


class DesignsRepository:
    async def save(
        self,
        *,
        session_id: str,
        name: str,
        philosophy: str | None,
        room_state: dict,
        existing_id: str | None = None,
    ) -> DesignRecord:
        now = datetime.utcnow().isoformat() + "Z"
        if existing_id:
            design_id = existing_id
            async with aiosqlite.connect(str(DB_PATH)) as db:
                await db.execute(
                    """
                    UPDATE designs
                    SET name = ?, philosophy = ?, room_state_json = ?, updated_at = ?
                    WHERE id = ? AND session_id = ?
                    """,
                    (name, philosophy, json.dumps(room_state), now, design_id, session_id),
                )
                await db.commit()
                # Re-fetch to confirm
                async with db.execute(
                    "SELECT id, session_id, name, philosophy, room_state_json, created_at, updated_at "
                    "FROM designs WHERE id = ?",
                    (design_id,),
                ) as cur:
                    row = await cur.fetchone()
            if row is None:
                raise ValueError("design vanished")
            return DesignRecord(*row)

        design_id = uuid.uuid4().hex
        async with aiosqlite.connect(str(DB_PATH)) as db:
            await db.execute(
                """
                INSERT INTO designs (id, session_id, name, philosophy, room_state_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (design_id, session_id, name, philosophy, json.dumps(room_state), now, now),
            )
            await db.commit()
        return DesignRecord(
            id=design_id,
            session_id=session_id,
            name=name,
            philosophy=philosophy,
            room_state_json=json.dumps(room_state),
            created_at=now,
            updated_at=now,
        )

    async def list_for(self, session_id: str) -> list[DesignRecord]:
        async with aiosqlite.connect(str(DB_PATH)) as db:
            async with db.execute(
                "SELECT id, session_id, name, philosophy, room_state_json, created_at, updated_at "
                "FROM designs WHERE session_id = ? ORDER BY updated_at DESC",
                (session_id,),
            ) as cur:
                rows = await cur.fetchall()
        return [DesignRecord(*r) for r in rows]

    async def get(self, design_id: str) -> DesignRecord | None:
        async with aiosqlite.connect(str(DB_PATH)) as db:
            async with db.execute(
                "SELECT id, session_id, name, philosophy, room_state_json, created_at, updated_at "
                "FROM designs WHERE id = ?",
                (design_id,),
            ) as cur:
                row = await cur.fetchone()
        return DesignRecord(*row) if row else None

    async def delete(self, design_id: str, session_id: str) -> bool:
        async with aiosqlite.connect(str(DB_PATH)) as db:
            cur = await db.execute(
                "DELETE FROM designs WHERE id = ? AND session_id = ?",
                (design_id, session_id),
            )
            await db.commit()
            return cur.rowcount > 0


repo = DesignsRepository()
