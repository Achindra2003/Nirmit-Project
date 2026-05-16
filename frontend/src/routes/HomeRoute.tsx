import { useEffect, useRef, useState } from "react";
import { api, type DesignSummary } from "@/api/client";
import type { RoomState, Vision } from "@/api/types";
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
            <span className="eyebrow">&#2344;&#2367;&#2352;&#2381;&#2350;&#2367;&#2340; &middot; Design intelligence for Indian homes</span>
          </div>

          <h1
            className="appear-2"
            style={{
              fontFamily: "var(--fd)",
              fontSize: "clamp(54px, 6vw, 88px)",
              lineHeight: 0.92,
              fontWeight: 600,
              letterSpacing: "-0.025em",
              color: "var(--ink)",
              marginBottom: 28,
            }}
          >
            Design your<br />
            <span style={{ fontStyle: "italic", fontWeight: 400, color: "var(--terra)" }}>
              home,
            </span>{" "}
            with us.
          </h1>

          <p
            className="appear-3"
            style={{
              fontFamily: "var(--fb)",
              fontSize: 16,
              lineHeight: 1.8,
              color: "var(--ink-2)",
              marginBottom: 48,
              maxWidth: "42ch",
            }}
          >
            Tell us about your room and your family. We&rsquo;ll design three options
            you can explore in 3D &mdash; then hand your carpenter everything
            they need to build it.
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
          <div
            style={{
              position: "absolute", top: 24, left: "50%", transform: "translateX(-50%)",
              fontFamily: "var(--fm)", fontSize: 8, letterSpacing: "0.22em",
              color: "var(--ink-3)", textTransform: "uppercase", whiteSpace: "nowrap",
              opacity: 0, animation: "fade .5s ease-out 4.2s forwards",
            }}
          >
            SECTION A&ndash;A &middot; LIVING ROOM
          </div>
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
          style={{ flexShrink: 0, borderTop: "1px solid var(--line)", padding: "72px 80px 96px" }}
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
        viewBox="0 0 560 490"
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

        {/* ── Phase 1: Structural frame (0–1.6s) ── */}
        {/* Floor 500px */}
        <line x1="30" y1="385" x2="530" y2="385"
          stroke="var(--ink)" strokeWidth="2.5"
          style={{ strokeDasharray: 500, strokeDashoffset: 500, animation: "drawLine 1.4s linear 0s forwards" }}
        />
        {/* Left wall 327px */}
        <line x1="50" y1="385" x2="50" y2="58"
          stroke="var(--ink)" strokeWidth="2"
          style={{ strokeDasharray: 327, strokeDashoffset: 327, animation: "drawLine 0.95s linear 0s forwards" }}
        />
        {/* Right wall 327px */}
        <line x1="510" y1="385" x2="510" y2="58"
          stroke="var(--ink)" strokeWidth="2"
          style={{ strokeDasharray: 327, strokeDashoffset: 327, animation: "drawLine 0.95s linear 0s forwards" }}
        />
        {/* Ceiling 460px */}
        <line x1="50" y1="58" x2="510" y2="58"
          stroke="var(--ink)" strokeWidth="2"
          style={{ strokeDasharray: 460, strokeDashoffset: 460, animation: "drawLine 1.3s linear 0.15s forwards" }}
        />

        {/* ── Phase 2: Furniture outlines (1.0–2.3s) ── */}
        {/* Sofa seat perimeter 606px */}
        <rect x="114" y="296" width="214" height="89"
          fill="none" stroke="var(--ink)" strokeWidth="1.3"
          style={{ strokeDasharray: 606, strokeDashoffset: 606, animation: "drawLine 1.5s linear 1.0s forwards" }}
        />
        <rect x="114" y="296" width="214" height="89"
          fill="url(#hatch-cov)" stroke="none"
          style={{ opacity: 0, animation: "fade 0.6s ease-out 2.1s forwards" }}
        />
        {/* Sofa backrest 508px */}
        <rect x="114" y="262" width="214" height="40"
          fill="none" stroke="var(--ink)" strokeWidth="1"
          style={{ strokeDasharray: 508, strokeDashoffset: 508, animation: "drawLine 1.3s linear 1.1s forwards" }}
        />
        <rect x="114" y="262" width="214" height="40"
          fill="var(--paper-2)" stroke="none"
          style={{ opacity: 0, animation: "fade 0.5s ease-out 2.0s forwards" }}
        />
        {/* Left arm 270px */}
        <rect x="102" y="258" width="18" height="117"
          fill="none" stroke="var(--ink)" strokeWidth="0.9"
          style={{ strokeDasharray: 270, strokeDashoffset: 270, animation: "drawLine 0.7s linear 1.15s forwards" }}
        />
        <rect x="102" y="258" width="18" height="117"
          fill="var(--paper-2)" stroke="none"
          style={{ opacity: 0, animation: "fade 0.5s ease-out 1.9s forwards" }}
        />
        {/* Right arm 270px */}
        <rect x="328" y="258" width="18" height="117"
          fill="none" stroke="var(--ink)" strokeWidth="0.9"
          style={{ strokeDasharray: 270, strokeDashoffset: 270, animation: "drawLine 0.7s linear 1.15s forwards" }}
        />
        <rect x="328" y="258" width="18" height="117"
          fill="var(--paper-2)" stroke="none"
          style={{ opacity: 0, animation: "fade 0.5s ease-out 1.9s forwards" }}
        />
        {/* Cushion centre line 89px */}
        <line x1="221" y1="296" x2="221" y2="385"
          stroke="var(--ink)" strokeWidth="0.5"
          style={{ strokeDasharray: 89, strokeDashoffset: 89, animation: "drawLine 0.25s linear 2.2s forwards" }}
        />

        {/* TV cabinet 520px */}
        <rect x="362" y="268" width="143" height="117"
          fill="none" stroke="var(--ink)" strokeWidth="1.2"
          style={{ strokeDasharray: 520, strokeDashoffset: 520, animation: "drawLine 1.3s linear 1.0s forwards" }}
        />
        <line x1="362" y1="314" x2="505" y2="314"
          stroke="var(--ink-3)" strokeWidth="0.5" strokeDasharray="4 4"
          style={{ opacity: 0, animation: "fade 0.4s ease-out 2.1s forwards" }}
        />
        <line x1="362" y1="346" x2="505" y2="346"
          stroke="var(--ink-3)" strokeWidth="0.5" strokeDasharray="4 4"
          style={{ opacity: 0, animation: "fade 0.4s ease-out 2.1s forwards" }}
        />
        {/* TV screen 364px */}
        <rect x="382" y="184" width="104" height="78" rx="1"
          fill="none" stroke="var(--ink)" strokeWidth="1"
          style={{ strokeDasharray: 364, strokeDashoffset: 364, animation: "drawLine 0.9s linear 1.4s forwards" }}
        />
        <rect x="382" y="184" width="104" height="78" rx="1"
          fill="var(--ink)" stroke="none"
          style={{ opacity: 0, animation: "fade 0.5s ease-out 2.2s forwards" }}
        />
        <text x="434" y="228" textAnchor="middle"
          fontFamily="var(--fm)" fontSize="8" letterSpacing="0.14em" fill="var(--paper)"
          style={{ opacity: 0, animation: "fade 0.3s ease-out 2.6s forwards" }}
        >55&Prime;</text>
        {/* TV mount connector — too short to draw, just fade */}
        <line x1="434" y1="262" x2="434" y2="268"
          stroke="var(--ink)" strokeWidth="0.8"
          style={{ opacity: 0, animation: "fade 0.2s ease-out 2.1s forwards" }}
        />

        {/* Mandir niche 324px */}
        <rect x="60" y="168" width="52" height="110"
          fill="none" stroke="var(--terra)" strokeWidth="1.6"
          style={{ strokeDasharray: 324, strokeDashoffset: 324, animation: "drawLine 0.85s linear 1.3s forwards" }}
        />
        <rect x="60" y="168" width="52" height="110"
          fill="url(#hatch-terra-cov)" stroke="none"
          style={{ opacity: 0, animation: "fade 0.6s ease-out 2.2s forwards" }}
        />
        {/* Mandir shelf 52px */}
        <line x1="60" y1="196" x2="112" y2="196"
          stroke="var(--terra)" strokeWidth="0.9"
          style={{ strokeDasharray: 52, strokeDashoffset: 52, animation: "drawLine 0.15s linear 2.15s forwards" }}
        />
        <circle cx="86" cy="228" r="5" fill="var(--terra)"
          style={{ opacity: 0, animation: "fade 0.3s ease-out 2.4s forwards" }}
        />
        <circle cx="86" cy="228" r="2.5" fill="var(--paper)"
          style={{ opacity: 0, animation: "fade 0.3s ease-out 2.4s forwards" }}
        />
        <text x="86" y="255" textAnchor="middle"
          fontFamily="var(--fm)" fontSize="6.5" letterSpacing="0.18em" fill="var(--terra-dk)"
          transform="rotate(-90, 86, 255)"
          style={{ opacity: 0, animation: "fade 0.4s ease-out 2.6s forwards" }}
        >MANDIR</text>

        {/* Pendant wire 90px */}
        <line x1="222" y1="58" x2="222" y2="148"
          stroke="var(--ink)" strokeWidth="0.9"
          style={{ strokeDasharray: 90, strokeDashoffset: 90, animation: "drawLine 0.25s linear 1.4s forwards" }}
        />
        {/* Pendant shade ~131px */}
        <path d="M 198 148 L 246 148 L 238 172 L 206 172 Z"
          fill="none" stroke="var(--ink)" strokeWidth="1"
          style={{ strokeDasharray: 131, strokeDashoffset: 131, animation: "drawLine 0.38s linear 1.65s forwards" }}
        />
        <path d="M 198 148 L 246 148 L 238 172 L 206 172 Z"
          fill="var(--paper-3)" stroke="none"
          style={{ opacity: 0, animation: "fade 0.4s ease-out 2.3s forwards" }}
        />
        {/* Light pool */}
        <ellipse cx="222" cy="295" rx="58" ry="9" fill="var(--terra)"
          style={{ opacity: 0, animation: "fade 0.5s ease-out 2.4s forwards" }}
        />

        {/* Plant leaf ~150px */}
        <path d="M 462 350 Q 438 312 476 290 Q 514 312 490 350"
          fill="none" stroke="#5A7A4A" strokeWidth="1.3"
          style={{ strokeDasharray: 150, strokeDashoffset: 150, animation: "drawLine 0.44s linear 1.7s forwards" }}
        />
        <path d="M 462 350 Q 438 312 476 290 Q 514 312 490 350"
          fill="url(#hatch-leaf-cov)" stroke="none"
          style={{ opacity: 0, animation: "fade 0.4s ease-out 2.4s forwards" }}
        />
        {/* Plant pot 122px */}
        <rect x="463" y="350" width="26" height="35"
          fill="none" stroke="#5A7A4A" strokeWidth="1"
          style={{ strokeDasharray: 122, strokeDashoffset: 122, animation: "drawLine 0.36s linear 1.9s forwards" }}
        />

        {/* ── Phase 3: Annotations & dimensions (2.4s+) ── */}
        <g style={{ opacity: 0, animation: "fade 0.6s ease-out 2.4s forwards" }}>
          <line x1="22" y1="58" x2="22" y2="385" stroke="var(--ink-3)" strokeWidth="0.5" />
          <line x1="17" y1="58" x2="27" y2="58" stroke="var(--ink-3)" strokeWidth="0.5" />
          <line x1="17" y1="385" x2="27" y2="385" stroke="var(--ink-3)" strokeWidth="0.5" />
          <text x="14" y="222" textAnchor="middle"
            fontFamily="var(--fm)" fontSize="8.5" fill="var(--ink-3)"
            transform="rotate(-90, 14, 222)" letterSpacing="0.12em"
          >10&prime;-0&Prime; CEIL.</text>
        </g>

        <g style={{ opacity: 0, animation: "fade 0.5s ease-out 2.9s forwards" }}>
          <line x1="112" y1="180" x2="130" y2="180" stroke="var(--terra-dk)" strokeWidth="0.7" />
          <line x1="130" y1="180" x2="130" y2="142" stroke="var(--terra-dk)" strokeWidth="0.7" />
          <circle cx="130" cy="142" r="2" fill="var(--terra-dk)" />
          <text x="136" y="138" fontFamily="var(--fd)" fontStyle="italic" fontSize="11" fill="var(--terra-dk)">
            for the morning sun
          </text>
        </g>

        <g style={{ opacity: 0, animation: "fade 0.5s ease-out 3.4s forwards" }}>
          <line x1="221" y1="406" x2="221" y2="393" stroke="var(--ink-2)" strokeWidth="0.7" />
          <text x="96" y="418" fontFamily="var(--fd)" fontStyle="italic" fontSize="12" fill="var(--ink-2)">
            9 ft sofa &mdash; movie nights, family time
          </text>
        </g>

        <g style={{ opacity: 0, animation: "fade 0.4s ease-out 3.9s forwards" }}>
          <line x1="30" y1="446" x2="530" y2="446" stroke="var(--ink-3)" strokeWidth="0.4" />
          <line x1="30" y1="446" x2="30" y2="472" stroke="var(--ink-3)" strokeWidth="0.4" />
          <line x1="530" y1="446" x2="530" y2="472" stroke="var(--ink-3)" strokeWidth="0.4" />
          <line x1="30" y1="472" x2="530" y2="472" stroke="var(--ink-3)" strokeWidth="0.4" />
          <line x1="320" y1="446" x2="320" y2="472" stroke="var(--ink-3)" strokeWidth="0.4" />
          <text x="38" y="462" fontFamily="var(--fm)" fontSize="8" fill="var(--ink-3)" letterSpacing="0.13em">
            SECTION A&ndash;A &middot; LIVING ROOM &middot; SCALE 1:32
          </text>
          <text x="328" y="458" fontFamily="var(--fd)" fontSize="9" fontWeight="600" fill="var(--ink-2)" letterSpacing="0.06em">
            NIRMIT
          </text>
          <text x="328" y="469" fontFamily="var(--fb)" fontSize="7.5" fill="var(--ink-3)" letterSpacing="0.04em">
            For Priya and Rohan
          </text>
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
