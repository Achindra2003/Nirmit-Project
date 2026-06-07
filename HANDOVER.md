# Nirmit — Technical Handover

Everything a new engineer needs to understand, run, and extend this project.
Pair this with `VISION.md` (product soul), `CLAUDE.md` (constitution), and
`ROADMAP.md` (what to build next). The auto-memory under
`.claude/.../memory/MEMORY.md` records non-obvious decisions over time.

---

## 1. What Nirmit is

An AI interior-design tool for **Indian homes**. A homeowner answers a short,
room-adaptive intake; the system generates **three furnished, priced room
layouts**; they edit (directly or by chatting with an AI) while cost updates live
against budget; and they export a **carpenter-ready quotation** (mm dimensions,
buy-vs-build, local language). Rooms can be saved, shared, and live-edited.

It is a **prototype**. The loop works end-to-end and is reliable, but the furniture
catalog uses an open, non-commercial 3D dataset — production requires a licensed
catalog (see `ROADMAP.md` §1).

---

## 2. Architecture — three parts (from `CLAUDE.md`)

- **The Headless Brain** — Python/FastAPI/LangGraph. All spatial math, cost logic,
  cultural inference (Vastu, storage, multi-generational). Thinks independently of
  any UI. All dimensions in **millimetres**.
- **The Pure Face** — React/TypeScript/Three.js. A window, not an engine: renders
  the room, handles intent-based editing and the "reveal" ceremony.
- **The State Contract** — a predictable JSON shape (RoomState, Vision,
  CostBreakdown) passed between brain and face. Defined in
  `backend/app/schemas/state.py`, mirrored in `frontend/src/api/types.ts`.

**Key principle:** the *spatial spine is deterministic*; the LLM handles language,
reasoning, and conversational edits — never the geometry. This is why it's reliable
under rate limits.

---

## 3. Tech stack

| Layer | Tech |
|---|---|
| Frontend | React, TypeScript, Vite, Three.js + React Three Fiber, Zustand |
| Backend | Python, FastAPI, LangGraph, Pydantic |
| LLM | Groq-hosted (model via env, e.g. `llama-3.3-70b-versatile` / kimi-k2), swappable adapter |
| Persistence | Supabase (Postgres + Row-Level Security + Realtime) |
| 3D assets | 3D-FRONT / Sweet Home 3D GLB meshes (CC-BY-NC — prototype only) |

---

## 4. Repository layout

```
backend/
  app/
    main.py                  FastAPI app + router wiring
    config.py                Settings (LLM feature flags, CORS, etc.)
    api/                     HTTP routes: generate, chat, apply, cost, export,
                             finishing, catalog
    graph/
      generate_graph.py      LangGraph: interpret → layout → rank/explain → 3 Visions
      collaborator_graph.py  LangGraph: compose → generate → parse → apply → cost-delta
    domain/                  THE BRAIN (pure logic, no IO)
      presets/
        layouts.py           24 curated presets (4 rooms × 3 philosophies × 2 variants)
        resolver.py          resolve_preset_via_engine(); _profile_items() (household→pieces)
        engine.py            headless placement engine (containment/clearance/overlap/wall-snap)
        model.py, compose.py
      catalog/
        hero_catalog.py      runtime catalog
        presets/*.py         per-preset catalogs (keyed by sub_category)
        repository.py, model.py
      costing/engine.py      build_cost_breakdown(); materials_cost()
      boq/boq.py             bill of quantities; local_lang.py (Hindi/local spec)
      finishing/options.py   curated, priced paint/floor finishes (by room + philosophy)
      intent/executor.py     apply_intents(): add/remove/move/recolor + placement safety-net
      vastu/rules.py         Vastu zones + rules
      solver/                fallback solver (FittingPlacer, zones) when no preset
    schemas/state.py         Pydantic State Contract (Intake, RoomState, Vision, ...)
    prompts/                 system prompts + builders (collaborator, ranker, style, voices)
    llm/                     get_llm() adapter; guard.py (LlmQuotaGate rate-limit breaker)
  pyproject.toml             backend dependencies

frontend/
  src/
    App.tsx                  Stage router; ?share= route; mounts <LiveSync>
    routes/
      HomeRoute, LoginRoute, SignupRoute
      IntakeRoute            room-first, room-adaptive intake (character + use chips)
      GeneratingRoute, RevealRoute
      PlannerRoute           3D canvas + Bill of Items + AI collaborator + direct edit
      StyleRoute             materials/finishes
      ExportRoute            BOQ/quotation, save (named), share
      SharedRoute            collaborative shared room (?share=<token>)
    three/                   RoomScene, RoomShell, GlbItem, Lighting, Atmosphere,
                             SceneSnapshot, assetTuning, units
    components/              FinishingPanel, Planner2D, LiveSync, shell/TopNav
    store/                   useAppStore (journey, visions, activeDesignId), useAuthStore
    api/                     client.ts (HTTP + Supabase + Realtime), types.ts (contract)
  public/models/sh3d/        307MB GLB furniture meshes — GITIGNORED, fetch separately

supabase/migrations/         0001_designs.sql, 0002_share.sql
```

