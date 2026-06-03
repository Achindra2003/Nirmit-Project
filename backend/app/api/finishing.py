"""GET /finishing/options — paint swatches, flooring, lighting warmth.

Pure read-only endpoint. The finishing-mode UI calls this once it knows the
room. Options are **curated for the room type + philosophy** (a bedroom leans
darker and restful, a living room lighter and welcoming), and each carries a
real ₹/sqft material rate so the choice flows through to the cost.
"""
from __future__ import annotations

from dataclasses import asdict

from fastapi import APIRouter

from app.domain.finishing import (
    curated_flooring,
    curated_paints,
    lighting_warmth_presets,
)

router = APIRouter()


@router.get("/finishing/options")
async def finishing_options(
    room_type: str | None = None,
    philosophy: str | None = None,
    vibe: str | None = None,
) -> dict:
    # `vibe` is accepted for forward-compatibility (front-end sends it) but the
    # curation keys off room_type + philosophy today.
    _ = vibe
    paints = curated_paints(room_type, philosophy)
    floors = curated_flooring(room_type, philosophy)
    return {
        "paint_swatches": [_strip_tags(asdict(s)) for s in paints],
        "flooring": [_strip_tags(asdict(f)) for f in floors],
        "warmth_presets": [asdict(w) for w in lighting_warmth_presets()],
    }


def _strip_tags(d: dict) -> dict:
    # tone/temp are internal curation knobs — not part of the wire contract.
    d.pop("tone", None)
    d.pop("temp", None)
    return d
