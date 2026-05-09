# Nirmit Backend — The Headless Brain

Python/FastAPI/LangGraph service that owns every intelligent decision in Nirmit:
layout generation, Vastu reasoning, furniture selection, AI collaboration, costing,
and quotation generation.

The backend has **no rendering responsibilities** and the frontend has **no
intelligence responsibilities** (CLAUDE.md §3). This boundary is enforced.

## Surface

Five endpoints. That's all. (VISION.md "The Clean Version of Nirmit")

| Method | Path        | Purpose                                                |
| ------ | ----------- | ------------------------------------------------------ |
| POST   | `/generate` | Intake JSON → 3 visions with placed items + reasoning  |
| POST   | `/chat`     | User message + room state → response + actions + cost  |
| POST   | `/apply`    | Action list → updated room state                       |
| POST   | `/cost`     | Room state → full cost breakdown ("budget story")      |
| POST   | `/export`   | Room state → carpenter-ready quotation PDF             |

## Quick start

```powershell
# from backend/
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
copy .env.example .env   # then fill in GROQ_API_KEY
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000/docs for interactive API explorer.

## Architecture

```
app/
├── api/         FastAPI routers — one per endpoint
├── graph/       LangGraph workflows (generate, collaborator)
├── domain/      Pure logic — solver, vastu, costing, boq. NO LLM, NO IO.
├── prompts/     Versioned LLM prompts
├── schemas/     Pydantic State Contract (the API surface)
├── llm/         Provider adapter (Groq + Kimi K2 default)
└── main.py      App entrypoint
```

**Hard rules:**
- All spatial dimensions are **millimeters**. Non-mm input is rejected.
- `domain/` modules have **zero LLM imports**. Pure functions only.
- `schemas/` is the source of truth for the API contract; TypeScript types
  are generated from it (see `../shared/contracts/`).