---

## 5. The State Contract (key schemas — `schemas/state.py` / `types.ts`)

- **Intake** — `room_type`, `room_dimensions` (mm), `entrance_direction`,
  `who_lives_here` (the household string — built from intake chips), `vibe`,
  `budget_inr`, `vastu_matters`, `city`.
- **RoomState** — `intake`, `items: PlacedItem[]`, `palette`, `flooring`,
  `wall_finish`, finish **rates** (`wall_finish_rate_inr_sqft`,
  `floor_rate_inr_sqft`), `lighting_kelvin`, `openings: Opening[]`, `design_intent`.
- **PlacedItem** — `id` (prefixed by sub_category, e.g. `sofa-ab12`), `catalog`,
  `dimensions` (mm), `position` (x_mm/z_mm = footprint **centre**), `facing`,
  `is_buy`, prices, `rationale`.
- **CostBreakdown** — `story: BudgetStory`, `line_items: CostLineItem[]`,
  `materials_inr`. `story.total_inr` is the all-in live estimate.
- **Vision** — `id`, `philosophy` (gathering | breath | keeper), `name`, `tagline`,
  `room_state`, `reasoning`, `cost`.
- **Intent** — `kind` (add/remove/move/rotate/recolor_room/…), `target_item_id`,
  `parameters`. The single unit of editing.

---

## 6. Core flows (with entry points)

### Generation  (Intake → 3 Visions)
`POST /generate` → `graph/generate_graph.py`:
1. **interpret** — parse `who_lives_here` into a **design brief** (has_kids,
   has_elderly, entertains_guests, needs_storage, spiritual_practice, …). LLM is
   OFF by default → a deterministic phrase parser reads the structured intake chips.
2. **layout** — for each philosophy, `_build_vision()`:
   - `resolve_preset_via_engine()` picks the curated preset and places items via the
     headless engine (validates containment, clearances, overlaps, wall-snapping).
   - `_profile_items()` adds/swaps pieces from the brief (elderly → arms `lounge_chair`
     swap; storage-high/kids → closed `cabinet`; frequent guests → pull-in seat).
   - LLM style (palette/finish) — OFF by default → vibe/philosophy defaults.
   - `build_cost_breakdown()` then **budget-fit**: trim least-essential pieces until
     the all-in fits — never returns an over-budget room.
   - `_name_and_tagline()` (curated, distinct) + `_deterministic_reasoning()`
     (household-aware, **only describes pieces actually placed** — no hallucination).
3. **rank** — optional LLM re-authoring of reasoning/name (OFF by default).

### Editing  (Planner / Style)
Direct edits and finish changes emit **Intents** → `POST /apply` →
`domain/intent/executor.py` → patched RoomState + recomputed cost. The frontend
funnels every change through `useAppStore.patchActiveVision()` so planner,
materials, and export always read the latest. Edits are bounds-clamped/guarded
(placement safety-net).

### AI collaborator
`POST /chat` → `graph/collaborator_graph.py` (compose → generate → parse → apply →
cost-delta). Under rate limit it returns an **in-character fallback and applies no
intents** (never hallucinates a change). Proactive "first-look" suggestions and
cross-sell are **deterministic** (`domain/suggest.py`), budget-gated — no LLM.

### Cost  (the trust core)
`POST /cost` → `costing/engine.py`. `story.total_inr` = furniture + `materials_cost`
(wall+floor area × selected ₹/sqft rate). The BOQ (`boq/boq.py`) uses the **same**
selected rates and adds labour (city-based) + GST + contingency, reconciled so the
on-screen all-in estimate matches the downloaded quotation.

### Export
`POST /export` → BOQ + local-language carpenter spec (`boq/local_lang.py`).
`ExportRoute` renders it and rasterises to PDF (html2canvas).

### Persistence & collaboration
Frontend talks to **Supabase directly** (`api/client.ts`) — a deliberate shortcut
(should be FastAPI-mediated; see ROADMAP §3). Designs are per-user rows (RLS).
Sharing adds a `share_token`; `SharedRoute` loads/edits by token and subscribes to
Realtime. `LiveSync.tsx` (one-way) patches the owner's active vision when a
collaborator edits — **uncommitted**, see §10.

