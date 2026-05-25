"""Hindi specification — kept as a thin shim over the city-aware
`local_lang` module so existing imports (`generate_hindi_section`) continue
to work. New code should call `generate_local_section(boq, city)` directly.
"""
from __future__ import annotations

from app.domain.boq.boq import BOQ
from app.domain.boq.local_lang import HINDI, generate_local_section

# Re-exported for any callers that still reach into the Hindi vocabulary directly.
HINDI_FURNITURE: dict[str, str] = dict(HINDI.furniture)


def to_hindi_name(english: str) -> str:
    name = english.lower()
    for k, v in HINDI_FURNITURE.items():
        if k in name:
            return v
    return english


def generate_hindi_section(boq: BOQ) -> str:
    """Backward-compatible alias that always produces the Hindi pack."""
    return generate_local_section(boq, city="Delhi")
