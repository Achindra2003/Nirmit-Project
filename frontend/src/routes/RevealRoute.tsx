import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RoomScene, type CameraView } from "@/three/RoomScene";
import { humanizeReasoningCopy } from "@/lib/humanizeReasoning";
import { useAppStore } from "@/store/useAppStore";
import { TopNav } from "@/components/shell/TopNav";

/** Warm "why this room" copy — never CAD coordinates or millimetres. */
function ReasoningCard({ headline, bullets, vastuNotes }: { headline: string; bullets: string[]; vastuNotes: string[] }) {
  const hasVastu = vastuNotes.length > 0;
  const [tab, setTab] = useState<"think" | "vastu">("think");

  return (
    <div className="reveal-lift" style={{ background: "var(--paper-3)", border: "1px solid var(--line)" }}>
      {hasVastu && (
        <div style={{ display: "flex", borderBottom: "1px solid var(--line)" }}>
          {([
            { id: "think" as const, label: "Made for you" },
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
                  transition: "color var(--t-fast) ease, border-color var(--t-fast) ease, background var(--t-fast) ease",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ padding: "var(--s-4) var(--s-5)" }}>
        <AnimatePresence mode="wait">
          {tab === "think" ? (
            <motion.div
              key="think"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {!hasVastu && (
                <span className="eyebrow" style={{ display: "block", marginBottom: 10 }}>Why we drew it this way</span>
              )}
              <p style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 17, fontWeight: 500, lineHeight: 1.45, color: "var(--ink)", marginBottom: 14 }}>
                {headline}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {bullets.map((b, i) => (
                  <div
                    key={i}
                    className="reasoning-bullet"
                    style={{ display: "flex", alignItems: "flex-start", gap: 10, animationDelay: `${0.06 * i}s` }}
                  >
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--terra)", flexShrink: 0, marginTop: 7 }} />
                    <p style={{ fontFamily: "var(--fb)", fontSize: 14, lineHeight: 1.6, color: "var(--ink-2)" }}>{b}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="vastu"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <p style={{ fontFamily: "var(--fb)", fontSize: 13, color: "var(--ink-3)", lineHeight: 1.5, marginBottom: 4 }}>
                Placements that respect what matters to your family.
              </p>
              {vastuNotes.map((n, i) => (
                <div
                  key={i}
                  className="reasoning-bullet"
                  style={{ display: "flex", alignItems: "flex-start", gap: 10, animationDelay: `${0.06 * i}s` }}
                >
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--ink-3)", flexShrink: 0, marginTop: 7 }} />
                  <p style={{ fontFamily: "var(--fb)", fontSize: 14, lineHeight: 1.6, color: "var(--ink-2)" }}>{n}</p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
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

  const reasoning = useMemo(
    () => humanizeReasoningCopy({
      headline: vision?.reasoning.headline ?? "",
      bullets: vision?.reasoning.bullets ?? [],
      vastu_notes: vision?.reasoning.vastu_notes ?? [],
    }),
    [vision?.id, vision?.reasoning.headline, vision?.reasoning.bullets, vision?.reasoning.vastu_notes],
  );

  useEffect(() => {
    setShow(false);
    const t = setTimeout(() => setShow(true), 640);
    return () => clearTimeout(t);
  }, [vision?.id]);

  if (!vision) {
    return (
      <div className="paper" style={{ height: "100vh", display: "grid", placeItems: "center" }}>
        <p style={{ fontFamily: "var(--fd)", fontStyle: "italic", color: "var(--ink-2)" }}>No room ready yet — tell us about your home first.</p>
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

      {/* Spread — `.reveal-body` is the responsive hook (tablet styles
       *  in styles.css). */}
      <div className="reveal-body" style={{ flex: 1, display: "grid", gridTemplateColumns: "1.15fr 1fr", minHeight: 0 }}>

        {/* LEFT — 3D canvas */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, position: "relative" }}>
          <div style={{ flex: 1, position: "relative", overflow: "hidden", minHeight: 0 }}>
            <RoomScene room={vision.room_state} view={view} warmthK={vision.room_state.lighting_kelvin ?? 3200} showAtmosphere />

            {/* (The bottom-left ROOM VIEW / name / tagline caption overlay was
                removed 2026-05-26 — the same name + tagline already lives in
                the right-side info panel, so the overlay was redundant and
                obscured part of the scene.) */}

            {/* View pills — bottom right */}
            <div style={{ position: "absolute", right: 24, bottom: 28, display: "flex", gap: 0, border: "1px solid rgba(242,235,221,.22)", background: "rgba(20,16,12,.55)", backdropFilter: "blur(10px)" }}>
              {(["eye", "corner", "top"] as const).map((v, i) => (
                <div key={v} onClick={() => setView(v)} style={{ padding: "9px 16px", fontFamily: "var(--fm)", fontSize: 9.5, letterSpacing: "0.1em", color: view === v ? "var(--paper)" : "rgba(242,235,221,.45)", background: view === v ? "rgba(242,235,221,.12)" : "transparent", borderLeft: i > 0 ? "1px solid rgba(242,235,221,.22)" : "none", cursor: "pointer", transition: "all .2s" }}>
                  {{ eye: "ENTRY", corner: "ROOM", top: "PLAN" }[v]}
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

              <h2 style={{ fontFamily: "var(--fd)", fontSize: "clamp(26px, 2.6vw, 34px)", fontWeight: 600, lineHeight: 1.14, letterSpacing: "-0.015em", color: "var(--ink)", marginBottom: 6 }}>
                {vision.name}
              </h2>
              <div className="pull-note" style={{ marginBottom: 0 }}>
                {vision.tagline}
              </div>
            </div>

            {/* ── MIDDLE (scrolls) ──────────────────────────────────── */}
            <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "var(--s-2) var(--s-6) var(--s-4)" }}>
              <ReasoningCard
                headline={reasoning.headline}
                bullets={reasoning.bullets}
                vastuNotes={reasoning.vastu_notes}
              />
            </div>

            {/* ── BOTTOM (fixed) ────────────────────────────────────── */}
            <div style={{ flexShrink: 0, padding: "16px 32px 22px", borderTop: "1px solid var(--line)", background: "var(--paper)" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span className="eyebrow">Your estimate</span>
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
                Open this room
                <span style={{ fontSize: 16, fontWeight: 400 }}>→</span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
