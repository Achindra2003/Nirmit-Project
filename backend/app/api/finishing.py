"""GET /finishing/options — paint swatches, flooring, lighting warmth.

Pure read-only endpoint. The finishing mode UI calls this once on mount.
"""
from __future__ import annotations

from dataclasses import asdict

from fastapi import APIRouter

from app.domain.finishing import (
    flooring_options,
    lighting_warmth_presets,
    wall_paint_swatches,
)

router = APIRouter()


@router.get("/finishing/options")
async def finishing_options() -> dict:
    return {
        "paint_swatches": [asdict(s) for s in wall_paint_swatches()],
        "flooring": [asdict(f) for f in flooring_options()],
        "warmth_presets": [asdict(w) for w in lighting_warmth_presets()],
    }
