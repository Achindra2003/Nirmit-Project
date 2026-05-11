# Nirmit — Homepage UI/UX Audit
### Deep Visual & Psychological Analysis

---

## The Design System (what's actually powering this page)

Before getting into issues, it's worth naming what's here. The page is built on a well-considered token system: four typefaces (Cormorant Garamond for display/CTA, Tiro Devanagari Hindi for Hindi script, DM Sans for body, JetBrains Mono for labels), a warm parchment palette (`#F2EBDD` background), and a `32px` grid overlaid at 18% opacity as a subtle paper texture. The background is not flat — it uses radial gradients darkening slightly at the top and bottom edges to give the page a physical, bound-document feeling. This is genuinely sophisticated craft and sets the stage for everything that follows.

---

## 1. Navigation Bar

**What's there:** "Nirmit" in 20px Cormorant Garamond (weight 500, `#1F1B16`) · "निर्मित" in 15px Tiro Devanagari (`#8C8170`, slightly muted) · on the right: "A PRACTICE IN INDIAN INTERIORS" in 11px JetBrains Mono (`#8C8170`, 1.98px letter-spacing, all-caps).

**Visual:** The nav achieves genuine elegance through restraint. No borders, no background, no hamburger. The bilateral tension — brand left, descriptor right — reads like a masthead. The Devanagari script sitting quietly beside the Roman wordmark is the single most visually meaningful thing on the page: it announces the bilingual identity before any other content arrives.

**Issues:**

The right-side tagline `A PRACTICE IN INDIAN INTERIORS` is a direct repeat of the Folio label that appears about 30px below it. These two strings — rendered in the same font, same size, same color, same case — are identical. The user reads it twice within 3 seconds of arriving, which dilutes its meaning. The nav version functions as a company descriptor; the folio version functions as a content label. They are doing different things but look and read identically. One of them should be differentiated or removed.

The logo has no click behavior to return home. While the site is currently a single page, this will become a problem as soon as more routes exist. There is also no hover state on "Nirmit" — `cursor: pointer` is absent. The logo reads as decorative text rather than a navigational anchor.

There is no visual separator (border, shadow, background change) between the nav and the content below. The transition from nav to the `FOLIO Nº 01` label is a jump of roughly 15px of visual breathing room — fine for the current single-screen context, but fragile. The nav sits at `z-index: 1` inside the `.paper` stacking context, meaning if any scrolling content overlaps, there is no guaranteed visibility.

---

## 2. Folio Label (`FOLIO Nº 01 · A PRACTICE IN INDIAN INTERIORS`)

**What's there:** 11px JetBrains Mono, 1.98px letter-spacing, `--ink-3` (`#8C8170`), all-caps, left-aligned at `x=64px`, `y=65px`.

**Visual:** The "FOLIO Nº" convention is beautiful — it frames the product as a published work, a portfolio piece, something that will be numbered and accumulated. The `Nº` ligature is a nice typographic touch that reinforces the craft ethos.

**Contrast:** At 11px, `#8C8170` against `#F2EBDD` yields a contrast ratio of **3.23:1**. WCAG AA requires 4.5:1 for normal text, and 11px text does not qualify as "large" (that threshold is 18pt/24px, or 14pt/~19px bold). This fails accessibility standards. The intent is clearly decorative-hierarchical, but at this scale it becomes genuinely difficult to read for anyone with reduced vision or on a non-calibrated screen.

**Semantic issue:** The label carries no semantic markup — it is a `SPAN` with class `.eyebrow`. While the visual result is clean, it signals nothing to screen readers about its role as a page/section identifier.

---

## 3. Hero Headline

**What's there:** "Drawing your / *home,* with you." — 67.6px Cormorant Garamond, weight 500, letter-spacing `-1.487px`, line-height `63.5px` (0.94 — tighter than the font size). The word "home," is rendered in italic, weight 400, `--terra` (`#C2502E`).

