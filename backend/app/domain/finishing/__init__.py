"""Finishing palette — wall paint, flooring, lighting warmth, curtains.

After furniture placement the user enters Finishing mode (VISION.md "The
finishing layer exists as its own mode"). These options use real Indian
brand picks from the cultural-context module.
"""
from app.domain.finishing.options import (
    FlooringOption,
    LightingWarmth,
    PaintSwatch,
    flooring_options,
    lighting_warmth_presets,
    wall_paint_swatches,
)

__all__ = [
    "FlooringOption",
    "LightingWarmth",
    "PaintSwatch",
    "flooring_options",
    "lighting_warmth_presets",
    "wall_paint_swatches",
]
