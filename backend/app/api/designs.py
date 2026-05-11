"""Designs API — save / load / list / delete user designs.

Session model: anonymous browser session via X-Nirmit-Session header. The
frontend generates a UUID on first load and pins it in localStorage. No real
auth for the capstone; the session id IS the user identity.
"""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Header, HTTPException
from pydantic import Field

from app.domain.persistence import init_db, repo
from app.schemas.state import RoomState, StrictModel

router = APIRouter()


@router.on_event("startup")
async def _startup() -> None:
    await init_db()


class SaveDesignRequest(StrictModel):
    name: str
    philosophy: str | None = None
    room_state: RoomState
    existing_id: str | None = None


class DesignSummary(StrictModel):
    id: str
    name: str
    philosophy: str | None
    created_at: str
    updated_at: str


class SaveDesignResponse(StrictModel):
    id: str
    name: str
    philosophy: str | None
    created_at: str
    updated_at: str


class ListDesignsResponse(StrictModel):
    designs: List[DesignSummary] = Field(default_factory=list)


class LoadDesignResponse(StrictModel):
    id: str
    name: str
    philosophy: str | None
    created_at: str
    updated_at: str
    room_state: RoomState


@router.post("/designs", response_model=SaveDesignResponse)
async def save_design(
    req: SaveDesignRequest,
    x_nirmit_session: str | None = Header(default=None),
) -> SaveDesignResponse:
    if not x_nirmit_session:
        raise HTTPException(400, "X-Nirmit-Session header required")
    rec = await repo.save(
        session_id=x_nirmit_session,
        name=req.name.strip() or "Untitled room",
        philosophy=req.philosophy,
        room_state=req.room_state.model_dump(),
        existing_id=req.existing_id,
    )
    return SaveDesignResponse(
        id=rec.id,
        name=rec.name,
        philosophy=rec.philosophy,
        created_at=rec.created_at,
        updated_at=rec.updated_at,
    )


@router.get("/designs", response_model=ListDesignsResponse)
async def list_designs(
    x_nirmit_session: str | None = Header(default=None),
) -> ListDesignsResponse:
    if not x_nirmit_session:
        raise HTTPException(400, "X-Nirmit-Session header required")
    rows = await repo.list_for(x_nirmit_session)
    return ListDesignsResponse(
        designs=[
            DesignSummary(
                id=r.id, name=r.name, philosophy=r.philosophy,
                created_at=r.created_at, updated_at=r.updated_at,
            )
            for r in rows
        ]
    )


@router.get("/designs/{design_id}", response_model=LoadDesignResponse)
async def load_design(
    design_id: str,
    x_nirmit_session: str | None = Header(default=None),
) -> LoadDesignResponse:
    if not x_nirmit_session:
        raise HTTPException(400, "X-Nirmit-Session header required")
    rec = await repo.get(design_id)
    if rec is None or rec.session_id != x_nirmit_session:
        raise HTTPException(404, "Design not found")
    return LoadDesignResponse(
        id=rec.id,
        name=rec.name,
        philosophy=rec.philosophy,
        created_at=rec.created_at,
        updated_at=rec.updated_at,
        room_state=RoomState.model_validate(rec.room_state),
    )


@router.delete("/designs/{design_id}")
async def delete_design(
    design_id: str,
    x_nirmit_session: str | None = Header(default=None),
) -> dict:
    if not x_nirmit_session:
        raise HTTPException(400, "X-Nirmit-Session header required")
    ok = await repo.delete(design_id, x_nirmit_session)
    if not ok:
        raise HTTPException(404, "Design not found")
    return {"deleted": design_id}
