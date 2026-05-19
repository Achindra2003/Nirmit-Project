# Nirmit — Master Fix Prompt for Claude Code

You are working on **Nirmit**, an AI-powered Indian interior design tool.
Read this entire prompt before touching any file.

---

## What this product does

A user fills a short intake form (room type, dimensions, entrance direction, who lives there, vibe, budget). The backend generates **three room visions** — Gathering, Breath, Keeper — each a complete furniture layout with palette, flooring, and reasoning. The user picks one, then the AI collaborator and/or manual drag-and-drop lets them edit the room. This builds up a live cost estimate (BOQ). When happy, they move to a style page (paints/flooring/lighting) and finally download a quotation PDF.

The 3D room renders GLB models using Three.js. The backend is FastAPI + LangGraph + Python. The LLM is Groq + Llama 3.3 70B (free tier — keep it that way).

---

## Codebase map (read these files first before writing any code)

```
backend/app/
  schemas/state.py          — All Pydantic models: Intake, RoomState, PlacedItem, IntentKind, Vision, etc.
  domain/
    catalog/
      hero_catalog.py       — 67 catalog items with SKUs, dims, tint_hex, vibes
      selector.py           — Templates per (room_type, philosophy) + select_items()
    solver/
      zones.py              — ZoneTemplate definitions + ZONE_COMPOSITIONS dict
      solver.py             — _solve_zones() and _solve_flat() placement algorithms
    intent/
      executor.py           — apply_intent() dispatcher + _resolve() re-solver
  graph/
    generate_graph.py       — LangGraph: _interpret → _layout → _rank_and_explain
    collaborator_graph.py   — LangGraph: compose → generate → parse → apply → cost
  prompts/
    voices.py               — COLLABORATOR_SYSTEM, STYLE_SYSTEM, RANKER_SYSTEM, build_*_prompt()
  llm/
    client.py               — get_llm() — Groq by default, swappable via .env
  config.py                 — Settings: LLM_PROVIDER=groq, LLM_MODEL, API keys
  api/
    generate.py             — POST /generate
    chat.py                 — POST /chat

frontend/src/
  routes/
    IntakeRoute.tsx         — The intake form
    RevealRoute.tsx         — 3 visions shown, user picks one
    PlannerRoute.tsx        — 3D room + chat collaborator + edit controls
    StyleRoute.tsx          — Paint/flooring/lighting picker
    ExportRoute.tsx         — Quotation preview + PDF download
  three/
    GlbItem.tsx             — GLB loader, auto-fit scaling, per-asset tuning
    assetTuning.ts          — Per-GLB scaleMul and yNudge overrides
  components/
    VibeCard.tsx            — Vibe selector card (currently SVG, needs photography)
```

---

## The architecture in one paragraph

`/generate` runs: `_interpret` (parse intake → design_brief) → `_layout` (for each of 3 philosophies: `select_items()` picks furniture from catalog templates, `solve()` places them using zone compositions, `_llm_style()` picks palette/flooring) → `_rank_and_explain` (LLM writes the "why this was made for you" copy). Result: 3 `Vision` objects, each with a `RoomState`. `/chat` runs the collaborator: LLM reads room state + chat history → emits reply + intents → `apply_intent()` executes each intent against RoomState → `_resolve()` re-runs the solver → cost delta.

---

## The confirmed bugs — fix these in order, do not skip ahead

### Bug 1 — Layout degrades on every user edit (HIGHEST PRIORITY)

**File:** `backend/app/schemas/state.py` and `backend/app/domain/intent/executor.py` and `backend/app/graph/generate_graph.py`

**Problem:** `RoomState` has no `philosophy` field. When `_resolve()` in `executor.py` re-runs the solver after any edit, it cannot look up which zone composition to use, so it passes `zones=()` and calls `_solve_flat()`. Every sofa-faces-TV relationship breaks after the first edit.

**Fix:**

1. In `state.py`, add to `RoomState`:
```python
philosophy: str | None = None   # "gathering" | "breath" | "keeper"
```

2. In `generate_graph.py`, find where `RoomState(...)` is constructed inside `_build_vision()` and add:
```python
philosophy=philosophy.value,
```

