# Nirmit — Session Handover

**Status as of this handover: the *foundation is locked*. Architecture, data
contract, backend logic, solver, and the wired-up flow are in place and
verified. The visual 3D quality and UI/UX styling are explicitly *not* done —
that is the next team's job and this document tells you exactly where to go.**

Read `VISION.md` (product manifesto, the emotional arc, "the 3D is the king")
and `CLAUDE.md` (the architectural constitution) before changing anything.

---

## 1. What is verified vs. what is prototype

### Verified (don't break it)
- **Architecture**: hard split — Python/LangGraph **brain** (`backend/`), React/Three.js **face** (`frontend/`), talking over a JSON contract. An ESLint rule (`frontend/.eslintrc.cjs`) fails the build if the frontend imports an LLM SDK.
- **State Contract**: `backend/app/schemas/state.py` is the single source of truth. `frontend/src/api/types.ts` mirrors it (hand-kept in sync — regenerate via `backend/scripts/export_schema.py` if you wire up codegen).
- **8 endpoints**: `/generate` (intake → 3 visions), `/chat` (collaborator turn), `/apply` (intents → new room state), `/cost`, `/export` (PDF + JSON BOQ), `/finishing/options`, `/designs` (save/list/load/delete — SQLite), `/health`. All respond; smoke-tested live.
- **Domain logic** (`backend/app/domain/`): `solver` (anchor-then-relate, footprint-CENTRE coords, Vastu zone bias, sight-lines, room clamping — verified: 0 items outside the room), `vastu` (7 weighted rules), `costing`, `boq` (BOQ + Hindi spec + ReportLab PDF with a floor-plan sketch), `intent` (deterministic executor), `finishing`, `persistence`, `catalog`.
- **Backend tests**: `cd backend && pytest -q` → 20 passing (solver, vastu, generate graph, intent, BOQ/PDF, schema invariants).
- **Frontend build**: `cd frontend && npx tsc -b --noEmit` → clean. `npm run lint` → clean. Every route + Three.js module transpiles through Vite.