**Visual:** This is the strongest element on the page. The headline is large, confident, and the terracotta italic creates genuine visual punctuation. The negative tracking (`-1.487px`) tightens the letters just enough to feel editorial rather than default. The compressed line-height (0.94× the font size) is bold — it makes the two lines feel like a single mass of text rather than two separate lines, which suits the emotional density of the message.

**Typography detail:** The comma after "home," is part of the colored italic span. Grammatically and visually, this is correct — the comma trails the emphatic word and separates it from "with you." cleanly. However, the italicised comma creates a very slight optical gap before the upright "with" that reads as a stutter on fast scan. This is genuinely minor — arguably a feature — but worth noting.

**Contrast:** Headlines are `#1F1B16` on `#F2EBDD` = **14.43:1**. Excellent. The terracotta "home," is `#C2502E` on `#F2EBDD` = **3.95:1**. This passes WCAG AA for large text (≥3:1 at 67px) but only barely. The word is decorative-emphatic rather than informational, so this is acceptable, but if the terracotta shifts in future palettes, this needs watching.

**Line break behavior:** At this viewport width (901px), the headline breaks cleanly: "Drawing your" / "*home,* with you." This is the intended break. The word "you." landing at the end with the full stop is emotionally correct — it ends with the user. However, this break is fragile. At ~780px wide (common tablet/large phone landscape), "Drawing your *home,*" will likely stay on line one and "with you." will sit alone — fine. But at ~600px, the break becomes unpredictable without responsive typography adjustments.

---

## 4. Hindi Subheadline ("आपका घर, *your hand.*")

**What's there:** "आपका घर," in 22px Tiro Devanagari (`#5D544A`), followed by "*your hand.*" in 22px Cormorant Garamond italic, same color. Gap from h1 bottom to this line: **18px**.

**Visual:** The 18px gap after a 127px headline is very tight. It reads as a subtitle tethered closely to the headline — which is the intent — but the proximity is almost too close. At a glance, "आपका घर," appears to be a third line of the headline rather than a separate, explanatory statement. This ambiguity is intentional from a design perspective (you want it to feel continuous) but it creates a brief parsing confusion, particularly for users unfamiliar with Devanagari who may not immediately recognize it as a different script/language.

**The fragment "*your hand.*"** is the most psychologically interesting phrase on the page. "Drawing your home, with you. Your home, your hand." The meaning is poetic but requires a beat of deduction: *my home, drawn with my hand.* This is a beautiful idea but it is not instantly legible. Users who scan rather than read — the majority — will not extract this meaning on first pass. They will receive it as decorative atmosphere, which means the emotional work it should do ("this is collaborative, intimate, yours") is lost in the scan path.

The Tiro Devanagari and Cormorant Garamond sit at the same size and similar weight. The color match (`#5D544A`) is exact. This creates visual harmony but reduces the script-switching effect — the script change is doing all the work of differentiation, and for users who don't read Devanagari, there is no visual signal that the two halves of the line are saying the same thing in different languages.

---

## 5. Body Paragraph

**What's there:** "Nirmit is a drawing practice…" — 16px DM Sans, weight 400, `#5D544A`, line-height 27.2px (1.7× — very generous). Gap from the Hindi subheadline to paragraph top: **83px**.

**Contrast:** `#5D544A` on `#F2EBDD` = **6.25:1**. Passes WCAG AA. Comfortably readable.

**The 83px gap** between the subheadline and body paragraph is one of the most significant visual decisions on the page — and it's a problem. 83px of white space between the "آपکا گھر, your hand." line and the explanatory paragraph creates a *perceptual break* that reads as: "the headline section is finished, and now something new begins." This might be intentional — separating the emotional hook from the rational explanation. But the effect is that the body paragraph feels detached from what precedes it. On a screen where everything is visible at once, the eye scans headline → subhead → 83px of nothing → paragraph, and that gap registers as a navigation moment rather than a continuation. Users in a hurry may miss the paragraph entirely, because the gap signals "I've seen the above section, I'll scroll now."

