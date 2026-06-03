# INTENTION.md — Session Handoff & Working Brief

> **Read this first.** It tells a fresh Claude session the *situation*, the *stakes*, the *plan*, and *how to help*. It is the situational layer on top of `CLAUDE.md` (architecture rules), `VISION.md` (product manifesto), and `README.md` (stack + how to run). Read those three after this one.

_Last updated: 2026-06-02._

---

## 1. Who you're working with and how to behave

- The user is the **founder/builder of Nirmit** and is doing this as an **internship project**. They expect **CTO / tech-lead-level partnership** — honest assessment, grounded technical specifics, real opinions. **Do not cheerlead.** Do not rubber-stamp bad ideas, and don't just agree with critics either. Triage: signal vs. noise.
- **The stakes are real and personal.** Whether the user converts to a full-time employee depends on (a) their mentor's evaluation and (b) whether a vacancy exists. The product being "finished" is *not* the bar — engineering judgment, ownership, and how feedback is handled are what's actually being evaluated. Keep them focused on what they can control.
- Be **emotionally honest but constructive.** The user has been discouraged by harsh feedback (see §3). Reframe self-doubt as "this is a hard problem," then give a concrete path. No toxic positivity.

---

## 2. What Nirmit is (30-second version)

Interior design for Indian homes. Four-question intake → backend generates **three philosophy-distinct 3D rooms** (Gathering / Breath / Keeper) → user refines by **talking to an AI collaborator** or direct editing → exports a **carpenter-buildable quotation** (BOQ, local-language specs, redacted contractor PDF). The product sells *a feeling*: "understood by someone with great taste who knows your budget." Architecture is a hard split: **Python brain** (all intelligence) ↔ **React face** (zero intelligence) ↔ **quotation document**.

Full why → `VISION.md`. Architecture constitution → `CLAUDE.md`. Stack + journey table → `README.md`.

---

## 3. The feedback that triggered this work (UI dept head review)

A **UI department head** (NOT the mentor who decides conversion — different, more dismissive person) reviewed the project and said:
- **UI is fine.** The problem is **business logic / actual usability** — i.e. *can it generate genuinely good, usable rooms.*
- Nitpicked **furniture choice, placement, wall paints, flooring, lighting** — "not good."
- **Intake** should be more "user profiling."
- **Collaboration:** multiple users (contractor, family) should be able to view / work on the same design.
- **Vastu** felt "iffy and controversial."
- Floor plan is missing **proper cardinal directions**, which should also appear in the 3D room.
- Verdict for all intern projects: *"the foundational engines / baselines are there; it needs a lot more building to be a usable product."*

