/**
 * Vibe selection card — photography-first with label overlay.
 *
 * Images live in /public/vibes/ mapped by vibe key. Falls back to
 * the background color if the image fails to load.
 */
import { useState } from "react";
import type { Vibe } from "@/api/types";

interface Props {
  vibe: Vibe;
  selected: boolean;
  onSelect: (vibe: Vibe) => void;
}

interface VibeMeta {
  label: string;
  description: string;
  image: string;
  fallbackBg: string;
}

const META: Record<Vibe, VibeMeta> = {
  warm_traditional: {
    label: "Warm + Traditional",
    description: "Wood, brass, layered textiles. Diwali every evening.",
    image: "/vibes/gathering.png",
    fallbackBg: "#B8845A",
  },
  modern_minimal: {
    label: "Modern + Minimal",
    description: "Clean lines, neutral palette. Less is more.",
    image: "/vibes/studio.png",
    fallbackBg: "#C8C4BE",
  },
  earthy_crafted: {
    label: "Earthy + Crafted",
    description: "Terracotta, jute, handmade. Pol house energy.",
    image: "/vibes/keeper.png",
    fallbackBg: "#A35A2A",
  },
  light_airy: {
    label: "Light + Airy",
    description: "Pale wood, white walls, breathing space.",
    image: "/vibes/breath.png",
    fallbackBg: "#D8E0DC",
  },
  maximalist: {
    label: "Maximalist",
    description: "Bold colours, layered patterns, nothing held back.",
    image: "/vibes/bazaar.png",
    fallbackBg: "#8B1A1A",
  },
  coastal: {
    label: "Coastal",
    description: "Breezy, salt-bleached, open to the sea.",
    image: "/vibes/shore.png",
    fallbackBg: "#6E9090",
  },
};

export function VibeCard({ vibe, selected, onSelect }: Props) {
  const meta = META[vibe];
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <button
      type="button"
      onClick={() => onSelect(vibe)}
      style={{
        background: "transparent",
        border: "none",
        padding: 0,
        textAlign: "left",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        outline: selected ? "3px solid var(--terra)" : "1px solid var(--line)",
        transform: selected ? "translateY(-2px)" : "translateY(0)",
        boxShadow: selected
          ? "0 14px 36px rgba(0,0,0,0.18)"
          : "0 4px 14px rgba(0,0,0,0.06)",
        transition: "transform 220ms ease, box-shadow 220ms ease, outline 220ms ease",
        font: "inherit",
      }}
    >
      {/* Image */}
      <div style={{ position: "relative", width: "100%", height: 148, overflow: "hidden", background: meta.fallbackBg }}>
        {!imgFailed && (
          <img
            src={meta.image}
            alt={meta.label}
            onError={() => setImgFailed(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        )}
        {/* Gradient fade toward bottom so text stays legible */}
        <div style={{
          position: "absolute",
          left: 0, right: 0, bottom: 0,
          height: 80,
          background: "linear-gradient(to bottom, transparent, rgba(20,14,8,.72))",
          pointerEvents: "none",
        }} />
        {/* Selected checkmark */}
        {selected && (
          <div style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "var(--terra)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
              <path d="M1 4.5L4.5 8L11 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>

      {/* Text below image */}
      <div style={{ padding: "11px 13px 13px", background: "var(--paper-3)", display: "flex", flexDirection: "column", gap: 3 }}>
        <strong style={{ fontFamily: "var(--fb)", fontSize: 13.5, fontWeight: 600, color: "var(--ink)", lineHeight: 1.2 }}>
          {meta.label}
        </strong>
        <small style={{ fontFamily: "var(--fb)", fontSize: 11.5, color: "var(--ink-2)", lineHeight: 1.4 }}>
          {meta.description}
        </small>
      </div>
    </button>
  );
}
