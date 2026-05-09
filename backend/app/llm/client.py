"""LLM provider adapter.

The brain talks to LLMs through this single function. Providers are swappable by
config — swapping Groq for Anthropic should be a one-line change in .env, not a
codebase migration.

Default: Groq + moonshotai/kimi-k2-instruct (per founder decision 2026-05-08).
"""
from __future__ import annotations

from functools import lru_cache

from langchain_core.language_models.chat_models import BaseChatModel

from app.config import settings


@lru_cache(maxsize=8)
def get_llm(*, model: str | None = None, temperature: float = 0.4) -> BaseChatModel:
    """Return a configured chat model. Cached per (provider, model, temperature)."""
    provider = settings.LLM_PROVIDER
    chosen_model = model or settings.LLM_MODEL

    if provider == "groq":
        from langchain_groq import ChatGroq

        if not settings.GROQ_API_KEY:
            raise RuntimeError(
                "LLM_PROVIDER=groq but GROQ_API_KEY is not set. "
                "Copy backend/.env.example to backend/.env and fill it in."
            )
        return ChatGroq(
            model=chosen_model,
            temperature=temperature,
            api_key=settings.GROQ_API_KEY,
        )

    if provider == "anthropic":
        from langchain_anthropic import ChatAnthropic

        if not settings.ANTHROPIC_API_KEY:
            raise RuntimeError("LLM_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set.")
        return ChatAnthropic(
            model=chosen_model,
            temperature=temperature,
            api_key=settings.ANTHROPIC_API_KEY,
        )

    if provider == "openai":
        from langchain_openai import ChatOpenAI

        if not settings.OPENAI_API_KEY:
            raise RuntimeError("LLM_PROVIDER=openai but OPENAI_API_KEY is not set.")
        return ChatOpenAI(
            model=chosen_model,
            temperature=temperature,
            api_key=settings.OPENAI_API_KEY,
        )

    raise ValueError(f"Unknown LLM_PROVIDER: {provider}")
