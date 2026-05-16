# Nirmit UX Migration Guide
## Keep nirmit-analyze's visual identity · Take POC's UX journey

---

## Executive Summary

**nirmit-analyze** has a deeply considered design language — the paper/ink/terracotta palette, Cormorant Garamond serif type, architectural SVG drawings, and the editorial grid feel. This is the visual identity worth keeping.

**POC** has a superior UX journey — a persistent AppShell with a sticky nav, a properly bounded step-based intake flow with icons and better information architecture, the Visions gallery (multi-layout selection), and a cleaner progression structure.

The goal: transplant POC's user journey into nirmit-analyze's aesthetic container.

---

## Section 1 — Design Language Comparison

### nirmit-analyze: The Design Language (KEEP THIS)

**Color system** (`styles.css`):
- Surfaces: `--paper` (#F2EBDD), `--paper-2`, `--paper-3`, `--basalt` (#1A1714)
- Ink: `--ink`, `--ink-2`, `--ink-3`
- Accents: `--terra` (#C2502E), `--terra-dk`, `--walnut`, `--leaf`, `--green`
- Lines: `--line`, `--line-2`

**Typography** (4 typefaces working together):
- `--fd` Cormorant Garamond — editorial headers, serif romance
- `--fb` DM Sans — body, UI
- `--fm` JetBrains Mono — eyebrows, labels, dimensions
- `--fh` Tiro Devanagari Hindi — Hindi text (निर्मित)

**Signature visual elements** (don't touch these):
- The paper texture (`.paper` with grid overlay at 0.18 opacity)
- The animated architectural SVG drawing on landing
- The `draw-line` animation (stroke-dashoffset 1000 → 0)
- `eyebrow` class — mono, 11px, 0.18em letter-spacing, uppercase
- The `.lnk` underline-link pattern with italic serif + arrow
- The 8pt spacing grid (`--s-1` through `--s-8`)
- The 60px topbar with Nirmit + निर्मित logo

**Motion system**:
- `appear`, `appear-2` through `appear-5` — staggered reveals
- `slide-up` — for question transitions
- `draw-line` — architectural drawing animation
- Framer Motion `AnimatePresence` with 0.28s opacity crossfades

---

### POC: The UX Journey (TAKE THIS)

**What POC does better:**

1. **AppShell architecture** — sticky 56px header wrapping all screens (except landing). Back button + logo left, progress trail center, contextual right (cost chip). nirmit-analyze rebuilds the topbar in every route — maintenance nightmare.

2. **Intake step structure** — POC's 4-step intake with animated slide transitions (x: 60px enter, x: -60px exit, direction-aware) vs analyze's static page-per-question layout. POC also shows icons (Lucide) for room types and family profiles.

3. **Visions screen** — POC has an explicit multi-layout gallery with named layouts ("The Family Anchor", "The Open Flow") + mini-map SVG previews + score-based tags. nirmit-analyze's `RevealRoute` jumps straight to a 3D view with carousel arrows — less scannable.

4. **Journey stages** — POC: `landing → intake → generating → visions → plan → style → export`. nirmit-analyze: same but `visions` is called `reveal` and lacks the gallery layout picker that shows options side-by-side.

5. **Cost visibility** — POC has a persistent `CostChip` (floating) + `CostDrawer` (slide-in). nirmit-analyze shows cost only in the reveal right panel and export screen.

6. **Navigation back** — POC centralizes back navigation in AppShell with a `backScreenMap`. nirmit-analyze duplicates nav logic in each screen.

---

## Section 2 — Screen-by-Screen Journey Delta

| POC Screen | Analyze Equivalent | Gap |
|---|---|---|
| `LandingScreen` | `HomeRoute` | Analyze is stronger — editorial SVG, saved designs, city strip. Keep as-is. |
| `IntakeScreen` (4 steps with direction-aware animation) | `IntakeRoute` (4 pages, static) | POC's slide animation, icon-grid for rooms, `StepHeader` component. |
| `GeneratingScreen` (stage list + progress) | `GeneratingRoute` | Both similar; analyze's floor plan animation is better. |
| `VisionsScreen` (gallery with named layouts + minimap) | `RevealRoute` (3D view + carousel) | **Biggest gap** — POC shows all options simultaneously; analyze hides them behind arrow navigation. |
| `PlannerScreen` | `PlannerRoute` | Very similar. Both have 3D + chat + intent system. |
| `StyleScreen` | `StyleRoute` | Similar; POC has AI-text material input. |
| `ExportScreen` | `ExportRoute` | Analyze is stronger (PDF preview + BOQ table). |
| AppShell (persistent) | Per-screen topbars | **Structural gap** — analyze duplicates header in every route. |

---

## Section 3 — Changes to Make in nirmit-analyze

These are ordered by impact, from foundational to incremental.

---

### Change 1 — Add AppShell (foundational, restructures App.tsx)

**What:** Extract the common header into a persistent `AppShell` component that wraps all screens except `home`.

**Why:** Currently nirmit-analyze repeats the 60px topbar + logo + ProgressTrail in every route. AppShell centralizes this, adds a consistent back button pattern, and unlocks the cost chip.

**Implementation in opencode:**

Create `src/components/shell/AppShell.tsx`:

```tsx
import { type ReactNode } from "react";
import { ProgressTrail } from "@/components/ProgressTrail";
import { useAppStore, type Stage } from "@/store/useAppStore";

const BACK_MAP: Partial<Record<Stage, Stage>> = {
  intake:     "home",
  reveal:     "intake",
  planner:    "reveal",
  style:      "planner",
  export:     "style",
};

interface AppShellProps {
  children: ReactNode;
  stage: Stage;
  rightContent?: ReactNode;
}

export function AppShell({ children, stage, rightContent }: AppShellProps) {
  const setStage = useAppStore((s) => s.setStage);
  const backStage = BACK_MAP[stage];

  const isFullBleed = stage === "planner" || stage === "style" || stage === "generating";

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Sticky header */}
      <div style={{
        height: 60,
        padding: "0 40px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexShrink: 0,
        borderBottom: "1px solid var(--line)",
        background: "rgba(242,235,221,0.94)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}>
        {/* Left — back + logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 200 }}>
          {backStage && (
            <button
              onClick={() => setStage(backStage)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 14px",
                border: "1px solid var(--line-2)",
                background: "transparent",
                color: "var(--ink-2)",
                fontFamily: "var(--fb)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 180ms ease",
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = "var(--ink)"; e.currentTarget.style.color = "var(--ink)"; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = "var(--line-2)"; e.currentTarget.style.color = "var(--ink-2)"; }}
            >
              ← Back
            </button>
          )}
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontFamily: "var(--fd)", fontSize: 20, fontWeight: 500, color: "var(--ink)" }}>Nirmit</span>
            <span style={{ fontFamily: "var(--fh)", fontSize: 15, color: "var(--ink-3)" }}>निर्मित</span>
          </div>
        </div>

        {/* Center — progress trail */}
        <ProgressTrail stage={stage} />

        {/* Right — contextual */}
        <div style={{ minWidth: 200, display: "flex", justifyContent: "flex-end" }}>
          {rightContent}
        </div>
      </div>

      {/* Body */}
      <div style={{
        flex: 1,
        overflow: isFullBleed ? "hidden" : "auto",
        display: "flex",
        flexDirection: "column",
      }}>
        {children}
      </div>
    </div>
  );
}
```

Then update `App.tsx` to use AppShell for all screens except `home`:

```tsx
export function App() {
  const stage = useAppStore((s) => s.stage);

  if (stage === "home") {
    return (
      <AnimatePresence mode="wait">
        <motion.div key="home" ...>
          <HomeRoute />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AppShell stage={stage}>
      <AnimatePresence mode="wait">
        <motion.div key={stage} ...>
          {ROUTE_MAP[stage]}
        </motion.div>
      </AnimatePresence>
    </AppShell>
  );
}
```

Then **remove** the topbar div from each route (IntakeRoute, GeneratingRoute, RevealRoute, PlannerRoute, StyleRoute, ExportRoute) since AppShell handles it. Each route body starts directly with its content grid.

---

### Change 2 — Animate Intake Step Transitions (direction-aware)

**What:** Add directional slide animation when moving between intake pages (left slide for forward, right slide for back).

**Why:** The current `key={page}` + `slide-up` animation always enters from below. POC uses `x: 60px → 0 → -60px` with direction tracking.

**Implementation — update `IntakeRoute.tsx`:**

Add direction state:
```tsx
const [page, setPage] = useState(0);
const [direction, setDirection] = useState(1);  // +1 = forward, -1 = back

function next() {
  if (page < 3) { setDirection(1); setPage(page + 1); }
  else void submit();
}
function prev() {
  if (page > 0) { setDirection(-1); setPage(page - 1); }
  else setStage("home");
}
```

Replace the `key={`a${page}`} className="slide-up"` div with Framer Motion:
```tsx
import { motion, AnimatePresence } from "framer-motion";

// In JSX:
<AnimatePresence mode="wait" custom={direction}>
  <motion.div
    key={page}
    custom={direction}
    variants={{
      enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
      center: { x: 0, opacity: 1 },
      exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
    }}
    initial="enter"
    animate="center"
    exit="exit"
    transition={{ duration: 0.28, ease: [0.22, 0.7, 0, 1.05] }}
    style={{ flex: 1, overflowY: "auto", padding: "60px 72px 24px" }}
  >
    {/* page content */}
  </motion.div>
</AnimatePresence>
```

---

### Change 3 — Add Room Type Icons to Intake Page 2

**What:** Add Lucide icons to the room type selector cards (Sofa for Living, Bed for Bedroom, etc.).

**Why:** POC's room selection uses icon-grid cards that communicate room type visually before reading the label. Much faster to scan.

**Implementation:**

Install if not already present: `npm install lucide-react`

In `IntakeRoute.tsx`, update the `RoomAnswer` component:

```tsx
import { Sofa, Bed, Coffee, Laptop } from "lucide-react";

const ROOM_ICONS: Record<RoomType, React.ReactNode> = {
  living:  <Sofa size={20} strokeWidth={1.5} />,
  bedroom: <Bed size={20} strokeWidth={1.5} />,
  dining:  <Coffee size={20} strokeWidth={1.5} />,
  study:   <Laptop size={20} strokeWidth={1.5} />,
};

// In the room type selector row, add icon above the label:
<div key={id} onClick={() => setRoom(id)} style={{ ... }}>
  <div style={{ color: sel ? "var(--paper)" : "var(--terra)", marginBottom: 8 }}>
    {ROOM_ICONS[id]}
  </div>
  <div style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 17, fontWeight: 500 }}>{en}</div>
</div>
```

---

### Change 4 — Replace RevealRoute with a Visions Gallery Screen

**What:** Add a gallery view before the 3D reveal, showing all generated visions side-by-side with named layouts and feature tags.

**Why:** This is the **biggest UX gap**. POC's `VisionsScreen` lets users compare all options simultaneously before committing. nirmit-analyze's `RevealRoute` hides options behind carousel arrows — users don't know there are 3 options until they accidentally press the nav arrow.

**New component:** `src/routes/VisionsGalleryRoute.tsx`

Key design decisions:
- Keep nirmit-analyze's paper/ink palette (no POC's gray Tailwind classes)
- Use the existing `Vision` type from the backend
- Named visions using the `vision.name` and `vision.tagline` from the API
- Feature chips drawn from `vision.reasoning.bullets` (first 2)
- Selecting a vision sets `selectedVisionId` and navigates to `reveal` (the 3D view)

**Update the journey:** Add `"visions"` stage to `Stage` type in `useAppStore.ts`:

```ts
export type Stage = "home" | "intake" | "generating" | "visions" | "reveal" | "planner" | "style" | "export";
```

Update `api.generate()` flow in `IntakeRoute.tsx`:
```tsx
// After API call succeeds:
setVisions(res.visions);
setStage("visions");   // was: setStage("reveal")
```

**VisionsGalleryRoute implementation:**

```tsx
export function VisionsGalleryRoute() {
  const { visions, selectVision, setStage } = useAppStore();

  function choose(id: string) {
    selectVision(id);
    setStage("reveal");
  }

  return (
    <div className="paper" style={{ minHeight: "calc(100vh - 60px)", padding: "56px 64px 80px" }}>
      
      {/* Section header */}
      <div className="appear" style={{ marginBottom: 48 }}>
        <span className="eyebrow">Three rooms drawn for you</span>
        <h2 style={{
          fontFamily: "var(--fd)", fontSize: "clamp(36px, 4vw, 56px)",
          fontWeight: 500, lineHeight: 1.0, letterSpacing: "-0.018em",
          color: "var(--ink)", marginTop: 12, maxWidth: "28ch",
        }}>
          Choose a starting
          <span style={{ fontStyle: "italic", color: "var(--terra)" }}> drawing.</span>
        </h2>
        <p style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 16, color: "var(--ink-2)", marginTop: 12, maxWidth: "50ch" }}>
          Each room below is fully furnished, priced, and ready to edit. Pick the one that speaks to you.
        </p>
      </div>

      {/* Vision grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
        {visions.map((vision, i) => (
          <VisionCard
            key={vision.id}
            vision={vision}
            rank={i}
            onSelect={() => choose(vision.id)}
          />
        ))}
      </div>
    </div>
  );
}

function VisionCard({ vision, rank, onSelect }: { vision: Vision; rank: number; onSelect: () => void }) {
  const [hover, setHover] = useState(false);
  const totalFmt = `₹${Math.round(vision.cost.story.total_inr / 1000)}k`;
  const remaining = vision.cost.story.remaining_inr;
  const remainColor = remaining >= 0 ? "var(--leaf)" : "var(--terra-dk)";

  const palette = vision.room_state.palette.accent
    ? [vision.room_state.palette.accent, vision.room_state.palette.wall ?? "#D9C09C"]
    : ["#C2502E", "#D9C09C"];

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`appear-${rank + 2}`}
      style={{
        border: `1px solid ${hover ? "var(--ink)" : "var(--line)"}`,
        background: hover ? "var(--paper-3)" : "var(--paper)",
        cursor: "pointer",
        transition: "all .25s ease",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Palette strip */}
      <div style={{ height: 6, display: "flex" }}>
        {palette.map((c, i) => (
          <div key={i} style={{ flex: 1, background: c }} />
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "24px 24px 20px" }}>
        {rank === 0 && (
          <div style={{ marginBottom: 12 }}>
            <span style={{
              fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.16em",
              color: "var(--paper)", background: "var(--terra)",
              padding: "3px 10px", textTransform: "uppercase",
            }}>
              TOP CHOICE
            </span>
          </div>
        )}

        <div style={{ fontFamily: "var(--fm)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em", marginBottom: 8 }}>
          {String(rank + 1).padStart(2, "0")} — {vision.philosophy?.replace(/_/g, " ").toUpperCase()}
        </div>

        <h3 style={{
          fontFamily: "var(--fd)", fontSize: 26, fontWeight: 500, lineHeight: 1.05,
          letterSpacing: "-0.015em", color: "var(--ink)", marginBottom: 6,
        }}>
          {vision.name}
        </h3>
        <p style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 14, color: "var(--terra)", marginBottom: 20, lineHeight: 1.4 }}>
          {vision.tagline}
        </p>

        {/* Feature chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
          {vision.reasoning.bullets.slice(0, 2).map((b, i) => (
            <span key={i} style={{
              fontFamily: "var(--fb)", fontSize: 11,
              border: "1px solid var(--line)", padding: "4px 10px",
              color: "var(--ink-2)", lineHeight: 1,
            }}>
              {b.split(".")[0]}
            </span>
          ))}
        </div>

        {/* Cost row */}
        <div style={{
          display: "flex", alignItems: "baseline", justifyContent: "space-between",
          borderTop: "1px solid var(--line)", paddingTop: 16,
        }}>
          <span style={{ fontFamily: "var(--fd)", fontSize: 22, fontWeight: 500, color: "var(--ink)" }}>
            {totalFmt}
          </span>
          <span style={{ fontFamily: "var(--fb)", fontSize: 12, color: remainColor }}>
            {remaining >= 0
              ? `+₹${Math.round(remaining / 1000)}k under`
              : `-₹${Math.round(Math.abs(remaining) / 1000)}k over`}
          </span>
        </div>
      </div>

      {/* CTA */}
      <div style={{
        padding: "14px 24px",
        borderTop: "1px solid var(--line)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: hover ? "var(--ink)" : "transparent",
        transition: "background .25s ease",
      }}>
        <span style={{
          fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 14, fontWeight: 500,
          color: hover ? "var(--paper)" : "var(--ink)",
          transition: "color .25s ease",
        }}>
          Explore this room
        </span>
        <span style={{ color: hover ? "var(--paper)" : "var(--terra)", transition: "color .25s ease" }}>→</span>
      </div>
    </div>
  );
}
```

Also add `visions` to `ROUTE_MAP` in `App.tsx` and update `STAGE_TO_STEP` in `ProgressTrail.tsx`:

```ts
// ProgressTrail.tsx
const STAGE_TO_STEP: Partial<Record<Stage, number>> = {
  intake:     0,
  generating: 0,
  visions:    1,   // ADD THIS
  reveal:     1,
  planner:    2,
  style:      3,
  export:     4,
};
```

---

### Change 5 — Persistent Cost Chip

**What:** Add a floating cost chip visible in `planner` and `style` stages showing the current room total.

**Why:** POC surfaces cost at every step so users always know where they stand. nirmit-analyze only shows it in the reveal sidebar and export.

**Implementation — `src/components/shell/CostChip.tsx`:**

```tsx
import { useAppStore } from "@/store/useAppStore";

export function CostChip() {
  const stage = useAppStore((s) => s.stage);
  const visions = useAppStore((s) => s.visions);
  const selectedVisionId = useAppStore((s) => s.selectedVisionId);

  if (!["planner", "style"].includes(stage)) return null;

  const vision = visions.find((v) => v.id === selectedVisionId) ?? visions[0];
  if (!vision) return null;

  const total = vision.cost.story.total_inr;
  const budget = vision.cost.story.budget_inr;
  const pct = Math.round((total / budget) * 100);

  return (
    <div style={{
      position: "fixed",
      bottom: 28,
      right: 28,
      background: "var(--ink)",
      color: "var(--paper)",
      padding: "12px 20px",
      display: "flex",
      alignItems: "baseline",
      gap: 10,
      zIndex: 50,
      boxShadow: "0 4px 24px rgba(26,23,20,.3)",
    }}>
      <span style={{ fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.14em", color: "rgba(242,235,221,.5)" }}>
        TOTAL
      </span>
      <span style={{ fontFamily: "var(--fd)", fontSize: 20, fontWeight: 500 }}>
        ₹{Math.round(total / 1000)}k
      </span>
      <span style={{ fontFamily: "var(--fm)", fontSize: 9, color: "rgba(242,235,221,.4)", letterSpacing: "0.08em" }}>
        of ₹{Math.round(budget / 1000)}k · {pct}%
      </span>
    </div>
  );
}
```

Add `<CostChip />` to `App.tsx` (outside the AnimatePresence, so it persists during route transitions).

---

### Change 6 — Add Who Lives Here Chip Tags to Intake

**What:** The intake "Who lives here" step in POC uses chips like `[Couple] [Kids] [Elderly Parents] [WFH] [Pets]`. nirmit-analyze already has `WHO_CHIPS` but they're styled differently. This is already done but worth verifying the chip toggle works with enter key / accessibility.

**Status:** Already implemented in nirmit-analyze's `WhoAnswer`. Minor polish only.

---

### Change 7 — Remove Duplicate Topbars from Each Route

Once AppShell is in place (Change 1), remove the per-screen header from:

- `IntakeRoute.tsx` — remove the `{/* Top bar */}` div block (~10 lines)
- `GeneratingRoute.tsx` — remove top bar
- `RevealRoute.tsx` — remove top bar (logo + progress trail)
- `PlannerRoute.tsx` — keep the internal dark topbar since it's part of the 3D editor chrome, not page header
- `StyleRoute.tsx` — keep the dark top bar (editor chrome)
- `ExportRoute.tsx` — remove logo/nav duplicates, keep the document title section

The PlannerRoute and StyleRoute have a **dark internal toolbar** (not the paper header). This is fine — AppShell renders the paper header, then the routes render their own dark editor chrome below it. No conflict.

---

## Section 4 — What NOT to Change

These are POC patterns that nirmit-analyze already does better. Don't backport them:

| POC element | Why to leave it |
|---|---|
| Tailwind CSS classes everywhere | analyze's CSS variables + inline styles are more intentional |
| `rounded-2xl`, `shadow-lg` | analyze's sharp borders are part of the design language |
| White/gray backgrounds (`bg-[#F4F3EE]`) | analyze's warm paper texture with grid overlay is superior |
| POC's `LandingScreen` | analyze's editorial landing with animated SVG section drawing is far stronger |
| POC's `ExportScreen` | analyze's PDF preview + BOQ table is more complete |
| POC's generic `Button` component | analyze's `.lnk` underline-button is more distinctive |
| Generic font stack | analyze's Cormorant + DM Sans + JetBrains Mono pairing is exceptional |
| POC's progress trail (numbered circles) | analyze's text-label trail in JetBrains Mono is more editorial |

---

## Section 5 — File Change Checklist for opencode

```
CREATES (new files):
□ src/components/shell/AppShell.tsx
□ src/components/shell/CostChip.tsx
□ src/routes/VisionsGalleryRoute.tsx

MODIFIES (existing files):
□ src/store/useAppStore.ts
    — Add "visions" to Stage type
    — STAGE_TO_STEP update

□ src/App.tsx
    — Add AppShell wrapper for non-home stages
    — Add VisionsGalleryRoute to ROUTE_MAP
    — Add CostChip outside AnimatePresence

□ src/components/ProgressTrail.tsx
    — Add "visions" → 1 to STAGE_TO_STEP

□ src/routes/IntakeRoute.tsx
    — Add direction state
    — Replace static page body with AnimatePresence + directional motion
    — Change `setStage("reveal")` → `setStage("visions")` in submit()
    — Add Lucide icons to RoomAnswer
    — Remove topbar div (AppShell handles it)

□ src/routes/GeneratingRoute.tsx
    — Remove topbar div

□ src/routes/RevealRoute.tsx
    — Remove topbar div (AppShell handles it now)

□ src/routes/ExportRoute.tsx
    — Remove duplicated logo/nav header block
    — Keep document content (BOQ table etc.)
```

---

## Section 6 — Priority Order for opencode Sessions

Work in this order — each step is independently deployable:

**Session 1 (Structural):** Changes 1 + 7 together — AppShell + remove duplicate headers. Test that all routes render correctly inside the shell.

**Session 2 (Journey):** Change 4 — VisionsGalleryRoute. Also update Stage type and routing. Test end-to-end: intake → generating → visions → reveal.

**Session 3 (Polish):** Changes 2 + 3 — directional intake animations + room icons.

**Session 4 (Ambient):** Change 5 — CostChip. Low risk, high delight.

---

## Section 7 — Token Reference for nirmit-analyze Aesthetic

When implementing any new component, always use these:

```css
/* Fonts */
font-family: var(--fd);          /* headers, serif labels */
font-family: var(--fb);          /* body, buttons, UI */
font-family: var(--fm);          /* eyebrows, mono labels, dimensions */
font-family: var(--fh);          /* Hindi text */

/* Colors */
background: var(--paper);       /* main surface */
background: var(--paper-2);     /* slightly deeper surface */
background: var(--basalt);      /* dark areas (3D viewer background) */
color: var(--ink);              /* primary text */
color: var(--ink-2);            /* secondary text */
color: var(--ink-3);            /* muted text, eyebrows */
color: var(--terra);            /* accent, CTAs */
border-color: var(--line);      /* subtle borders */
border-color: var(--line-2);    /* slightly more visible borders */

/* Spacing */
--s-4: 16px; --s-5: 24px; --s-6: 32px; --s-7: 48px; --s-8: 64px;

/* Reusable utility classes */
.paper         /* paper surface with texture + grid */
.eyebrow       /* mono 11px 0.18em uppercase */
.lnk           /* serif italic underline-link */
.appear        /* staggered fade-up .1 */
.appear-2 → .appear-5
.slide-up      /* spring slide-up */
```

**Never in nirmit-analyze:**
- `rounded-*` Tailwind classes
- `bg-white` / `bg-gray-*`
- `box-shadow: var(--sh-*)` (POC's shadow tokens don't exist here)
- Purple or blue accent colors (terra is the only accent)
- `Inter`, `Space Grotesk`, `system-ui` as primary faces