**The copy itself:** The sentence structure is good — "You tell us…We draw…we give you everything your carpenter needs, in Hindi." — subject: you, action: we, outcome: in your language. The phrase "the shape of your evenings" is the most evocative and specific thing in the paragraph, and it earns genuine emotional weight. The phrase "in Hindi" at the very end is the most culturally pointed claim on the page, and it's buried as a trailing modifier.

**What's missing:** The paragraph explains *what* Nirmit does but not *what you get*. "We draw three rooms for you" — what does that look like? The architectural illustration to the right is presumably the answer, but it is not labeled, not captioned, not visually connected to the copy. The connection between "we draw" and "here is a drawing" must be inferred.

---

## 6. The Architectural Illustration (SVG)

**What's there:** An SVG with viewBox `0 0 580 460`, rendered at approximately `352×279px` on screen, positioned at `x=486, y=237`. The drawing shows a living room elevation with a Mandir highlighted in red (terracotta), annotated in both Hindi and English. Caption at bottom: `SECTION A–A · LIVING ROOM / SCALE 1:30 · DRAFT`.

**Visual:** This is exceptional. The drawing is precise, beautiful, and culturally specific — the Mandir placement "northeast, for the morning sun" is not a generic interior detail; it's a signal to the exact audience this product serves. The annotation style (`मन्दिर — northeast, for the morning sun`) mirrors how an actual drawing practice would annotate a client's cultural requirements. The `SCALE 1:30 · DRAFT` stamp at the bottom reinforces the professional drawing-practice framing.

**Critical gap — unlabeled as output:** The illustration is not labeled anywhere as "what you'll receive" or "a sample drawing." There is no caption connecting it to the service. A new user sees it as part of the page design — a decorative motif — not as the actual deliverable. This is the single largest lost opportunity on the page. The illustration is the product. Right now it's the decoration.

**Positioning:** The SVG starts at y=237 (below the midpoint of the headline) and ends at approximately y=516 (below the CTA button). This means the illustration is vertically centered against the body text + CTA zone, not against the full left column. The headline effectively has no visual counterpart — it's floating above the illustration. The left-right split is felt as: top-left is editorial, bottom-right is visual, and they don't fully converse.

**Right edge:** At 901px wide, the illustration fits fully within the viewport. At 1288px (1440p window), it also fits. But the SVG viewBox (`580×460`) scaled to its display size means the internal line weight is slightly thicker than architectural drawings typically are — the lines feel slightly heavy relative to the annotation text. This gives it a "diagram" quality rather than a "hand-drawn" quality. For a product called a "drawing practice," this matters.

---

## 7. CTA Button ("Start a new room →")

**What's there:** A `<button>` styled as `.lnk` — 20px Cormorant Garamond italic, weight 500, `#1F1B16` text, `#F0F0F0` background, `1px solid #1F1B16` bottom border only, `padding: 0px 0px 3px`. On hover: color → `--terra`, border-color → `--terra`, arrow → `translateX(4px)`. Transition: `color 0.25s, border-color 0.25s`.

**Visual:** The underline-only button is a deliberate anti-button — it looks like a hyperlink from a broadsheet newspaper, not a UI component. This is perfectly aligned with the editorial brand. The italic Cormorant Garamond gives it a handwritten-instruction quality. The arrow that slides on hover is a small but satisfying animation that communicates directionality.

**Critical issue — border rendering:** The computed border is `outset outset solid` with widths `2px 2px 0.666px`. The `outset` value on the top and sides is a browser default artifact — only the bottom border is explicitly set, but the browser is rendering a ghost border (2px `outset` = the default button appearance bleeding through). This is a CSS specificity bug. The button has `border: none` reset in the stylesheet but doesn't explicitly override the button UA stylesheet's outset borders on all sides. The result, visible in the zoomed screenshots, is that the button appears to have a faint box around it that the design did not intend. This makes the button look slightly boxy — like a traditional button trying to pretend it's a text link, rather than a clean text link.

