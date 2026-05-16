import { useAppStore } from "@/store/useAppStore";

export function CostChip() {
  const stage = useAppStore((s) => s.stage);
  const visions = useAppStore((s) => s.visions);
  const selectedVisionId = useAppStore((s) => s.selectedVisionId);

  if (!["planner", "style"].includes(stage)) return null;

  const vision = visions.find((v) => v.id === selectedVisionId) ?? visions[0];
  if (!vision) return null;

  const total = vision.cost.story.total_inr;
  const budget = vision.cost.story.budget_inr;
  const pct = Math.round((total / budget) * 100);

  return (
    <div style={{
      position: "fixed",
      bottom: 28,
      right: 28,
      background: "var(--ink)",
      color: "var(--paper)",
      padding: "12px 20px",
      display: "flex",
      alignItems: "baseline",
      gap: 10,
      zIndex: 50,
      boxShadow: "0 4px 24px rgba(26,23,20,.3)",
    }}>
      <span style={{ fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.14em", color: "rgba(242,235,221,.5)" }}>
        TOTAL
      </span>
      <span style={{ fontFamily: "var(--fd)", fontSize: 20, fontWeight: 500 }}>
        ₹{Math.round(total / 1000)}k
      </span>
      <span style={{ fontFamily: "var(--fm)", fontSize: 9, color: "rgba(242,235,221,.4)", letterSpacing: "0.08em" }}>
        of ₹{Math.round(budget / 1000)}k · {pct}%
      </span>
    </div>
  );
}
