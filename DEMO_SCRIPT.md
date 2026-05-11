# Nirmit — 15-Minute Demo Script

> Build TO this. Every Code session's goal is "make minute X land". Rehearse
> it ≥3× before the panel. Record a backup video (3D demos glitch live).

**Demo persona** — use these exact values so you don't fumble on stage:
- Room: **Living room**, **4.2 m × 3.6 m**, entrance faces **South**
- Who lives here: *"family with two kids, mother-in-law visits often"*
- Vibe: **Warm + Traditional**
- Budget: **₹3.0 lakhs**
- Vastu: **on**
- Loved item (if asked): *"my grandmother's brass diya"*

---

## 0:00 – 1:30 · Open + "Your Home"
- Open `localhost:5173`. Land on **Your Home** (empty first time → "Design my first room").
- Narration beat: *"Priya in Thane just bought a 2BHK. Livspace quoted ₹7L. Her carpenter Suresh is ready but needs her to point at walls. There's no middle path — until now."*
- Click **"Design my first room"**.

## 1:30 – 3:30 · Intake (4 questions)
- Q1 room size + entrance direction → enter 4.2 × 3.6, entrance South.
- Q2 who lives here → type the persona line. *Beat: "Notice — this isn't a checkbox grid. It reads this and infers kids, elders, density."*
- Q3 vibe → tap **Warm + Traditional** (it's an SVG illustration, not a stock photo — say so).
- Q4 budget → slide to ₹3L, leave **Vastu on**.
- Hit **"Design my room"**.

## 3:30 – 4:00 · Generating ceremony
- The narrative loader runs ("Understanding your space… Placing your family… Finding your vibe…").
- *Beat: "This isn't a spinner — it's a moment of anticipation. Ten seconds of something being made for her."*

## 4:00 – 7:30 · The Reveal
- Lands on **The Gathering**, full-screen, after a 1.5s appreciation beat.
- Read the **"why this was made for you"** bullets aloud — point at "Mandir placed in the northeast — Ishaan kona…" and "Sofa height is 850 mm with arms — easy stand-up for older guests."
- Show the **cost story**: *"₹X of ₹3L — about Y% of what Livspace quoted her."*
- Cycle the camera: **Eye** (walk into the doorway) → **3/4** → **Plan**. Orbit it with the cursor.
- Swipe → **The Breath** (open, minimal, 6 items) → **The Keeper** (storage-first, 7 items). *Beat: "Three ways to live in the same room — she picks the one that matches her temperament."*
- Pick **The Gathering**, click **"I want to refine this →"**.

## 7:30 – 12:30 · The Planner (the heart of it)
- **Chat panel on the left** — read the welcome line.
- Tap the **sofa** in the 3D → the controls strip appears. *Beat: "By default the room is locked so the camera moves smoothly."*
- Hit **↕ Move** → drag the sofa → **✓ Done**. Then **↻ Rotate**, **＋ Bigger**.
- Switch to **2D** → show the architect plan (hatched walls, door arc, North arrow, mm dimensions). Drag an item there too.
- Back to **3D**. Now the AI collaborator — type these in order, demo each result:
  1. *"make the sofa bigger"* → it takes a position, shows the cost change, proposes it. Click **Apply**.
  2. *"make it feel warmer"* → it picks specifics (wood finish + jute rug), shows the cost.
  3. *"add a study desk by the window"* → it adds one (or explains the tradeoff if the room's full — either is a good demo).
- Click **Finishing** mode → change the **wall paint** (Asian Paints swatch) and **flooring** (Pergo) and slide **lighting warmth** — the 3D updates. Watch the cost.
- Click **Save to your home**.

## 12:30 – 14:00 · The Quotation
- Click **Generate quotation →**.
- Walk the BOQ: furniture line items with **Buy vs Build**, the **execution sequence** (8 phases), the totals (subtotal + contingency + GST).
- Click **Download carpenter PDF** → open it: the **floor-plan sketch** with mm dimensions + North arrow, the **carpenter specs** ("18mm BWP marine ply, soft-close Hettich channels"), the **Hindi section** *(beat: "written the way a contractor talks to a carpenter — Suresh prints this and tapes it to his wall")*.

## 14:00 – 15:00 · Close + Your Home
- Back to **Your Home** → the saved design is there. *Beat: "She comes back when Suresh has a question, when she's ready to do the bedroom, when the sofa goes on sale."*
- Close: *"From overwhelmed to ready-to-act, in ninety minutes, for free, no lock-in — and a quote her own carpenter can build. That's the middle path."*

---

## What to say about the prototype (be honest, it reads as maturity)
- "84 real GLB models; the ~3,600 catalogue SKUs are parametric size/material/finish variants — a real launch is a data partnership with Pepperfry / Urban Ladder."
- "The AI collaborator runs on Groq + Kimi K2; the design intelligence — solver, Vastu rules, costing, the BOQ — is deterministic Python so it's testable. 20 backend tests."
- "The 3D is stylised, not photoreal — that's the vision (uncanny valley is expensive and real). The architecture (headless brain / pure face / JSON contract) is what makes it extensible."

## Engineering narrative (have these ready for Q&A)
- Why brain/face split + a typed JSON contract; why all spatial math is millimetres.
- Why the solver does anchor-then-relate with functional zones (sofa faces TV, coffee table between).
- The coordinate-convention bug: layouts felt "random" because position was an anchor, not the footprint centre — refactored the whole stack to footprint-centre coords.
- The drag/orbit conflict: solved with an `editMode` (browse/move) gate — locked by default so OrbitControls is smooth; drag only when an item is selected and Move is toggled.
- The honest call: locked the foundation, wrote `SESSION_HANDOVER.md`, scoped the 3D-polish as a tracked workstream rather than pretending it was done.
