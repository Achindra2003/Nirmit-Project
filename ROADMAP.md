# Taking Nirmit Forward

A practical roadmap for what to build next, written after a substantial round of
feedback-driven work. Read `VISION.md` for the product soul and `HANDOVER.md` for
how the system actually works. This file is about *direction*.

---

## Where it stands today

Nirmit is a **working prototype** of the full loop: a homeowner answers a short,
room-adaptive intake and gets **three furnished, priced room layouts**, can edit
them (directly or by chatting with an AI), watches cost update live against
budget, and exports a **carpenter-ready quotation** (mm dimensions, buy-vs-build,
local language). Rooms are shareable and live-editable.

What is genuinely solid:
- The end-to-end journey works and is reliable (generation is deterministic).
- The room reflects the household (elderly → arms chair, joint family → storage).
- Cost is honest end-to-end (real ₹/sqft finishes, all-in number == the BOQ).
- The reveal is fast and never hallucinates furniture it didn't place.

What is **prototype-grade and gates everything**: the catalog. It uses an open,
non-commercial 3D dataset (3D-FRONT / Sweet Home 3D meshes). Trust, 3D fidelity,
and price realism all sit on top of it.

---

## The one principle to preserve

**Trust beats fidelity.** For a homeowner this is a *confidence tool*, not a
transaction tool — it takes someone from "I have no idea / I'll be overcharged" to
"I have a plan and a price I believe." Hold every change against one test:

> Would a real person screenshot the reveal and send it to their spouse — and hand
> the quote to a carpenter without embarrassment?

If a feature doesn't move that needle, it's polishing an unproven loop. Resist
adding fidelity (more swatches, fancier lighting) before the catalog is real.

---

## Near-term — what would *complete* the prototype (next few months)

Ordered by leverage. The first one unblocks the rest.

### 1. Real, licensed catalog  ← the #1 blocker
Replace 3D-FRONT/SH3D placeholder meshes with **licensed Indian-brand furniture**:
real models, real SKUs, real prices/stock. This is a procurement + data effort,
**not** an architecture change — the catalog is already a swappable data layer
(`backend/app/domain/catalog/`), and the pricing engine + BOQ read per-item rates,
so real prices flow through automatically. Until this lands, the "honest quote"
promise is only as honest as the placeholder prices.

### 2. Whole-flat / multi-room
Today each room is generated and priced independently. Add a **floor-plan
container** that runs the existing per-room engine for several connected rooms,
with shared style/palette across rooms, circulation between them, and one combined
budget + consolidated quotation. The room contract already exists per room; this is
a layer above it.

### 3. Production persistence (FastAPI-mediated + JWT)
Right now the frontend talks to Supabase **directly** (a deliberate demo shortcut;
see `project_persistence_shortcut` in memory). The correct architecture is the
React face → FastAPI brain → Supabase, with the backend verifying the Supabase JWT
and owning all writes. This also closes the RLS-only trust surface.

### 4. Finish collaboration (two-way, conflict-aware)
Live sharing works (Supabase Realtime, last-write-wins) and a **one-way** sync into
the owner's planner exists (`frontend/src/components/LiveSync.tsx`). To make it
real: stream the owner's edits live too (not only on Save), and replace LWW with
per-item or presence-based conflict handling so two people editing at once don't
clobber each other.

### 5. Lighting, orientation & Vastu depth
Rooms carry window `openings[]` and an entrance direction, and the 3D already
drives daylight from the window. Complete the loop: surface a **compass** so
orientation is an explicit, visible decision, then model real directional daylight
(E = soft morning, W = harsh evening, etc.) and deepen Vastu beyond opt-in tagging.
This is a *credibility detail* — do it after 1–3, not before.

---

## Bigger bets (the "wow" + the business)

- **AR room preview (mobile).** The room is already structured 3D data in mm — AR
  is the same models rendered through the phone camera (WebXR, or ARKit/ARCore in a
  native app) at true scale. A new renderer over the same data, not a rewrite. This
  is the strongest "make people believe it" feature.
- **Vendor marketplace.** The export already produces a structured quote — route it
  to local carpenters/vendors for bids or job claims. Mostly backend + partnerships.
- **Deeper AI in layout generation.** Move from fixed presets toward genuinely
  AI-arranged rooms — *without* losing the deterministic safety net (validate every
  AI placement through the same containment/clearance/overlap engine).

**Through-line for storytelling:** make people believe it (AR) → make the prices
real (catalog) → cover the whole home (multi-room) → connect to who builds it
(marketplace).

---

## Tech debt & cleanup to keep an eye on

- **Uncommitted work:** the one-way LiveSync feature (store `activeDesignId`,
  `LiveSync.tsx`, wiring in `App/Export/Home`) is implemented but **not committed**
  pending a two-window test. Decide: test → commit, or revert to `7b4ffac`.
- **LLM rate limits:** Groq free tier throttles. Generation is deterministic so it
  survives, but the AI collaborator goes quiet under throttle. For production, paid
  tier + response caching + the existing `LlmQuotaGate` circuit breaker.
- **LLM flags are OFF by default** (`backend/app/config.py`) for demo reliability —
  ranker/style/interpret. Turning them on adds "magic" but reintroduces
  rate-limit and nondeterminism risk. Revisit per-feature, not globally.
- **Catalog licensing** (3D-FRONT is CC-BY-NC) — must be resolved before any
  production ship. Prototype-only today.

---

## How to prioritize

Do the **cheap + trust-fatal** things before the **expensive + impressive** ones.
A wrong price or a hallucinated piece destroys trust instantly and is cheap to fix;
a beautiful render on a fake catalog earns nothing. Sequence: catalog → multi-room
→ persistence hardening → AR/marketplace.
