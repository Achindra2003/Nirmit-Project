import { useEffect, useState } from "react";
import { api, type DesignSummary } from "@/api/client";
import type { RoomState, Vision } from "@/api/types";
import { useAppStore } from "@/store/useAppStore";

export function HomeRoute() {
  const setStage = useAppStore((s) => s.setStage);
  const setVisions = useAppStore((s) => s.setVisions);
  const [loading, setLoading] = useState(true);
  const [designs, setDesigns] = useState<DesignSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

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
        reasoning: { headline: "Picking up where you left off.", bullets: [], vastu_notes: [], accessibility_notes: [] },
        cost: { story: { total_inr: 0, budget_inr: room.intake.budget_inr, remaining_inr: room.intake.budget_inr, livspace_comparison_pct: 0, headline: "" }, line_items: [] },
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

  return (
    <div className="paper" style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{ height: 60, padding: "0 40px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, borderBottom: "1px solid var(--line)" }}>
        <Logo />
        <span className="eyebrow" style={{ color: "var(--ink-3)" }}>A practice in Indian interiors</span>
      </div>

      {/* Hero */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1.05fr 1fr", minHeight: 0 }}>

        {/* Left — editorial type */}
        <div style={{ padding: "0 0 64px 64px", display: "flex", flexDirection: "column", justifyContent: "center", position: "relative" }}>

          <div className="appear" style={{ marginBottom: 24 }}>
            <span className="eyebrow">Folio Nº 01 · A Practice in Indian Interiors</span>
          </div>

          <h1 className="appear-2" style={{
            fontFamily: "var(--fd)", fontSize: "clamp(64px, 7.5vw, 112px)", lineHeight: 0.94,
            fontWeight: 500, letterSpacing: "-0.022em", color: "var(--ink)", marginBottom: 18, maxWidth: "14ch",
          }}>
            Drawing your<br />
            <span style={{ fontStyle: "italic", fontWeight: 400, color: "var(--terra)" }}>home,</span> with you.
          </h1>

          <p className="appear-3" style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ink-2)", marginBottom: 44, maxWidth: "42ch" }}>
            Nirmit is a drawing practice. You tell us about your flat, your family, and the shape of your evenings. We draw three rooms for you — and give you everything your carpenter needs, in Hindi.
          </p>

          <div className="appear-4" style={{ display: "flex", alignItems: "center", gap: 36, marginBottom: 36 }}>
            <button
              className="lnk"
              onClick={() => setStage("intake")}
              style={{ fontSize: 20, letterSpacing: "0.005em" }}
            >
              {designs.length === 0 ? "Begin a consultation" : "Start a new room"}
              <span className="lnk-arrow">→</span>
            </button>
            <span className="eyebrow">No fees · No lock-in · 12 minutes</span>
          </div>

          {/* Saved designs */}
          {!loading && designs.length > 0 && (
            <div className="appear-4" style={{ marginBottom: 40 }}>
              <span className="eyebrow" style={{ display: "block", marginBottom: 12 }}>Your saved rooms</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 0, borderTop: "1px solid var(--line)" }}>
                {designs.slice(0, 4).map((d) => (
                  <div
                    key={d.id}
                    style={{
                      display: "flex", alignItems: "baseline", justifyContent: "space-between",
                      padding: "12px 0", borderBottom: "1px solid var(--line)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                      <span style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 16, color: "var(--ink)" }}>{d.name}</span>
                      <span style={{ fontFamily: "var(--fm)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em" }}>{timeAgo(d.updated_at)}</span>
                    </div>
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      <button
                        onClick={() => open(d.id)}
                        className="lnk"
                        style={{ fontSize: 13 }}
                      >
                        Open <span className="lnk-arrow">→</span>
                      </button>
                      <button
                        onClick={() => remove(d.id)}
                        style={{ background: "transparent", border: "none", color: "var(--ink-3)", fontSize: 16, cursor: "pointer", lineHeight: 1 }}
                        aria-label="Delete"
                      >×</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p style={{ color: "var(--terra-dk)", fontFamily: "var(--fd)", fontStyle: "italic", marginBottom: 16 }}>{error}</p>}

          {/* City signature */}
          <div className="appear-5" style={{ position: "absolute", bottom: 40, left: 64, display: "flex", flexWrap: "wrap" as const, alignItems: "baseline", gap: "4px 0" }}>
            <span style={{ fontFamily: "var(--fm)", fontSize: 9.5, letterSpacing: "0.12em", color: "var(--ink-3)", textTransform: "uppercase" as const, marginRight: 12 }}>Drawn this season in</span>
            {["Mumbai", "Pune", "Bangalore", "Hyderabad", "Chennai", "Delhi"].map((c, i, arr) => (
              <span key={c} style={{ fontFamily: "var(--fd)", fontSize: 13, color: "var(--ink-2)" }}>
                {c}{i < arr.length - 1 && <span style={{ color: "var(--line-2)", margin: "0 7px" }}>·</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Right — animated section drawing */}
        <div style={{ padding: "24px 64px 64px 24px", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <CoverSectionDrawing />
        </div>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, userSelect: "none" }}>
      <span style={{ fontFamily: "var(--fd)", fontSize: 20, fontWeight: 500, letterSpacing: "0.02em", color: "var(--ink)" }}>Nirmit</span>
      <span style={{ fontFamily: "var(--fh)", fontSize: 15, color: "var(--ink-3)", letterSpacing: "0.04em" }}>निर्मित</span>
    </div>
  );
}

function CoverSectionDrawing() {
  return (
    <div style={{ width: "100%", maxWidth: 580, position: "relative" }}>
      <svg viewBox="0 0 580 460" width="100%" style={{ overflow: "visible" }}>
        {/* Floor */}
        <line x1="20" y1="380" x2="560" y2="380" stroke="var(--ink)" strokeWidth="2" className="draw-line" />
        {/* Walls */}
        <line x1="40" y1="380" x2="40" y2="60" stroke="var(--ink)" strokeWidth="2" className="draw-line" style={{ animationDelay: ".4s" }} />
        <line x1="540" y1="380" x2="540" y2="60" stroke="var(--ink)" strokeWidth="2" className="draw-line" style={{ animationDelay: ".4s" }} />
        <line x1="40" y1="60" x2="540" y2="60" stroke="var(--ink)" strokeWidth="2" className="draw-line" style={{ animationDelay: ".7s" }} />

        {/* Sofa */}
        <g style={{ animation: "fade .8s ease 1.4s both" }}>
          <rect x="120" y="295" width="220" height="85" fill="url(#hatch-cov)" stroke="var(--ink)" strokeWidth="1.2" />
          <rect x="120" y="270" width="220" height="40" fill="var(--paper-2)" stroke="var(--ink)" strokeWidth="1" />
          <line x1="130" y1="380" x2="130" y2="388" stroke="var(--ink)" strokeWidth="1" />
          <line x1="330" y1="380" x2="330" y2="388" stroke="var(--ink)" strokeWidth="1" />
        </g>

        {/* TV unit */}
        <g style={{ animation: "fade .8s ease 1.8s both" }}>
          <rect x="370" y="280" width="170" height="100" fill="none" stroke="var(--ink)" strokeWidth="1.2" />
          <rect x="395" y="200" width="120" height="74" fill="var(--ink)" opacity="0.9" />
          <line x1="395" y1="280" x2="540" y2="280" stroke="var(--ink)" strokeWidth="0.8" />
          <line x1="370" y1="320" x2="540" y2="320" stroke="var(--ink-3)" strokeWidth="0.5" strokeDasharray="2 2" />
          <line x1="370" y1="350" x2="540" y2="350" stroke="var(--ink-3)" strokeWidth="0.5" strokeDasharray="2 2" />
        </g>

        {/* Mandir niche */}
        <g style={{ animation: "fade .8s ease 2.2s both" }}>
          <rect x="60" y="180" width="50" height="100" fill="url(#hatch-terra-cov)" stroke="var(--terra)" strokeWidth="1.4" />
          <line x1="60" y1="200" x2="110" y2="200" stroke="var(--terra)" strokeWidth="0.8" />
          <circle cx="85" cy="225" r="3" fill="var(--terra)" />
        </g>

        {/* Pendant */}
        <g style={{ animation: "fade .8s ease 2.5s both" }}>
          <line x1="225" y1="60" x2="225" y2="155" stroke="var(--ink)" strokeWidth="0.8" />
          <path d="M 200 155 L 250 155 L 240 175 L 210 175 Z" fill="var(--paper-3)" stroke="var(--ink)" strokeWidth="1" />
          <ellipse cx="225" cy="290" rx="50" ry="6" fill="var(--terra)" opacity="0.08" />
        </g>

        {/* Plant */}
        <g style={{ animation: "fade .8s ease 2.8s both" }}>
          <rect x="30" y="350" width="22" height="30" fill="none" stroke="var(--leaf)" strokeWidth="1" />
          <path d="M 32 350 Q 30 320 41 305 Q 52 320 50 350" fill="none" stroke="var(--leaf)" strokeWidth="1.2" />
        </g>

        {/* Person scale */}
        <g style={{ animation: "fade .8s ease 3.1s both" }}>
          <circle cx="510" cy="320" r="6" fill="var(--ink-2)" />
          <path d="M 504 326 L 504 360 L 516 360 L 516 326 Z" fill="var(--ink-2)" />
          <line x1="510" y1="360" x2="510" y2="378" stroke="var(--ink-2)" strokeWidth="2" />
        </g>

        {/* Dimension line */}
        <g style={{ animation: "fade .6s ease 3.3s both" }}>
          <line x1="20" y1="60" x2="20" y2="380" stroke="var(--ink-3)" strokeWidth="0.5" />
          <line x1="16" y1="60" x2="24" y2="60" stroke="var(--ink-3)" strokeWidth="0.5" />
          <line x1="16" y1="380" x2="24" y2="380" stroke="var(--ink-3)" strokeWidth="0.5" />
          <text x="14" y="220" textAnchor="middle" fontFamily="var(--fm)" fontSize="9" fill="var(--ink-3)" transform="rotate(-90, 14, 220)" letterSpacing="0.1em">10&apos;-0&quot; CEIL.</text>
        </g>

        {/* Mandir marginalia */}
        <g style={{ animation: "fade .8s ease 3.6s both" }}>
          <text x="60" y="172" fontFamily="var(--fd)" fontStyle="italic" fontSize="13" fill="var(--terra-dk)">मन्दिर — northeast,</text>
          <text x="60" y="186" fontFamily="var(--fd)" fontStyle="italic" fontSize="13" fill="var(--terra-dk)">for the morning sun</text>
          <line x1="115" y1="200" x2="142" y2="195" stroke="var(--terra-dk)" strokeWidth="0.6" />
          <circle cx="142" cy="195" r="1.5" fill="var(--terra-dk)" />
        </g>

        {/* Sofa marginalia */}
        <g style={{ animation: "fade .8s ease 4s both" }}>
          <text x="220" y="408" fontFamily="var(--fd)" fontStyle="italic" fontSize="13" fill="var(--ink-2)">9 ft sofa — for movie nights</text>
          <line x1="220" y1="404" x2="225" y2="382" stroke="var(--ink-2)" strokeWidth="0.6" />
        </g>

        {/* Title block */}
        <g style={{ animation: "fade .6s ease 4.4s both" }}>
          <line x1="20" y1="430" x2="200" y2="430" stroke="var(--ink-3)" strokeWidth="0.5" />
          <text x="20" y="446" fontFamily="var(--fm)" fontSize="9" fill="var(--ink-3)" letterSpacing="0.14em">SECTION A–A · LIVING ROOM</text>
          <text x="20" y="458" fontFamily="var(--fm)" fontSize="9" fill="var(--ink-3)" letterSpacing="0.14em">SCALE 1:30 · DRAFT</text>
        </g>

        <defs>
          <pattern id="hatch-cov" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--ink)" strokeWidth="0.6" opacity="0.55" />
          </pattern>
          <pattern id="hatch-terra-cov" x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="5" stroke="var(--terra)" strokeWidth="0.7" opacity="0.55" />
          </pattern>
        </defs>
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
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString("en-IN");
}