### Our triage of that feedback (agreed strategy — important)
| Feedback | Verdict | What to actually do |
| --- | --- | --- |
| Rooms don't feel "designed" yet editable | **Real signal — the core problem** | Depth over breadth: hand-tune **one hero room** to genuinely-designed quality; constrain editing so it can't wreck the design. |
| AI collaborator's adds/changes ruin layouts | **Real** | **Narrow the collaborator** to safe (cosmetic) ops it can't break — recolor, change fabric/finish, style-swap, warm lighting. Have it *decline* layout-wrecking adds in-character and suggest manual placement. |
| Catalog quality "makes it suck" | **Real, but NOT an engineering gap & NOT fixable fast** | Catalog is 3D-FRONT (inconsistent scale/style + **CC-BY-NC, can't ship**). This is a *procurement/licensing* problem. Mitigation: **curate down to ~20–30 good-looking, consistent assets** and use only those. Frame honestly as a company-level constraint. |
| Floor plan missing N/S/E/W; want it in 3D too | **Real & quick win** | Add **North arrow + cardinal labels** to the 2D plan and a **compass** to the 3D view. Fast, visible, also bolsters Vastu credibility. |
| Vastu "controversial" | **Partly fair** | Make Vastu **explicitly opt-in + clearly reasoned**, framed as a tradition many families respect (VISION.md already frames it as a respect gesture, not necessarily personal belief). Don't drop it; soften the assertion and explain it. |
| Intake → "more profiling" | **Contradicts VISION ("Less Is the Answer", 4 questions)** | Do **NOT** add more questions. Instead make the **4 existing inputs visibly drive the output** (e.g. "who lives here: elderly + toddler" → armchair-with-arms near door, rounded/closed storage), and have the collaborator *say* it. That's the "profiling" he wants, delivered through the design. |
| Multi-user collaboration | **Scope trap given timeline** | Real-time co-editing = weeks of work. Ship the scoped version: a **read-only share link** to a design (contractor/family can view). Pairs with the existing contractor export. |
| Paints/floors/lighting quality | **Real** | **Curate 2–3 hand-picked material/lighting schemes per philosophy** instead of letting the LLM emit raw hex. Finishes then always look intentional. |

**Overall strategy:** stop trying to make the *general* system perfect (proven not to land in the time). Switch to **one undeniably good hero room + a few visible wins + an honest roadmap.** That story ("I triaged the feedback, shipped the high-leverage fixes, scoped the rest") is a *stronger* signal for conversion than a shallow-but-polished product.

---

## 4. The user's immediate intent (what THIS handoff is for)

The user wants to **go through the site screen by screen and make changes/tweaks** to visibly demonstrate they incorporated the feedback, ahead of a presentation to their **mentor** (the person who matters for conversion). They plan to do this over upcoming work sessions, **in a branch**.

**Your job in the next session:** help them walk the journey one screen at a time and make concrete, defensible improvements. Suggested order (fast wins first to build momentum, then the high-impact one):

1. **Directions/compass** — 2D `Planner2D.tsx` North arrow + N/S/E/W; 3D compass in the scene. _(fast, visible)_
2. **Narrow the AI collaborator** to safe ops; graceful decline on layout-breaking adds. _(stops live demo failures)_
3. **Curate finishes** — fixed paint/floor/lighting schemes per philosophy. _(StyleRoute + style prompt)_
4. **Vastu** — opt-in + explained, less assertive.
5. **Personalization loop** — wire 3–4 "who lives here" → furniture/placement rules; collaborator narrates them.
6. **Hero room** — hand-tune ONE room type × philosophy to genuinely-designed quality with the curated asset subset. _(highest impact)_
7. _(stretch)_ **Read-only share link** for a saved design.

Confirm with the user which screen/item they want to start with each session — don't assume.

---

## 5. Work already done THIS session (uncommitted — verify git state)

> ⚠️ As of this writing these changes were **made but NOT committed**, on branch `feat/room-presets`. Check `git status` / `git diff` first. If the user wants them kept, commit on the branch.

- **Placement safety net** — `backend/app/domain/intent/executor.py`: every in-place edit (move/scale/rotate/duplicate) is now **bounds-clamped + slid clear of other items** (helpers `_clamp_centre`, `_find_clear_centre`, `_effective_footprint`, `_slot_clear(exclude_id=…)`, `_wall_slot`, `_wall_flush_centre`). `_move` now takes a **semantic vocabulary**: `wall: "N|S|E|W"` (snap flush), `dx_mm/dz_mm` (nudge), or raw `x_mm/z_mm` (last resort). The AI can no longer push furniture through a wall or onto another piece.
- **Graceful AI failures** — `backend/app/graph/collaborator_graph.py`: `_deterministic_fallback` rewritten to reply **in the designer's voice** for `rate_limit` / `error` / `garbled` cases (no error codes leaked); rate limits trip the `LlmQuotaGate` circuit breaker. Frontend `PlannerRoute.tsx` chat `catch` no longer shows `(error: …)`.
- **Smarter collaborator** — `backend/app/prompts/voices.py`: `COLLABORATOR_SYSTEM` rewritten with a **"read the turn first"** framework. Greetings/thanks/questions now return **empty intents** (no room change); it only edits when actually asked, and pushes back on bad ideas. _(Verified live against Groq: "hi"/"thanks"/"what do you think?" → no changes; "add a rug" → acts.)_
- **Tests added** — `backend/tests/test_intent_placement.py` (5) and `backend/tests/test_collaborator_fallback.py` (10). Full backend suite was **green (47 passed)**.
- **Docs** — `PRESENTATION.md` (talk-track + deep narrative for presenting; **Part 0 is the spoken script**).

**Known issue surfaced by tests:** a preset can place a piece **longer than the room dimension** flush to a wall (e.g. a 4200 mm sofa in a 3600 mm-deep room). The clamp now *centres* it instead of clipping, but the real fix is a solver/preset guard. Relevant to the "rooms don't feel designed" complaint.

---

## 6. Technical orientation (so you can act fast)

**Run it:**
- Backend: from `backend/` → `./.venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000` (Windows venv). Tests: `./.venv/Scripts/python.exe -m pytest tests/ -q`.
- Frontend: from `frontend/` → `npm run dev` (port **5173**). Vite proxies `/api/*` → `http://127.0.0.1:8000` (`vite.config.ts`, strips `/api`).
- Platform is **Windows / PowerShell**. The venv python is `backend/.venv/Scripts/python.exe`. Note: reading source via cp1252 can choke on unicode — use `py_compile` or the Read tool, not `cat`.

**Stack (exact):**
- **Frontend:** React 18, Vite 5, TypeScript 5.6, three.js 0.169 + @react-three/fiber 8 + @react-three/drei 9 + @react-three/postprocessing, framer-motion 11, Zustand 5, @supabase/supabase-js 2, html2canvas + jsPDF. 2D plan is **hand-rolled SVG** (no lib).
- **Backend:** Python 3.11+, FastAPI + Uvicorn, Pydantic v2, LangGraph + LangChain, **langchain-groq** (Groq; running Llama-3.3-70B, Kimi K2 was the target), reportlab (PDF), huggingface-hub (catalog pull). 5 POST endpoints: `/generate`, `/chat`, `/apply`, `/cost`, `/export`.
- **DB/auth:** Supabase (Postgres + Row-Level Security). Frontend currently calls Supabase **directly** for saved designs (RLS-protected); the FastAPI `/designs/*` endpoints are vestigial. Known shortcut, deferred.

**Where things live (key files for the change list):**
- Screens (one per stage): `frontend/src/routes/{Home,Intake,Generating,Reveal,Planner,Style,Export}Route.tsx`
- 2D floor plan (add directions here): `frontend/src/components/Planner2D.tsx`
- 3D scene (add compass here): `frontend/src/three/RoomScene.tsx`, `CameraRig.tsx`, `RoomShell.tsx`
- AI collaborator pipeline: `backend/app/graph/collaborator_graph.py`
- Collaborator prompt / voice: `backend/app/prompts/voices.py`
- Intent execution (move/add/etc.): `backend/app/domain/intent/executor.py`
- Generation pipeline (3 visions): `backend/app/graph/generate_graph.py`
- Layout solver: `backend/app/domain/solver/{solver,partition,zones}.py`
- Presets (24, philosophy-distinct): `backend/app/domain/catalog/presets/`
- Catalog: `backend/app/domain/catalog/{hero_catalog.py,model.py,repository.py,selector.py}`
- Vastu rules: `backend/app/domain/vastu/rules.py`
- Cost/BOQ: `backend/app/domain/costing/engine.py`, `backend/app/domain/boq/`
- Confirm-gate guards: `frontend/src/lib/plannerGuards.ts`
- Style/finishing: `frontend/src/components/FinishingPanel.tsx`, style prompt in `voices.py` (`STYLE_SYSTEM`, `build_style_prompt`)

**Coordinate convention:** `(x_mm, z_mm)` = footprint **centre**, in mm. x = west→east, z = south→north (south = 0). Rotation 90/270 swaps effective width/depth.

---

## 7. Scope traps — do NOT do these without pushing back

- Real-time multi-user co-editing (offer the read-only share link instead).
- Adding more intake questions (contradicts VISION; make the existing 4 matter more).
- Trying to "fix the catalog" wholesale (curate a subset; it's a licensing/procurement problem).
- Chasing every furniture nitpick across all 24 presets (do one hero room well).

---

## 8. Pointers

- Product why: `VISION.md` (esp. "The Intake: Less Is the Answer", "The AI Collaborator: What Robustness Actually Means", "The 3D Experience: This Is Your Product").
- Architecture rules: `CLAUDE.md`.
- Presentation talk-track: `PRESENTATION.md` (Part 0).
- The user's auto-memory (loads each session) already records build history, the catalog swap, preset redesign, layout fixes, auth strategy, and the persistence shortcut.
