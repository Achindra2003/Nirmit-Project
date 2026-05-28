/**
 * Auth state for Supabase email/password sign-in.
 *
 * Stub mode: when `supabase` is null (no env vars), every auth action
 * silently succeeds and pretends there's a local user — this lets the
 * UI render and lets a developer click through the flow without having
 * a Supabase project set up. The stub user lives only in memory; reload
 * clears it.
 *
 * Real mode: delegates to Supabase. The auth listener (installed by
 * `installAuthListener()` once on app boot) keeps the store in sync
 * across tabs and across page reloads.
 */
import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export interface AuthUser {
  id: string;
  email: string | null;
  /** Best-effort display name. Pulled from user_metadata.name on real
   *  Supabase users, or derived from the email's local-part otherwise. */
  display_name: string;
}

interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;     // true during a sign-in / sign-up request
  bootstrapped: boolean; // true once the initial session restore finishes
  error: string | null;

  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  /** Internal — invoked by the Supabase auth listener. */
  _setSession: (s: Session | null) => void;
  /** Internal — flips `bootstrapped` to true after the initial restore. */
  _markBootstrapped: () => void;
}

function toAuthUser(u: User | null, fallbackEmail?: string): AuthUser | null {
  if (!u) return null;
  const email = u.email ?? fallbackEmail ?? null;
  const metaName = (u.user_metadata as { name?: string } | null)?.name;
  const display = metaName?.trim() || (email ? email.split("@")[0] : "you");
  return { id: u.id, email, display_name: display };
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: false,
  bootstrapped: false,
  error: null,

  signUp: async (email, password, displayName) => {
    set({ loading: true, error: null });
    try {
      if (!isSupabaseConfigured || !supabase) {
        // Stub mode — fake a user so the UI flows work without Supabase.
        const stub: AuthUser = {
          id: "stub-" + Math.random().toString(36).slice(2, 10),
          email,
          display_name: displayName?.trim() || email.split("@")[0],
        };
        set({ user: stub, loading: false });
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: displayName ? { name: displayName.trim() } : undefined },
      });
      if (error) throw error;
      // When the Supabase project has "Confirm email" enabled (default),
      // signUp returns the new user record but session === null until the
      // confirmation link is clicked. Without a session, the JS client
      // can't attach a JWT to subsequent calls — every insert would hit
      // RLS as anonymous and fail with "new row violates row-level
      // security". Surface this state cleanly instead of pretending the
      // user is signed in: throw a humanised error AND leave the store
      // in a signed-out state so the UI doesn't show a fake user pill. */
      if (!data.session) {
        set({ user: null, session: null, loading: false });
        throw new Error(
          "Check your email to confirm your account, then sign in. (Or turn off 'Confirm email' in your Supabase project's Authentication settings if you'd rather skip the confirmation step.)"
        );
      }
      set({
        user: toAuthUser(data.user ?? null, email),
        session: data.session,
        loading: false,
      });
    } catch (e) {
      set({ loading: false, error: humanizeAuthError(e) });
      throw e;
    }
  },

  signIn: async (email, password) => {
    set({ loading: true, error: null });
    try {
      if (!isSupabaseConfigured || !supabase) {
        const stub: AuthUser = {
          id: "stub-" + Math.random().toString(36).slice(2, 10),
          email,
          display_name: email.split("@")[0],
        };
        set({ user: stub, loading: false });
        return;
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      set({
        user: toAuthUser(data.user ?? null, email),
        session: data.session,
        loading: false,
      });
    } catch (e) {
      set({ loading: false, error: humanizeAuthError(e) });
      throw e;
    }
  },

  signOut: async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    set({ user: null, session: null, error: null });
  },

  clearError: () => set({ error: null }),

  _setSession: (session) => {
    set({ session, user: toAuthUser(session?.user ?? null) });
  },
  _markBootstrapped: () => set({ bootstrapped: true }),
}));

/**
 * Install the Supabase auth listener once at app bootstrap. Reads the
 * persisted session (Supabase stores it in localStorage by default) so a
 * refresh keeps the user signed in. Listener fires on sign-in/out events
 * across tabs too.
 */
export async function installAuthListener(): Promise<() => void> {
  if (!isSupabaseConfigured || !supabase) {
    // Stub mode — no listener to install. Mark bootstrapped immediately so
    // route gating doesn't spin forever on the loading state.
    useAuthStore.getState()._markBootstrapped();
    return () => {};
  }
  // Restore session on first paint.
  const { data: { session } } = await supabase.auth.getSession();
  useAuthStore.getState()._setSession(session);
  useAuthStore.getState()._markBootstrapped();

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
    useAuthStore.getState()._setSession(s);
  });
  return () => subscription.unsubscribe();
}

/** Translate Supabase auth errors into something a user can read. */
function humanizeAuthError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/Invalid login credentials/i.test(msg)) return "That email and password don't match. Try again.";
  if (/User already registered/i.test(msg)) return "An account with this email already exists — try signing in instead.";
  if (/Password should be at least/i.test(msg)) return "Pick a longer password (at least 6 characters).";
  if (/rate limit/i.test(msg)) return "Too many tries in a row — wait a minute and try again.";
  if (/Email not confirmed/i.test(msg)) return "Check your inbox and confirm your email first.";
  if (/Network|Failed to fetch/i.test(msg)) return "Couldn't reach the auth server. Check your connection.";
  return msg;
}
