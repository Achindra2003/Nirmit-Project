# Nirmit — Internal Presentation Guide

> A speakable narrative for presenting Nirmit internally: **what it is, why it exists, what it is *not*, how it was built and why, and a screen-by-screen walkthrough.**
> Read top-to-bottom to rehearse; jump to Part 5 for the live demo script.

---

## How to use this doc
- **Part 0 is the talk track** — the linear thing you actually *say* while clicking through. Read this one; the rest is backup.
- **Parts 1–3** = deeper "story" material if you want to expand a point or get asked "why".
- **Part 4** = the engineering decisions + the *why* behind each (for technical questions).
- **Part 5** = the click-by-click demo with phrasing and what to avoid.
- **Part 6** = honest limitations + roadmap. Own these; it reads as confidence, not weakness.

---

# PART 0 — The Talk Track (just speak this, screen up)

> Stage directions in [brackets]. Everything else is the gist of what you say — put it in your own words, don't recite it.

**Open with the problem (no app yet, or on the Home screen):**
"So — every year millions of Indian families furnish a flat. It's the second-biggest spend after the home itself, and the process is genuinely broken. You've got two options. One is Livspace or DesignCafe — great design, but a five-lakh minimum, locked to their contractors, weeks of back-and-forth, and it feels like a sales trap. The other is your local carpenter — brilliant at building, but he's not a designer, so he turns to you and says *'madam aap batao kahan kya chahiye.'* And you're standing in an empty room pointing at walls, hoping it turns out okay. There's no middle path where you can actually *see* your flat designed before you spend the money. That's the gap Nirmit fills."

**What it is, in one breath:**
"Nirmit is an interior designer for Indian homes. You answer four questions, it draws you three fully-furnished 3D rooms of your *actual* flat, you refine them just by talking to an AI designer, and you walk out with a quotation your carpenter can build from. But honestly the real product isn't the features — it's a feeling. The feeling of being understood by someone with great taste who also happens to know your budget. Everything you're about to see is in service of that one feeling."

**Then: "let me just show you."** [Click Start designing.]

**Intake** — [pick The Gathering · Living Room · Large · type a real sentence + tick Vastu · ₹3L]:
"Four questions, about ninety seconds. The key one is this — *who lives here* — and it's free text, not checkboxes. I can say 'mother-in-law visits often, we've got a four-year-old, tons of toys.' Because the whole bet is that it reasons about *Indian* life — storage as a real problem, the prayer space, multi-generational comfort. Every extra question we'd add is just a reason for someone to leave, so we ask the minimum and discover the rest later." [Draw my room.]

**Generating** — [let it play]:
"Now — this isn't a loading spinner. It's showing its work. Big pieces first, then the details, then Vastu and daylight, then it prices the whole thing. It's making the wait feel like something's being built *for you*."

**Reveal** — [click ENTRY; flip the 3 visions; open Vastu tab; point at the budget]:
"This is the payoff. Notice it's not a floor plan — Priya doesn't think in floor plans, she thinks 'what will a guest see when they walk in.' So we show the room from the entrance. Three genuinely different *ways to live* in the room — not three palettes of the same thing. And it tells you *why* it made each choice — here's the Vastu reasoning, mandir in the north-east. And cost is always shown against the budget, so it's never a nasty surprise at the end." [Open this room.]

**Planner — the heart.** [Beat 1: type "hi", then "what do you think of this layout?"]:
"This is where you refine. And the first thing I want to show is that it actually *listens* — watch, I say hi, it says hi back like a person. I ask its opinion, it gives me an honest critique with reasons — and it changes *nothing*. It's a collaborator, not a genie that blindly does whatever I type."
[Beat 2: type "add a hand-knotted rug" → Apply on the proposal card]:
"When I *do* want a change, it proposes it *with the cost impact*, and I decide. Intent in, change out — I never touch a slider or a coordinate."
[Beat 3: click the sofa → ⇄ Style a couple times]:
"Tap any piece and cycle styles — it stays inside the room's philosophy so the layout never breaks."
[Beat 4: Edit → drag a piece in 2D, or say "move the sofa to the west wall"]:
"And I can just drag things, or tell it 'put the sofa on the west wall.' It keeps everything inside the walls for me."
[Optional: ✕ Remove the only sofa → confirm dialog]:
"And it has opinions — try to remove the only sofa and it stops me. Opinionated collaborator, not a yes-man." [Tune the materials.]

