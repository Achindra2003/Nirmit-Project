import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/useAuthStore";
import { useAppStore } from "@/store/useAppStore";

/**
 * Email + password sign-up + optional display name.
 *
 * Same paper-and-ink editorial treatment as LoginRoute — drafting-paper
 * corner ticks framing the form, terra accent rule above the eyebrow,
 * cross-link below the form (not in the header).
 * Motif elements (grid dots, measurement strip, section label) carry the
 * drafting / architectural design language throughout.
 *
 * Validations (real-time, non-intrusive):
 *   · Name    — optional, but capped at 60 chars; warns if exceeded.
 *   · Email   — RFC-5322-ish regex check, only surfaces on blur or submit.
 *   · Password — ≥ 8 chars, with a live strength meter (weak / fair / strong).
 *               The 6-char minimum is the Supabase floor; we nudge users
 *               toward 8+ for their own benefit.
 */
export function SignupRoute() {
  const signUp = useAuthStore((s) => s.signUp);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const user = useAuthStore((s) => s.user);
  const setStage = useAppStore((s) => s.setStage);
  const pendingReturn = useAppStore((s) => s.pendingReturn);
  const setPendingReturn = useAppStore((s) => s.setPendingReturn);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (user) {
      const next = pendingReturn ?? "home";
      setPendingReturn(null);
      setStage(next);
    }
  }, [user, setStage, pendingReturn, setPendingReturn]);

  useEffect(() => { if (error) clearError(); }, [name, email, password]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Validation rules ──────────────────────────────────────────────
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordScore = scorePassword(password);   // 0 | 1 | 2 | 3
  const passwordOk = password.length >= 6;         // Supabase floor
  const nameOverLimit = name.length > 60;

  const emailError: string | null =
    emailTouched && email.trim().length === 0
      ? "We need an email to create your account."
      : emailTouched && !emailValid
      ? "That doesn't look like a valid email address."
      : null;

  const passwordError: string | null =
    submitted && password.length === 0
      ? "Please choose a password."
      : submitted && !passwordOk
      ? "Password must be at least 6 characters."
      : null;

  const nameError: string | null = nameOverLimit
    ? "Keep your name under 60 characters."
    : null;

  const canSubmit = !loading && emailValid && passwordOk && !nameOverLimit;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setEmailTouched(true);
    if (!canSubmit) return;
    try {
      await signUp(email.trim(), password, name.trim() || undefined);
      // Navigation handled by the user-watching effect above.
    } catch {
      // Error already humanized in store.
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
          <CornerTick pos="tl" />
          <CornerTick pos="tr" />
          <CornerTick pos="bl" />
          <CornerTick pos="br" />

          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 24, height: 1, background: "var(--terra)", opacity: 0.7 }} />
              <span className="eyebrow">Make an account</span>
            </div>
            <h1 style={{ fontFamily: "var(--fd)", fontSize: "clamp(34px, 3.6vw, 44px)", fontWeight: 600, lineHeight: 1.1, letterSpacing: "-0.018em", color: "var(--ink)" }}>
              Design rooms <em style={{ fontStyle: "italic", fontWeight: 400, color: "var(--terra)" }}>you can keep.</em>
            </h1>
            <p style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 15, color: "var(--ink-2)", marginTop: 12, lineHeight: 1.55 }}>
              Sign up so your rooms, quotations, and conversations stay with you across visits.
            </p>
          </div>

          <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <Field
              id="signup-name"
              label="Your name (optional)"
              type="text"
              autoComplete="name"
              value={name}
              onChange={setName}
              validationError={nameError}
              hint={name.length > 0 ? `${name.length}/60` : undefined}
              autoFocus
            />
            <Field
              id="signup-email"
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
              onBlur={() => setEmailTouched(true)}
              validationError={emailError}
            />

            {/* Password with strength meter */}
            <div>
              <Field
                id="signup-password"
                label="Password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={setPassword}
                validationError={passwordError}
              />
              {password.length > 0 && !passwordError && (
                <PasswordStrengthMeter score={passwordScore} />
              )}
              {!password && !passwordError && (
                <span style={{
                  display: "block",
                  marginTop: 6,
                  fontFamily: "var(--fm)",
                  fontSize: 10,
                  color: "var(--ink-3)",
                  letterSpacing: "0.08em",
                }}>
                  AT LEAST 6 CHARACTERS · KEEP IT MEMORABLE
                </span>
              )}
            </div>

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
              {loading ? "Creating your account…" : "Create account"}
              <span style={{ fontSize: 16, fontWeight: 400 }}>→</span>
            </button>
          </form>

          <div style={{ marginTop: 28, paddingTop: 22, borderTop: "0.5px solid var(--line-2)", textAlign: "center" }}>
            <span style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 14, color: "var(--ink-3)" }}>
              Already have an account?{" "}
              <button
                onClick={() => setStage("login")}
                style={{ background: "transparent", border: "none", padding: 0, fontFamily: "inherit", fontStyle: "inherit", fontSize: "inherit", color: "var(--terra)", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, textDecorationThickness: 0.5 }}
              >
                Sign in
              </button>.
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Password strength scorer ───────────────────────────────────────────────
// Returns 0 (empty) | 1 (weak) | 2 (fair) | 3 (strong)
function scorePassword(pw: string): 0 | 1 | 2 | 3 {
  if (pw.length === 0) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) || /[0-9]/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(3, score) as 0 | 1 | 2 | 3;
}

const STRENGTH_META: Record<1 | 2 | 3, { label: string; color: string }> = {
  1: { label: "WEAK", color: "var(--terra-dk)" },
  2: { label: "FAIR", color: "var(--walnut)" },
  3: { label: "STRONG", color: "var(--leaf)" },
};

function PasswordStrengthMeter({ score }: { score: 0 | 1 | 2 | 3 }) {
  if (score === 0) return null;
  const meta = STRENGTH_META[score as 1 | 2 | 3];
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}
    >
      {/* Three segment bars */}
      <div style={{ display: "flex", gap: 4, flex: 1 }}>
        {[1, 2, 3].map((seg) => (
          <div
            key={seg}
            style={{
              flex: 1,
              height: 2,
              background: seg <= score ? meta.color : "var(--line)",
              transition: "background var(--t-fast) ease",
            }}
          />
        ))}
      </div>
      <span style={{
        fontFamily: "var(--fm)",
        fontSize: 9,
        letterSpacing: "0.12em",
        color: meta.color,
        minWidth: 44,
        textAlign: "right",
      }}>
        {meta.label}
      </span>
    </motion.div>
  );
}


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
 * `hint` renders a soft character count or guidance note when there's no error.
 */
function Field({
  id, label, type, value, onChange, onBlur, autoComplete, autoFocus, validationError, hint,
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
  hint?: string;
}) {
  const hasError = !!validationError;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="eyebrow" style={{ color: hasError ? "var(--terra-dk)" : undefined }}>{label}</span>
          {hint && !hasError && (
            <span style={{ fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.06em", color: "var(--ink-3)" }}>{hint}</span>
          )}
        </div>
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
