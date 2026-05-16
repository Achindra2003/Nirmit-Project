# Nirmit — Brutal UI/UX Audit

---

## 🏠 LANDING PAGE (Home)

### Layout & Visual Design

**1. Zero above-the-fold content hierarchy on narrow viewports.**
The massive serif headline occupies the entire viewport at smaller widths, pushing the CTA, the product illustration, and saved rooms completely off screen. The hero is all emotion and no function — users on a phone or small laptop have to scroll just to find the button.

**2. The hero image (architectural drawing) is disconnected from the headline.**
The isometric/section-drawing illustration sits in the right half with no label, caption, or explanation. A first-time visitor has no idea what they're looking at. It looks like a placeholder. A real-person room photo or animated 3D render would communicate the product in 2 seconds.

**3. The heading "Design your home, with us." is grammatically broken by layout.**
The italic red "home," sits alone on line 2 while "with us." wraps to line 3. The comma after "home" followed by a period after "us" creates visual noise. The punctuation is being used as typographic decoration but reads as incorrect grammar at a glance.

**4. The CTA button "DESIGN A NEW ROOM" is broken across two lines with a floating arrow.**
The arrow `→` is right-justified and completely detached from the label text, floating awkwardly at the right edge of the button. The text wraps onto two lines ("DESIGN A / NEW / ROOM") which makes it look like three words stacked, not a button label.

**5. "Free · No lock-in · 12 min" sits orphaned to the right of the CTA.**
This is valuable trust copy but it's visually separated from the button, has no visual weight, and gets lost. It's not clear it relates to the button. It would work far better as a small line directly beneath the CTA.

**6. Zero navigation, no logo link behavior, no footer.**
The "Nirmit" wordmark in the top-left isn't a link (or at least shows no hover affordance). There is no navigation menu — no About, no How It Works, no Pricing, no FAQ. For a consumer product handling design trust and money, this is a red flag. No footer means no legal links, no contact, nothing.

**7. The page is a dead end for first-time visitors.**
There's only one action — "Design a New Room." If a visitor wants to see examples, understand pricing, read about the process, learn about the company, or see portfolio work, there's literally nowhere to go. The conversion funnel has no warmup.

**8. "YOUR SAVED ROOMS" appears on the home page for all users, including new visitors who have nothing saved.**
For first-time visitors this section is empty and confusing. It takes up real estate and makes the page feel incomplete. It should be hidden until a user has at least one saved room.

**9. The saved rooms list has a terrible delete UX.**
The `×` button for deleting a room sits right next to the "Open →" button with no confirmation dialog, no undo, no spacing between them. One misclick and the room is gone.

**10. "3d ago" timestamp is ambiguous and informal.**
"3d ago" means 3 days ago but could be mistaken for 3D (as in 3-dimensional). For an app that uses "3D" constantly, this is a genuine source of confusion.

---

## 🧭 ONBOARDING FLOW (New Room → Steps 1–4)

### Navigation / Progress

**11. The top progress bar is a design mess.**
It shows: `Discover — • Visions — • Design — • Style — • Quotation`
But the steps inside say "Step 1 of 4", "Step 2 of 4", etc. — so the progress indicators don't match. Are there 4 steps or 5 stages? The "Discover" phase has 4 sub-steps but only one dot in the top nav. Users have no idea how far they are or how long this will take.

**12. The nav bar overlaps the "Nirmit" logo text.**
In the top bar, "Nirmit" and "Discover" are literally overlapping — the "Discover" text is rendered directly on top of the wordmark. This is a hard layout collision that looks broken.

**13. The stepper progress bar at the top animates a red underline under "Discover" but the active stage dot is elsewhere.**
The underline animation is decorative but functionally redundant with the dot system. Two competing visual progress indicators that don't agree.

**14. "← Back" button placement is inconsistent.**
In the onboarding it's a small text button top-left. In the design room it's inside the room name header. In the materials screen it's a bordered button at the bottom. Three different placements for the same action.

### Step 1 — "What feeling?"

**15. Six image cards are crammed into a grid with text overlaid on busy photos.**
White text over dark photos: "The Gathering," "The Bazaar," "The Studio" etc. The contrast is acceptable on some cards but borderline illegible on "The Shorekeeper" card (light blue/white photo, white text). No WCAG compliance here.

**16. The card images are extremely small (~190px wide) at standard viewport sizes.**
These are supposed to be inspiration images that evoke an emotional feeling, but they're postage-stamp sized. The user can barely see the room style. The whole premise of choosing a "feeling" from a blurry tiny card is undermined.

