/**
 * Supabase client — single instance for auth + (future) DB access.
 *
 * Configuration: read from Vite env vars at build time.
 *   VITE_SUPABASE_URL       — your project URL (https://xxxx.supabase.co)
 *   VITE_SUPABASE_ANON_KEY  — the public anon/publishable key
 *
 * Copy `frontend/.env.example` to `frontend/.env.local` and fill in the
 * values from your Supabase project's API settings page.
 *
 * "Configured" mode: real Supabase calls go through.
 * "Stub" mode (no env vars set): the export below is null; `useAuthStore`
 * detects the null and runs in a local-only mode that lets the UI render
 * without throwing. Useful for working on the design without having a
 * Supabase project set up yet.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  URL && ANON
    ? createClient(URL, ANON, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export const isSupabaseConfigured = supabase !== null;