**Style** — [make one change]:
"Then the finish — real Indian materials and brands, palette and lighting, all updating live."

**Export — close here, strong:** [select Contractor; show redacted prices + local-language section; generate PDF]:
"And this is the whole point. The output isn't a pretty picture — it's a quotation your *carpenter* can build from. Specs in his language, the client's pricing redacted so he can't see the markup. We call it the Suresh standard: if Suresh can build it with zero ambiguity, we did our job."

**Close (one line):**
"So that's it — tell it how you live, it draws and reasons, you refine by just talking, and it hands your carpenter something buildable. The middle path that didn't exist before."

**If asked 'what's not done yet' / 'what's next':** see Part 6 — be honest: fine-grained AI moves, a licensed catalogue for launch, moving saves behind the API. Owning those lands better than pretending it's finished.

---

# PART 1 — What Nirmit Is

**One line:** Nirmit is interior design for Indian homes — you answer four questions, it draws three fully-furnished 3D rooms for your actual flat, you refine them by talking to an AI designer, and you walk away with a quotation your local carpenter can build from.

**The feeling it sells (this is the real product):**
> *"The feeling of being understood by someone with great taste who also happens to know your budget."*

Everything in the product either produces that feeling or dilutes it. Nirmit is **not** competing on features — it's competing on a feeling. That framing comes straight from `VISION.md` and it's the test for every decision.

**The shape of it:** a guided journey through seven screens —
`Home → Intake → Generating → Reveal → Planner → Style → Export`
— that walks the user through five emotional states (see Part 2).

---

# PART 2 — Why It Exists (the problem + the philosophy)

## The market gap
Furnishing a flat is an Indian family's **second-biggest expense after the home itself**, and the process is broken into two bad options:

- **The expensive route — Livspace / DesignCafe:** professional, but ~₹5L minimum, locked to *their* contractors, takes weeks, feels like a sales trap.
- **The cheap route — your neighbourhood carpenter:** great at building, but not a designer. He needs *you* to tell him exactly what you want. So you stand in an empty room, point at walls, and hope.

There is **no middle path where you can actually *see* your flat designed before you commit money.** Nirmit is that middle path.

## The person we build for (use her by name)
**Priya and Rohan, 2BHK in Thane.** Four-year-old, Rohan's mother stays often, lots of accumulated stuff. They want movie-night seating, an east-facing pooja space, storage to hide the toys, a small work desk — all Vastu-respecting because Rohan's mother believes in it. Budget ~₹3L. Livspace quoted ₹7L. Their carpenter Suresh keeps asking *"madam aap batao kahan kya chahiye."* They're stuck.

Every design choice answers: **does this make Priya feel understood?**

## The emotional arc IS the product
We don't think in features; we think in emotional states the user moves through:

| State | Screen that owns it |
| --- | --- |
| **Overwhelmed** → | (arrives here) |
| **Understood** | Intake — "they get my life" |
| **Excited** | Reveal — "I couldn't have imagined this alone" |
| **Confident** | Planner — "I have taste; I'm making good calls" |
| **Ready to act** | Export — "I can actually do this" |

If any screen moves her *backwards* — intake that feels like a form, a reveal that makes her uncertain, a chat that feels like operating software — that screen has failed. The fix is never "add a feature"; it's "return to the emotional-state question."

## Cultural sovereignty (the moat)
This is **not** a global SaaS with a Hindi paste-over. Nirmit demonstrates, through behaviour, that it was built by people who understand Indian domestic life:

- **Vastu is geometry, not garnish.** Not a toggle — a spatial logic that decides which walls things sit against, what the entrance view is, which corners stay clear. The mandir gets the north-east, and the app explains *why*.
- **Storage is architecture, not a feature.** Indian homes accumulate; every wall earns its keep.
- **Multi-generational living is designed for, not accommodated.** A grandmother who visits often is a resident — a chair with arms, a view of the door, proximity to the pooja.
- **The guest moment matters.** What a guest sees walking in is a real design requirement.
- **The carpenter writes his quote on a half-sheet, in his language.** So the BOQ is generated in Hindi / Marathi / Tamil depending on the user's city.