**17. "Not the style. The feeling." — left panel is empty space.**
The left sidebar has the step label, the headline, one line of copy, and then a big empty void before "SO FAR." This is wasted real estate on every single step. The blank space makes the layout feel unfinished.

**18. "SO FAR" summary panel updates in real-time but uses an illegible italic serif in muted gray.**
"FEELING ... ROOM — LIVES HERE — BUDGET —" in all-caps tracking + light gray is very hard to read. The italic serif values (e.g. "The Gathering") in a different weight collide typographically with the label. There's no visual hierarchy between label and value.

### Step 2 — "Which room, how big?"

**19. Room type selector (Living Room / Bedroom / Dining / Study) has no selected state styling.**
When you click "Living Room" the cell doesn't visibly highlight — there's no border change, no background fill that's clearly selected. Barely a difference from unselected.

**20. The SIZE cards extend partially off-screen.**
A fourth size option ("Open") is only partially visible at the right edge — visible enough to know something is there, but you have to horizontally scroll to see it. There's no scroll indicator, no visible edge fade, nothing to guide the user.

**21. Size option descriptions are cramped and cut off.**
"Generous, well-proportioned" gets clipped inside the card without ellipsis or scroll. The card height is fixed but descriptions vary in length.

### Step 3 — "Who lives here?"

**22. The placeholder text in the textarea IS the example answer.**
The input shows a full pre-filled example ("A family of four — my son is four years old…") but it's actually placeholder text. A user who starts typing replaces it, but a user who hits Continue without typing submits nothing. The character count showing "0 CH." confirms no actual content has been entered. This is extremely confusing.

**23. The Continue button is not disabled when the field is empty, but also doesn't work.**
Clicking Continue with 0 characters doesn't proceed — but there's no error message, no tooltip, no visual feedback explaining why. The button just… does nothing. This is a silent failure.

**24. "OR PICK WHAT FITS — OPTIONAL" chip tags don't auto-populate the text area.**
Clicking "Young children" or "Pets" selects them visually but doesn't add any text to the input field. The relationship between the chips and the text box is completely unclear — do they supplement it? Replace it? Are they recorded separately? The user has no idea.

### Step 4 — "Budget, and where?"

**25. The budget slider labels at the bottom ("75K · ESSENTIALS 1.5L · FAMILY 3L · COMPLETE 5L+ · PREMIUM") are not aligned with slider positions.**
These are just text decorations — they don't correspond to actual tick marks or snap points on the slider. The slider appears to be continuous, making it unclear what snapping behavior (if any) exists.

**26. The city selector has 7 cities (Mumbai, Pune, Bangalore, Delhi, Hyderabad, Chennai, Kolkata) with no "Other" or freeform option.**
If you're not in one of these cities, you're stuck. There's no fallback. The last city "Kolkata" sits alone on a row of its own, asymmetrically breaking the 3-column grid. Visually messy.

---

## 🎨 VISIONS STAGE (Design Proposals)

**27. "3 rooms designed +₹255k under budget" in the nav header — this is confusing as a persistent nav element.**
This looks like a system notification or status badge crammed into the navigation bar. It's important information but is styled like an afterthought, sitting right next to "Quotation" and truncating into what looks like "Quotations designed."

**28. The three proposal dots (01/03) use filled/unfilled inconsistently and are too small to click.**
The three dots for switching between room proposals are tiny (about 8px). On a touch screen they're nearly impossible to tap. There's no swipe gesture, no arrow buttons for navigation (only inside the 3D view). Users can miss that there are multiple designs.

**29. The palette strip at the bottom left is purely decorative — you can't interact with it.**
Four color swatches show "PALETTE" but nothing happens when you click them. No tooltip, no action. Why is it there? Very confusing.

**30. The 3D view uses ENTRANCE / 3/4 / PLAN navigation buttons with no icons and cryptic labels.**
"3/4" is jargon for "three-quarter view" — completely opaque to non-designers. First-time users have no idea what this means. None of these buttons have icons to support the label.

**31. The "Why was this designed for me?" button is invisible until clicked — it expands a panel that completely replaces the price + CTA.**
When clicked, the CTA "START WITH THIS ROOM →" disappears, replaced by the explanation panel. To start with the room, you have to scroll back down or navigate away. A user reading the explanation has their conversion path interrupted.

