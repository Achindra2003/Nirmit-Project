/**
 * The Reveal — one room, full screen. Tagline + reasoning bullets fade in
 * after a beat (VISION.md "The Reveal Is the Entire Product").
 *
 * Phase 1 ships the static layout; Phase 2 adds the swipe-between-visions
 * affordance and the timing ceremony.
 */
import { useAppStore } from "@/store/useAppStore";
import { RoomScene } from "@/three/RoomScene";

export function RevealRoute() {
  const { visions, selectedVisionId, selectVision, setStage } = useAppStore();
  const vision =
    visions.find((v) => v.id === selectedVisionId) ?? visions[0];

  if (!vision) {
    return (
      <div style={{ padding: 32 }}>No vision yet. Go back to intake.</div>
    );
  }

  return (
    <div style={shell}>
      <div style={canvasWrap}>
        <RoomScene room={vision.room_state} />
      </div>

      <div style={overlay}>
        <h2 style={name}>{vision.name}</h2>
        <p style={tagline}>{vision.tagline}</p>

        <div style={card}>
          <p style={why}>{vision.reasoning.headline}</p>
          <ul style={bullets}>
            {vision.reasoning.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          {vision.reasoning.vastu_notes.length > 0 && (
            <div style={section}>
              <small style={smallLabel}>Vastu</small>
              {vision.reasoning.vastu_notes.map((n, i) => (
                <p key={i} style={noteLine}>
                  {n}
                </p>
              ))}
            </div>
          )}
          {vision.reasoning.accessibility_notes.length > 0 && (
            <div style={section}>
              <small style={smallLabel}>For everyone in the room</small>
              {vision.reasoning.accessibility_notes.map((n, i) => (
                <p key={i} style={noteLine}>
                  {n}
                </p>
              ))}
            </div>
          )}
        </div>

        <div style={costCard}>
          <p style={costHeadline}>{vision.cost.story.headline}</p>
          <small style={smallLabel}>
            ₹{Math.round(vision.cost.story.total_inr / 1000)}k of ₹
            {Math.round(vision.cost.story.budget_inr / 1000)}k budget — about{" "}
            {vision.cost.story.livspace_comparison_pct}% of a comparable Livspace quote
          </small>
        </div>

        {visions.length > 1 && (
          <div style={visionTabs}>
            {visions.map((v) => (
              <button
                key={v.id}
                onClick={() => selectVision(v.id)}
                style={{
                  ...tabBtn,
                  outline:
                    v.id === vision.id ? "2px solid var(--warm-accent)" : "none",
                }}
              >
                {v.name}
              </button>
            ))}
          </div>
        )}

        <button onClick={() => setStage("planner")} style={cta}>
          I want to refine this →
        </button>
      </div>
    </div>
  );
}

const shell = {
  position: "relative" as const,
  width: "100%",
  height: "100vh",
  background: "#0e0a05",
};
const canvasWrap = {
  position: "absolute" as const,
  inset: 0,
};
const overlay = {
  position: "absolute" as const,
  right: 0,
  top: 0,
  bottom: 0,
  width: 360,
  padding: "24px 24px 32px",
  background: "rgba(247, 241, 230, 0.94)",
  display: "flex",
  flexDirection: "column" as const,
  gap: 14,
  overflowY: "auto" as const,
};
const name = { margin: 0, fontSize: 24, fontWeight: 600 };
const tagline = { margin: 0, color: "#6b614f", fontStyle: "italic" as const };
const card = {
  background: "#fff",
  borderRadius: 12,
  padding: 16,
  marginTop: 12,
};
const why = { margin: 0, fontWeight: 500 };
const bullets = { margin: "8px 0 0", paddingLeft: 18, color: "#3b3424" };
const section = { marginTop: 12 };
const smallLabel = {
  textTransform: "uppercase" as const,
  letterSpacing: 1.2,
  color: "#8a7d5e",
  fontSize: 11,
};
const noteLine = { margin: "4px 0 0", color: "#3b3424" };
const costCard = {
  background: "#f0e7d3",
  borderRadius: 12,
  padding: 14,
};
const costHeadline = { margin: 0, fontWeight: 500 };
const visionTabs = { display: "flex", gap: 8, flexWrap: "wrap" as const };
const tabBtn = {
  background: "#fff",
  border: "1px solid #d8cfba",
  borderRadius: 999,
  padding: "6px 12px",
  fontSize: 13,
};
const cta = {
  marginTop: "auto",
  background: "var(--warm-ink)",
  color: "#f7f1e6",
  padding: "12px 16px",
  border: "none",
  borderRadius: 10,
  fontWeight: 600,
};
