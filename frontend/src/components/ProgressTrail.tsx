import type { Stage } from "@/store/useAppStore";

const STEPS = ["Discover", "Visions", "Design", "Style", "The Brief"] as const;

const STAGE_TO_STEP: Partial<Record<Stage, number>> = {
  intake:     0,
  generating: 0,
  reveal:     1,
  planner:    2,
  style:      3,
  export:     4,
};

interface Props {
  stage: Stage;
  dark?: boolean;
}

export function ProgressTrail({ stage, dark = false }: Props) {
  const active = STAGE_TO_STEP[stage] ?? -1;
  const ink    = dark ? "rgba(242,235,221,.55)" : "var(--ink-3)";
  const inkFt  = dark ? "rgba(242,235,221,.25)" : "var(--line-2)";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, height: 44, padding: "0 0", userSelect: "none" }}>
      {STEPS.map((label, i) => {
        const done   = i < active;
        const isCurr = i === active;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center" }}>
            {/* Step label */}
            <span style={{
              fontFamily: "var(--fm)",
              fontSize: 9.5,
              letterSpacing: "0.12em",
              textTransform: "uppercase" as const,
              color: isCurr ? "var(--terra)" : done ? (dark ? "rgba(242,235,221,.7)" : "var(--ink-2)") : ink,
              fontWeight: isCurr ? 600 : 400,
              transition: "color .3s ease",
              whiteSpace: "nowrap" as const,
            }}>
              {label}
            </span>
            {/* Connector (not after last) */}
            {i < STEPS.length - 1 && (
              <div style={{
                width: 28,
                height: 1,
                margin: "0 8px",
                background: done ? (dark ? "rgba(242,235,221,.35)" : "var(--ink-3)") : inkFt,
                transition: "background .3s ease",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
