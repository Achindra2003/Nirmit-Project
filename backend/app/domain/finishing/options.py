"""Finishing options — pure data. No LLM, no IO.

Real Indian brands for credibility (Asian Paints / Berger / Kajaria /
Pergo / CenturyPly). Prices are indicative; the BOQ's per-sqft rates are
authoritative for pricing.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PaintSwatch:
    id: str
    brand: str
    product: str
    color_name: str
    hex: str
    finish: str  # matte / satin / eggshell


@dataclass(frozen=True)
class FlooringOption:
    id: str
    brand: str
    product: str
    label: str
    hex: str
    type: str  # wood / vitrified / kota / marble


@dataclass(frozen=True)
class LightingWarmth:
    id: str
    label: str
    kelvin: int


def wall_paint_swatches() -> list[PaintSwatch]:
    return [
        PaintSwatch("ap-bisque", "Asian Paints", "Royale Luxury Emulsion", "Warm Bisque", "#EFE0CD", "matte"),
        PaintSwatch("ap-champagne", "Asian Paints", "Royale Atmos", "Champagne", "#E7D7B4", "matte"),
        PaintSwatch("ap-clay", "Asian Paints", "Royale Aspira", "Clay Pot", "#C99876", "matte"),
        PaintSwatch("ap-sage", "Asian Paints", "Royale Atmos", "Sage Whisper", "#A8B59A", "matte"),
        PaintSwatch("be-ivory", "Berger", "Silk Glamour", "Ivory Cream", "#F5EBD9", "satin"),
        PaintSwatch("be-terracotta", "Berger", "Easy Clean", "Terracotta", "#B5673E", "matte"),
        PaintSwatch("nl-graphite", "Nerolac", "Impressions HD", "Graphite Grey", "#5B5750", "eggshell"),
        PaintSwatch("nl-ink", "Nerolac", "Impressions HD", "Midnight Ink", "#2A2218", "eggshell"),
    ]


def flooring_options() -> list[FlooringOption]:
    return [
        FlooringOption("pergo-oak-warm", "Pergo", "Original Excellence", "Warm Oak Plank", "#B89B7A", "wood"),
        FlooringOption("pergo-oak-pale", "Pergo", "Original Excellence", "Pale Oak Plank", "#C9B89D", "wood"),
        FlooringOption("pergo-walnut", "Pergo", "Sensation", "Smoked Walnut Plank", "#7A5C3A", "wood"),
        FlooringOption("kaj-vitri-grey", "Kajaria", "Eternity Vitrified", "Storm Grey", "#A89A8C", "vitrified"),
        FlooringOption("kaj-vitri-marble", "Kajaria", "Eternity Marbletech", "Bianco", "#F0ECE4", "vitrified"),
        FlooringOption("kota-stone", "Local", "Kota Stone Polished", "Earth Beige", "#8B8B7A", "kota"),
        FlooringOption("athangudi", "Local", "Athangudi Tiles", "Heritage Pattern", "#C28F5E", "athangudi"),
        FlooringOption("italian-marble", "Local", "Italian Marble", "Statuario White", "#F4F0E8", "marble"),
    ]


def lighting_warmth_presets() -> list[LightingWarmth]:
    return [
        LightingWarmth("candle", "Candlelit", 2400),
        LightingWarmth("warm", "Warm white", 2700),
        LightingWarmth("soft", "Soft white", 3000),
        LightingWarmth("neutral", "Neutral", 3500),
        LightingWarmth("daylight", "Daylight", 4000),
    ]
