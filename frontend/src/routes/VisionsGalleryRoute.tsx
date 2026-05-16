import { useState } from "react";
import type { Vision } from "@/api/types";
import { useAppStore } from "@/store/useAppStore";

export function VisionsGalleryRoute() {
  const { visions, selectVision, setStage } = useAppStore();

  function choose(id: string) {
    selectVision(id);
    setStage("reveal");
  }

  return (
    <div className="paper" style={{ minHeight: "calc(100vh - 60px)", padding: "56px 64px 80px" }}>

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
      <div style={{ height: 6, display: "flex" }}>
        {palette.map((c, i) => (
          <div key={i} style={{ flex: 1, background: c }} />
        ))}
      </div>

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
