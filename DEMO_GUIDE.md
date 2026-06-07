# Presentation & Demo Guide

The full speaking flow, the two interactive audience beats, planted questions for
friends, and model answers to likely Q&A. Square brackets are delivery notes;
**bold** is roughly what to say (make it yours — don't read it verbatim).

**Order:** Intro → Problem/Hook → Business Use Case → Tech → Solution Highlights →
**Demo** → Future Scope → Q&A.

---

## 0. Pre-flight (do 2 min before you start)
- **Warm the LLM:** run one full intake → reveal so Groq is warm and reasoning is
  firing. If throttled, generation still works (deterministic) but the AI chat may
  go quiet — that's fine, lean on the deterministic parts.
- **Collaboration demo (if showing it):** open the share link in **two windows** —
  two share-link windows sync live. Don't rely on the owner-planner live-sync
  unless you've tested it.
- Have a known-good room in mind: **Living room → Large → gathering vision
  ("The Long Wall")** is the clean hero room.

---

## 1. Introduce yourself (~20s)
**"Hi everyone, I'm [name], a final-year student at [college]. I've spent my
internship here in the [UI/Design] competency, and I'd like to show you what I
built — a project called Nirmit."**

## 2. Problem → solution (rhetorical hook, ~50s)
[Open question to the room — rhetorical, nobody has to answer. Pause after it.]
**"Picture this: you've just got the keys to a new flat. One empty room, a budget
in your head — and no idea where to begin. So here's the question: how do you
design a room you can't picture yet, and trust a price you have no way to verify?"**
[Beat, then explain.]
**"That's the real problem in Indian homes. People either freeze on a blank room,
or hand it to a designer and quietly worry they're being overcharged. Nirmit fixes
exactly that — answer a few simple questions, and it designs your room, prices it
honestly against your budget, and gives you a quotation a local carpenter can
actually build from. No designer in the middle."**

## 3. Business Use Case (~25s)
**"Value three ways: for a homeowner, design without a designer. For furniture
brands, every room is a warm lead. For builders and real-estate firms, a
white-label tool they can offer buyers."**

## 4. Technologies — frontend first (~30s)
[You're in the UI competency — lead with your home turf.]
**"On the front end — where I focused — React and TypeScript, with Three.js and
React Three Fiber rendering the room in real-time 3D, and Zustand for state. Behind
it, the design brain is Python with FastAPI and LangGraph on a Groq-hosted LLM, and
Supabase — Postgres with row-level security — handles saving and sharing."**

## 5. Solution Highlights (~25s)
**"Three things make it work: it generates three furnished layouts from one short
intake; you edit by chatting with an AI while cost updates live against budget; and
it exports a carpenter-ready quotation. Let me just show you."**

---

## 6. THE DEMO — walk every feature
[Go slow, narrate *why*. ★ = the two audience beats.]

**Landing** → click **Start designing**. *"You sign in so anything you design is
saved."* (Feature: auth-gated, saved archive.)

**Intake — profiling.**
- **Living room → Large.** *"Room and size first — everything after adapts to it."*
- **Character** — pick one. *"It asks the feel in this room's own words. A study
  would never be asked if it feels 'warm and gathered.'"*
- **Who uses it** — tap **Elderly parent visits** + **Joint family**. *"Watch the
  right side — it tells me live what it'll plan for. It's listening."*

★ **INTERACTIVE 1 — city.** **"Last thing, and I'll let you decide — shout out a
city. Where should we build this?"** [take one, select it] **"City matters: it sets
the local labour rates in your final quote. A Mumbai carpenter isn't priced like a
Pune one."** [enter budget]

**Reveal** → *"Three real options — not colour swaps, three ways to live in the
room: The Long Wall, The Open Centre, The Working Walls."* [open **The Long Wall**]

**Planner — the payoff.**
- *"You said elderly parents visit — there's the firm armchair with arms. Joint
  family — there's the closed storage. It designed for the household I described."*
- *"And it explains every choice in plain language."* [show reasoning]
- [orbit 3D; toggle 2D] *"Real-time 3D, and a top-down 2D plan."*
- [open **Bill of Items**] *"Every piece, buy-vs-build, a running total against
  budget — you always know what you have, not just at the end."*
- [AI / accept a suggestion] *"Edit by just talking to it — 'add a rug' — or edit
  directly. Cost updates instantly."*

**Materials.**
★ **INTERACTIVE 2 — paint/flooring.** **"Pick one for me — should this floor be
Kota stone or Italian marble?"** [swap to the pricier one] **"Watch the cost — it
moves, live. Each finish has a real rate, and it flows through to the final quote.
Marble actually changes what your carpenter is quoted."**

**Export.** *"The thing that matters most — the quotation. Real mm dimensions,
buy-vs-build, in the local language a carpenter reads. Not a pretty picture — a
plan you can act on Monday."* [name a save; optionally show the live share link]

*"That's the whole journey — empty room to a buildable, priced plan, in minutes."*

## 7. Future Scope (~30s)
**"Three things next. AR — point your phone at your real room and walk through the
design before buying anything. A real, licensed catalog of Indian-brand furniture
with exact prices. And whole-flat design — every room together, not one at a time.
Same trust story: today it's 3D on a screen; next, it's standing in your home."**

## 8. Q&A
**"That's Nirmit — thank you. Happy to take any questions."**

---

## Planted questions (give each friend a *different* one; loose wording, spaced out)

**1. "Why not just let the AI design the whole thing — why bother with fixed layouts?"**
> *"Because the AI is a collaborator, not a genie. A model placing furniture freely
> hallucinates and is slow and rate-limited — fine for a toy, fatal for something
> you trust with ₹2 lakh. So the spatial logic — fit, clearances, Vastu, budget — is
> deterministic and reliable, and the AI does what it's good at: understanding your
> household, explaining the design, letting you edit by talking. Reliable where it
> must be, smart where it helps."*

**2. "What stops it from just making things up — a price, or furniture that isn't there?"**
> *"The thing I cared about most. Early on I caught it describing a mandir that
> wasn't in the room — so now the reasoning can only describe pieces actually
> placed; it can't narrate furniture that isn't there. And the price isn't a guess:
> every finish has a real per-sqft rate, labour is priced by city, and the all-in
> number — furniture, materials, labour, GST — is the same number on the carpenter's
> quote. The price you see is the price you hand over."*

**3. "How's this different from a designer or a tool that already exists?"**
> *"A generic tool hands you a pretty render. This is built for how Indian homes
> actually work — storage as a first-class problem, multi-generational comfort,
> Vastu as real spatial logic, not a toggle. And the output isn't an image — it's a
> quotation a local carpenter can build from, in the local language, down to the
> millimetre. It takes someone from 'I have no idea' to 'here's a plan I can hand to
> someone on Monday.'"*

---

## Likely unplanted Q&A — model answers (keep them shorter out loud than written)

**"What was the hardest part?"**
> *"Making the cost honest end-to-end. Easy to show a pretty room; hard to make the
> price match what a carpenter would actually charge. I had two cost paths that
> disagreed and reconciling them into one trustworthy all-in number was the real
> work."*

**"Where do the 3D models come from / how real is the catalog?"**
> *"Right now it's an open research dataset — great for a prototype, but
> non-commercial and inconsistent. I'm upfront that this is the prototype boundary:
> production means licensing real Indian-brand models with real prices. The catalog
> is a swappable data layer, so that's procurement, not a rewrite."*

**"What about data privacy / where's user data?"**
> *"Designs are per-user in Supabase — Postgres with row-level security, so you only
> read your own rooms. Sharing is explicit and token-based. For production the next
> step is routing those calls through the backend with proper auth verification
> instead of the client talking to the database directly."*

**"Why Groq / what if the AI is down or wrong?"**
> *"Groq for speed — responses feel instant, which matters in a live editor. The
> provider's swappable behind an adapter. And the AI is never in the critical path:
> the room generates deterministically, so if the model is throttled it falls back
> to authored reasoning. It degrades gracefully instead of breaking."*

**"Only one room? / Whole house?"**
> *"One room today, deliberately — I wanted one room genuinely good before scaling.
> Whole-flat is the clear next step: the engine already designs and prices a room
> end-to-end, so multi-room is a floor-plan container that runs it per room."*

**"Who actually uses this — would people trust an AI over a designer?"**
> *"For a homeowner it's not a replacement for a designer — it's a confidence tool.
> It takes you from blank-page panic and fear of being overcharged to a concrete
> plan and a price you trust. Most still hire someone to build it — but they walk in
> informed instead of anxious."*

**"How does Vastu work?"**
> *"It's opt-in — most users don't ask, so I don't impose it. When they do, it's
> real spatial logic: orientation drives where heavy storage, seating, and key
> pieces sit, and the reasoning explains it. A foundational rule, not a checkbox."*

**"What did you build yourself / was it solo?"** *(adapt to reality)*
> *"I owned this end-to-end — product direction, full stack, every design call. The
> hardest decisions weren't code, they were judgment: who's it for, where the AI
> helps vs gets in the way, what makes a price trustworthy."*

**"How would it make money?"**
> *"Warm leads for furniture brands, a white-label tool for builders, and longer-term
> a marketplace cut when a quote becomes a real job. The homeowner stays free —
> they're the top of the funnel, not the revenue."*

**"What would you do differently?"**
> *"Nail the catalog first. So much — prices, 3D quality, trust — depends on real,
> consistent furniture data, and I built a lot on placeholder assets."*

**When you genuinely don't know:** don't bluff —
> *"Honestly, I haven't solved that yet — but here's how I'd approach it…"*
> That answer *raises* your credibility with engineers. Bluffing loses it instantly.

---

## Delivery reminders
- The **demo is your strongest asset** — if a slide bullet slips, no one notices; a
  smooth run-through is what they remember.
- At the two ★ beats, if the room is silent, just pick one yourself and keep moving.
- Answer **#2 (making things up)** is your best moment — hope it gets asked.
