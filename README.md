# Nirmit

The middle path for Indian home design — between Livspace's ₹5L minimum and
the carpenter who needs you to point at walls. Built around the feeling of
being understood by someone with great taste who also happens to know your
budget.

The product manifesto is in `VISION.md`. The architectural constitution is in
`CLAUDE.md`. **Read both before any non-trivial change.**

## Repo layout

```
nirmit-project/
├── backend/        Python · FastAPI · LangGraph — the headless brain
├── frontend/       React · Vite · Three.js (R3F) — the pure face
├── shared/
│   └── contracts/  Generated JSON Schema from Pydantic models
├── _legacy_poc/    Read-only graveyard. Extract intelligence; leave coupling.
├── CLAUDE.md       Architectural constitution
└── VISION.md       Product manifesto
```

## Run it locally

Two terminals.

**Backend** (`backend/`):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
copy .env.example .env   # then fill in GROQ_API_KEY
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Frontend** (`frontend/`):

```powershell
npm install
npm run dev   # http://localhost:5173
```

The frontend dev server proxies `/api/*` to the backend on port 8000, so the
two halves talk over a clean network boundary.

## The five-endpoint contract

| Method | Path        | Purpose                                             |
| ------ | ----------- | --------------------------------------------------- |
| POST   | `/generate` | Intake → up to 3 visions with placed items + reasoning |
| POST   | `/chat`     | User message + room state → response + intents      |
| POST   | `/apply`    | Intent list → updated room state                    |
| POST   | `/cost`     | Room state → budget story                           |
| POST   | `/export`   | Room state → carpenter-ready quotation              |

Frontend never duplicates intelligence. Backend never renders. JSON Schema is
generated from the backend Pydantic models (`shared/contracts/`).

## Build phases

- **Phase 1 — Foundation (current):** scaffold both halves, mock `/generate`
  end-to-end, render one fixture vision in R3F. Goal: see something real.
- **Phase 2 — Real visions:** port the layout solver, Vastu rules, and
  catalog from `_legacy_poc/`. Three real visions per intake.
- **Phase 3 — Collaborator:** the LangGraph chat agent with the four
  robustness rules from VISION.md.
- **Phase 4 — Quotation:** BOQ + Hindi specs + Buy-vs-Build PDF.
