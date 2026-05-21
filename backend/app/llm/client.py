"""LLM provider adapter.

The brain talks to LLMs through this single function. Providers are swappable by
config — swapping Groq for Anthropic should be a one-line change in .env, not a
codebase migration.

Default: Groq + llama-3.3-70b-versatile (moonshotai/kimi-k2-instruct unavailable on this account).
"""
from __future__ import annotations

from functools import lru_cache

from langchain_core.language_models.chat_models import BaseChatModel

from app.config import settings


@lru_cache(maxsize=16)
def get_llm(*, model: str | None = None, temperature: float = 0.4, json_mode: bool = False) -> BaseChatModel:
    """Return a configured chat model. Cached per (provider, model, temperature, json_mode)."""
    provider = settings.LLM_PROVIDER
    chosen_model = model or settings.LLM_MODEL

    if provider == "groq":
        from langchain_groq import ChatGroq

        if not settings.GROQ_API_KEY:
            raise RuntimeError(
                "LLM_PROVIDER=groq but GROQ_API_KEY is not set. "
                "Copy backend/.env.example to backend/.env and fill it in."
            )
        extra: dict = {}
        if json_mode:
            extra["model_kwargs"] = {"response_format": {"type": "json_object"}}
        return ChatGroq(
            model=chosen_model,
            temperature=temperature,
            api_key=settings.GROQ_API_KEY,
            **extra,
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
