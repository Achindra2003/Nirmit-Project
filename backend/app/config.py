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

    # Generation pipeline — each vision used to trigger 2 LLM calls (style + ranker).
    # Defaults keep Groq free-tier TPD usable; enable when you have headroom.
    LLM_INTERPRET_ON_GENERATE: bool = False
    LLM_STYLE_ON_GENERATE: bool = False
    LLM_RANKER_ON_GENERATE: bool = False
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
