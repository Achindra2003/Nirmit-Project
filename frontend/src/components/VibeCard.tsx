/**
 * Procedural SVG vibe illustrations — one per vibe, no external images.
 *
 * Each card depicts an abstract room interior using the vibe's signature
 * palette and motifs. Tap to select. Selected card glows.
 *
 * Why SVG: zero-cost (no licensing, no CDN), pin-sharp at any size, animates
 * cleanly, and stays in the warm Indian aesthetic without depending on stock
 * photography that may rot.
 */
import type { Vibe } from "@/api/types";

interface Props {
  vibe: Vibe;
  selected: boolean;
  onSelect: (vibe: Vibe) => void;
}

interface VibeMeta {
  label: string;
  description: string;
  palette: string[]; // [bg, wall, floor, accent, dark]
  motif: "warm" | "modern" | "earthy" | "airy";
}

const META: Record<Vibe, VibeMeta> = {
  warm_traditional: {
    label: "Warm + Traditional",
    description: "Wood, brass, layered textiles. Diwali every evening.",
    palette: ["#F4E5C8", "#E8C97A", "#9C5E2C", "#5C2E12", "#2A1808"],
    motif: "warm",
  },
  modern_minimal: {
    label: "Modern + Minimal",
    description: "Clean lines, neutral palette. Less is more.",
    palette: ["#F2EFEA", "#DCDDD9", "#A89A8C", "#3F3A33", "#1C1917"],
    motif: "modern",
  },
  earthy_crafted: {
    label: "Earthy + Crafted",
    description: "Terracotta, jute, handmade. Pol house energy.",
    palette: ["#EFE0CC", "#D8A66E", "#A35A2A", "#5C3919", "#2A1A0E"],
    motif: "earthy",
  },
  light_airy: {
    label: "Light + Airy",
    description: "Pale wood, white walls, breathing space.",
    palette: ["#F8F4ED", "#EFE9DD", "#C9B89D", "#6E8388", "#243743"],
    motif: "airy",
  },
};

export function VibeCard({ vibe, selected, onSelect }: Props) {
  const meta = META[vibe];
  return (
    <button
      type="button"
      onClick={() => onSelect(vibe)}
      style={{
        ...cardStyle,
        outline: selected ? "3px solid var(--warm-accent)" : "1px solid #d8cfba",
        transform: selected ? "translateY(-2px)" : "translateY(0)",
        boxShadow: selected
          ? "0 14px 36px rgba(122, 92, 58, 0.22)"
          : "0 6px 18px rgba(42, 34, 24, 0.06)",
      }}
    >
      <VibeIllustration motif={meta.motif} palette={meta.palette} />
      <div style={textBlock}>
        <strong style={titleStyle}>{meta.label}</strong>
        <small style={descStyle}>{meta.description}</small>
      </div>
    </button>
  );
}

function VibeIllustration({
  motif,
  palette,
}: {
  motif: VibeMeta["motif"];
  palette: string[];
}) {
  const [bg, wall, floor, accent, dark] = palette;
  return (
    <svg viewBox="0 0 200 130" width="100%" height="130" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`light-${motif}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={bg} stopOpacity="0.95" />
          <stop offset="100%" stopColor={wall} stopOpacity="0.4" />
        </linearGradient>
      </defs>

      {/* Wall + floor */}
      <rect x="0" y="0" width="200" height="80" fill={wall} />
      <rect x="0" y="80" width="200" height="50" fill={floor} />
      <rect x="0" y="0" width="200" height="80" fill={`url(#light-${motif})`} />

      {/* Window */}
      <rect x="20" y="14" width="50" height="44" fill={bg} stroke={dark} strokeWidth="1" opacity="0.85" />
      <line x1="45" y1="14" x2="45" y2="58" stroke={dark} strokeWidth="0.6" opacity="0.6" />
      <line x1="20" y1="36" x2="70" y2="36" stroke={dark} strokeWidth="0.6" opacity="0.6" />

      {motif === "warm" && (
        <>
          <rect x="90" y="60" width="80" height="22" rx="3" fill={accent} />
          <rect x="105" y="55" width="50" height="8" rx="2" fill="#F2C66A" />
          <rect x="95" y="82" width="70" height="4" fill={dark} opacity="0.5" />
          <circle cx="178" cy="62" r="6" fill="#E8C97A" />
          <rect x="130" y="36" width="20" height="22" fill={dark} opacity="0.55" />
          <line x1="0" y1="80" x2="200" y2="80" stroke={dark} strokeWidth="0.7" opacity="0.4" />
        </>
      )}
      {motif === "modern" && (
        <>
          <rect x="86" y="62" width="92" height="18" rx="2" fill={accent} />
          <rect x="92" y="48" width="80" height="14" fill={dark} opacity="0.85" />
          <line x1="0" y1="80" x2="200" y2="80" stroke={dark} strokeWidth="0.5" opacity="0.3" />
          <circle cx="180" cy="56" r="3" fill={accent} />
        </>
      )}
      {motif === "earthy" && (
        <>
          <rect x="88" y="60" width="80" height="22" rx="6" fill={accent} />
          <ellipse cx="128" cy="58" rx="10" ry="4" fill="#88533A" />
          <ellipse cx="148" cy="55" rx="6" ry="3" fill="#88533A" />
          <rect x="160" y="44" width="14" height="38" fill={dark} opacity="0.6" />
          <path d="M 90 80 Q 100 76 110 80 Q 120 76 130 80" stroke={dark} strokeWidth="0.6" fill="none" opacity="0.5" />
        </>
      )}
      {motif === "airy" && (
        <>
          <rect x="90" y="64" width="80" height="18" rx="3" fill={bg} stroke={accent} strokeWidth="1" />
          <rect x="100" y="50" width="60" height="14" fill={accent} opacity="0.6" />
          <line x1="0" y1="80" x2="200" y2="80" stroke={accent} strokeWidth="0.5" opacity="0.3" />
        </>
      )}

      {/* Subtle floor shadow under hero piece */}
      <ellipse cx="130" cy="98" rx="58" ry="3" fill={dark} opacity="0.12" />
    </svg>
  );
}

const cardStyle = {
  background: "#fff",
  border: "1px solid #d8cfba",
  borderRadius: 12,
  padding: 0,
  textAlign: "left" as const,
  cursor: "pointer",
  display: "flex",
  flexDirection: "column" as const,
  overflow: "hidden",
  transition: "transform 220ms ease, box-shadow 220ms ease",
  font: "inherit",
};
const textBlock = { padding: "10px 12px 12px", display: "flex", flexDirection: "column" as const, gap: 2 };
const titleStyle = { fontSize: 14, fontWeight: 600 } as const;
const descStyle = { fontSize: 12, color: "#6b614f", fontStyle: "normal" as const };
