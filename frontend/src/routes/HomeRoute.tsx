import { useEffect, useRef, useState } from "react";
import { api, type DesignSummary } from "@/api/client";
import type { RoomState, Vision } from "@/api/types";
import { penFill, penLabel, penPath, penPathQuick } from "@/lib/penDraw";
import { useAppStore } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore";
import { TopNav } from "@/components/shell/TopNav";

export function HomeRoute() {
  const setStage = useAppStore((s) => s.setStage);
  const setVisions = useAppStore((s) => s.setVisions);
  // Saved-rooms section is auth-gated: anonymous visitors see only the
  // hero + CTA (no archive section at all — the empty-state for a
  // never-signed-in visitor is noise). Signed-in users see their archive
  // below the hero. See memory/project_auth_strategy.md.
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [designs, setDesigns] = useState<DesignSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const savedRoomsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Skip the listDesigns call entirely for anonymous visitors — we
    // already know they have no archive to fetch, and we never render
    // the section for them anyway.
    if (!user) {
      setLoading(false);
      setDesigns([]);
      return;
    }
    setLoading(true);
    api.listDesigns()
      .then((r) => setDesigns(r.designs))
      .catch(() => setDesigns([]))
      .finally(() => setLoading(false));
  }, [user]);

  async function open(id: string) {
    try {
      const d = await api.loadDesign(id);
      const room: RoomState = d.room_state;
      const fakeVision: Vision = {
        id: d.id,
        philosophy: (d.philosophy as Vision["philosophy"]) || "gathering",
        name: d.name,
        tagline: "Your saved room.",
        room_state: room,
        reasoning: {
          headline: "Picking up where you left off.",
          bullets: [],
          vastu_notes: [],
          accessibility_notes: [],
        },
        cost: {
          story: {
            total_inr: 0,
            budget_inr: room.intake.budget_inr,
            remaining_inr: room.intake.budget_inr,
            livspace_comparison_pct: 0,
            headline: "",
          },
          line_items: [],
        },
      };
      setVisions([fakeVision]);
      setStage("planner");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function remove(id: string) {
    try {
      await api.deleteDesign(id);
      setDesigns((d) => d.filter((x) => x.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function scrollToRooms() {
    savedRoomsRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  const hasRooms = !loading && designs.length > 0;
  // Signed-in users with at least one saved room see the archive
  // section + the floating scroll cue. Anonymous visitors (no `user`)
  // see hero only, even if `designs` somehow had entries — gate is
  // explicit on `user` so the intent reads in the JSX. */
  const showArchive = !!user && hasRooms;

  return (
    <div
      className="paper"
      style={{ height: "100vh", overflowY: "auto", display: "flex", flexDirection: "column" }}
    >
      <TopNav stage="home" hideTrail hideBack />

      {/* Hero — `.home-hero` is the responsive hook (see styles.css media
       *  query): under 1100 px the two columns stack so the headline and
       *  the section drawing each get the full width instead of being
       *  crushed into half-and-half. */}
      <div
        className="home-hero"
        style={{
          flexShrink: 0,
          minHeight: "calc(100vh - 64px)",
          display: "grid",
          gridTemplateColumns: "56fr 44fr",
          position: "relative",
        }}
      >
        {/* Left: editorial copy */}
        <div
          style={{
            padding: "0 64px 0 80px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            className="appear"
            style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}
          >
            <div style={{ width: 28, height: 1, background: "var(--terra)", opacity: 0.7 }} />
            <span className="eyebrow">&#2344;&#2367;&#2352;&#2381;&#2350;&#2367;&#2340; &middot; Interior design for Indian homes</span>
          </div>

          <h1 className="hero-display appear-2">
            <span className="hero-display-line">Design your</span>
            <span className="hero-display-line">
              <em>home,</em> with us.
            </span>
          </h1>

          <p className="hero-lead appear-3">
            Tell us how you live. We draw three rooms you can walk through —
            refine the one you like, and hand your carpenter a quotation they
            can actually build from.
          </p>

          <div className="appear-4">
            <button className="btn-primary btn-lg" onClick={() => setStage("intake")}>
              {designs.length === 0 ? "Start designing" : "Design a new room"}
              <span style={{ fontWeight: 300, lineHeight: 1 }}>&rarr;</span>
            </button>
          </div>

          {error && (
            <p style={{ color: "var(--terra-dk)", fontFamily: "var(--fb)", fontSize: 14, marginTop: 20 }}>
              {error}
            </p>
          )}
        </div>

        {/* Right: architectural drawing, same paper background */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: 20, left: 20, width: 18, height: 18, borderTop: "1px solid var(--line-2)", borderLeft: "1px solid var(--line-2)" }} />
          <div style={{ position: "absolute", top: 20, right: 20, width: 18, height: 18, borderTop: "1px solid var(--line-2)", borderRight: "1px solid var(--line-2)" }} />
          <div style={{ position: "absolute", bottom: 20, left: 20, width: 18, height: 18, borderBottom: "1px solid var(--line-2)", borderLeft: "1px solid var(--line-2)" }} />
          <div style={{ position: "absolute", bottom: 20, right: 20, width: 18, height: 18, borderBottom: "1px solid var(--line-2)", borderRight: "1px solid var(--line-2)" }} />
          <ReplayableCoverDrawing />
        </div>

        {/* Floating scroll indicator — centered, clickable, gently rocks
            up/down. Only appears for signed-in users with at least one
            saved room (gated on `showArchive`, not just `hasRooms`).
            Anonymous visitors see the hero unbroken. */}
        {showArchive && (
          <button
            onClick={scrollToRooms}
            style={{
              position: "absolute",
              bottom: 28,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              opacity: 0,
              animation: "fade .6s ease-out 1.2s forwards",
            }}
          >
            <span
              style={{
                fontFamily: "var(--fm)",
                fontSize: 9,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--ink-3)",
              }}
            >
              {designs.length} saved {designs.length === 1 ? "room" : "rooms"}
            </span>
            <div style={{ animation: "float 2.6s ease-in-out 1.8s infinite" }}>
              <svg width="18" height="11" viewBox="0 0 18 11" fill="none">
                <path d="M1 1L9 9L17 1" stroke="var(--ink-3)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </button>
        )}
      </div>

      {/* Saved rooms — auth-gated. Anonymous visitors don't see this
          section at all; it's noise for someone who just arrived. */}
      {showArchive && (
        <div
          ref={savedRoomsRef}
          className="page-shell"
          style={{ flexShrink: 0, borderTop: "1px solid var(--line)" }}
        >
          <div style={{ maxWidth: 680 }}>
            <div
              style={{
                display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 40,
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--fd)", fontSize: "clamp(28px, 3vw, 42px)",
                  fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1, color: "var(--ink)",
                }}
              >
                Your rooms
              </h2>
              <span
                style={{
                  fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.2em",
                  color: "var(--terra-dk)", background: "var(--terra-light)", padding: "5px 12px",
                }}
              >
                {designs.length} {designs.length === 1 ? "ROOM" : "ROOMS"} SAVED
              </span>
            </div>

            <div style={{ borderTop: "1px solid var(--line)" }}>
              {designs.slice(0, 6).map((d) => (
                <div
                  key={d.id}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "18px 0", borderBottom: "1px solid var(--line)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                    <span style={{ fontFamily: "var(--fd)", fontSize: 18, fontWeight: 500, color: "var(--ink)" }}>
                      {d.name}
                    </span>
                    <span style={{ fontFamily: "var(--fm)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em" }}>
                      {timeAgo(d.updated_at)}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button className="btn-ghost" onClick={() => open(d.id)}>Open &rarr;</button>
                    {confirmDelete === d.id ? (
                      <div className="inline-confirm">
                        <span className="inline-confirm-label">Drop it?</span>
                        <button className="inline-confirm-yes" onClick={() => { void remove(d.id); setConfirmDelete(null); }}>Yes, drop</button>
                        <button className="inline-confirm-no" onClick={() => setConfirmDelete(null)}>Keep</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(d.id)}
                        style={{ background: "transparent", border: "none", color: "var(--ink-3)", fontSize: 18, cursor: "pointer", lineHeight: 1, padding: 4 }}
                        aria-label="Delete room"
                      >&times;</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   ReplayableCoverDrawing — architectural section drawing in Nirmit's
   paper-and-ink language. There are no hover effects, no 3D tilt, no
   parallax, no continuous ambient motion. The drawing exists for ONE
   show-piece moment: the pen-draw choreography on first paint. We are
   deliberately committing every detail to that one moment instead of
   diluting it with hover-shenanigans.

   The pen-draw runs in five phases that read like an architect's actual
   drafting session:

     Phase 1 (0 → 1.6 s):   the room shell — floor first, then the two
                            side walls, then the ceiling. A draftsman
                            lays out the page before drawing in it.
     Phase 2 (1.6 → 2.3 s): the ceiling-height dimension — quick ticks
                            and the "10'-0″" label in the left margin.
     Phase 3 (2.3 → 3.8 s): the furniture — sofa, then TV unit + screen,
                            then mandir niche (terra accent), then
                            pendant light, then plant. Built up in the
                            same order a designer would actually place
                            them in a real room.
     Phase 4 (3.8 → 4.4 s): the two margin annotations — "morning sun"
                            over the mandir, "9' sofa · movie nights"
                            below the sofa.
     Phase 5 (4.4 → 5.0 s): the title block at the bottom — eyebrow,
                            brand line, italic tagline.

   Each phase has a brief settle at its end before the next begins, so
   the eye actually FOLLOWS the pen instead of being overwhelmed by
   simultaneous motion. The delays below are tuned so each new stroke
   begins as the previous one is still settling — pen lift, pen down,
   continuous flow.

   Implementation note: the timings hand off to the CSS keyframes in
   styles.css (penDraw / penLabel / penFill). All durations and delays
   are multiplied by TEMPO in lib/penDraw.ts — change that single dial
   to retune the whole choreography without touching individual values. */
function ReplayableCoverDrawing() {
  return (
    <div style={{ width: "100%", maxWidth: 480, position: "relative" }}>
      <CoverSectionDrawing />
    </div>
  );
}

function CoverSectionDrawing() {
  return (
    <svg
      className="pen-svg"
      viewBox="0 0 560 540"
      width="100%"
      shapeRendering="geometricPrecision"
      style={{ overflow: "visible" }}
    >
      <defs>
        <pattern id="hatch-cov" x="0" y="0" width="7" height="7"
          patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" stroke="var(--ink)" strokeWidth="0.6" opacity="0.35" />
        </pattern>
        <pattern id="hatch-terra-cov" x="0" y="0" width="5" height="5"
          patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke="var(--terra)" strokeWidth="0.8" opacity="0.5" />
        </pattern>
        <pattern id="hatch-leaf-cov" x="0" y="0" width="5" height="5"
          patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke="#5A7A4A" strokeWidth="0.7" opacity="0.5" />
        </pattern>

        {/* Furniture drop-shadow. The HD-2D diorama cue — every piece
            sits slightly proud of the page. */}
        <filter id="furniture-lift" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3.5" stdDeviation="1.6" floodColor="var(--ink)" floodOpacity="0.22" />
        </filter>
      </defs>

      {/* ════════════════════════════════════════════════════════════════
            PHASE 1 — Room shell (raw 0.0 → 1.6, actual ~0.0 → 1.0 s)
            The architect lays out the page. Floor first (the strongest
            line, sets the ground plane), then the two side walls drawn
            slightly slower so they read as deliberate, then the ceiling
            to close the rectangle. Each line waits for the previous to
            be settling — not finished — so the pen reads as continuous.
         ════════════════════════════════════════════════════════════════ */}
      <g>
        <line x1="60"  y1="410" x2="500" y2="410" stroke="var(--ink)" strokeWidth="1.8" style={penPath(440, 0.00, 0.70)} />
        <line x1="80"  y1="410" x2="80"  y2="80"  stroke="var(--ink)" strokeWidth="1.5" style={penPath(330, 0.50, 0.55)} />
        <line x1="480" y1="410" x2="480" y2="80"  stroke="var(--ink)" strokeWidth="1.5" style={penPath(330, 0.75, 0.55)} />
        <line x1="80"  y1="80"  x2="480" y2="80"  stroke="var(--ink)" strokeWidth="1.5" style={penPath(400, 1.00, 0.55)} />
      </g>

      {/* ════════════════════════════════════════════════════════════════
            PHASE 2 — Ceiling-height dimension (raw 1.55 → 2.5)
            The first annotation the architect makes — vertical line
            with two ticks and a rotated "10'-0″" label in the left
            margin. The pen has moved off the room, so this phase
            starts crisply once the ceiling has just settled.
         ════════════════════════════════════════════════════════════════ */}
      <g>
        <line x1="50" y1="80"  x2="50" y2="410" stroke="var(--ink-3)" strokeWidth="0.4" style={penPath(330, 1.55, 0.50)} />
        <line x1="46" y1="80"  x2="54" y2="80"  stroke="var(--ink-3)" strokeWidth="0.4" style={penPathQuick(8, 1.95, 0.10)} />
        <line x1="46" y1="410" x2="54" y2="410" stroke="var(--ink-3)" strokeWidth="0.4" style={penPathQuick(8, 2.00, 0.10)} />
        <text x="40" y="245" textAnchor="middle" fontFamily="var(--fm)" fontSize="9" fill="var(--ink-3)" transform="rotate(-90, 40, 245)" letterSpacing="0.14em" style={penLabel(2.10, 0.40)}>10&apos;-0&quot;</text>
      </g>

      {/* ════════════════════════════════════════════════════════════════
            PHASE 3 — Furniture (raw 2.3 → 3.7)
            Built up in a spatial order a real designer would follow:
              · Sofa first  — the anchor of the room
              · TV unit     — the focal piece opposite the sofa
              · Mandir niche— the terra accent
              · Pendant     — the overhead light
              · Plant       — the final accent
            Within each piece, outline → fill → details. Pieces overlap
            slightly so the pen reads as continuous, never picking up
            and waiting. The drop-shadow filter lifts the furniture
            group ~3.5px off the paper.
         ════════════════════════════════════════════════════════════════ */}
      <g filter="url(#furniture-lift)">

        {/* ── Sofa ── */}
        <g>
          {/* Body */}
          <rect x="142" y="318" width="200" height="84" fill="none" stroke="var(--ink)" strokeWidth="1.3" style={penPath(568, 2.30, 0.85)} />
          <rect x="142" y="318" width="200" height="84" fill="url(#hatch-cov)" stroke="none" style={penFill(2.95)} />
          {/* Back cushion */}
          <rect x="142" y="286" width="200" height="38" fill="none" stroke="var(--ink)" strokeWidth="1" style={penPath(476, 2.45, 0.55)} />
          <rect x="142" y="286" width="200" height="38" fill="var(--paper-2)" stroke="none" style={penFill(2.90)} />
          {/* Left arm */}
          <rect x="130" y="282" width="16" height="120" fill="none" stroke="var(--ink)" strokeWidth="0.9" style={penPath(272, 2.50, 0.45)} />
          <rect x="130" y="282" width="16" height="120" fill="var(--paper-2)" stroke="none" style={penFill(2.85)} />
          {/* Right arm */}
          <rect x="342" y="282" width="16" height="120" fill="none" stroke="var(--ink)" strokeWidth="0.9" style={penPath(272, 2.55, 0.45)} />
          <rect x="342" y="282" width="16" height="120" fill="var(--paper-2)" stroke="none" style={penFill(2.90)} />
          {/* Centre divider line */}
          <line x1="242" y1="318" x2="242" y2="402" stroke="var(--ink)" strokeWidth="0.5" style={penPathQuick(84, 3.00, 0.20)} />
          {/* Terra warmth ellipse — the single subtle 3D cue, sofa sitting on the floor */}
          <ellipse cx="242" cy="318" rx="56" ry="8" fill="var(--terra)" style={penFill(3.15, 0.5)} />
        </g>

        {/* ── TV unit + screen ── */}
        <g>
          <rect x="374" y="290" width="100" height="112" fill="none" stroke="var(--ink)" strokeWidth="1.1" style={penPath(424, 2.70, 0.60)} />
          <line x1="374" y1="328" x2="474" y2="328" stroke="var(--ink-3)" strokeWidth="0.5" strokeDasharray="4 4" style={penFill(3.15)} />
          <line x1="374" y1="362" x2="474" y2="362" stroke="var(--ink-3)" strokeWidth="0.5" strokeDasharray="4 4" style={penFill(3.20)} />
          <rect x="388" y="214" width="72" height="60" rx="1" fill="none" stroke="var(--ink)" strokeWidth="1" style={penPath(264, 2.85, 0.50)} />
          <rect x="388" y="214" width="72" height="60" rx="1" fill="var(--ink)" stroke="none" style={penFill(3.20)} />
          <text x="424" y="249" textAnchor="middle" fontFamily="var(--fm)" fontSize="9" letterSpacing="0.16em" fill="var(--paper)" style={penLabel(3.45, 0.35)}>55&Prime;</text>
          <line x1="424" y1="274" x2="424" y2="290" stroke="var(--ink)" strokeWidth="0.8" style={penFill(3.25, 0.2)} />
        </g>

        {/* ── Mandir niche — the single terra accent ── */}
        <g>
          <rect x="92" y="190" width="50" height="100" fill="none" stroke="var(--terra)" strokeWidth="1.6" style={penPath(300, 2.95, 0.55)} />
          <rect x="92" y="190" width="50" height="100" fill="url(#hatch-terra-cov)" stroke="none" style={penFill(3.40)} />
          <line x1="92" y1="216" x2="142" y2="216" stroke="var(--terra)" strokeWidth="0.9" style={penPathQuick(50, 3.40, 0.14)} />
          <circle cx="117" cy="248" r="5"   fill="var(--terra)" style={penFill(3.55, 0.25)} />
          <circle cx="117" cy="248" r="2.4" fill="var(--paper)" style={penFill(3.60, 0.20)} />
        </g>

        {/* ── Hanging light ── cord first, then cone */}
        <g>
          <line x1="280" y1="80" x2="280" y2="156" stroke="var(--ink)" strokeWidth="0.9" style={penPathQuick(76, 3.00, 0.20)} />
          <path d="M 258 156 L 302 156 L 295 178 L 265 178 Z" fill="none" stroke="var(--ink)" strokeWidth="1" style={penPath(122, 3.15, 0.30)} />
          <path d="M 258 156 L 302 156 L 295 178 L 265 178 Z" fill="var(--paper-3)" stroke="none" style={penFill(3.50)} />
        </g>

        {/* ── Potted plant ── */}
        <g>
          <path d="M 432 366 Q 408 330 446 308 Q 484 330 460 366" fill="none" stroke="#5A7A4A" strokeWidth="1.3" style={penPath(150, 3.10, 0.40)} />
          <path d="M 432 366 Q 408 330 446 308 Q 484 330 460 366" fill="url(#hatch-leaf-cov)" stroke="none" style={penFill(3.55)} />
          <rect x="433" y="366" width="26" height="32" fill="none" stroke="#5A7A4A" strokeWidth="1" style={penPath(116, 3.30, 0.30)} />
        </g>
      </g>

      {/* ════════════════════════════════════════════════════════════════
            PHASE 4 — Margin annotations (raw 3.85 → 4.6)
            Two ink-leader annotations enter once the room is fully
            drawn. Solid leader line, filled circle anchor, italic
            Playfair label — the drafting convention used everywhere
            else in the app. "morning sun" above the mandir (terra),
            "9' sofa · movie nights" below the sofa (ink).
         ════════════════════════════════════════════════════════════════ */}
      <g>
        <g>
          <line x1="118" y1="62" x2="118" y2="190" stroke="var(--terra-dk)" strokeWidth="0.7" style={penPath(128, 3.85, 0.40)} />
          <circle cx="118" cy="190" r="2.4" fill="var(--terra-dk)" style={penFill(4.10, 0.20)} />
          <text x="118" y="52" textAnchor="middle" fontFamily="var(--fd)" fontStyle="italic" fontSize="14" fill="var(--terra-dk)" style={penLabel(4.15, 0.40)}>morning sun</text>
        </g>

        <g>
          <line x1="242" y1="410" x2="242" y2="438" stroke="var(--ink-2)" strokeWidth="0.7" style={penPath(28, 4.25, 0.25)} />
          <circle cx="242" cy="410" r="2.4" fill="var(--ink-2)" style={penFill(4.40, 0.20)} />
          <text x="242" y="454" textAnchor="middle" fontFamily="var(--fd)" fontStyle="italic" fontSize="14" fill="var(--ink-2)" style={penLabel(4.40, 0.40)}>9&apos; sofa · movie nights</text>
        </g>
      </g>

      {/* ════════════════════════════════════════════════════════════════
            PHASE 5 — Title block (raw 4.65 → 5.0)
            The final flourish — same shape as every Nirmit footer:
            eyebrow caps, brand mark, italic tagline. Reads as the
            architect signing the drawing.
         ════════════════════════════════════════════════════════════════ */}
      <g>
        <text x="60"  y="498" fontFamily="var(--fm)" fontSize="10.5" fill="var(--ink-3)" letterSpacing="0.22em" style={penLabel(4.65, 0.45)}>SECTION · LIVING ROOM · 1:32</text>
        <text x="60"  y="528" fontFamily="var(--fd)" fontSize="17"   fill="var(--ink-2)" fontWeight="600" letterSpacing="0.03em" style={penLabel(4.80, 0.45)}>Nirmit</text>
        <text x="118" y="528" fontFamily="var(--fd)" fontSize="14"   fill="var(--ink-3)" fontStyle="italic" style={penLabel(4.90, 0.45)}>— drawn for your family</text>
      </g>
    </svg>
  );
}

function timeAgo(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return iso;
  const delta = Date.now() - ts;
  const min = Math.floor(delta / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d} day${d !== 1 ? "s" : ""} ago`;
  return new Date(ts).toLocaleDateString("en-IN");
}
