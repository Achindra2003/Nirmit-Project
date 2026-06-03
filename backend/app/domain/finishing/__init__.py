"""Finishing palette — wall paint, flooring, lighting warmth, curtains.

After furniture placement the user enters Finishing mode (VISION.md "The
finishing layer exists as its own mode"). These options use real Indian
brand picks from the cultural-context module.
"""
from app.domain.finishing.options import (
    DEFAULT_FLOOR_RATE_SQFT,
    DEFAULT_WALL_RATE_SQFT,
    FlooringOption,
    LightingWarmth,
    PaintSwatch,
    curated_flooring,
    curated_paints,
    floor_rate_for_hex,
    flooring_options,
    lighting_warmth_presets,
    paint_rate_for_hex,
    wall_paint_swatches,
)

__all__ = [
    "DEFAULT_FLOOR_RATE_SQFT",
    "DEFAULT_WALL_RATE_SQFT",
    "FlooringOption",
    "LightingWarmth",
    "PaintSwatch",
    "curated_flooring",
    "curated_paints",
    "floor_rate_for_hex",
    "flooring_options",
    "lighting_warmth_presets",
    "paint_rate_for_hex",
    "wall_paint_swatches",
]
