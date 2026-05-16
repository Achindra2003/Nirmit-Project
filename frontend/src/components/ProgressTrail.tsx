import type { Stage } from "@/store/useAppStore";

const STEPS = ["Discover", "Visions", "Design", "Style", "Quotation"] as const;

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

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, height: 44, userSelect: "none" }}>
      {STEPS.map((label, i) => {
        const done   = i < active;
        const isCurr = i === active;

        const color = isCurr
          ? "var(--terra)"
          : done
            ? (dark ? "rgba(242,235,221,.7)" : "var(--ink)")
            : (dark ? "rgba(242,235,221,.3)" : "var(--ink-3)");

        const connectorBg = done
          ? (dark ? "rgba(242,235,221,.35)" : "var(--terra)")
          : (dark ? "rgba(242,235,221,.12)" : "var(--line)");

        return (
          <div key={label} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {/* Step dot */}
              <div style={{
                width: isCurr ? 8 : 6,
                height: isCurr ? 8 : 6,
                borderRadius: "50%",
                background: isCurr ? "var(--terra)" : done ? (dark ? "rgba(242,235,221,.6)" : "var(--ink-2)") : (dark ? "rgba(242,235,221,.15)" : "var(--line)"),
                transition: "all .3s ease",
                flexShrink: 0,
              }} />
              {/* Label */}
              <span style={{
                fontFamily: "var(--fb)",
                fontSize: 11,
                fontWeight: isCurr ? 600 : 400,
                letterSpacing: "0.04em",
                color,
                transition: "color .3s ease",
                whiteSpace: "nowrap" as const,
              }}>
                {label}
              </span>
            </div>
            {/* Connector */}
            {i < STEPS.length - 1 && (
              <div style={{
                width: 24,
                height: 1.5,
                margin: "0 8px",
                background: connectorBg,
                borderRadius: 1,
                transition: "background .3s ease",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