**32. The design thinking bullet points use raw millimeter measurements ("2234mm wide") mixed with imperial equivalents elsewhere.**
In one screen: "2234mm wide" (metric). In another: "10×10 ft" (imperial). The app speaks two measurement languages inconsistently throughout.

**33. The total estimate "₹45k OF ₹300k" uses inconsistent size hierarchy.**
"₹45k" is displayed in a giant display font while "OF ₹300k" is tiny and barely visible. This makes the estimate look dramatically cheaper at a glance — likely intentional dark pattern territory, but even ignoring ethics, the typographic hierarchy is a mess.

**34. "+₹255k under budget" in teal/green color is jarring against the warm beige palette.**
The teal is the only cool-toned color on the entire page. It's not part of the design system and feels like a random indicator color copy-pasted from a dashboard component.

---

## 🛠 ROOM EDITOR

**35. The 3D canvas completely fails to load at times — shows a black screen.**
When entering Edit Layout mode and switching to 2D, the canvas is entirely black. This is a hard functional failure, not a style issue.

**36. "DRAWING ·" prefix before the room name in the header is meaningless metadata nobody needs.**
The header reads "DRAWING · The Breath 14′-0″ × 12′-0″". What does "DRAWING" tell the user? That they're looking at a drawing? It's visual clutter.

**37. The room name header area is extremely cramped.**
"The Breath" in large serif, "14′-0″ × 12′-0″" in small text, and "Furniture / Finishing" tabs are all competing in a 200px-wide dark header strip. Text overflows and is cut off.

**38. "Furniture" and "Finishing" tab labels in the top header are invisible until you know to look there.**
These are the only navigation tabs in the 3D editor but they're styled like inactive gray text in the top bar — zero affordance that they're clickable tabs. There's no tab underline, no active state, no visual differentiation.

**39. The AI collaborator panel shows "Calculating…" persistently.**
"Calculating…" has been shown this entire session without ever resolving. There's no timeout message, no error state, no retry action. The user is stuck watching a spinner forever.

**40. The 5 prompt chips ("Make the sofa bigger", "Add more storage", etc.) are static across all sessions.**
These suggestions never change, regardless of room type, budget, or what's already been done. They feel like dummy UI rather than context-aware suggestions.

**41. The chat input "Tell Nirmit what to refine…" uses placeholder text styling that's nearly invisible.**
The placeholder text is light italic at low contrast against the beige background. The "→ Send" button is also styled as plain italic text with an arrow — users may not realize it's a button.

**42. The send button is text-only with no visual weight.**
"→ Send" has no background, no border, no button shape. Compared to the red CTA buttons elsewhere in the app, this button is invisible.

**43. SAVE button is tiny and low-contrast in the bottom bar.**
"SAVE" is a small bordered button sitting next to "ESTIMATE" (which is just plain text, not a button?) and "MATERIALS & FINISH →". The hierarchy is wrong — Save should be the most prominent action.

**44. "ESTIMATE" is ambiguous — is it a button or a label?**
In the bottom bar, "ESTIMATE" appears next to actual buttons but has no button styling. It's unclear whether clicking it does anything. Users will click it and nothing happens, or they won't click it when they should.

**45. ENTRANCE / 3/4 / PLAN / WALK view navigation: no active state on ENTRANCE.**
After switching to PLAN, switching back to ENTRANCE shows no active/selected visual state on the button. It's impossible to know which view mode is currently active.

---

## 🎨 MATERIALS & FINISH SCREEN

**46. "STEP 4 OF 5" — but the onboarding said "Step X of 4".**
There's a completely different step count in the materials screen. The user thought they were done after 4 steps, but they're now in a new "Step 4 of 5" flow. This is highly disorienting.

**47. The Wall Paint, Flooring, and Lighting tabs use tiny icons with no labels on mobile.**
The icons (a square split diagonally, two vertical lines, a sun) are ambiguous. "Flooring" looks like a window. There's no tooltip or visible label unless you squint.

**48. Paint swatches show color name and brand but NOT the actual paint code.**
"Warm Bisque — Asian Paints" tells me the brand but not the specific color code I'd need to actually buy it at a store. The primary utility (handing off to a carpenter/painter) is incomplete.

**49. The lighting warmth slider mixes technical and conceptual labels inconsistently.**
"Candlelit" (descriptive/poetic) on one end and "Daylight" (descriptive) on the other, with a "Scene temperature" label and the Kelvin number "2700 K" (technical). The target audience (homeowners, not designers) doesn't know what 2700K means. The technical label undermines the product's "we handle the complexity" promise.

