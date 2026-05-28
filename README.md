# Nirmit · निर्मित

> Interior design for Indian homes — an opinionated AI collaborator that draws three furnished rooms for your flat in 3D and hands your carpenter a buildable quotation.

The middle path between Livspace's ₹5L minimum and the carpenter who needs you to point at walls. Built around the feeling of being understood by someone with great taste who also knows your budget.

The product manifesto is in [`VISION.md`](./VISION.md). The architectural constitution is in [`CLAUDE.md`](./CLAUDE.md). **Read both before any non-trivial change.**

---

## Where you are

This is **`main`** — the **procedural** layout baseline of Nirmit. Rooms are placed by a hand-rolled solver (`FittingPlacer` + a squarified-treemap zone partitioner) on top of a curated GLB catalogue. It's the foundation everything else builds on top of.

Active development happens on **`feat/room-presets`**, which swaps the layout engine for `blueprint3d-modern`-driven preset rooms and adds Supabase auth + per-user persistence. Check that branch if you want the full current experience.

---

## What's inside

| Stage | What happens |
| --- | --- |
| **Home** | Hero with a pen-drawn architectural section drawing + the user's saved-rooms list (stored locally via a session UUID). |
| **Intake** | Four-question wizard: vibe → room + size → who lives here → budget + city. Image-first vibe cards; chips for household details; rupee-aware budget slider. |
| **Generating** | Layout pipeline animation while the LangGraph brain solves three philosophy-distinct visions (Gathering / Breath / Keeper) in parallel. |
| **Reveal** | Three full visions to pick from: 3D walkthrough on the left, italic "why this room" reasoning + Vastu notes + budget story on the right. |
| **Planner** | Live 2D + 3D editor with an AI collaborator chat panel. Drag furniture, swap styles, add from the catalogue, ask the AI to "make it warmer". |
| **Style** | Materials + finishing. Paint swatches, flooring options, lighting warmth presets. |
| **Export** | The artefact. Full quotation PDF, WhatsApp share card, contractor PDF with prices redacted. |

---

## Tech stack

| Layer | What |
| --- | --- |
| **Frontend** | React 18 + Vite + TypeScript |
| **3D** | three.js + @react-three/fiber + drei |
| **2D plan** | Hand-rolled SVG (`Planner2D.tsx`) — paper-and-ink section drawings |
| **Animation** | framer-motion |
| **State** | Zustand |
| **Persistence** | Backend session storage keyed by a localStorage session UUID (anonymous, device-scoped) |
| **Brain** | Python · FastAPI · LangGraph · Groq (Kimi K2) |
| **Layout engine** | Procedural: `FittingPlacer` + squarified treemap zone partitioner |
| **PDF** | html2canvas + jsPDF |

---

## Architecture in two sentences

**The Headless Brain** (`backend/`) holds every shred of intelligence — layout math, Vastu rules, vibe-aware naming, cost reasoning, the LangGraph chat agent. It speaks JSON over a small contract and can exist completely without a UI.

**The Pure Face** (`frontend/`) is a window onto that brain. It renders rooms, captures intent, and ships the final artefact. It owns zero intelligence; even validation lives backend-side. The contract between the two is JSON, not function calls.

See `CLAUDE.md` for the full architectural constitution and `VISION.md` for why each rule is there.

---

## Branch strategy

| Branch | Layout engine | Persistence | Status |
| --- | --- | --- | --- |
| `main` | Procedural FittingPlacer + treemap | Anonymous session UUID (localStorage) | Stable baseline (this branch) |
| `feat/room-presets` | `blueprint3d-modern` preset rooms | Supabase auth + RLS Postgres | Active development |
| `feat/landing-and-auth` | Experimental | Supabase | On hold, do not merge |

---

## Run it locally

You need Node 18+ and Python 3.11+.

### 1. Frontend

```bash
cd frontend
npm install
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

That's it — main needs no Supabase setup. The saved-rooms list on the home page is stored backend-side under an anonymous session UUID that lives in the browser's localStorage.

---

## Project layout

```
nirmit-project/
├── backend/                  Python · FastAPI · LangGraph — the headless brain
│   └── app/
│       ├── graph/            Generation pipeline (3 visions per intake)
│       ├── domain/
│       │   ├── catalog/      Furniture catalogue (3D-FRONT GLBs)
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
│   │   ├── store/            useAppStore (journey + planner state)
│   │   ├── lib/              penDraw helpers, etc.
│   │   └── api/              Single api/client.ts — the only intelligence dependency
│
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

## License

Private — capstone project. The vendored layout libraries and design references in non-tracked directories carry their own licenses.
