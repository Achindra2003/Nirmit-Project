# Nirmit — Demo Punch List

> The loop: Claude Code (Sonnet) fixes the top items → `npm run dev` + `uvicorn`
> → open in Chrome with the Claude extension → "QA the flow per DEMO_SCRIPT.md,
> screenshot, list every visual/interaction bug" → add new items here → repeat.
> Work P0 to zero before touching P1. Day 6 = hard stop on fixes, start rehearsing.

## P0 — demo-killers (a chunk of the 15 min is dead if these break)
- [x] `GROQ_API_KEY` set in `backend/.env` — copied from `.env.example` (key present).
- [ ] Cold start: `cd backend; pip install -e ".[dev]"; uvicorn app.main:app --reload --port 8000` works; `cd frontend; npm install; npm run dev` works; first open of "Your Home" doesn't crash on the empty state. _(`.env` now exists; needs live browser QA)_
- [x] GLB scaling seed entries in `assetTuning.ts` updated: ceiling fan/lamp yNudge, wardrobe entries, rugRounded. Sun lighting centred on room axis (was off by w/2). Needs Chrome QA pass for final scaleMul tweaks.
- [ ] Reveal renders cleanly — needs browser QA (code looks correct: camera at corner, wall fader, no near-clip issue).
- [ ] Planner select → ↕ Move → drag → ✓ Done loop — needs browser QA (code is correct).
- [x] `/apply` round-trip fixes: (1) `_add` relaxes room constraint so "add a study desk" works in living rooms; (2) COLLABORATOR_SYSTEM now includes parameter reference for `recolor_room` (lighting_kelvin), `add` (sub_category), etc.
- [x] Hindi PDF: `boq/pdf.py` checks `C:/Windows/Fonts/Nirmala.ttf` — Nirmala UI ships with Windows and has Devanagari. Should render without dropping a TTF. Needs one download test.

## P1 — janky but not fatal
- [ ] Reveal ceremony timing (fade → 1.5s hold → reveal + panels fade in), swipe between visions smooth, reasoning/cost panels readable.
- [ ] Planner: ↻ Rotate / ⧉ Duplicate work; Finishing mode actually changes the 3D (paint, flooring, lighting warmth); cost pulse on changes; camera-preset bar; "Apply this change?" proposal card.
- [ ] Intake: copy on the 4 questions, vibe cards look decent, slide transitions, budget slider.
- [ ] 3D: atmosphere props not floating/clipping; contact shadows under furniture; wall-fade smooth (the two walls between camera and room centre fade — verify it actually works).
- [ ] States: generating-screen narrative timing; API-down → graceful error message (not a white screen); loading/empty states.
- [ ] Page transitions between stages (re-add `framer-motion` — small dep, makes the demo feel finished).

## P2 — only if time
- [ ] Real vibe photos instead of SVG.
- [ ] Better GLB models / baked materials.
- [ ] Mixing feature polish ("bring the mandir from Gathering into Breath").
- [ ] Multi-room beyond living/bedroom.
- [ ] Mobile responsive.

## P3 — demo logistics (mandatory, not code)
- [ ] DEMO_SCRIPT.md finalised with real numbers from a live run.
- [ ] Rehearsed ≥3×; intake values memorised.
- [ ] Backup video recorded of the full 15-min flow.
- [ ] README tidy; `SESSION_HANDOVER.md` present; "what's prototype" line in the readme.
- [ ] Engineering-narrative bullets ready for Q&A (see DEMO_SCRIPT.md bottom).

---

### Bug log (add as Chrome QA finds them — newest first)
- _[date] [screen] [what's wrong] → [fix / status]_