---

## 7. Key design decisions & why

- **Deterministic spatial spine, LLM only for language/edits.** LLMs hallucinate,
  are slow, and rate-limit. The geometry must never break in a demo → presets +
  headless engine. LLM does household understanding, reasoning prose, and chat edits.
- **LLM feature flags OFF by default** (`config.py`: interpret/style/ranker). The
  ranker was nondeterministic and collapsed all three vision names to the same text;
  off → curated distinct names + fast, deterministic reveal. Turn on per-feature
  only with rate-limit/caching in place.
- **Budget-fit generation** — never hand back an over-budget room; trim extras, which
  resurface as in-budget cross-sell suggestions.
- **Honest reasoning** — bullets only describe items actually placed (a past bug
  narrated a mandir/"two accent chairs" that weren't there). Trust depends on this.
- **Profile drives the room** — intake chips → brief → `_profile_items`. The "so I'll
  plan for…" promise must be delivered, or it's theatre.
- **Curated, priced finishes** — finishes carry real ₹/sqft so choosing one moves the
  live budget *and* the BOQ (Kota ≠ Italian marble).
- **Catalog is a swappable data layer** — so licensing real furniture is a data
  effort, not a rewrite.

---

## 8. Running it locally

**Backend** (from `backend/`):
```bash
python -m venv .venv
.venv/Scripts/pip install -e .          # Windows; or: source .venv/bin/activate && pip install -e .
# create backend/.env (see backend/.env.example): GROQ_API_KEY, LLM_PROVIDER, Supabase keys
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```
Run from `backend/` with `app.main:app` and `--reload` — running elsewhere or
without reload loads stale code (a recurring footgun).

**Frontend** (from `frontend/`):
```bash
npm install
npm run dev        # http://localhost:5173 ; Vite proxies /api → :8000
```

**3D assets** (required, gitignored): restore `frontend/public/models/sh3d/`
(307 MB, 1,506 GLBs) from the backup/Release. Without it, furniture won't render.

**Supabase:** run `supabase/migrations/0001_designs.sql` then `0002_share.sql`
against your project; enable **Realtime** on the `designs` table (Database →
Replication) for live sharing; confirm the RLS + anon GRANTs from `0002`.

---

## 9. Config & environment

- `backend/.env` — `GROQ_API_KEY`, `LLM_PROVIDER`, Supabase URL/keys. Gitignored;
  see `backend/.env.example` for the shape.
- `backend/app/config.py` — feature flags: `LLM_INTERPRET_ON_GENERATE`,
  `LLM_STYLE_ON_GENERATE`, `LLM_RANKER_ON_GENERATE` (all default **False**),
  CORS, host/port.
- Frontend Supabase config — via Vite env (`VITE_*`) in `frontend`; if absent, the
  Supabase client is a no-op (save/share disabled, rest works).

---

## 10. Git state & gotchas

- **Branches:** `main`, `feat/room-presets`, `feat/feedback-fixes` (current).
  Remote: `github.com/Achindra2003/Nirmit-Project`.
- **Clean rollback point:** commit `7b4ffac` (`feat(profile): …`).
- **Uncommitted work:** the one-way **LiveSync** feature — store `activeDesignId`
  (`store/useAppStore.ts`), `components/LiveSync.tsx`, wiring in
  `App.tsx`/`ExportRoute.tsx`/`HomeRoute.tsx`, and the export BOQ re-fetch on
  `room_state`. Type-checks clean; needs a two-window realtime test before committing.
- **Gitignored, not in repo:** `frontend/public/models/sh3d/` (307MB runtime GLBs),
  `backend/data/` (1.5GB SH3D/3D-FRONT sources — only for regenerating assets),
  `.env`, `node_modules`, `.venv`. Full snapshot lives in the Google Drive backup.

### Gotchas
- Run backend from `backend/` with `--reload`, else stale code.
- Groq free tier throttles; generation survives (deterministic), AI chat goes quiet.
- `LlmQuotaGate` (`llm/guard.py`) auto-disables LLM calls after a rate-limit trip.
- Coordinate origin is the entrance corner; `position.x_mm/z_mm` is the footprint
  **centre**; wall items render at a fixed mount height via `three/assetTuning.ts`.
- Catalog is **CC-BY-NC** — do not ship the current assets to production.

---

## 11. Where to start if you're taking over
1. Get it running (§8) with the restored assets.
2. Read `VISION.md`, then trace one generation: `generate_graph.py` →
   `resolver.py` → `costing/engine.py`.
3. Skim `ROADMAP.md` — the catalog is the #1 thing standing between this and a real
   product. Everything else is downstream of it.
