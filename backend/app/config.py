"""Settings loaded from environment / .env. The single place we read process state."""
from __future__ import annotations

from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    LLM_PROVIDER: Literal["groq", "anthropic", "openai"] = "groq"
    LLM_MODEL: str = "moonshotai/kimi-k2-instruct"
    GROQ_API_KEY: str | None = None
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