---

# PART 3 — What Nirmit Is NOT (scope boundaries — important for an internal audience)

State these explicitly; it shows the scope was deliberate, not accidental.

- **Not a furniture e-commerce site.** The catalogue is never browsed as a grid — it's *discovered* through the design (AI suggestions, "try another style", contextual search). Turning Priya into a SKU shopper kills the feeling.
- **Not a CAD / floor-plan tool.** Priya doesn't think in floor plans. The reveal is an *experience* (warm 3D room from the entrance), not a schematic. The 2D plan exists for the carpenter, not as the primary reveal.
- **Not a configurator.** Mixing visions is framed as *"tell me what you love about each,"* not "mix and match modules." Love, not selection.
- **Not a command interface.** The AI is a **collaborator with opinions**, not a genie that executes literal commands. It takes a position, explains, and sometimes pushes back.
- **Not a precision measurement tool (yet).** Intake takes *approximate* sizes ("medium", "16×18 ft"). Precision is for the planner, not the front door.
- **Not gated behind sign-up.** Auth is optional and late — the entire magic (intake → reveal → planner → export) works signed-out. Sign-up is promoted only at Save, never as a wall.
- **Not a production catalogue.** Current 3D furniture is from the 3D-FRONT research dataset (CC-BY-NC) — **prototype only, must not ship commercially.** A licensed catalogue is a pre-launch requirement.
- **Not handling kitchen / bathroom flows in v1.** Living, bedroom, dining, study are wired; kitchen/bath/pooja are deliberately out of the v1 intake.

---

# PART 4 — How It Was Built, and Why (the engineering narrative)

This is the heart of an internal talk. Each subsection is **a decision + the reasoning**, so you can defend "why did you do it this way?"

## 4.1 The starting point: inherit intelligence, not architecture
There was a legacy proof-of-concept (`_legacy_poc`) — a TypeScript app with all the intelligence scattered across the frontend (`layoutService.ts`, `chatEngine.ts`, `materialService.ts`, `costing.ts`). It worked, but the AI and business logic were welded to the UI, so it couldn't evolve.

**Decision:** rebuild from scratch as a **headless brain + pure face**, and treat the legacy as a quarry — *"extract the intelligence, leave the spaghetti"* (the math, the asset dimensions, the catalogue structure were worth keeping; the coupled architecture was not).

**Why it matters:** every "intelligent" thing now lives in one place, is independently testable, and the LLM provider is swappable. The frontend can't make a bad design decision because it doesn't make *any* design decisions.

## 4.2 The architecture: Brain / Face / Document, hard-separated
Three parts, talking only through JSON:

```
BACKEND (Python)              FRONTEND (React)          DOCUMENT
FastAPI · LangGraph · LLM ←→  UI/UX only            →   Quotation (PDF)
all intelligence             no AI, no business logic
```

- **The Headless Brain** (`backend/`) — layout math, Vastu rules, vibe-aware naming, costing, the chat agent. It can run with no UI at all.
- **The Pure Face** (`frontend/`) — renders rooms, captures intent, ships the artefact. Owns zero intelligence; even validation is backend-side.
- **The Contract** — JSON generated from Pydantic models (`backend/app/schemas/`), mirrored to `shared/contracts/`. The schema is the single source of truth.

**The API is five endpoints:** `/generate`, `/chat`, `/apply`, `/cost`, `/export`. That's the entire surface between brain and face.

**Why LangGraph specifically:** generation isn't one LLM call — it's a *workflow* with conditional stages (Room Interpreter → Furniture Selector → Layout Generator → Ranker/Explainer, then a live stateful Collaborator agent). LangGraph makes those stages explicit and debuggable instead of buried in silent TypeScript failures.

## 4.3 The LLM stack: fast and swappable
**Decision:** Groq as the provider (Kimi K2 was the target model; currently running Llama-3.3-70B), behind a one-function adapter (`backend/app/llm/client.py`) so swapping to Anthropic/OpenAI is a `.env` change, not a migration.

**Why:** Groq is fast (the chat needs to feel live), and the adapter keeps us off any single vendor's lock-in. There's also a **rate-limit circuit breaker** (`LlmQuotaGate`) so one 429 pauses optional calls instead of hammering the provider.