3. In `executor.py`, in `_resolve()`, replace the `zones=()` (or missing zones argument) with:
```python
from app.domain.solver.zones import composition_for
zones = composition_for(room.intake.room_type.value, room.philosophy) if room.philosophy else ()
```

**Test:** Generate a living room. Note the sofa position. Use the collaborator to add a plant. The sofa must still face the TV after the add. If it moved randomly, the fix didn't work.

---

### Bug 2 — Collaborator told it cannot move furniture (QUICK WIN)

**File:** `backend/app/prompts/voices.py` line 51–52

**Problem:** The system prompt says `IMPORTANT: You cannot move or rotate furniture.` But `executor.py` already handles `IntentKind.MOVE` and `IntentKind.ROTATE` correctly.

**Fix:**

Replace those two lines with:
```
You CAN move and rotate furniture using the move and rotate intents. Only do so when the user explicitly asks to move or rotate a specific item.
  move   — {target_item_id: required, parameters: {"x_mm": <int>, "z_mm": <int>}}
  rotate — {target_item_id: required, parameters: {"rotation_deg": <0|90|180|270>}}
```

---

### Bug 3 — change_finish is a no-op stub

**File:** `backend/app/domain/intent/executor.py`, function `_change_finish()`

**Problem:** Returns room unchanged. `PlacedItem.catalog` already has `tint_hex` and `roughness_hint` fields on `CatalogRef` — the executor just never writes them.

**Fix:**
```python
def _change_finish(room: RoomState, target_id: str | None, params: dict) -> RoomState | None:
    if not target_id:
        return None
    tint = params.get("tint_hex")
    roughness = params.get("roughness_hint")
    if tint is None and roughness is None:
        return room
    out = []
    found = False
    for it in room.items:
        if it.id == target_id:
            new_catalog = it.catalog.model_copy(update={
                k: v for k, v in {"tint_hex": tint, "roughness_hint": roughness}.items()
                if v is not None
            })
            out.append(it.model_copy(update={"catalog": new_catalog}))
            found = True
        else:
            out.append(it)
    return room.model_copy(update={"items": out}) if found else None
```

---

### Bug 4 — CatalogueDrawer sends wrong intent kind

**File:** `frontend/src/routes/PlannerRoute.tsx` around line 366

**Problem:** The Add button calls `kind: "add_item"` which doesn't exist in `IntentKind`. Should be `kind: "add"`.

**Fix:** Find the `onAdd` handler in the catalogue drawer and change it to:
```typescript
onAdd={(sku, sub) => applyOneIntent({ kind: "add", target_item_id: null, parameters: { sku, sub_category: sub } })}
```

Also wire the drawer to `GET /catalog` (add this endpoint — it just calls `get_catalog()` and returns all items filtered by the room type from the current room state) instead of the static hardcoded `CATALOGUE_BY_TYPE` object in the frontend.

---

## The feature builds — do these after all 4 bugs are fixed

### Feature 1 — LLM-driven design brief (replaces keyword matching)

**File:** `backend/app/graph/generate_graph.py`, function `_interpret()`

**Current problem:** `_interpret()` does keyword matching producing only 2 booleans. `who_lives_here: "my mother is 78 with a hip replacement and we have a four-year-old"` produces `{"has_kids": true, "has_elderly": true}` — all richness discarded.

**Replace `_interpret()` with an LLM call:**

