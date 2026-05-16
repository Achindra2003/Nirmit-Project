import type { ReactNode } from "react";
import { ProgressTrail } from "@/components/ProgressTrail";
import { useAppStore, type Stage } from "@/store/useAppStore";

interface TopNavProps {
  /** Current route stage — drives progress trail highlighting */
  stage: Stage;
  /** Dark mode for planner/style views on basalt background */
  dark?: boolean;
  /** Optional content for the right slot (cost chip, CTA buttons, etc.) */
  rightContent?: ReactNode;
  /** Hide the progress trail (e.g. on the home page) */
  hideTrail?: boolean;
  /** Hide the back button */
  hideBack?: boolean;
}

const BACK_MAP: Partial<Record<Stage, Stage>> = {
  intake:     "home",
  generating: "intake",
  reveal:     "generating",
  planner:    "reveal",
  style:      "planner",
  export:     "style",
};

export function TopNav({ stage, dark = false, rightContent, hideTrail = false, hideBack = false }: TopNavProps) {
  const setStage = useAppStore((s) => s.setStage);
  const backStage = BACK_MAP[stage];

  const bg = dark
    ? "rgba(26,23,20,.97)"
    : "rgba(240,230,211,0.92)";
  const borderColor = dark
    ? "rgba(242,235,221,.08)"
    : "var(--line)";
  const logoColor = dark ? "var(--paper)" : "var(--ink)";

  return (
    <div
      style={{
        height: 64,
        padding: "0 32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexShrink: 0,
        borderBottom: `1px solid ${borderColor}`,
        background: bg,
        backdropFilter: dark ? undefined : "blur(12px)",
        position: "relative",
        zIndex: 20,
      }}
    >
      {/* Left: back + logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 200 }}>
        {!hideBack && backStage && (
          <button
            onClick={() => setStage(backStage)}
            className={dark ? "btn-ghost-dark" : "btn-ghost"}
            style={{ padding: "6px 12px", fontSize: 12 }}
          >
            ← Back
          </button>
        )}
        <div
          onClick={() => setStage("home")}
          style={{ cursor: "pointer", display: "flex", alignItems: "baseline", gap: 10, userSelect: "none" }}
        >
          <span style={{ fontFamily: "var(--fd)", fontSize: 22, fontWeight: 600, color: logoColor, letterSpacing: "-0.01em" }}>
            Nirmit
          </span>
          <span style={{ fontFamily: "var(--fh)", fontSize: 14, color: logoColor, opacity: dark ? 0.4 : 0.45, lineHeight: 1 }}>
            निर्मित
          </span>
        </div>
      </div>

      {/* Center: progress trail */}
      {!hideTrail && (
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
          <ProgressTrail stage={stage} dark={dark} />
        </div>
      )}

      {/* Right: context actions */}
      <div style={{ minWidth: 200, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
        {rightContent}
      </div>
    </div>
  );
}
