"""Finishing options — pure data + curation. No LLM, no IO.

Real Indian brands for credibility (Asian Paints / Berger / Nerolac / Kajaria /
Pergo / local stone). Each option now carries a **material rate in ₹/sqft** —
the single source of truth the cost engine and the BOQ both read, so choosing a
finish actually moves the budget (a Kota floor and an Italian-marble floor no
longer cost the same).

Options are **curated per room type and philosophy** rather than served as one
flat global list:
  - room type sets the dominant mood — a bedroom leans darker and restful, a
    living/dining room lighter and welcoming, a study neutral and focused, a
    pooja room warm and luminous.
  - philosophy (gathering / breath / keeper) nudges within that — gathering
    warmer, breath lighter and cooler, keeper deeper and earthier.

The curation is a small scoring pass over a tagged pool, so adding a swatch is
just adding a row; the room/philosophy targeting picks it up automatically.
"""
from __future__ import annotations

from dataclasses import dataclass

# Defaults used when a room hasn't had a finish explicitly chosen yet (freshly
# generated rooms). Kept equal to the legacy BOQ flat rates so an untouched
# room prices exactly as it did before; the moment the user picks a curated
# finish, its real rate takes over.
DEFAULT_WALL_RATE_SQFT = 38
DEFAULT_FLOOR_RATE_SQFT = 95


@dataclass(frozen=True)
class PaintSwatch:
    id: str
    brand: str
    product: str
    color_name: str
    hex: str
    finish: str  # matte / satin / eggshell
    rate_inr_sqft: int
    # Curation tags (not serialised) — tone 0=light..1=dark, temp -1=cool..1=warm
    tone: float = 0.4
    temp: float = 0.3


@dataclass(frozen=True)
class FlooringOption:
    id: str
    brand: str
    product: str
    label: str
    hex: str
    type: str  # wood / vitrified / kota / marble / athangudi / terrazzo / oxide
    rate_inr_sqft: int
    tone: float = 0.4
    temp: float = 0.3


@dataclass(frozen=True)
class LightingWarmth:
    id: str
    label: str
    kelvin: int


# ---------- Pools (full catalog, tagged + priced) ----------


def _paint_pool() -> list[PaintSwatch]:
    return [
        # Light, warm — welcoming, guest-facing rooms
        PaintSwatch("be-ivory", "Berger", "Silk Glamour", "Ivory Cream", "#F5EBD9", "satin", 38, tone=0.15, temp=0.7),
        PaintSwatch("ap-bisque", "Asian Paints", "Royale Luxury Emulsion", "Warm Bisque", "#EFE0CD", "matte", 48, tone=0.18, temp=0.7),
        PaintSwatch("ap-champagne", "Asian Paints", "Royale Atmos", "Champagne", "#E7D7B4", "matte", 52, tone=0.22, temp=0.6),
        # Light, cool / neutral — airy, minimal
        PaintSwatch("ap-pearl", "Asian Paints", "Royale Luxury Emulsion", "Pearl Grey", "#E2E1DC", "matte", 44, tone=0.2, temp=-0.2),
        PaintSwatch("be-mist", "Berger", "Breathe Easy", "Morning Mist", "#DCE3E2", "matte", 46, tone=0.22, temp=-0.5),
        # Mid, warm / earthy
        PaintSwatch("ap-sand", "Asian Paints", "Royale Atmos", "Desert Sand", "#CDB89B", "matte", 50, tone=0.5, temp=0.4),
        PaintSwatch("ap-clay", "Asian Paints", "Royale Aspira", "Clay Pot", "#C99876", "matte", 60, tone=0.55, temp=0.7),
        PaintSwatch("be-terracotta", "Berger", "Easy Clean", "Terracotta", "#B5673E", "matte", 46, tone=0.6, temp=0.85),
        # Mid, cool / green
        PaintSwatch("ap-sage", "Asian Paints", "Royale Atmos", "Sage Whisper", "#A8B59A", "matte", 55, tone=0.5, temp=-0.3),
        PaintSwatch("ap-slate", "Asian Paints", "Royale Aspira", "Slate Blue", "#8A98A3", "eggshell", 55, tone=0.55, temp=-0.6),
        # Dark — restful bedrooms, dramatic accents
        PaintSwatch("ap-olive", "Asian Paints", "Royale Aspira", "Deep Olive", "#5E6048", "matte", 65, tone=0.82, temp=0.3),
        PaintSwatch("nl-graphite", "Nerolac", "Impressions HD", "Graphite Grey", "#5B5750", "eggshell", 58, tone=0.82, temp=-0.1),
        PaintSwatch("ap-teal", "Asian Paints", "Royale Aspira", "Peacock Teal", "#2E4D4A", "eggshell", 68, tone=0.85, temp=-0.4),
        PaintSwatch("ap-plum", "Asian Paints", "Royale Aspira", "Wine Plum", "#4A2E38", "eggshell", 68, tone=0.85, temp=0.5),
        PaintSwatch("nl-ink", "Nerolac", "Impressions HD", "Midnight Ink", "#2A2218", "eggshell", 60, tone=0.9, temp=0.4),
    ]