**Hover state — contrast:** On hover, text and border become `--terra` (`#C2502E`) on `#F2EBDD` background. That yields **3.95:1**. This passes for large text but the background of the button is actually `#F0F0F0` (slightly different from the page background `#F2EBDD`). The button background does not change on hover — the slightly off-white `#F0F0F0` against the warm `#F2EBDD` page background creates a faint but visible rectangle behind the button in its default state. This rectangle has no intentional design meaning but it visually bulks up the button in a way that contradicts the text-link intent.

**Cognitive framing:** "Start a new room" is excellent action copy. "Room" rather than "project" or "design" keeps the language human and domestic. The "new" is slightly redundant (every room starts as new), but it prevents ambiguity for returning users. The one concern: "room" implies you're designing a room, not a space-planning consultation. If a user's expectation gap is "this is an AI that draws a 3D room," they'll be surprised when it's a consultation form. The copy works, but it could be more specific: "Begin your room" or "Draw a room with us" carries more of the collaborative process framing.

---

## 8. The Reassurance Copy (`NO FEES · NO LOCK-IN · 12 MINUTES`)

**What's there:** 11px JetBrains Mono, `--ink-3` (`#8C8170`), all-caps, letter-spacing 1.98px. Positioned inline with the CTA button via flexbox, `gap: 36px`. The text is split across two lines in the rendered output.

**Contrast:** `#8C8170` on `#F2EBDD` = **3.23:1**. Fails WCAG AA for normal text at 11px. But the deeper problem is psychological, not technical.

**Psychological issue:** This is the most powerful anxiety-removal copy on the page. It addresses the three biggest barriers to clicking: cost, commitment, and time. These three words — **Fees, Lock-in, Minutes** — are exactly what a nervous first-timer needs to see before they click. And they are rendered at 11px in a muted color, given less visual weight than the architectural caption on the SVG. The hierarchy inverts what should be prominent.

**Two-line wrap:** The `36px` gap between the button and the text, combined with the button being 130px wide, means the reassurance copy wraps to two lines at this viewport ("NO FEES · NO LOCK-IN · 12 / MINUTES"). "MINUTES" dangling alone on the second line reads as clipped or unfinished. The line break undermines the punchy tricolon rhythm.

---

## 9. "YOUR SAVED ROOMS" Section

**What's there:** Label in 11px JetBrains Mono (`#8C8170`, 1.98px tracking). Below: "The Breath" in 16px Cormorant Garamond italic (`#1F1B16`), "1d ago" in 10px JetBrains Mono (`#8C8170`), and an "Open →" button plus an "×" delete button.

**Visual:** The saved room row is minimalist to the point of near-invisibility. "The Breath" sits in italic Cormorant — the same style used for the CTA button text. The name alone — without context — is cryptic to anyone who doesn't know that "The Breath" is a style preset from the consultation. A returning user will recognize it. A new user who landed here after someone else used the device will have no idea what it means.

**The "×" delete button:** The `×` is 8.8px wide and 16px tall. That is a 8.8×16px touch target. WCAG recommends a minimum of 24×24px for interactive elements; Apple HIG recommends 44×44px. This delete button is essentially untappable on mobile and frustratingly small even with a mouse. The consequence of clicking it incorrectly is losing a saved room — a high-stakes misclick for a tiny target.

**Missing separator:** The `savedRoomRow` has `borderBottom: 0px none`. The row has no visual boundary — it floats as text within the section. If there were multiple saved rooms, they would run together with no dividing line. The section label `YOUR SAVED ROOMS` is separated only by line height from the row content.

**New user confusion:** As noted previously, a first-time visitor whose browser doesn't have a saved session will see `YOUR SAVED ROOMS` with nothing below it, or potentially another user's room name. The section should either be hidden when empty or show a state like "— no saved rooms yet —" to orient new visitors.

---

## 10. "DRAWN THIS SEASON IN" City List

**What's there:** "DRAWN THIS SEASON IN" in 9.5px JetBrains Mono (`#8C8170`, all-caps), followed by city names in 13px Cormorant Garamond (`#5D544A`), separated by `·` dots in `--line-2` (`#C8BFA8`).