```python
def _interpret(state: GenerateState) -> GenerateState:
    intake = state["intake"]
    
    INTERPRET_SYSTEM = """You extract a structured design brief from an Indian homeowner's intake.
Output ONLY valid JSON, no markdown, no commentary.
{
  "has_kids": bool,
  "kid_age": "toddler|school|teen|none",
  "has_elderly": bool,
  "mobility_concern": bool,
  "entertains_guests": "frequent|occasional|rare",
  "needs_storage": "high|medium|low",
  "spiritual_practice": "daily_mandir|occasional|none",
  "works_from_home": bool,
  "avoid_glass_surfaces": bool,
  "vibe": "<echo the vibe>",
  "vastu_enabled": bool
}
Be conservative: only set a flag true if the text clearly supports it."""

    prompt = f"""Room: {intake.room_type.value}
Who lives here: {intake.who_lives_here}
Vibe: {intake.vibe.value}
Vastu matters: {intake.vastu_matters}
Budget: ₹{intake.budget_inr}
Keep existing: {intake.keep_existing or 'nothing mentioned'}"""

    try:
        from langchain_core.messages import HumanMessage, SystemMessage
        from app.llm import get_llm
        import json, re
        llm = get_llm(temperature=0.2)
        raw = llm.invoke([SystemMessage(content=INTERPRET_SYSTEM), HumanMessage(content=prompt)])
        text = raw.content if hasattr(raw, "content") else str(raw)
        m = re.search(r'\{.*\}', text, re.DOTALL)
        if m:
            brief = json.loads(m.group(0))
            return {**state, "design_brief": brief}
    except Exception:
        log.warning("LLM interpret failed, falling back to keyword matching", exc_info=True)
    
    # Fallback: keyword matching (keep existing logic here)
    text = intake.who_lives_here.lower()
    has_kids = any(k in text for k in ("kid", "child", "son", "daughter", "baby", "toddler"))
    has_elderly = any(k in text for k in ("mother-in-law", "grand", "elder", "parents", "father-in-law"))
    return {**state, "design_brief": {
        "has_kids": has_kids, "has_elderly": has_elderly,
        "kid_age": "none", "mobility_concern": has_elderly,
        "entertains_guests": "occasional", "needs_storage": "medium",
        "spiritual_practice": "none", "works_from_home": False,
        "avoid_glass_surfaces": has_kids, "vibe": intake.vibe.value,
        "vastu_enabled": intake.vastu_matters,
    }}
```

Then update `selector.py`'s `select_items()` to use the richer brief:
- `mobility_concern: true` → swap `coffee_table` → `coffee_table_round`, promote `lounge_chair` to mandatory
- `avoid_glass_surfaces: true` → skip glass-tagged items (add a `materials: list[str]` field to `CatalogItem` — mark relevant items)
- `needs_storage: high` → promote all storage requirements one level (optional→recommended, recommended→mandatory)
- `spiritual_practice: daily_mandir` → promote `mandir_wall` to mandatory
- `entertains_guests: frequent` → add `accent_chair` as recommended in Gathering

---

### Feature 2 — Catalog-aware collaborator

**File:** `backend/app/prompts/voices.py`, function `build_collaborator_prompt()`

**Current problem:** The collaborator only sees placed items, never what's available to add. It hallucinates SKUs.

**Add a catalog snapshot to the prompt:**

```python
def build_collaborator_prompt(*, intake, room, history, user_message):
    from app.domain.catalog.repository import get_catalog
    catalog = get_catalog()
    relevant = [
        i for i in catalog._items
        if intake.room_type in i.rooms
    ][:30]
    catalog_lines = "\n".join(
        f"  - {i.sub_category} · {i.name_en} · ₹{i.price_inr:,} · {i.dimensions.width_mm}×{i.dimensions.depth_mm}mm · sku={i.sku}"
        for i in relevant
    )
    
    items_lines = "\n".join(
        f"  - id={it.id} {it.name_en} ({it.category}) {it.dimensions.width_mm}x{it.dimensions.depth_mm}mm "
        f"at ({it.position.x_mm}, {it.position.z_mm}) rupees {it.price_inr}"
        for it in room.items
    )
    history_lines = "\n".join(f"  {h['role']}: {h['content']}" for h in history[-8:])
    
    return f"""ROOM STATE
  Room: {intake.room_type.value} {intake.room_dimensions.width_mm}x{intake.room_dimensions.depth_mm}mm
  Vibe: {intake.vibe.value}, Budget: ₹{intake.budget_inr}, Vastu: {intake.vastu_matters}
  Who lives here: {intake.who_lives_here}

PLACED ITEMS
{items_lines}

AVAILABLE TO ADD ({intake.room_type.value} room)
{catalog_lines}

When adding items, use the exact sku from AVAILABLE TO ADD above.

CONVERSATION SO FAR
{history_lines or "(this is the first turn)"}

USER: {user_message}

Respond as the JSON described in the system prompt. The user-facing `reply` must satisfy all four voice rules."""
```

