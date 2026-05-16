/**
 * AppShell — wraps routes with unified TopNav and full-bleed or scrollable content.
 * This component is the canonical layout wrapper. Routes that need a dark canvas
 * (planner, style) handle their own layout but still benefit from the design system.
 */
import type { ReactNode } from "react";
import { TopNav } from "@/components/shell/TopNav";
import type { Stage } from "@/store/useAppStore";

interface AppShellProps {
  children: ReactNode;
  stage: Stage;
  rightContent?: ReactNode;
  dark?: boolean;
}

export function AppShell({ children, stage, rightContent, dark = false }: AppShellProps) {
  const isFullBleed = stage === "planner" || stage === "style" || stage === "generating";

  return (
    <div className={dark ? undefined : "paper"} style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <TopNav stage={stage} dark={dark} rightContent={rightContent} />
      <div style={{
        flex: 1,
        overflow: isFullBleed ? "hidden" : "auto",
        display: "flex",
        flexDirection: "column",
      }}>
        {children}
      </div>
    </div>
  );
}
