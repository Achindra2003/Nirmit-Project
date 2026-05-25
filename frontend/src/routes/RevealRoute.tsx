import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RoomScene, type CameraView } from "@/three/RoomScene";
import { useAppStore } from "@/store/useAppStore";
import { TopNav } from "@/components/shell/TopNav";

/**
 * Reasoning card on the visions page. Two tabs (Thinking / Vastu) keep the
 * default height compact — previously the design-thinking block + Vastu sub-
 * section stacked vertically and pushed the price + CTA below the fold. Tab
 * defaults to Thinking; Vastu tab is hidden entirely when there are no notes.
 */
function ReasoningCard({ headline, bullets, vastuNotes }: { headline: string; bullets: string[]; vastuNotes: string[] }) {
  const hasVastu = vastuNotes.length > 0;
  const [tab, setTab] = useState<"think" | "vastu">("think");

  return (
    <div style={{ background: "var(--paper-3)", border: "1px solid var(--line)" }}>
      {/* Tab strip — hidden when there's only one tab to choose from */}
      {hasVastu && (
        <div style={{ display: "flex", borderBottom: "1px solid var(--line)" }}>
          {([
            { id: "think" as const, label: "Design thinking" },
            { id: "vastu" as const, label: `Vastu · ${vastuNotes.length}` },
          ]).map((t) => {
            const sel = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  flex: 1,
                  padding: "11px 12px",
                  background: sel ? "var(--paper)" : "transparent",
                  border: "none",
                  borderBottom: sel ? "2px solid var(--terra)" : "2px solid transparent",
                  cursor: "pointer",
                  fontFamily: "var(--fm)",
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase" as const,
                  color: sel ? "var(--terra)" : "var(--ink-3)",
                  fontWeight: sel ? 600 : 500,
                  transition: "all .18s",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ padding: "16px 18px" }}>
        {tab === "think" ? (
          <>
            {!hasVastu && (
              <span className="eyebrow" style={{ display: "block", marginBottom: 10 }}>The design thinking</span>
            )}
            <p style={{ fontFamily: "var(--fb)", fontSize: 14.5, fontWeight: 500, lineHeight: 1.55, color: "var(--ink)", marginBottom: 12 }}>
              {headline}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {bullets.map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--terra)", flexShrink: 0, marginTop: 6 }} />
                  <p style={{ fontFamily: "var(--fb)", fontSize: 13.5, lineHeight: 1.55, color: "var(--ink-2)" }}>{b}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {vastuNotes.map((n, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--ink-3)", flexShrink: 0, marginTop: 6 }} />
                <p style={{ fontFamily: "var(--fb)", fontSize: 13.5, lineHeight: 1.55, color: "var(--ink-2)" }}>{n}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function RevealRoute() {
  const { visions, selectedVisionId, selectVision, setStage } = useAppStore();
  const idx    = Math.max(0, visions.findIndex((v) => v.id === selectedVisionId));
  const vision = visions[idx] ?? visions[0];

  const [show, setShow]   = useState(false);
  const [view, setView]   = useState<CameraView>("corner");

  useEffect(() => {
    setShow(false);
    const t = setTimeout(() => setShow(true), 800);
    return () => clearTimeout(t);
  }, [vision?.id]);

  if (!vision) {
    return (
      <div className="paper" style={{ height: "100vh", display: "grid", placeItems: "center" }}>
        <p style={{ fontFamily: "var(--fd)", fontStyle: "italic", color: "var(--ink-2)" }}>No vision yet. Go back to intake.</p>
      </div>
    );
  }

  const totalFmt  = `₹${Math.round(vision.cost.story.total_inr / 1000)}k`;
  const budgetFmt = `₹${Math.round(vision.cost.story.budget_inr / 1000)}k`;
  const remaining = vision.cost.story.remaining_inr;
  const remainFmt = remaining >= 0
    ? `+₹${Math.round(remaining / 1000)}k under budget`
    : `-₹${Math.round(Math.abs(remaining) / 1000)}k over budget`;
  const remainColor = remaining >= 0 ? "var(--leaf)" : "var(--terra-dk)";

  const palette = vision.room_state.palette.accent
    ? [vision.room_state.palette.accent, vision.room_state.palette.wall ?? "#D9C09C", "#E8DDD0", "#3A2D24"]
    : ["#C2502E", "#8E5A35", "#D9C09C", "#3A2D24"];

  return (
    <div className="paper" style={{ height: "100vh", display: "flex", flexDirection: "column" }}>

      <TopNav stage="reveal" hideTrail />

      {/* Spread */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1.15fr 1fr", minHeight: 0 }}>

        {/* LEFT — 3D canvas */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, position: "relative" }}>
          <div style={{ flex: 1, position: "relative", overflow: "hidden", minHeight: 0 }}>
            <RoomScene room={vision.room_state} view={view} warmthK={vision.room_state.lighting_kelvin ?? 3200} showAtmosphere />

            {/* Caption overlay bottom-left */}
            <div style={{ position: "absolute", left: 28, bottom: 28, opacity: show ? 1 : 0, transition: "opacity 1s ease .4s", pointerEvents: "none" }}>
              <span style={{ fontFamily: "var(--fm)", fontSize: 9, color: "rgba(242,235,221,.55)", letterSpacing: "0.14em", textTransform: "uppercase" as const, display: "block", marginBottom: 6 }}>
                {({ eye: "ENTRANCE VIEW", corner: "3/4 VIEW", top: "FLOOR PLAN", walk: "WALK-THROUGH" } as const)[view]}
              </span>
              <div style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 22, fontWeight: 500, color: "var(--paper)" }}>{vision.name}</div>
              <div style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 14, color: "rgba(242,235,221,.6)", marginTop: 3 }}>{vision.tagline}</div>
            </div>

            {/* View pills — bottom right */}
            <div style={{ position: "absolute", right: 24, bottom: 28, display: "flex", gap: 0, border: "1px solid rgba(242,235,221,.22)", background: "rgba(20,16,12,.55)", backdropFilter: "blur(10px)" }}>
              {(["eye", "corner", "top"] as const).map((v, i) => (
                <div key={v} onClick={() => setView(v)} style={{ padding: "9px 16px", fontFamily: "var(--fm)", fontSize: 9.5, letterSpacing: "0.1em", color: view === v ? "var(--paper)" : "rgba(242,235,221,.45)", background: view === v ? "rgba(242,235,221,.12)" : "transparent", borderLeft: i > 0 ? "1px solid rgba(242,235,221,.22)" : "none", cursor: "pointer", transition: "all .2s" }}>
                  {{ eye: "ENTRANCE", corner: "3/4", top: "PLAN" }[v]}
                </div>
              ))}
            </div>

            {/* Prev / Next — left/right on canvas */}
            {visions.length > 1 && (
              <>
                <button
                  onClick={() => selectVision(visions[(idx - 1 + visions.length) % visions.length].id)}
                  style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", background: "rgba(20,16,12,.55)", color: "rgba(242,235,221,.8)", border: "1px solid rgba(242,235,221,.18)", width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 20, backdropFilter: "blur(8px)", transition: "all .2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(20,16,12,.8)"; e.currentTarget.style.color = "var(--paper)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(20,16,12,.55)"; e.currentTarget.style.color = "rgba(242,235,221,.8)"; }}
                  aria-label="Previous vision"
                >‹</button>
                <button
                  onClick={() => selectVision(visions[(idx + 1) % visions.length].id)}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "rgba(20,16,12,.55)", color: "rgba(242,235,221,.8)", border: "1px solid rgba(242,235,221,.18)", width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 20, backdropFilter: "blur(8px)", transition: "all .2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(20,16,12,.8)"; e.currentTarget.style.color = "var(--paper)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(20,16,12,.55)"; e.currentTarget.style.color = "rgba(242,235,221,.8)"; }}
                  aria-label="Next vision"
                >›</button>
              </>
            )}
          </div>

          {/* Palette strip below canvas */}
          <div style={{ padding: "14px 28px", display: "flex", alignItems: "center", gap: 20, flexShrink: 0, borderTop: "1px solid var(--line)", opacity: show ? 1 : 0, transition: "opacity .8s ease .6s" }}>
            <span className="eyebrow" style={{ minWidth: 52 }}>Palette</span>
            <div style={{ display: "flex", gap: 8 }}>
              {palette.map((c, i) => (
                <div key={i} style={{ width: 32, height: 32, background: c, border: "1px solid rgba(0,0,0,.1)" }} title={c} />
              ))}
            </div>
            {vision.reasoning.vastu_notes.length > 0 && (
              <div style={{ marginLeft: 16, display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                {vision.reasoning.vastu_notes.slice(0, 1).map((n, i) => (
                  <span key={i} style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 12.5, color: "var(--ink-3)" }}>{n}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — info panel.
            Three vertical regions so the design thinking can grow without
            ever pushing the price and CTA off-screen:
              · TOP (fixed)     dot nav + vision name + tagline
              · MIDDLE (scrolls) design thinking + Vastu (in a scroll region)
              · BOTTOM (fixed)  price + "Start with this room" CTA
            The previous layout put everything in a single scroll column with
            `marginTop:auto` on the CTA, so a long reasoning block would push
            the CTA into the overflow and the user wouldn't see it. */}
        <div style={{ borderLeft: "1px solid var(--line)", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--paper)", minHeight: 0 }}>
          <motion.div
            key={`main-${vision.id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: show ? 1 : 0, y: show ? 0 : 10 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
          >
            {/* ── TOP (fixed) ───────────────────────────────────────── */}
            <div style={{ padding: "24px 32px 16px", flexShrink: 0 }}>
              {visions.length > 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                  {visions.map((v, i) => {
                    const sel = i === idx;
                    return (
                      <div
                        key={v.id}
                        onClick={() => selectVision(v.id)}
                        title={v.name}
                        style={{
                          height: 8,
                          width: sel ? 28 : 8,
                          borderRadius: 4,
                          background: sel ? "var(--terra)" : "var(--line-2)",
                          cursor: "pointer",
                          transition: "width .28s ease, background .28s ease",
                          flexShrink: 0,
                        }}
                      />
                    );
                  })}
                  <span style={{ fontFamily: "var(--fm)", fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.1em", marginLeft: 6 }}>
                    {String(idx + 1).padStart(2, "0")} / {String(visions.length).padStart(2, "0")}
                  </span>
                </div>
              )}

              <h2 style={{ fontFamily: "var(--fd)", fontSize: "clamp(26px, 2.6vw, 34px)", fontWeight: 600, lineHeight: 1.05, letterSpacing: "-0.015em", color: "var(--ink)", marginBottom: 6 }}>
                {vision.name}
              </h2>
              <div className="pull-note" style={{ marginBottom: 0 }}>
                {vision.tagline}
              </div>
            </div>

            {/* ── MIDDLE (scrolls) ──────────────────────────────────── */}
            <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "8px 32px 16px" }}>
              {/* Headline + bullets — single integrated card. Vastu becomes a
                  tab-toggle so it doesn't double the card height by default. */}
              <ReasoningCard
                headline={vision.reasoning.headline}
                bullets={vision.reasoning.bullets}
                vastuNotes={vision.reasoning.vastu_notes}
              />
            </div>

            {/* ── BOTTOM (fixed) ────────────────────────────────────── */}
            <div style={{ flexShrink: 0, padding: "16px 32px 22px", borderTop: "1px solid var(--line)", background: "var(--paper)" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span className="eyebrow">Total estimate</span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontFamily: "var(--fd)", fontSize: "clamp(26px, 2.6vw, 32px)", fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.02em", lineHeight: 1 }}>{totalFmt}</span>
                    <span style={{ fontFamily: "var(--fm)", fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.1em" }}>OF {budgetFmt}</span>
                  </div>
                </div>
                <span style={{ fontFamily: "var(--fb)", fontSize: 12, color: remainColor, fontWeight: 500, textAlign: "right" as const }}>{remainFmt}</span>
              </div>
              <button
                className="btn-primary"
                onClick={() => setStage("planner")}
                style={{ width: "100%" }}
              >
                Start with this room
                <span style={{ fontSize: 16, fontWeight: 400 }}>→</span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