---

### Feature 3 — Proactive first-look suggestions

**File:** `backend/app/api/chat.py` and `backend/app/graph/collaborator_graph.py`

**What it does:** On PlannerRoute mount, fire a `/chat/first-look` call. The collaborator returns 3 suggested intents with reasoning, but does NOT apply them. The frontend shows them as "Accept / Skip" cards.

**Backend — new endpoint:**

```python
# In chat.py
@router.post("/chat/first-look", response_model=ChatResponse)
async def chat_first_look(req: ChatRequest) -> ChatResponse:
    # Inject special first-look marker into message
    req_modified = req.model_copy(update={"message": "__FIRST_LOOK__"})
    result = await _graph.ainvoke({
        "room_state": req_modified.room_state,
        "history": [],
        "message": "__FIRST_LOOK__",
        "available_visions": req.available_visions,
        "first_look_mode": True,  # intents returned but NOT applied
    })
    return result["response"]
```

**System prompt addition in `COLLABORATOR_SYSTEM`:**

```
FIRST LOOK MODE: When you see message "__FIRST_LOOK__", switch to suggestion mode.
Look at this room as if you just walked in. Produce exactly 3 specific, opinionated intents
that would most improve this room for this specific household.
In your reply, explain each suggestion in one sentence referencing who lives there.
Intents are suggestions only — do not apply them, the user will accept or skip.
```

**Frontend — PlannerRoute:**
- On mount, call `/chat/first-look` with the current room state
- Render the returned intents as 3 cards with Accept/Skip buttons above the chat input
- Accept → fire that intent via the existing `applyOneIntent()` flow
- Skip → dismiss the card

---

### Feature 4 — 3-panel vision comparison on RevealRoute

**File:** `frontend/src/routes/RevealRoute.tsx`

**Current problem:** One vision at a time with ‹ › arrows. The entire product proposition is "choose your world" — you can't choose between three things you can't see simultaneously.

**New layout:**
```
┌────────────────────────────┬──────────────────┐
│  THE GATHERING             │  ● The Keeper    │
│  (full 3D canvas)          │  [top-view scene]│
│                            │  ₹XXk            │
│  [reasoning card]          ├──────────────────┤
│  ₹XXk · under budget       │  ○ The Breath    │
│  [Choose this room →]      │  [top-view scene]│
│                            │  ₹XXk            │
└────────────────────────────┴──────────────────┘
```

- Left panel: selected vision, full 3D, existing RoomScene with camera controls
- Right panel: the other two as small `RoomScene` components with `view="top"` (plan view) — shows layout difference immediately, cheaper to render
- Clicking a thumbnail on the right promotes it to the left panel (swap selectedVisionId)
- Mobile: dot navigation remains, 3-panel stacks vertically

**Performance note:** Don't render all three full 3D scenes simultaneously — use `view="top"` for thumbnails which is a flat orthographic render.

---

### Feature 5 — GLB auto-fit fix

**File:** `frontend/src/three/GlbItem.tsx` around line 244

**Current problem:** `Math.min(horizontal_fit, vertical_fit)` — wide floor furniture scales down to its height. A 2200mm wide sofa that's only 850mm tall renders tiny.

**Fix — horizontal-priority:**
```typescript
// Current — wrong for floor furniture
const scale = Math.min(Math.max(w, d) / Math.max(size.x, size.z), h / size.y) * tuning.scaleMul;

// Fixed — footprint drives scale, height is approximate
const scaleH = Math.max(w, d) / Math.max(size.x, size.z);
const scale = scaleH * tuning.scaleMul;
// yNudge in assetTuning.ts handles per-asset vertical correction
```

Also fix `assetTuning.ts` — add specific entries for the 5 worst offenders:
- `dining_6.glb` — check if chairs float or sink
- `wardrobe.glb` — tall item, verify it doesn't clip ceiling
- `bookshelf_tall.glb` — same
- `sofa_l.glb` — L-shape, verify footprint alignment
- `ceiling_fan.glb` — overlay item, should hang from ceiling not float at floor level

