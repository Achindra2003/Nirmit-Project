import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/useAuthStore";
import { useAppStore } from "@/store/useAppStore";

/**
 * Email + password sign-in.
 *
 * Validations:
 *   · Email — validated against RFC-5322-ish regex on blur.
 *   · Password — live strength meter shows feedback as the user types;
 *     error surfaces on submit if the field is empty.
 *
 * Post-auth navigation: drops the user back home, OR to the stage that
 * stashed itself in pendingReturn.
 */
export function LoginRoute() {
  const signIn = useAuthStore((s) => s.signIn);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const user = useAuthStore((s) => s.user);
  const setStage = useAppStore((s) => s.setStage);
  const pendingReturn = useAppStore((s) => s.pendingReturn);
  const setPendingReturn = useAppStore((s) => s.setPendingReturn);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Validation helpers
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordValid = password.length > 0;

  const emailError = emailTouched && !emailValid && email.trim().length > 0
    ? "That doesn't look like a valid email address."
    : emailTouched && email.trim().length === 0
    ? "We need your email to find your account."
    : null;

  const passwordError = submitted && !passwordValid
    ? "Please enter your password."
    : null;

  const canSubmit = !loading && emailValid && passwordValid;

  useEffect(() => {
    if (user) {
      const next = pendingReturn ?? "home";
      setPendingReturn(null);
      setStage(next);
    }
  }, [user, setStage, pendingReturn, setPendingReturn]);

  // Clear auth error when the user corrects their inputs
  useEffect(() => { if (error) clearError(); }, [email, password]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setEmailTouched(true);
    if (!canSubmit) return;
    try {
      await signIn(email.trim(), password);
      // Navigation handled by the user-watching effect above.
    } catch {
      // Error already set in store; humanized.
    }
  }

  return (
    <div className="paper" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Minimal header */}
      <div style={{ padding: "var(--s-5) var(--s-7)" }}>
        <button
          onClick={() => setStage("home")}
          style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "baseline", gap: 10, padding: 0 }}
          aria-label="Back to home"
        >
          <span style={{ fontFamily: "var(--fd)", fontSize: 22, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em" }}>Nirmit</span>
          <span style={{ fontFamily: "var(--fh)", fontSize: 14, color: "var(--ink)", opacity: 0.45, lineHeight: 1 }}>निर्मित</span>
        </button>
      </div>

      <div style={{ flex: 1, display: "grid", placeItems: "center", padding: "var(--s-6)" }}>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 0.7, 0, 1] }}
          style={{ width: "100%", maxWidth: 460, position: "relative", padding: "40px 32px" }}
        >
          {/* Drafting-paper corner ticks */}
          <CornerTick pos="tl" />
          <CornerTick pos="tr" />
          <CornerTick pos="bl" />
          <CornerTick pos="br" />

          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 24, height: 1, background: "var(--terra)", opacity: 0.7 }} />
              <span className="eyebrow">Welcome back</span>
            </div>
            <h1 style={{ fontFamily: "var(--fd)", fontSize: "clamp(34px, 3.6vw, 44px)", fontWeight: 600, lineHeight: 1.1, letterSpacing: "-0.018em", color: "var(--ink)" }}>
              Sign in to <em style={{ fontStyle: "italic", fontWeight: 400, color: "var(--terra)" }}>your room.</em>
            </h1>
          </div>

          <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <Field
              id="login-email"
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
              onBlur={() => setEmailTouched(true)}
              validationError={emailError}
              autoFocus
            />
            <Field
              id="login-password"
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
              validationError={passwordError}
            />

            {/* Auth-level error from the store */}
            <AnimatePresence>
              {error && (
                <motion.p
                  key="auth-error"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 14, color: "var(--terra-dk)", margin: 0 }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: "100%", marginTop: 6 }}
            >
              {loading ? "Signing you in…" : "Sign in"}
              <span style={{ fontSize: 16, fontWeight: 400 }}>→</span>
            </button>
          </form>

          {/* Cross-link to signup */}
          <div style={{ marginTop: 28, paddingTop: 22, borderTop: "0.5px solid var(--line-2)", textAlign: "center" }}>
            <span style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 14, color: "var(--ink-3)" }}>
              New here?{" "}
              <button
                onClick={() => setStage("signup")}
                style={{ background: "transparent", border: "none", padding: 0, fontFamily: "inherit", fontStyle: "inherit", fontSize: "inherit", color: "var(--terra)", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, textDecorationThickness: 0.5 }}
              >
                Make an account
              </button>.
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}



/**
 * Drafting-paper corner tick. 12×12 with terra-coloured L-shaped border
 * lines on two sides. Same convention used around the cover drawing on
 * HomeRoute and the planner guard modal — visually frames a region
 * without imposing a full card border. */
function CornerTick({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const base = {
    position: "absolute" as const,
    width: 12,
    height: 12,
  };
  const style: React.CSSProperties = {
    ...base,
    ...(pos === "tl" && { top: 0,    left: 0,  borderTop:    "1px solid var(--terra)", borderLeft:  "1px solid var(--terra)" }),
    ...(pos === "tr" && { top: 0,    right: 0, borderTop:    "1px solid var(--terra)", borderRight: "1px solid var(--terra)" }),
    ...(pos === "bl" && { bottom: 0, left: 0,  borderBottom: "1px solid var(--terra)", borderLeft:  "1px solid var(--terra)" }),
    ...(pos === "br" && { bottom: 0, right: 0, borderBottom: "1px solid var(--terra)", borderRight: "1px solid var(--terra)" }),
  };
  return <div style={style} aria-hidden />;
}

/**
 * Underline form input with inline validation feedback.
 * The label is its own line above the input (not a placeholder)
 * so the field still reads when filled. Validation errors animate in
 * below the field — never replace the label so the field stays clear.
 */
function Field({
  id, label, type, value, onChange, onBlur, autoComplete, autoFocus, validationError,
}: {
  id: string;
  label: string;
  type: "email" | "password" | "text";
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  autoComplete?: string;
  autoFocus?: boolean;
  validationError?: string | null;
}) {
  const hasError = !!validationError;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="eyebrow" style={{ color: hasError ? "var(--terra-dk)" : undefined }}>{label}</span>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
          style={{
            width: "100%",
            border: "none",
            borderBottom: `2px solid ${hasError ? "var(--terra-dk)" : "var(--line)"}`,
            background: "transparent",
            padding: "8px 0",
            fontFamily: "var(--fb)",
            fontSize: 17,
            color: "var(--ink)",
            outline: "none",
            transition: "border-color var(--t-fast) ease",
          }}
          onFocus={(e) => { e.currentTarget.style.borderBottomColor = hasError ? "var(--terra-dk)" : "var(--terra)"; }}
          onBlur={(e) => {
            e.currentTarget.style.borderBottomColor = hasError ? "var(--terra-dk)" : "var(--line)";
            onBlur?.();
          }}
        />
      </label>
      <AnimatePresence>
        {hasError && (
          <motion.span
            id={`${id}-error`}
            role="alert"
            key="field-error"
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            style={{
              fontFamily: "var(--fm)",
              fontSize: 10,
              letterSpacing: "0.06em",
              color: "var(--terra-dk)",
              overflow: "hidden",
              display: "block",
            }}
          >
            {validationError}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