## 4.4 Spatial integrity: everything in millimetres
**Decision:** all dimensions, collision math, and placement logic are in **mm** (a hard constraint from `CLAUDE.md`). The legacy catalogue was in metres, so the swap included a unit conversion.

**Why:** the output has to be *buildable*. A carpenter's quote can't have rounding ambiguity. Coordinate convention: `(x_mm, z_mm)` is the footprint **centre**; x runs west→east, z runs south→north.

## 4.5 Layout: from procedural to curated presets
This evolved across two branches (worth showing as "we tried it both ways"):

- **`main` — procedural:** a catalogue-aware *FittingPlacer* (clearance zones per item type) + a *squarified treemap* to partition large rooms into zones. Flexible, but it sometimes produced layouts that read as *amateur* — the root of the "it feels off" complaint.
- **`feat/room-presets` (current) — curated presets:** 24 philosophy-distinct preset rooms (room-type × Gathering/Breath/Keeper), built on the vendored `blueprint3d-modern` engine with curated GLB furniture. Each preset is audit-clean: sofa+TV on facing walls, bed on the wall away from the door, door-clearance checks, mandir in the NE.

**Why:** for a demo and for quality, *curated beats clever*. Presets give us layouts we can stand behind, while the intent executor still lets the user (and AI) modify freely on top.

## 4.6 The catalogue: real meshes, discovered not browsed
**Decision:** replaced the 2,853 legacy "toy" entries with **3D-FRONT** furniture meshes (per-object GLBs) for warm, real-looking 3D.

**Why / caveat:** 3D-FRONT is **CC-BY-NC** — fine for a prototype, *not* for production (flagged in Part 6). The catalogue is surfaced only three ways, never as a grid: **AI suggestions**, **"try another style" alternatives**, and **search** — per the VISION rule that the catalogue is *discovered, not listed*.

