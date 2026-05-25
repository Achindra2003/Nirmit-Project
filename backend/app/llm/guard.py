"""Rate-limit circuit breaker — one 429 stops further calls in this process."""
from __future__ import annotations

import logging
import re
import time
from typing import Any

log = logging.getLogger(__name__)

_RETRY_AFTER = re.compile(r"try again in (?:(\d+)m)?([\d.]+)?s", re.I)


def is_rate_limit_error(exc: BaseException) -> bool:
    name = type(exc).__name__
    if "RateLimit" in name:
        return True
    msg = str(exc).lower()
    return "429" in msg or "rate_limit" in msg or "rate limit" in msg


def _parse_retry_seconds(exc: BaseException) -> float | None:
    m = _RETRY_AFTER.search(str(exc))
    if not m:
        return None
    minutes = float(m.group(1) or 0)
    seconds = float(m.group(2) or 0)
    total = minutes * 60 + seconds
    return total if total > 0 else None


def _short_error(exc: BaseException) -> str:
    text = str(exc).strip()
    if len(text) > 160:
        return text[:157] + "…"
    return text or type(exc).__name__


class LlmQuotaGate:
    """After Groq TPD/RPM 429, skip optional LLM calls until the window passes."""

    _open_until: float = 0.0

    @classmethod
    def is_open(cls) -> bool:
        return time.monotonic() < cls._open_until

    @classmethod
    def seconds_remaining(cls) -> float:
        return max(0.0, cls._open_until - time.monotonic())

    @classmethod
    def trip(cls, exc: BaseException, *, default_seconds: float = 600.0) -> None:
        if not is_rate_limit_error(exc):
            return
        wait = _parse_retry_seconds(exc) or default_seconds
        cls._open_until = time.monotonic() + wait
        log.warning(
            "LLM rate limit — pausing model calls for ~%.0fs (%s). Using built-in fallbacks.",
            wait,
            _short_error(exc),
        )

    @classmethod
    def reset(cls) -> None:
        cls._open_until = 0.0


def safe_llm_invoke(llm: Any, messages: list[Any], *, context: str = "LLM") -> Any | None:
    """Invoke chat model; return None on rate limit or other failure (no traceback spam)."""
    if LlmQuotaGate.is_open():
        log.debug("%s skipped — quota gate open (%.0fs left)", context, LlmQuotaGate.seconds_remaining())
        return None
    try:
        return llm.invoke(messages)
    except Exception as exc:
        if is_rate_limit_error(exc):
            LlmQuotaGate.trip(exc)
        else:
            log.warning("%s failed (%s); using fallback.", context, _short_error(exc))
        return None