### Prototype / NOT done (your job)
- **3D visual quality**. The R3F scene works (real wall geometry, wall-fading so the interior is always visible, OrbitControls, ACES tone mapping, procedural floor textures, atmosphere props, camera presets, grounded GLBs) but **nobody has art-directed it**. It probably looks rough. This is "the king" per VISION.md.
- **The catalog is procedurally inflated, not real**. `backend/data/catalog.json` has ~3,600 SKUs generated from only **~84 GLB-backed hero items** (`backend/data/catalog_hero.json`) by cross-producting size × material × finish; every SKU reuses one of ~80 `.glb` files with a colour tint. It is a *number*, not a real product catalogue. Real product data + real models is a workstream.
- **The collaborator is dark without an LLM key**. No `GROQ_API_KEY` in `backend/.env` → `/chat` returns an honest fallback stub. Set the key (Groq free tier) to get the real "AI designer with opinions".
- **Vibe selection is SVG illustrations**, not photos (`frontend/src/components/VibeCard.tsx`). Intentional (zero-cost), but a real product would use real Indian-room photography.
- **Layouts are *valid*, not necessarily *beautiful***. The solver guarantees items are inside the room, the sofa hugs a wall facing the TV, the coffee table sits between them, the mandir lands in the NE. "Looks like a designer did it" is a higher bar that needs visual iteration.
- **No reveal-ceremony animation polish, no page transitions, no design-system pass on the routes** beyond `frontend/src/styles.css` tokens. Framer Motion is *not* installed (the legacy used it; we didn't re-add it).

---

## 2. How to run it

Two terminals.

**Backend** (`backend/`):
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
copy .env.example .env        # then paste GROQ_API_KEY (Groq free tier) for the chat
uvicorn app.main:app --reload --port 8000
```
Interactive API explorer: http://127.0.0.1:8000/docs

**Frontend** (`frontend/`):
```powershell
npm install
npm run dev                   # http://localhost:5173 — proxies /api → :8000
```

Regenerate the catalog (only if you change `_legacy_poc`):
```powershell
cd backend
python -m scripts.migrate_catalog   # _legacy_poc → data/catalog_hero.json (84 items)
python -m scripts.expand_catalog    # hero → data/catalog.json (~3,600 SKUs)
```

---

## 3. Where the UI/UX & 3D design team needs to go

### 3.1 Textures & materials (the floor / walls / GLBs)
| What | File | What to do |
|---|---|---|
| **Floor textures** | `frontend/src/three/RoomShell.tsx` → `makeFloorTexture()` | Currently a *procedural canvas* (wood-grain / tile / marble drawn with 2D canvas). Replace with real PBR texture maps (`THREE.TextureLoader` → albedo + normal + roughness + AO) per flooring type. The `flooring` string on `RoomState` selects which. Put textures in `frontend/public/textures/`. |
| **Wall finishes** | `frontend/src/three/RoomShell.tsx` → `makeWallMaterial()` | Plain `MeshStandardMaterial` with a colour + roughness. Add subtle wall-texture / limewash normal maps. The `wall_finish` string + `palette.wall` hex drive it. **Do not change wall geometry** — the four `WallBox` meshes are ref'd by `RoomScene`'s `WallFader`, which fades the two walls between the camera and the room centre each frame. Touch geometry and you break the see-into-the-room behaviour. |
| **Furniture (GLB) materials** | `frontend/src/three/GlbItem.tsx` → `GlbMesh` | Each placed item resolves a `.glb` from `frontend/public/models/` (~156 files; the catalog references ~80). The catalog SKU carries `tint_hex` + `roughness_hint` which are applied to the GLB's `MeshStandardMaterial`s at load. **Floor grounding is solved** (two-pass bbox: scale to fit the declared footprint, then re-measure and offset so the lowest vertex sits on y=0) — don't undo it. Real work here: better GLBs, real materials baked into the .glb, per-fabric texture variants instead of a flat tint. |
| **3D atmosphere props** | `frontend/src/three/Atmosphere.tsx` | Procedural low-poly chai mug / books / throw / plant / picture frame / diya placed relative to the placed furniture. Replace with nicer GLB props; keep the placement logic (`deriveProps`). |
| **Lighting** | `frontend/src/three/Lighting.tsx` | Warm directional sun (positioned opposite the entrance, where the window is) + sky fill + floor bounce; Kelvin-tunable via `RoomState.lighting_kelvin` (the Finishing panel sets it). Tune intensities / add IES profiles / shadow softness. |
| **Post-processing** | `frontend/src/three/PostProcess.tsx` | ACES tone mapping + subtle bloom + vignette via `@react-three/postprocessing`. Tune or add DoF on the "Eye" view. |
| **Camera presets** | `frontend/src/three/RoomScene.tsx` → `CameraController` | Four presets — `eye` (stand inside the doorway), `corner` (3/4, default), `top` (plan), `walk` (free-roam, pan enabled). They lerp camera + orbit target over ~0.8s then hand back to `OrbitControls`. Adjust framing here. |
| **Vibe images** | `frontend/src/components/VibeCard.tsx` | Replace the SVG `VibeIllustration` with real photographs. The `Vibe` enum (`warm_traditional` / `modern_minimal` / `earthy_crafted` / `light_airy`) is the contract — keep the ids. |
| **2D planner styling** | `frontend/src/components/Planner2D.tsx` | Architect-drawing SVG (hatched walls, door arc, window, drafting icons per category, compass, dimensions). Restyle the `DraftIcon`s and palette. **Coordinate convention: `item.position.{x_mm,z_mm}` is the footprint CENTRE** in room coords (0..width, 0..depth), rotated about that centre — same everywhere. |
| **Design tokens** | `frontend/src/styles.css` | Colour palette, typography (Inter / Lora / Tiro Devanagari Hindi), spacing scale, radii, shadows, motion easing, reduced-motion support. The route components use a mix of these CSS vars and inline styles — a real design-system pass would extract a component library. |
| **Route polish** | `frontend/src/routes/*.tsx` | `HomeRoute` (saved designs), `IntakeRoute` (4-step), `GeneratingRoute` (narrative loader), `RevealRoute` (full-screen vision + swipe + ceremony beat), `PlannerRoute` (chat-left + canvas-right), `ExportRoute` (BOQ + PDF download). Add Framer Motion page transitions, ceremony timing, micro-interactions. |
| **Quotation PDF look** | `backend/app/domain/boq/pdf.py` | ReportLab document — cover, floor-plan `RoomSketch` (mm dims + N-arrow), furniture/materials/labor tables, execution timeline, Hindi spec section. Restyle; register a Devanagari TTF for proper Hindi rendering (currently falls back to Helvetica which won't render Devanagari glyphs). |

### 3.2 The **drag ⇄ orbit conflict is resolved** — don't reintroduce it
- **`useAppStore.editMode`** = `"browse" | "move"` (default `"browse"`).
- **Browse**: `RoomScene` renders `<OrbitControls enabled={true} />`, every `GlbItem` gets `draggable={false}` → pointer-down on an item only *selects*, the cursor belongs to OrbitControls. Smooth orbit, no fighting.
- **Move**: entered via the **"↕ Move"** button in the selected-item controls strip (only shown in 3D). `RoomScene` gets `moveMode` → `<OrbitControls enabled={false} />`, and the *selected* item gets `draggable={true}` → pointer-down starts a floor-plane drag (snapped to 50mm grid + walls), release fires a `move` intent to `/apply`. **"✓ Done"** flips back. Deselecting the item (the × button or clicking empty canvas) also returns to browse — `setSelectedItem(null)` resets `editMode` in the store.
- In **2D** drag always works (there's no camera to fight); double-click an item rotates it 90°.
- If you add `DragControls` from drei, gate it on `editMode === "move" && isSelected` the same way — never have it active alongside `OrbitControls`.

---

## 4. How the state machine works

### 4.1 Frontend — `frontend/src/store/useAppStore.ts` (Zustand)
```
stage:  "home" → "intake" → "generating" → "reveal" → "planner" → "export"
        (App.tsx switches the rendered route on `stage`; `setStage` advances)

intake:           the 4-question IntakePayload (set by IntakeRoute)
visions:          Vision[] returned by POST /generate (set by IntakeRoute on success)
selectedVisionId: which of the 3 visions is "current" (RevealRoute swipes it; PlannerRoute edits it)

selectedItemId:   the furniture item the planner has selected (null = nothing)
editMode:         "browse" (locked, orbit-able) | "move" (drag the selected item, orbit off)
                  setSelectedItem(null) auto-resets editMode → "browse"
```
- **PlannerRoute** holds the *working* `room: RoomState` in local state (it mutates as you edit). On "Save to your home" it POSTs to `/designs`; on "Generate quotation" it advances `stage` to `export`. When the collaborator proposes a change, it lands in `pending` and is applied to `room` (and pushed back into `visions`) only when the user clicks "Apply".
- **All edits go through `POST /apply`** with a list of `Intent`s. The backend `apply_intents` executes them and — for structural changes (add / replace / scale / mix) — re-runs the solver to keep the room valid. For *manual placement* intents (`move`, `rotate`, `recolor_room`, `change_finish`) it does **not** re-run the solver, so a deliberate placement sticks.

### 4.2 Backend — the brain (`backend/app/`)
```
POST /generate  →  graph/generate_graph.py (LangGraph)
                   Interpret (parse who_lives_here for kids/elders)
                   → Layout (per philosophy: catalog selector → solver → Vastu reasoning)
                   → Rank+Explain (LLM authors the "why this was made for you" copy;
                                   deterministic fallback when no GROQ_API_KEY)
                   → GenerateResponse { visions: Vision[1..3] }

POST /chat      →  graph/collaborator_graph.py (LangGraph)
                   generate (LLM → reply + structured Intents; fallback stub if no key)
                   → parse (harden JSON) → apply (intent executor → proposed_room_state + cost delta)

POST /apply     →  domain/intent/executor.py  (pure, deterministic; solver re-lay for structural intents)
POST /cost      →  domain/costing/engine.py   (BudgetStory)
POST /export    →  domain/boq/                (BOQ + Hindi + ReportLab PDF, or JSON breakdown)
POST/GET /designs → domain/persistence/       (SQLite; session = X-Nirmit-Session header, set by the frontend)
GET  /finishing/options → domain/finishing/   (paint swatches / flooring / warmth presets)
```
- **`RoomState`** is the universal currency: `{ id, intake, items: PlacedItem[], palette, flooring, wall_finish, lighting_kelvin }`. `PlacedItem.position.{x_mm,z_mm}` = footprint CENTRE; `rotation_deg` rotates about it. **All math is millimetres** (CLAUDE.md §5). The frontend converts mm→m only at the rendering boundary (`frontend/src/three/units.ts`).
- **LLM provider**: Groq + `moonshotai/kimi-k2-instruct` by default (`backend/app/config.py`, `backend/app/llm/client.py`). The adapter is provider-swappable (Anthropic / OpenAI) via env.

---

## 5. Known gaps / suggested next steps for the design team

1. **Make one screen excellent first.** Pick the Reveal *or* the Planner and art-direct it end-to-end (lighting, materials, framing, motion) rather than spreading thin. That gives you the one undeniable "this is the product" moment.
2. **Real GLB models + materials.** The current ~80 reused models are the visual ceiling. Source/commission proper Indian-furniture GLBs with baked materials; keep the catalog schema (`backend/app/domain/catalog/model.py`).
3. **Real floor/wall textures.** Swap `makeFloorTexture` (procedural canvas) for PBR maps.
4. **Wire `GROQ_API_KEY`** so the collaborator is real.
5. **Devanagari font in the PDF.** Register a TTF in `backend/app/domain/boq/pdf.py` so the Hindi section renders.
6. **Framer Motion** for page transitions + reveal ceremony (the legacy used it; we removed it for the lock — re-add deliberately).
7. **Don't touch**: the wall-fading geometry/refs (`RoomShell` ↔ `RoomScene.WallFader`), the GLB grounding two-pass in `GlbItem`, the `editMode` browse/move gate, the footprint-CENTRE coordinate convention, the mm-everywhere rule. Those are the load-bearing logic fixes from this session.

— Signed off: foundation locked, build green (backend 20/20 tests, frontend tsc + lint clean), full stack runs.