**50. "GENERATE QUOTATION →" button at the bottom of Materials appears before any choices are confirmed.**
The user can click Generate Quotation before picking flooring, lighting, or even a wall paint. There's no validation or warning that choices are incomplete.

**51. "← Back to design" button is styled like a secondary bordered button at the very bottom — easy to miss.**
For such a critical escape route, it's dangerously low contrast and placed below the fold.

---

## 🧠 PSYCHOLOGICAL / CONVERSION ISSUES

**52. No social proof anywhere on the platform.**
Zero testimonials, zero reviews, zero portfolio shots, zero "X rooms designed" counter. For a service asking people to trust them with their home design and pay up to ₹5L+, the absence of any social proof is a conversion killer.

**53. The value proposition is buried in a long sentence.**
"Tell us about your room and your family. We'll design three options you can explore in 3D — and hand you everything your carpenter needs to build it." is 32 words. The actual hook ("get 3 design options in 3D, for free, in 12 minutes") should be the headline, not paragraph copy.

**54. "Free · No lock-in · 12 min" is doing enormous lifting but is visually subordinate.**
This is the single most compelling reason to try the product. It's smaller, lighter, and less prominent than the button label. Invert this.

**55. The "So Far" summary panel in onboarding is shown to the user but they can't edit past selections.**
Seeing "FEELING: The Gathering" in the sidebar creates the implicit expectation that clicking it lets you change it. It doesn't. It's read-only. This is a psychological trap.

**56. No account system means no trust, no continuity, no ownership.**
Rooms are saved locally (or in some ephemeral state). There's no email, no sign-in, no confirmation. The user has no idea if their work is safe. "The Breath — 3d ago" could vanish and they'd have no recourse.

**57. The "3 rooms designed" framing in the Visions stage is confusing.**
The top bar says "3 rooms designed" which sounds like a lifetime stat, not "we've generated 3 options for you." The phrasing doesn't communicate its own meaning.

**58. "Why was this designed for me?" is buried and interrupts the conversion path.**
This is actually a brilliant trust-building feature — it explains the AI's reasoning, references the family details, and talks about accessibility. But it's hidden behind a small text button, and clicking it destroys the conversion path (hides the main CTA). It should be an expandable accordion below the design thinking section, not a page swap.

**59. Estimate "₹45k of ₹300k" creates anchoring confusion.**
The ₹300k is the budget set by the user. Displaying it next to the estimate implies ₹45k is the cost, but ₹300k is not the "total" — it's the budget ceiling. A user could think the room costs ₹300k with a current estimate of ₹45k (i.e., incomplete). The label "OF ₹300k" is ambiguous.

---

## ♿ ACCESSIBILITY ISSUES

**60. No visible focus states on most interactive elements.**
Keyboard navigation is essentially broken — there are no visible outlines when tabbing through buttons, cards, or the chat input.

**61. Color chips in palette/paint selection have no text alternative.**
A colorblind user has no way to distinguish between the 8 paint swatches without relying entirely on the written label below.

**62. The 3D room view has no alt text, no description, no accessible equivalent.**
Screen readers get nothing useful from the 3D canvas.

**63. All-caps text ("YOUR SAVED ROOMS", "DESIGN A NEW ROOM", "SO FAR") is harder to read and not read as words by some screen readers.**
All-caps should use `letter-spacing` carefully but should never replace mixed-case for long labels.

---

## 🐛 FUNCTIONAL / FEATURE BUGS

**64. 2D layout editor renders a completely black canvas.**
This is a hard bug — the 2D floor plan editor shows nothing.

**65. "Calculating…" spinner never resolves in the Collaborator panel.**
The AI panel has been stuck calculating for the entire session. No timeout, no error state.

**66. The "Why was this designed for me?" panel, once opened, has no close button that restores the previous state.**
It shows a "← Back" link, but this takes you to the full vision list, not back to the specific room card you were viewing.

**67. Character count "0 CH." on the "Who lives here?" textarea counts placeholder text as zero but pre-fills the field visually.**
The character counter and the textarea contents are out of sync — the textarea shows text (placeholder) but the counter shows 0.

**68. Room name "The Breath" has a hanging quote mark at the start in the Collaborator panel.**
The panel header shows `'The Breath` with a visible opening single quote character — a typography/encoding bug.