"""FastAPI entrypoint. Five endpoints. That's all.

Run locally:
  uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
"""
from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import apply, catalog, chat, cost, designs, export, finishing, generate
from app.config import settings
from app.domain.persistence import init_db

logging.basicConfig(level=settings.LOG_LEVEL)
_log = logging.getLogger("nirmit")

# Make the LLM state obvious at startup — a missing key is the #1 "why is the
# chat just a stub?" gotcha during demo prep.
_llm_key = (
    settings.GROQ_API_KEY if settings.LLM_PROVIDER == "groq"
    else settings.ANTHROPIC_API_KEY if settings.LLM_PROVIDER == "anthropic"
    else settings.OPENAI_API_KEY
)
if _llm_key:
    _log.warning("LLM configured: %s / %s — /chat is live.", settings.LLM_PROVIDER, settings.LLM_MODEL)
else:
    _log.warning(
        "LLM NOT configured (no %s key in backend/.env) — /chat will return the "
        "deterministic stub. Set the key for the real collaborator.",
        settings.LLM_PROVIDER.upper(),
    )

app = FastAPI(
    title="Nirmit — Headless Brain",
    description="Indian home design backend. Five endpoints (VISION.md §The Clean Version of Nirmit).",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Nirmit-Session"],
)

app.include_router(generate.router, tags=["generate"])
app.include_router(chat.router, tags=["chat"])
app.include_router(apply.router, tags=["apply"])
app.include_router(cost.router, tags=["cost"])
app.include_router(export.router, tags=["export"])
app.include_router(finishing.router, tags=["finishing"])
app.include_router(designs.router, tags=["designs"])
app.include_router(catalog.router, tags=["catalog"])


@app.on_event("startup")
async def _startup() -> None:
    await init_db()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "provider": settings.LLM_PROVIDER, "model": settings.LLM_MODEL}