def _flooring_pool() -> list[FlooringOption]:
    return [
        FlooringOption("pergo-oak-pale", "Pergo", "Original Excellence", "Pale Oak Plank", "#C9B89D", "wood", 135, tone=0.25, temp=0.5),
        FlooringOption("pergo-oak-warm", "Pergo", "Original Excellence", "Warm Oak Plank", "#B89B7A", "wood", 135, tone=0.5, temp=0.7),
        FlooringOption("pergo-walnut", "Pergo", "Sensation", "Smoked Walnut Plank", "#7A5C3A", "wood", 175, tone=0.8, temp=0.7),
        FlooringOption("kaj-vitri-marble", "Kajaria", "Eternity Marbletech", "Bianco", "#F0ECE4", "vitrified", 105, tone=0.2, temp=0.0),
        FlooringOption("kaj-vitri-grey", "Kajaria", "Eternity Vitrified", "Storm Grey", "#A89A8C", "vitrified", 90, tone=0.5, temp=-0.1),
        FlooringOption("terrazzo", "Bharat Mosaic", "Terrazzo", "Terrazzo Speckle", "#D8D2C4", "terrazzo", 140, tone=0.25, temp=0.0),
        FlooringOption("kota-stone", "Local", "Kota Stone Polished", "Earth Beige", "#8B8B7A", "kota", 70, tone=0.5, temp=0.1),
        FlooringOption("athangudi", "Local", "Athangudi Tiles", "Heritage Pattern", "#C28F5E", "athangudi", 160, tone=0.55, temp=0.75),
        FlooringOption("redoxide", "Local", "Red Oxide", "Red Oxide", "#9C5A43", "oxide", 60, tone=0.5, temp=0.85),
        FlooringOption("italian-marble", "Local", "Italian Marble", "Statuario White", "#F4F0E8", "marble", 380, tone=0.15, temp=-0.2),
    ]


def lighting_warmth_presets() -> list[LightingWarmth]:
    return [
        LightingWarmth("candle", "Candlelit", 2400),
        LightingWarmth("warm", "Warm white", 2700),
        LightingWarmth("soft", "Soft white", 3000),
        LightingWarmth("neutral", "Neutral", 3500),
        LightingWarmth("daylight", "Daylight", 4000),
    ]


# ---------- Curation ----------

# (tone_target 0=light..1=dark, temp_target -1=cool..1=warm) per room type.
_ROOM_TARGET: dict[str, tuple[float, float]] = {
    "living": (0.28, 0.5),
    "dining": (0.32, 0.6),
    "bedroom": (0.7, 0.3),
    "study": (0.5, -0.1),
    "pooja": (0.2, 0.75),
    "kids": (0.2, 0.5),
    "kitchen": (0.3, 0.0),
    "bathroom": (0.2, -0.2),
}
_DEFAULT_TARGET = (0.35, 0.3)

# Philosophy nudge applied on top of the room target.
_PHILOSOPHY_NUDGE: dict[str, tuple[float, float]] = {
    "gathering": (0.0, 0.2),
    "breath": (-0.15, -0.2),
    "keeper": (0.2, 0.1),
}


def _target(room_type: str | None, philosophy: str | None) -> tuple[float, float]:
    tone, temp = _ROOM_TARGET.get((room_type or "").lower(), _DEFAULT_TARGET)
    dt, dtemp = _PHILOSOPHY_NUDGE.get((philosophy or "").lower(), (0.0, 0.0))
    tone = min(1.0, max(0.0, tone + dt))
    temp = min(1.0, max(-1.0, temp + dtemp))
    return tone, temp


def _score(tone: float, temp: float, target: tuple[float, float]) -> float:
    # Higher is better. Tone match weighted above temperature so a bedroom
    # reliably surfaces deeper colours before it worries about warm-vs-cool.
    return -(abs(tone - target[0]) * 1.0 + abs(temp - target[1]) * 0.55)


def curated_paints(room_type: str | None, philosophy: str | None, limit: int = 8) -> list[PaintSwatch]:
    target = _target(room_type, philosophy)
    ordered = sorted(_paint_pool(), key=lambda s: _score(s.tone, s.temp, target), reverse=True)
    return ordered[:limit]


def curated_flooring(room_type: str | None, philosophy: str | None, limit: int = 7) -> list[FlooringOption]:
    target = _target(room_type, philosophy)
    ordered = sorted(_flooring_pool(), key=lambda f: _score(f.tone, f.temp, target), reverse=True)
    return ordered[:limit]


# ---------- Rate lookup (so cost stays correct even if only labels were stored) ----------


def paint_rate_for_hex(hex_value: str | None) -> int | None:
    if not hex_value:
        return None
    h = hex_value.lower()
    for s in _paint_pool():
        if s.hex.lower() == h:
            return s.rate_inr_sqft
    return None


def floor_rate_for_hex(hex_value: str | None) -> int | None:
    if not hex_value:
        return None
    h = hex_value.lower()
    for f in _flooring_pool():
        if f.hex.lower() == h:
            return f.rate_inr_sqft
    return None


# ---------- Back-compat shims (callers that want the full flat list) ----------


def wall_paint_swatches() -> list[PaintSwatch]:
    return _paint_pool()


def flooring_options() -> list[FlooringOption]:
    return _flooring_pool()
