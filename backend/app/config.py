"""Settings loaded from environment / .env. The single place we read process state."""
from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve .env relative to this file (backend/app/config.py → backend/.env)
# so the server works regardless of which directory uvicorn is started from.
_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(_ENV_FILE), env_file_encoding="utf-8", extra="ignore")

    LLM_PROVIDER: Literal["groq", "anthropic", "openai"] = "groq"
    LLM_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_API_KEY: str | None = None

    # Generation pipeline — each vision triggers up to 3 LLM calls (interpret +
    # style + ranker). The ranker is now on by default because the deterministic
    # vision names ("The Long Wall" / "The Open Centre" / "The Working Walls")
    # felt repetitive across sessions — the LLM ranker generates fresh names +
    # tagline + per-vision reasoning that actually references the household's
    # specifics. Interpret + Style remain off because they're luxuries; the
    # deterministic fallbacks for those are good enough.
    #
    # If you hit Groq quota issues, flip LLM_RANKER_ON_GENERATE back to False
    # — the deterministic naming table + reasoning still ships a respectable
    # baseline. The quota gate (LlmQuotaGate) also auto-disables LLM calls
    # when the API starts refusing.
    LLM_INTERPRET_ON_GENERATE: bool = False
    LLM_STYLE_ON_GENERATE: bool = False
    LLM_RANKER_ON_GENERATE: bool = True
    ANTHROPIC_API_KEY: str | None = None
    OPENAI_API_KEY: str | None = None

    API_HOST: str = "127.0.0.1"
    API_PORT: int = 8000

    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    LOG_LEVEL: str = "INFO"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