**Contrast failures:** The city separator dots (`#C8BFA8` on `#F2EBDD`) achieve **1.54:1** — essentially invisible. The label text at 9.5px `#8C8170` is **3.23:1** — fails at this size. The city names at 13px `#5D544A` are **6.25:1** — technically fine but at 13px, readability is borderline.

**Psychological opportunity lost:** "Drawn this season in Mumbai · Pune · Bangalore…" is the only social proof signal on the entire page. Its meaning is: *other people in your city are using this.* That is potent. It implies volume, recency, geographic proximity. But the phrase "drawn this season in" is grammatically passive — it says work was done in these cities, not that people in these cities are customers. It could read as "our team visited these cities" as easily as "people from these cities ordered." Reframing as "Homes drawn this season:" or "Clients in:" with a number — "43 rooms drawn in Mumbai" — would transform this from ambient decoration into genuine social proof.

**Layout:** The cities run across two lines, breaking between Hyderabad and Chennai. Mumbai · Pune · Bangalore · Hyderabad / Chennai · Delhi. This is an arbitrary line break driven by viewport width, not by geographic or alphabetical logic. It slightly undermines the "marquee" feeling — it should either be a single scrolling line or a structured grid.

---

## 11. Typography System — Macro Analysis

The page uses four typefaces simultaneously. In typography, using four faces is aggressive — most editorial systems use two. Here it works because each face has a completely distinct role: display (Cormorant), body (DM Sans), script (Tiro Devanagari Hindi), and label/data (JetBrains Mono). The Mono face used for UI labels is an interesting choice — it reads as "architectural specification," "blueprint annotation," "technical document." This is thematically right for a drawing practice. But it creates an optical tension: JetBrains Mono is a fixed-width font designed for code. The fixed character spacing means some label phrases look machine-typed in a way that contradicts the human warmth of the serif and Devanagari.

The **type scale** visible on the page: 9px → 9.5px → 10px → 11px → 13px → 15px → 16px → 20px → 22px → 67.6px. There is a large jump between 22px (Hindi subhead) and 67.6px (headline), and a dense cluster of very small sizes (9–13px) in the lower half of the page. The small sizes all serve decorative/atmospheric roles (city names, illustration captions, folio label) but their density creates a zone of visual noise that the eye tends to skim past without registering.

---

## 12. Spatial Rhythm & Grid Adherence

All left-aligned content sits at `x=64px`. The page uses a `32px` grid (visible as the paper texture). 64 is exactly 2 grid units — consistent. The body paragraph width is 398px, approximately 12.4 grid units — slightly off a clean multiple, but imperceptible. The SVG illustration starts at `x=486` — about 13.4 grid units from the left edge, which doesn't align cleanly to the 32px grid. The visual column split (left content ≈ 50% / right illustration ≈ 44%) is not a clean 50/50 or golden-ratio split — the right column appears narrower, which is fine visually, but the illustration doesn't fill its column — it floats in the right half without being anchored to a grid edge or aligned to the right margin.

---

## 13. Animation System

The page uses `.appear`, `.appear-2` through `.appear-5` — a staggered entrance with delays of 0, 0.10, 0.22, 0.34, and 0.46 seconds using `cubic-bezier(.22,.7,0,1.05)` (a spring curve — slightly overshoots and settles). This is elegant. The stagger means the page assembles itself in reading order, guiding the eye from headline to subhead to paragraph to CTA. The spring easing feels organic rather than mechanical.

However, `html, body, #root { overflow: hidden; }` means the page cannot scroll beyond its viewport. The entire homepage is forced into a single screen. This is a deliberate choice — the page is designed as a single frame. But it means the city list and saved rooms section are squeezed into the bottom of the viewport with no option to scroll if the viewport is shorter than the content. On a laptop with a browser toolbar, part of the bottom content may already be cut off.

The `prefers-reduced-motion` media query is correctly implemented — all animations collapse to 0.01ms for users who have requested reduced motion. This is a genuine accessibility win.
