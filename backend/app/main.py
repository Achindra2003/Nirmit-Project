"""FastAPI entrypoint. Five endpoints. That's all.

Run locally:
  uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
"""
from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import apply, chat, cost, export, generate
from app.config import settings

logging.basicConfig(level=settings.LOG_LEVEL)

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
)

app.include_router(generate.router, tags=["generate"])
app.include_router(chat.router, tags=["chat"])
app.include_router(apply.router, tags=["apply"])
app.include_router(cost.router, tags=["cost"])
app.include_router(export.router, tags=["export"])


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "provider": settings.LLM_PROVIDER, "model": settings.LLM_MODEL}
