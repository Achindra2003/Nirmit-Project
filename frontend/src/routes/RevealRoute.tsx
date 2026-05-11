import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RoomScene, type CameraView } from "@/three/RoomScene";
import { useAppStore } from "@/store/useAppStore";

export function RevealRoute() {
  const { visions, selectedVisionId, selectVision, setStage } = useAppStore();
  const idx    = Math.max(0, visions.findIndex((v) => v.id === selectedVisionId));
  const vision = visions[idx] ?? visions[0];

  const [show, setShow]   = useState(false);
  const [why, setWhy]     = useState(false);
  const [view, setView]   = useState<CameraView>("corner");

  useEffect(() => {
    setShow(false);
    setWhy(false);
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

      {/* Top bar — minimal */}
      <div style={{ height: 58, padding: "0 40px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, borderBottom: "1px solid var(--line)" }}>
        <div onClick={() => setStage("home")} style={{ cursor: "pointer", display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontFamily: "var(--fd)", fontSize: 20, fontWeight: 500, color: "var(--ink)" }}>Nirmit</span>
          <span style={{ fontFamily: "var(--fh)", fontSize: 15, color: "var(--ink-3)" }}>निर्मित</span>
        </div>
        <span style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 14, color: "var(--ink-3)" }}>
          {visions.length > 1 ? `${visions.length} rooms drawn for you` : "Your room is ready"}
          {remaining !== 0 && (
            <span style={{ marginLeft: 12, color: remainColor }}> · {remainFmt}</span>
          )}
        </span>
      </div>

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

        {/* RIGHT — info panel */}
        <div style={{ borderLeft: "1px solid var(--line)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <AnimatePresence mode="wait">
            {!why ? (
              <motion.div
                key={`main-${vision.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: show ? 1 : 0, y: show ? 0 : 10 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto", padding: "28px 36px 28px 32px" }}
              >
                {/* Dot navigation */}
                {visions.length > 1 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
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

                {/* Vision name */}
                <h2 style={{ fontFamily: "var(--fd)", fontSize: "clamp(28px, 2.8vw, 38px)", fontWeight: 500, lineHeight: 1.05, letterSpacing: "-0.018em", color: "var(--ink)", marginBottom: 8 }}>
                  {vision.name}
                </h2>

                {/* Tagline */}
                <p style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 16, color: "var(--terra)", marginBottom: 24, lineHeight: 1.4 }}>
                  {vision.tagline}
                </p>

                {/* Insight card */}
                <div style={{ background: "var(--paper-3)", border: "1px solid var(--line)", padding: "18px 20px", marginBottom: 24 }}>
                  <span className="eyebrow" style={{ display: "block", marginBottom: 10 }}>The design thinking</span>
                  <p style={{ fontFamily: "var(--fd)", fontSize: 16, fontWeight: 500, lineHeight: 1.5, color: "var(--ink)", marginBottom: 10 }}>
                    {vision.reasoning.headline}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {vision.reasoning.bullets.slice(0, 3).map((b, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--terra)", flexShrink: 0, marginTop: 7 }} />
                        <p style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 14, lineHeight: 1.55, color: "var(--ink-2)" }}>{b}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cost */}
                <div style={{ marginBottom: 24 }}>
                  <span className="eyebrow" style={{ display: "block", marginBottom: 8 }}>Total estimate</span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                    <span style={{ fontFamily: "var(--fd)", fontSize: "clamp(32px, 3.5vw, 44px)", fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.02em" }}>{totalFmt}</span>
                    <span style={{ fontFamily: "var(--fm)", fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.1em" }}>OF {budgetFmt}</span>
                  </div>
                  <div style={{ fontFamily: "var(--fb)", fontSize: 12.5, color: remainColor, marginTop: 4 }}>{remainFmt}</div>
                </div>

                {/* CTAs */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: "auto" }}>
                  <button
                    onClick={() => setStage("planner")}
                    style={{ width: "100%", background: "var(--terra)", color: "var(--paper)", border: "none", padding: "14px 24px", fontFamily: "var(--fb)", fontSize: 13, fontWeight: 600, letterSpacing: "0.04em", cursor: "pointer", textTransform: "uppercase" as const, transition: "background .2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--terra-dk)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "var(--terra)"; }}
                  >
                    Start with this room
                    <span style={{ fontSize: 16, fontWeight: 400 }}>→</span>
                  </button>
                  <button
                    onClick={() => setWhy(true)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 14, color: "var(--ink-3)", textDecoration: "underline", textUnderlineOffset: 4, padding: "4px 0" }}
                  >
                    Why was this designed for me?
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={`why-${vision.id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto", padding: "28px 36px 28px 32px" }}
              >
                <button
                  onClick={() => setWhy(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--fb)", fontSize: 12, color: "var(--ink-3)", textAlign: "left" as const, padding: "0 0 20px 0", display: "flex", alignItems: "center", gap: 6 }}
                >
                  <span style={{ display: "inline-block", transform: "scaleX(-1)" }}>→</span> Back
                </button>

                <h2 style={{ fontFamily: "var(--fd)", fontSize: 28, fontWeight: 500, marginBottom: 24, color: "var(--ink)" }}>
                  Why we designed it this way
                </h2>

                <div style={{ display: "flex", flexDirection: "column", gap: 18, flex: 1 }}>
                  {vision.reasoning.bullets.map((b, i) => (
                    <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--terra)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--paper)" }} />
                      </div>
                      <p style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 15.5, color: "var(--ink-2)", lineHeight: 1.6 }}>{b}</p>
                    </div>
                  ))}

                  {vision.reasoning.vastu_notes.length > 0 && (
                    <div style={{ marginTop: 8, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                      <span className="eyebrow" style={{ display: "block", marginBottom: 10, color: "var(--green)" }}>Vastu</span>
                      {vision.reasoning.vastu_notes.map((n, i) => (
                        <p key={i} style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 14.5, color: "var(--walnut)", lineHeight: 1.55, marginBottom: 8 }}>{n}</p>
                      ))}
                    </div>
                  )}

                  {vision.reasoning.accessibility_notes?.length > 0 && (
                    <div style={{ marginTop: 4, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                      <span className="eyebrow" style={{ display: "block", marginBottom: 10 }}>Accessibility</span>
                      {vision.reasoning.accessibility_notes.map((n, i) => (
                        <p key={i} style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 14.5, color: "var(--ink-2)", lineHeight: 1.55, marginBottom: 8 }}>{n}</p>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setStage("planner")}
                  style={{ width: "100%", background: "var(--terra)", color: "var(--paper)", border: "none", padding: "14px 24px", fontFamily: "var(--fb)", fontSize: 13, fontWeight: 600, letterSpacing: "0.04em", cursor: "pointer", textTransform: "uppercase" as const, transition: "background .2s", marginTop: 28, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--terra-dk)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--terra)"; }}
                >
                  Start with this room →
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
