import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ProgressTrail } from "@/components/ProgressTrail";
import { useAppStore, type Stage } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore";

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
      className="top-nav"
      style={{
        height: 64,
        padding: "0 var(--s-6)",
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
      <div className="top-nav-left" style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 200 }}>
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

      {/* Right: context actions + auth slot */}
      <div className="top-nav-right" style={{ minWidth: 200, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
        {rightContent}
        <AuthSlot dark={dark} />
      </div>
    </div>
  );
}

/**
 * Right-edge auth slot. Renders one of two states:
 *   · Anonymous → quiet "Sign in" link that routes to LoginRoute.
 *   · Signed-in → initials pill + display name; clicks open a dropdown
 *     with the user's email and a "Sign out" option.
 *
 * Hidden on the login + signup routes themselves (they have their own
 * inline navigation between sign-in and sign-up). Hidden on the
 * AuthBootSplash by virtue of the splash being rendered instead of
 * any route.
 */
function AuthSlot({ dark }: { dark: boolean }) {
  const stage = useAppStore((s) => s.stage);
  const setStage = useAppStore((s) => s.setStage);
  const user = useAuthStore((s) => s.user);

  if (stage === "login" || stage === "signup") return null;

  if (!user) {
    return (
      <button
        onClick={() => setStage("login")}
        className={dark ? "btn-ghost-dark" : "btn-ghost"}
        style={{ padding: "6px 14px", fontSize: 12 }}
      >
        Sign in
      </button>
    );
  }

  return <UserMenu dark={dark} />;
}

/**
 * Initials pill + display name. Opens a small dropdown with the user's
 * email + a "Sign out" action. Closes on outside-click or Escape.
 */
function UserMenu({ dark }: { dark: boolean }) {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const setStage = useAppStore((s) => s.setStage);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  const initials = (user.display_name || user.email || "you")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "·";

  async function doSignOut() {
    await signOut();
    setOpen(false);
    setStage("home");
  }

  const pillBg = dark ? "rgba(242,235,221,.08)" : "var(--paper-3)";
  const pillBorder = dark ? "rgba(242,235,221,.18)" : "var(--line)";
  const pillText = dark ? "var(--paper)" : "var(--ink)";
  const pillMuted = dark ? "rgba(242,235,221,.55)" : "var(--ink-3)";

  return (
    <div ref={menuRef} style={{ position: "relative" }}>
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ y: -1 }}
        whileTap={{ y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "5px 6px 5px 12px",
          background: pillBg,
          border: `1px solid ${pillBorder}`,
          borderRadius: 999,
          cursor: "pointer",
          fontFamily: "var(--fb)",
          color: pillText,
          fontSize: 12,
        }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span style={{ fontWeight: 500, letterSpacing: "0.01em", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {user.display_name}
        </span>
        <span
          aria-hidden
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "var(--terra)",
            color: "var(--paper)",
            display: "grid",
            placeItems: "center",
            fontFamily: "var(--fm)",
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: "0.04em",
          }}
        >
          {initials}
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 0.7, 0, 1] }}
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              minWidth: 220,
              background: "var(--paper)",
              border: "1px solid var(--line)",
              boxShadow: "0 14px 32px rgba(28,24,18,.12)",
              padding: "12px 0",
              zIndex: 30,
              transformOrigin: "top right",
            }}
          >
            <div style={{ padding: "0 16px 10px", borderBottom: "1px solid var(--line)" }}>
              <div style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 14, color: "var(--ink)", marginBottom: 2 }}>
                Signed in as
              </div>
              <div style={{ fontFamily: "var(--fb)", fontSize: 13, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.email ?? user.display_name}
              </div>
            </div>
            <MenuItem onClick={doSignOut} danger>
              <span>Sign out</span>
              <span style={{ color: pillMuted, fontSize: 11 }}>→</span>
            </MenuItem>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({
  children, onClick, danger,
}: {
  children: ReactNode;
  onClick: () => void | Promise<void>;
  danger?: boolean;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "10px 16px",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        fontFamily: "var(--fb)",
        fontSize: 14,
        color: danger ? "var(--terra-dk)" : "var(--ink)",
        textAlign: "left" as const,
        transition: "background var(--t-fast) ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = danger ? "var(--terra-light)" : "var(--paper-3)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {children}
    </button>
  );
}
