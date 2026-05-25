import { useEffect, useRef, useState } from "react";
import { api, type DesignSummary } from "@/api/client";
import type { RoomState, Vision } from "@/api/types";
import { penFill, penLabel, penPath, penPathQuick } from "@/lib/penDraw";
import { useAppStore } from "@/store/useAppStore";
import { TopNav } from "@/components/shell/TopNav";

export function HomeRoute() {
  const setStage = useAppStore((s) => s.setStage);
  const setVisions = useAppStore((s) => s.setVisions);
  const [loading, setLoading] = useState(true);
  const [designs, setDesigns] = useState<DesignSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const savedRoomsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.listDesigns()
      .then((r) => setDesigns(r.designs))
      .catch(() => setDesigns([]))
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <div
      className="paper"
      style={{ height: "100vh", overflowY: "auto", display: "flex", flexDirection: "column" }}
    >
      <TopNav stage="home" hideTrail hideBack />

      {/* Hero */}
      <div
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
            Tell us how you live in your flat. We draw three fully furnished rooms
            you can walk through in 3D, then hand your carpenter a quotation
            Suresh can build from without guessing.
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
          <CoverSectionDrawing />
        </div>

        {/* Floating scroll indicator — centered, clickable, gently rocks up/down */}
        {hasRooms && (
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

      {/* Saved rooms */}
      {hasRooms && (
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
                        <span className="inline-confirm-label">Remove?</span>
                        <button className="inline-confirm-yes" onClick={() => { void remove(d.id); setConfirmDelete(null); }}>Remove</button>
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
   Architectural section drawing — pen-on-paper effect.
   Each element's strokeDasharray == exact path perimeter so the full
   animation range is productive drawing time (no wasted offset range).
   @keyframes drawLine has only `to { stroke-dashoffset: 0 }`, so the
   browser interpolates from the element's own inline dashoffset.
───────────────────────────────────────────────────────────────────────── */
function CoverSectionDrawing() {
  return (
    <div style={{ width: "100%", maxWidth: 480, position: "relative" }}>
      <svg
        className="pen-svg"
        viewBox="0 0 560 528"
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
        </defs>

        {/* ── Phase 1: room shell — walls drawn in sequence like a hand sketch ── */}
        <line x1="30" y1="385" x2="530" y2="385" stroke="var(--ink)" strokeWidth="2.5" style={penPath(500, 0, 1.35)} />
        <line x1="50" y1="385" x2="50" y2="58" stroke="var(--ink)" strokeWidth="2" style={penPath(327, 0.35, 0.95)} />
        <line x1="510" y1="385" x2="510" y2="58" stroke="var(--ink)" strokeWidth="2" style={penPath(327, 0.7, 0.95)} />
        <line x1="50" y1="58" x2="510" y2="58" stroke="var(--ink)" strokeWidth="2" style={penPath(460, 1.05, 1.2)} />

        {/* ── Phase 2: furniture — outlines first, hatch settles after ── */}
        <rect x="114" y="296" width="214" height="89" fill="none" stroke="var(--ink)" strokeWidth="1.3" style={penPath(606, 1.85, 1.4)} />
        <rect x="114" y="296" width="214" height="89" fill="url(#hatch-cov)" stroke="none" style={penFill(3.0)} />
        <rect x="114" y="262" width="214" height="40" fill="none" stroke="var(--ink)" strokeWidth="1" style={penPath(508, 2.0, 1.15)} />
        <rect x="114" y="262" width="214" height="40" fill="var(--paper-2)" stroke="none" style={penFill(2.95)} />
        <rect x="102" y="258" width="18" height="117" fill="none" stroke="var(--ink)" strokeWidth="0.9" style={penPath(270, 2.05, 0.65)} />
        <rect x="102" y="258" width="18" height="117" fill="var(--paper-2)" stroke="none" style={penFill(2.85)} />
        <rect x="328" y="258" width="18" height="117" fill="none" stroke="var(--ink)" strokeWidth="0.9" style={penPath(270, 2.1, 0.65)} />
        <rect x="328" y="258" width="18" height="117" fill="var(--paper-2)" stroke="none" style={penFill(2.9)} />
        <line x1="221" y1="296" x2="221" y2="385" stroke="var(--ink)" strokeWidth="0.5" style={penPathQuick(89, 3.15, 0.22)} />

        <rect x="362" y="268" width="143" height="117" fill="none" stroke="var(--ink)" strokeWidth="1.2" style={penPath(520, 1.9, 1.15)} />
        <line x1="362" y1="314" x2="505" y2="314" stroke="var(--ink-3)" strokeWidth="0.5" strokeDasharray="4 4" style={penFill(3.05)} />
        <line x1="362" y1="346" x2="505" y2="346" stroke="var(--ink-3)" strokeWidth="0.5" strokeDasharray="4 4" style={penFill(3.05)} />
        <rect x="382" y="184" width="104" height="78" rx="1" fill="none" stroke="var(--ink)" strokeWidth="1" style={penPath(364, 2.25, 0.85)} />
        <rect x="382" y="184" width="104" height="78" rx="1" fill="var(--ink)" stroke="none" style={penFill(3.1)} />
        <text x="434" y="228" textAnchor="middle" fontFamily="var(--fm)" fontSize="8" letterSpacing="0.14em" fill="var(--paper)" style={penLabel(3.35, 0.35)}>55&Prime;</text>
        <line x1="434" y1="262" x2="434" y2="268" stroke="var(--ink)" strokeWidth="0.8" style={penFill(3.0, 0.2)} />

        <rect x="60" y="168" width="52" height="110" fill="none" stroke="var(--terra)" strokeWidth="1.6" style={penPath(324, 2.15, 0.8)} />
        <rect x="60" y="168" width="52" height="110" fill="url(#hatch-terra-cov)" stroke="none" style={penFill(3.05)} />
        <line x1="60" y1="196" x2="112" y2="196" stroke="var(--terra)" strokeWidth="0.9" style={penPathQuick(52, 3.1, 0.14)} />
        <circle cx="86" cy="228" r="5" fill="var(--terra)" style={penFill(3.25, 0.25)} />
        <circle cx="86" cy="228" r="2.5" fill="var(--paper)" style={penFill(3.3, 0.2)} />
        <text x="18" y="210" fontFamily="var(--fm)" fontSize="6.5" letterSpacing="0.16em" fill="var(--terra-dk)" style={penLabel(3.4, 0.4)}>MANDIR</text>

        <line x1="222" y1="58" x2="222" y2="148" stroke="var(--ink)" strokeWidth="0.9" style={penPathQuick(90, 2.3, 0.28)} />
        <path d="M 198 148 L 246 148 L 238 172 L 206 172 Z" fill="none" stroke="var(--ink)" strokeWidth="1" style={penPath(131, 2.55, 0.38)} />
        <path d="M 198 148 L 246 148 L 238 172 L 206 172 Z" fill="var(--paper-3)" stroke="none" style={penFill(3.05)} />
        <ellipse cx="222" cy="295" rx="58" ry="9" fill="var(--terra)" style={penFill(3.15, 0.5)} />

        <path d="M 462 350 Q 438 312 476 290 Q 514 312 490 350" fill="none" stroke="#5A7A4A" strokeWidth="1.3" style={penPath(150, 2.65, 0.42)} />
        <path d="M 462 350 Q 438 312 476 290 Q 514 312 490 350" fill="url(#hatch-leaf-cov)" stroke="none" style={penFill(3.2)} />
        <rect x="463" y="350" width="26" height="35" fill="none" stroke="#5A7A4A" strokeWidth="1" style={penPath(122, 2.85, 0.34)} />

        {/* ── Phase 3: dimensions + marginalia (after structure is drawn) ── */}
        <g>
          <line x1="22" y1="58" x2="22" y2="385" stroke="var(--ink-3)" strokeWidth="0.5" style={penPath(327, 3.2, 0.55)} />
          <line x1="17" y1="58" x2="27" y2="58" stroke="var(--ink-3)" strokeWidth="0.5" style={penPathQuick(10, 3.35, 0.12)} />
          <line x1="17" y1="385" x2="27" y2="385" stroke="var(--ink-3)" strokeWidth="0.5" style={penPathQuick(10, 3.4, 0.12)} />
          <text x="14" y="222" textAnchor="middle" fontFamily="var(--fm)" fontSize="8" fill="var(--ink-3)" transform="rotate(-90, 14, 222)" letterSpacing="0.1em" style={penLabel(3.55)}>10&apos;-0&quot; CEIL.</text>
        </g>

        {/* Mandir callout — left margin, clear of TV */}
        <g>
          <line x1="118" y1="178" x2="138" y2="178" stroke="var(--terra-dk)" strokeWidth="0.7" style={penPathQuick(20, 3.65, 0.15)} />
          <line x1="138" y1="178" x2="138" y2="152" stroke="var(--terra-dk)" strokeWidth="0.7" style={penPathQuick(26, 3.75, 0.18)} />
          <circle cx="138" cy="152" r="2" fill="var(--terra-dk)" style={penFill(3.85, 0.2)} />
          <text x="142" y="156" fontFamily="var(--fd)" fontStyle="italic" fontSize="10.5" fill="var(--terra-dk)" style={penLabel(3.9)}>morning sun</text>
        </g>

        {/* Sofa note — above title block */}
        <g>
          <line x1="221" y1="398" x2="221" y2="386" stroke="var(--ink-2)" strokeWidth="0.7" style={penPathQuick(12, 4.05, 0.12)} />
          <text x="52" y="408" fontFamily="var(--fd)" fontStyle="italic" fontSize="11.5" fill="var(--ink-2)" style={penLabel(4.15)}>9&apos; sofa — movie nights</text>
        </g>

        {/* Title block — bottom margin, single column to avoid overlap */}
        <g>
          <line x1="30" y1="468" x2="530" y2="468" stroke="var(--ink-3)" strokeWidth="0.4" style={penPath(500, 4.35, 0.7)} />
          <line x1="30" y1="468" x2="30" y2="498" stroke="var(--ink-3)" strokeWidth="0.4" style={penPathQuick(30, 4.5, 0.15)} />
          <line x1="530" y1="468" x2="530" y2="498" stroke="var(--ink-3)" strokeWidth="0.4" style={penPathQuick(30, 4.55, 0.15)} />
          <line x1="30" y1="498" x2="530" y2="498" stroke="var(--ink-3)" strokeWidth="0.4" style={penPath(500, 4.65, 0.55)} />
          <text x="42" y="486" fontFamily="var(--fm)" fontSize="7.5" fill="var(--ink-3)" letterSpacing="0.12em" style={penLabel(4.85)}>SECTION A–A · LIVING ROOM · 1:32</text>
          <text x="42" y="512" fontFamily="var(--fd)" fontSize="9" fontWeight="600" fill="var(--ink-2)" letterSpacing="0.05em" style={penLabel(5.0)}>NIRMIT</text>
          <text x="108" y="512" fontFamily="var(--fb)" fontSize="7.5" fill="var(--ink-3)" style={penLabel(5.15)}>drawn for your family</text>
        </g>
      </svg>
    </div>
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
