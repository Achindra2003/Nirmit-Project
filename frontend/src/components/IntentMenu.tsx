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
  background: "rgba(247, 241, 230, 0.97)",
  border: "1px solid #d8cfba",
  borderRadius: 14,
  padding: 12,
  width: 360,
  boxShadow: "0 12px 30px rgba(42, 34, 24, 0.18)",
};
const head = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  paddingBottom: 8,
  borderBottom: "1px solid #ede6d8",
};
const closeBtn = {
  background: "transparent",
  border: "none",
  fontSize: 22,
  lineHeight: 1,
  color: "#6b614f",
} as const;
const list = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
  marginTop: 10,
};
const btn = {
  background: "#fff",
  border: "1px solid #d8cfba",
  borderRadius: 8,
  padding: "10px 12px",
  font: "inherit",
  textAlign: "left" as const,
  cursor: "pointer",
};
