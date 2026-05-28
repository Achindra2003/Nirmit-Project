# Nirmit · निर्मित

> Interior design for Indian homes — an opinionated AI collaborator that draws three furnished rooms for your flat in 3D, hands your carpenter a buildable quotation, and stays out of your way when you just want to move a sofa.

The middle path between Livspace's ₹5L minimum and the carpenter who needs you to point at walls. Built around the feeling of being understood by someone with great taste who also knows your budget.

The product manifesto is in [`VISION.md`](./VISION.md). The architectural constitution is in [`CLAUDE.md`](./CLAUDE.md). **Read both before any non-trivial change.**

---

## What's inside

The user journey, top to bottom:

| Stage | What happens |
| --- | --- |
| **Home / Landing** | Hero with a pen-drawn architectural section drawing. Signed-in users see their saved-rooms archive below; signed-out users get hero + CTA only. |
| **Sign in / Sign up** | Optional and late. Email + password via Supabase. Paper-and-ink form treatment with drafting corner ticks. Promoted only on the Save action of the export page, never as a wall. |
| **Intake** | Four-question wizard: vibe → room + size → who lives here → budget + city. Image-first vibe cards; chips for household details; rupee-aware budget slider. |
| **Generating** | Layout pipeline animation while the LangGraph brain solves three philosophy-distinct visions (Gathering / Breath / Keeper) in parallel. |
| **Reveal** | Three full visions to pick from: 3D walkthrough on the left, italic "why this room" reasoning + Vastu notes + budget story on the right. |
| **Planner** | Live 2D + 3D editor with an AI collaborator chat panel. Drag furniture, swap styles, add from the catalogue, ask the AI to "make it warmer". Confirm-gate guards block accidentally-destructive edits (removing the only bed, three sofas in a small room, > 65% floor utilisation). |
| **Style** | Materials + finishing. Paint swatches (real Asian Paints + Dulux), flooring options, lighting warmth presets. |
| **Export** | The artefact. Full quotation PDF with city-aware carpenter spec (Hindi / Marathi / Tamil per the user's city), WhatsApp share card, and a contractor PDF with prices redacted. |

---

## Tech stack

| Layer | What | Why |
| --- | --- | --- |
| **Frontend** | React 18 + Vite + TypeScript | Fast HMR, strict typing, no Next.js — single-page in-app navigation via a Zustand stage machine |
| **3D** | three.js + @react-three/fiber + drei | The 3D walkthrough on Reveal / Planner / Style |
| **2D plan** | Hand-rolled SVG (`Planner2D.tsx`) | Paper-and-ink section drawings, sharp at all zooms |
| **Animation** | framer-motion | Page transitions, hero pen-draw choreography, inline reveals |
| **State** | Zustand | Single store for journey state + planner edit state + auth session |
| **Auth + DB** | Supabase (Postgres + RLS) | Email/password auth; `public.designs` table per-user with row-level security |
| **Brain** | Python · FastAPI · LangGraph · Groq (Kimi K2) | Headless intelligence — vision generation, intent interpretation, chat, costing |
| **Layout engine** | TypeScript via `blueprint3d-modern/` | Backend shells out for room placement |
| **Carpenter spec** | Multilingual templates | Hindi / Marathi / Tamil per city, with Devanagari + script rendering |
| **PDF** | html2canvas + jsPDF | Client-side PDF generation so the document the user sees IS the PDF |

---

## Architecture in two sentences

**The Headless Brain** (`backend/`) holds every shred of intelligence — layout math, Vastu rules, vibe-aware naming, cost reasoning, the LangGraph chat agent. It speaks JSON over five POST endpoints and can exist completely without a UI.

**The Pure Face** (`frontend/`) is a window onto that brain. It renders rooms, captures intent, and ships the final artefact. It owns zero intelligence; even validation lives backend-side. The contract between the two is JSON, not function calls.

See `CLAUDE.md` for the full architectural constitution and `VISION.md` for why each rule is there.

---

## Branch strategy

| Branch | Layout engine | Status |
| --- | --- | --- |
| `main` | Procedural — the catalogue-aware FittingPlacer + squarified treemap | Stable baseline |
| `feat/room-presets` | `blueprint3d-modern`-driven preset rooms with curated GLB furniture | Active development — auth + Supabase persistence live here |
| `feat/landing-and-auth` | Experimental — early auth scaffolding, kept for reference | On hold, do not merge |

---

## Run it locally

You need three things: Node 18+, Python 3.11+, and a Supabase project (free tier is fine).

### 1. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# edit .env.local with your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev   # http://localhost:5173
```

The frontend dev server proxies `/api/*` to the FastAPI backend on port 8000.

### 2. Backend

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1     # PowerShell
# or: source .venv/bin/activate  # bash
pip install -e ".[dev]"
cp .env.example .env             # then fill in GROQ_API_KEY
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 3. Supabase

In your Supabase dashboard:

1. **Database → SQL Editor → New query**
2. Paste the contents of [`supabase/migrations/0001_designs.sql`](./supabase/migrations/0001_designs.sql)
3. Run

This creates the `public.designs` table, four RLS policies (one per CRUD verb tied to `auth.uid()`), the `(user_id, updated_at desc)` index, and the `updated_at` trigger.

If you want auth to skip the email-confirmation step during development:

- **Authentication → Sign In / Up** → toggle off "Confirm email"

---

## Project layout

```
nirmit-project/
├── backend/                  Python · FastAPI · LangGraph — the headless brain
│   └── app/
│       ├── graph/            Generation pipeline (3 visions per intake)
│       ├── domain/
│       │   ├── catalog/      Furniture catalogue (3D-FRONT GLBs)
│       │   ├── presets/      Preset-room engine + blueprint3d-modern wrapper
│       │   ├── intent/       Intent executor (move, rotate, replace, recolour…)
│       │   └── vastu/        Cardinal-map rule engine
│       ├── prompts/          LLM ranker / interpreter / vision-naming prompts
│       └── schemas/          Pydantic models (source of truth for JSON contract)
│
├── frontend/                 React · Vite · Three.js (R3F) — the pure face
│   ├── src/
│   │   ├── routes/           One file per stage (Home, Intake, Reveal, Planner…)
│   │   ├── components/       Shared UI (TopNav, Planner2D, FinishingPanel…)
│   │   ├── three/            R3F scene + camera presets + atmosphere props
│   │   ├── store/            useAppStore (journey) + useAuthStore (Supabase)
│   │   ├── lib/              supabase client, penDraw helpers, planner guards
│   │   └── api/              Single api/client.ts — the only intelligence dependency
│   └── .env.example          Vite reads .env.local; copy this template
│
├── supabase/
│   └── migrations/           SQL migrations (run via Supabase SQL editor)
│
├── blueprint3d-modern/       Vendored 3D floor planner (preset engine depends on it)
├── shared/contracts/         JSON Schema generated from Pydantic models
├── scripts/                  Utility scripts (asset download, scale fixes, catalog tools)
│
├── CLAUDE.md                 Architectural constitution
├── VISION.md                 Product manifesto
└── README.md                 You are here
```

---

## Cultural sovereignty

This is not a global SaaS with a Hindi paste-over. Nirmit knows:

- The mandir gets the north-east. Vastu is geometry, not garnish.
- Storage is architecture — Indian homes accumulate, and every wall earns its keep.
- The carpenter writes his quote on a half-sheet of paper, in his language. So the BOQ is generated in Hindi, Marathi, or Tamil depending on the user's city.
- The "Suresh standard" — the final quotation has to be buildable by a local carpenter with zero ambiguity.

See `VISION.md` for the long version.

---

## Status

Active development on `feat/room-presets`. Auth + per-user persistence landed 2026-05-28. Up next: backend-side migration so save endpoints validate the Supabase JWT (currently the frontend talks to Supabase directly via RLS; the FastAPI `/designs/*` endpoints are vestigial and can be removed).

---

## License

Private — capstone project. Do not redistribute the `_legacy_poc` (now archived on `feat/landing-and-auth`) or `blueprint3d-modern` directories outside the scope of this project; both vendor third-party code under their own licenses.
