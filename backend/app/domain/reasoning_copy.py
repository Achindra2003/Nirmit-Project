"""Human-facing design reasoning — strip CAD jargon before it reaches the UI."""
from __future__ import annotations

import re

from app.schemas.state import Reasoning

_MM = re.compile(r"\b\d[\d,]*\s*mm\b", re.I)
_CM = re.compile(r"\b\d[\d,]*\s*cm\b", re.I)
_FT_IN = re.compile(r"\b\d+['′]\s*-?\s*\d*[\"″]?\b")
_COORD = re.compile(r"\b[xyz]\s*[=:]\s*[\d.,]+\s*(?:mm)?\b", re.I)
_ZONE_ID = re.compile(r"\bzone[_\s]?id\s*[=:]\s*\S+", re.I)
_HEX = re.compile(r"#[0-9A-Fa-f]{3,8}\b")
_SLUG = re.compile(r"\b(?:light_airy|warm_traditional|earthy_crafted|modern_minimal|maximalist|coastal)\b")

_REPLACEMENTS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\b\d{3,5}mm\s+wide\b", re.I), "wide enough for the whole family"),
    (re.compile(r"anchors the long wall\b", re.I), "runs along the long wall"),
    (re.compile(r"\banchored to\b", re.I), "set along"),
    (re.compile(r"\bposition(?:ed)? at\b", re.I), "placed"),
)


def humanize_reasoning_line(text: str) -> str:
    """Turn solver/LLM leftovers into warm designer language."""
    if not text or not text.strip():
        return text
    out = text.strip()
    for pat, repl in _REPLACEMENTS:
        out = pat.sub(repl, out)
    out = _MM.sub("", out)
    out = _CM.sub("", out)
    out = _FT_IN.sub("", out)
    out = _COORD.sub("", out)
    out = _ZONE_ID.sub("", out)
    out = _HEX.sub("", out)
    out = _SLUG.sub(lambda m: m.group(0).replace("_", " "), out)
    out = re.sub(r"\b[xyz]\s*=\s*(?:[xyz]\s*=\s*)?", "", out, flags=re.I)
    out = re.sub(r"\(\s*\)", "", out)
    out = re.sub(r"\s{2,}", " ", out)
    out = re.sub(r"\s+([,.])", r"\1", out)
    out = re.sub(r"^\s*[,.\-–—]\s*", "", out)
    return out.strip() or text.strip()


def humanize_reasoning(reasoning: Reasoning) -> Reasoning:
    return Reasoning(
        headline=humanize_reasoning_line(reasoning.headline),
        bullets=[humanize_reasoning_line(b) for b in reasoning.bullets],
        vastu_notes=[humanize_reasoning_line(n) for n in reasoning.vastu_notes],
        accessibility_notes=[humanize_reasoning_line(n) for n in reasoning.accessibility_notes],
    )
