/**
 * The intent-based editing menu (VISION.md "The Editing").
 * No resize handles. No properties panel. Four intents.
 */
import type { IntentKind } from "@/api/types";

interface Props {
  itemName: string;
  onIntent: (kind: IntentKind) => void;
  onClose: () => void;
}

const INTENTS: { kind: IntentKind; label: string }[] = [
  { kind: "make_bigger", label: "Make it bigger" },
  { kind: "make_smaller", label: "Make it smaller" },
  { kind: "change_style", label: "Try a different style" },
  { kind: "remove", label: "Remove it" },
];

export function IntentMenu({ itemName, onIntent, onClose }: Props) {
  return (
    <div style={card}>
      <div style={head}>
        <strong>{itemName}</strong>
        <button onClick={onClose} style={closeBtn} aria-label="Close">
          ×
        </button>
      </div>
      <div style={list}>
        {INTENTS.map((it) => (
          <button
            key={it.kind}
            onClick={() => onIntent(it.kind)}
            style={btn}
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const card = {
  position: "absolute" as const,
  bottom: 24,
  left: "50%",
  transform: "translateX(-50%)",
  background: "rgba(240, 230, 211, 0.97)",
  border: "1px solid var(--line)",
  padding: 12,
  width: 360,
  boxShadow: "0 12px 30px rgba(0, 0, 0, 0.15)",
};
const head = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  paddingBottom: 8,
  borderBottom: "1px solid var(--line)",
};
const closeBtn = {
  background: "transparent",
  border: "none",
  fontSize: 22,
  lineHeight: 1,
  color: "var(--ink-3)",
  cursor: "pointer",
} as const;
const list = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
  marginTop: 10,
};
const btn = {
  background: "var(--paper-3)",
  border: "1px solid var(--line)",
  padding: "10px 12px",
  font: "inherit",
  fontFamily: "var(--fb)",
  fontSize: 14,
  textAlign: "left" as const,
  cursor: "pointer",
};