## 4.7 Intake: "less is the answer"
**Decision:** exactly **four questions** — vibe (image-first cards), room + size, who lives here (free text + chips), budget + city. Entrance direction was *removed* and defaulted to South (most users don't know it and it barely changes cost/visuals).

**Why:** *every question is a reason to leave.* Priya came to see her room, not fill a form. We ask only what the AI can't infer and discover everything else *through the design* — "I've put the mandir in the NE, does that work?" is a better Vastu question than a checkbox.

## 4.8 Generating: a narrative, not a spinner
**Decision:** an ~11-second animated floor-plan-being-drawn with working-notes narration (Listening → Placing big pieces → Details → Vastu & daylight → Pricing).

**Why:** this is an *emotional beat*, not a load screen. It makes the wait feel like something is being **made for you**. Meanwhile the brain solves all three visions in parallel.

## 4.9 Reveal: feeling over evaluation
**Decision:** three full visions, each shown one at a time from **three camera angles** (Entry / Room / Plan), with an italic *"why this room was made for you"* reasoning card, a **Vastu tab** (when opted in), and the **budget story**.

**Why:** showing 3 layouts side-by-side puts the user in *evaluation mode* (cognitive work, kills feeling). Showing one room beautifully, with the reasoning, produces the "I want this" moment. The vision *names* ("The Long Wall", "The Open Centre") point at a real spatial feature, never a vibe word.

## 4.10 Planner: intent-based editing + an opinionated collaborator
This is the product. Three deliberate mechanics:

1. **Intent-based editing, not manipulation.** Tap a piece → *Make bigger / Change fabric / Try a style / Remove* — not resize handles and rotation dials. The only direct manipulation is **drag to move** (intuitive, and clamped to valid positions).
2. **The AI collaborator** (`/chat`) — reads the full room + intake every turn, takes a position, explains, and applies changes via a **proposal card** (you see the cost delta and click Apply / Not yet).
3. **Confirm-gate guards** (`plannerGuards.ts`) — block accidentally-destructive edits (removing the only bed, three sofas in a small room, >65% floor utilisation). The AI is *opinionated, not a genie.*

**Under the hood — the intent executor** (`backend/app/domain/intent/executor.py`): deterministic, no-LLM mutations of room state. The LLM only decides *what* intent to emit; the executor does the spatial math. After spatial edits it re-validates so the room stays legal.

## 4.11 Cost: a budget story, not a cash register
**Decision:** cost is always shown *in context* — "₹2.84L of ₹3L · ₹16k under budget" — never a bare running total. When over budget, the AI offers a fix ("switch the TV unit to a carpenter build, save ₹8k") rather than turning a number red.

**Why:** cost is a **psychological instrument** meant to *reduce* anxiety. A climbing total makes Priya feel guilty for adding nice things; a budget story makes her feel in control.

## 4.12 Export: the "Suresh standard"
**Decision:** the quotation is a **product in itself** — a full Bill of Quantities with **buy-vs-build** for every item, a clean dimensioned 2D plan, **carpenter specs in the local language** (Hindi/Marathi/Tamil by city), a WhatsApp share card, and a **contractor PDF with prices redacted**, plus a validity date.

**Why:** the document *travels* — Suresh shows it to other carpenters, Priya shows Rohan, it gets WhatsApp'd to a cousin "who knows about these things." It has to stand alone and be buildable with zero ambiguity. The Hindi section is a signal that we understand the *actual* homeowner-carpenter transaction.

## 4.13 Auth & persistence: optional, late, honest about debt
**Decision:** Supabase email/password auth with Postgres + row-level security; a per-user `designs` table. Auth is promoted only at Save.

**Honest caveat:** today the **frontend talks to Supabase directly** (guarded by RLS). The architecturally-correct version is FastAPI-mediated with JWT verification — the `/designs/*` endpoints exist but are currently vestigial. This is a known, deliberate shortcut deferred post-demo (see Part 6).

---

# PART 5 — The Live Walkthrough (screen by screen)

### Pre-flight (2 min)
- Backend up on **port 8000** — the green dot next to "Nirmit" in the planner confirms it.
- Use a laptop/desktop (there's a small-screen gate).
- **Golden rule for the AI panel:** ask it to *add*, *swap style*, *warm the lighting*, or move *to a named wall*. **Never** ask for fine nudges ("a bit more left") — that's the one weak spot.

---

### Screen 1 — Home
Pen draws an architectural section (sofa, TV, mandir niche, "morning sun", "movie nights"). Let it finish — it's a signature moment.
> *"Nirmit is a designer for Indian homes, not a catalog. You tell it how you live; it draws rooms you can walk through and hands your carpenter a buildable quotation. The whole thing speaks paper-and-ink — a draftsman's table, not a SaaS dashboard."*

**Click: Start designing →**

---

### Screen 2 — Intake (4 steps)
Choose the **safe, clean path:** *The Gathering* · *Living Room* + **Large (16×18 ft)** · a real sentence for "who lives here" + tick **"Vastu matters"** · ₹3L, Mumbai.
> *"The important bit is free text — 'mother-in-law visits', 'lots of toys'. It reasons about Indian domestic life: storage as a real problem, multi-generational comfort, the prayer space. Four questions, ninety seconds — every extra question is a reason to leave."*

**Click: Draw my room →**

---

### Screen 3 — Generating (~11s)
Floor plan draws itself; the dark panel narrates the reasoning steps.
> *"It's not a loader — it's showing its work. Big pieces first, then details, then Vastu and daylight, then pricing. The opinionated collaborator idea, made visible."*

*(Auto-advances when ready.)*

---

### Screen 4 — Reveal
1. Click **ENTRY** → *"What a guest sees walking in — that matters in Indian homes."*
2. Flip the **3 visions** (‹ ›) → *"Three genuinely different ways to live in the room — not three palettes of one layout."*
3. Open the **Vastu tab** → *"Vastu isn't a toggle; it tells you why the mandir is in the north-east."*
4. Point at **estimate vs budget** → *"Cost is always a story against the budget, never a surprise at the end."*

**Click: Open this room →**

---

### Screen 5 — Planner (the heart) — run these four safe beats
**Beat 1 — it actually listens (your strongest moment):** type **"hi"**, then **"what do you think of this layout?"**
> *"Watch — it doesn't redesign the room every time I speak. It says hello like a person, and when I ask its opinion it gives an honest critique with reasons, without touching anything. A collaborator listens before it acts."*

**Beat 2 — a deliberate change:** type **"add a hand-knotted rug"** → proposal card with cost delta → **Apply.**
> *"When I do ask for a change, it proposes it with the price impact and I decide. Intent in, change out."*

**Beat 3 — style swap:** click the **sofa** → hit **⇄ Style** a couple of times.
> *"Cycle styles on any piece — it stays within the room's philosophy and footprint, so the layout never breaks."*

**Beat 4 — reliable repositioning:** click **Edit** (turns green) → **drag** a piece in the 2D plan (snaps to walls). *Or* tell the AI **"move the sofa to the west wall"** (named-wall path is safe).

**Bonus if natural:** **✕ Remove** the only sofa → the **"Remove the only sofa?"** confirm appears — the opinionated guard, a feature not a bug.

**Avoid:** fine nudges; "make it warmer" (adds rug+light+plant — say *"warm up the lighting"* instead); rapid-fire move commands.

**Click: Tune the materials →**

---

### Screen 6 — Style / Materials
Make one visible change (warmer lighting or a flooring swap).
> *"Real Indian materials and brands, palette and lighting tuned to the philosophy you picked — updating live."*

---

### Screen 7 — Export (close strong here)
Select **Contractor** → prices show as `— — —`, with a **local-language carpenter section**.
> *"This is the whole point. Not a pretty picture — a quotation a local carpenter can build from, specs in his language, the client's pricing redacted. The 'Suresh standard': if Suresh can build it with zero ambiguity, we succeeded."*

Generate the **PDF** to show it's real.

**The one-sentence spine if you forget everything:**
> *Tell it how you live → it draws and reasons → you refine by intent → it hands your carpenter a buildable quotation.*

---

# PART 6 — Honest Limitations & Roadmap (own these internally)

| Area | Current state | Why / next step |
| --- | --- | --- |
| **AI fine-grained moves** | "Move sofa to the west wall" is solid (deterministic wall-snap, bounds-clamped, collision-checked). Fine nudges ("a bit left") still rely on the LLM guessing coordinates. | LLMs are bad at coordinate math. Next: relative-nudge UI affordance / let drag own fine positioning; AI owns *semantic* moves only. |
| **Layout solver edge case** | A preset occasionally places a piece longer than the room dimension flush to a wall (it gets centred, not clipped, after recent fixes). | Add a "piece longer than wall" guard in the solver, or pick footprints against room dims at preset-build time. |
| **Persistence shortcut** | Frontend talks to Supabase directly via RLS; FastAPI `/designs/*` endpoints are vestigial. | Move saves behind FastAPI with JWT verification — the architecturally-correct, "all intelligence/validation backend-side" version. |
| **Catalogue licensing** | 3D-FRONT (CC-BY-NC) — prototype only. | License a commercial catalogue before any launch. |
| **Room coverage** | Living / bedroom / dining / study wired; kitchen / bath / pooja not in v1 intake. | Expand intake + presets per room type. |
| **Mixing visions** | The "bring the mandir from vision 1 into vision 2" intent exists in the brain; not yet a first-class UI gesture. | Surface it as conversational mixing on Reveal/Planner. |

**Recent hardening (done):**
- **Placement safety-net** — every in-place edit (move/scale/rotate/duplicate) is now bounds-clamped and slid clear of other pieces; the AI can no longer push furniture through a wall or onto another item.
- **Graceful AI failures** — rate-limit / backend / parse errors now reply *in the designer's voice* ("give me a beat, yaar…") instead of leaking error codes; rate limits trip a circuit breaker instead of hammering the provider.
- **Smarter collaborator** — it now *reads the turn first*: greetings, thanks, and questions get a warm reply and **change nothing**; it only edits the room when actually asked, and pushes back on ideas that fight the room.

---

# Appendix — Fast facts for Q&A

- **Stack:** React 18 + Vite + TS + three.js (R3F) front; Python + FastAPI + LangGraph + Groq back; Supabase (Postgres + RLS) for auth/persistence; html2canvas + jsPDF for client-side PDF.
- **API surface:** 5 POST endpoints — `/generate`, `/chat`, `/apply`, `/cost`, `/export`.
- **Source of truth:** `VISION.md` (the why), `CLAUDE.md` (the architectural constitution), Pydantic schemas (the JSON contract).
- **Branches:** `main` (procedural layout baseline) · `feat/room-presets` (current — presets + auth + persistence).
- **The test for any decision:** *does this make Priya feel understood by someone with great taste who knows her budget?*