---

### Feature 6 — PDF export as iframe

**File:** `frontend/src/routes/ExportRoute.tsx`

**Current problem:** The React preview and the PDF are two separate renderers — they will visually drift over time.

**Fix — render the actual PDF in the preview:**

```tsx
// Instead of rendering BOQResponse as HTML sections:
const pdfUrl = `/api/export?format=pdf&room_state=${encodeURIComponent(JSON.stringify(roomState))}`;

return (
  <div className="export-container">
    <iframe
      src={pdfUrl}
      style={{ width: "100%", height: "80vh", border: "none" }}
      title="Quotation preview"
    />
    <a href={pdfUrl} download="nirmit-quotation.pdf">
      <button>Download PDF</button>
    </a>
  </div>
);
```

The download button is the same URL — the browser triggers a save instead of iframe embed. User sees exactly what they download.

---

## LLM cost budget — keep it free

Each `/generate` call fires:
- 1× `_interpret()` LLM call (new — ~200 tokens in, ~100 out)
- 3× `_llm_style()` calls (~300 tokens in, ~50 out each)
- 3× `_rank_and_explain()` calls (~600 tokens in, ~200 out each)
- **Total: ~3,000 tokens per /generate**

Each `/chat` call fires:
- 1× collaborator call (~800 tokens in, ~200 out)

Groq free tier: 14,400 requests/day + 500,000 tokens/day on Llama 3.3 70B.
At 30 DAU with 2 generates + 5 chat turns each: ~60 generate calls (180k tokens) + 300 chat calls (300k tokens) = ~480k tokens/day. **Within free tier.**

**Do not switch to Claude or GPT-4 for these calls** — structured JSON outputs are Llama 3.3's strength and it's free. Save expensive models for if/when you need richer prose.

---

## Build order — do not deviate

1. **Bug 1** — `philosophy` on RoomState + re-solve threading (3 files, ~15 lines)
2. **Bug 2** — Remove "cannot move" line, add move/rotate docs (1 file, ~5 lines)
3. **Bug 3** — `_change_finish` writes tint_hex (1 file, ~12 lines)
4. **Bug 4** — CatalogueDrawer intent kind + wire real catalog endpoint (2 files)
5. **Feature 1** — LLM-driven design brief in `_interpret()` (1 file)
6. **Feature 2** — Catalog snapshot in collaborator prompt (1 file, ~15 lines)
7. **Feature 3** — First-look proactive suggestions (2 files + frontend cards)
8. **Feature 4** — 3-panel RevealRoute (1 file)
9. **Feature 5** — GLB auto-fit fix + assetTuning entries (2 files)
10. **Feature 6** — PDF iframe on ExportRoute (1 file)

After each item: run the backend tests (`pytest backend/tests/`), check the frontend builds (`npm run build` in frontend/), and do a manual smoke test on a living room generation before moving to the next item.

---

## What "done" looks like

Generate a living room with intake: `who_lives_here="Joint family — parents, us, and our 3-year-old. My mother-in-law has bad knees."`, `vibe=warm_traditional`, `vastu_matters=true`.

✓ Three visions generate without errors  
✓ Each vision has a sofa, TV unit, coffee table, mandir — all present  
✓ Sofa faces TV in all three (sight-line check: draw mental line from sofa center forward, it hits the TV unit)  
✓ Gathering has a lounge_chair (mandatory for mobility_concern); Breath does not  
✓ Coffee table is `coffee_table_round` (avoid_glass_surfaces from toddler)  
✓ Mandir is in NE zone (vastu_matters=true)  
✓ Reasoning copy cites the mother-in-law's knees and the toddler specifically  
✓ User removes the ottoman → sofa still faces TV (Bug 1 fixed)  
✓ User types "move the bookshelf to the other wall" → collaborator emits a move intent (Bug 2 fixed)  
✓ Collaborator says "add a floor lamp" → uses real SKU from catalog, not hallucinated (Feature 2)  
✓ RevealRoute shows all 3 visions simultaneously (Feature 4)  
✓ ExportRoute PDF preview matches the downloaded file exactly (Feature 6)
