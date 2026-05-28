/**
 * The backend clients. Two backends in play:
 *
 *   · FastAPI (intelligence layer): /generate, /chat, /apply, /cost, /export.
 *     Stateless calls — no per-user data lives here. The X-Nirmit-Session
 *     header carries a localStorage UUID so rate limiting + telemetry have
 *     something to bucket on, but it has nothing to do with the user's
 *     identity.
 *
 *   · Supabase (persistence layer): saved designs. Each row in
 *     public.designs is tied to a Supabase auth.users.id; RLS enforces
 *     per-user isolation from the database side. The frontend reads
 *     the current user from useAuthStore and calls supabase.from(...)
 *     directly — no server round-trip for design save/load.
 *     See supabase/migrations/0001_designs.sql for the schema + policies.
 *
 * The two backends don't talk to each other today. If we ever need the
 * FastAPI side to know who's calling (e.g. for personalised generation),
 * the frontend would pass session.access_token in an Authorization header
 * and FastAPI would verify the JWT against Supabase JWKS.
 */
import type {
  ApplyRequest,
  ApplyResponse,
  ChatRequest,
  ChatResponse,
  CostBreakdown,
  CostRequest,
  ExportRequest,
  ExportResponse,
  GenerateRequest,
  GenerateResponse,
  RoomState,
} from "./types";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

const BASE = "/api"; // proxied to http://127.0.0.1:8000 (vite.config.ts)

const SESSION_KEY = "nirmit-session";
function sessionId(): string {
  let s = localStorage.getItem(SESSION_KEY);
  if (!s) {
    s = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, s);
  }
  return s;
}

function authHeaders(): Record<string, string> {
  return { "X-Nirmit-Session": sessionId() };
}

async function post<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} → ${res.status}: ${text}`);
  }
  return (await res.json()) as TRes;
}

// getJson + delJson were only used by the old FastAPI design endpoints
// (replaced with supabase.from("designs") below). Removed 2026-05-28.
// If we ever need GET/DELETE against the FastAPI backend again, just
// re-add them here — they were three lines each.

export interface DesignSummary {
  id: string;
  name: string;
  philosophy: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaveDesignRequest {
  name: string;
  philosophy: string | null;
  room_state: RoomState;
  existing_id?: string | null;
}

/** Columns returned for a DesignSummary — kept as a single string so the
 *  list, save, and load paths all ask for the same shape. `room_state`
 *  is added only on loadDesign. */
const SUMMARY_COLUMNS = "id, name, philosophy, created_at, updated_at";

/** Throw a uniform error so callers (Home archive list, Export save button)
 *  surface the same message regardless of which method failed. */
function requireAuthedSupabase(): { uid: string } {
  const user = useAuthStore.getState().user;
  if (!supabase) {
    throw new Error(
      "Saving rooms needs a Supabase project configured — add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local."
    );
  }
  if (!user) {
    throw new Error("Sign in to save and load your rooms.");
  }
  return { uid: user.id };
}

async function supabaseSaveDesign(req: SaveDesignRequest): Promise<DesignSummary> {
  const { uid } = requireAuthedSupabase();
  // existing_id ⇒ update in place. RLS would block updates on rows the
  // user doesn't own, but we also include user_id in the eq() filter as
  // a defence-in-depth + readability cue ("this updates one of MY rows").
  if (req.existing_id) {
    const { data, error } = await supabase!
      .from("designs")
      .update({
        name: req.name,
        philosophy: req.philosophy,
        room_state: req.room_state,
      })
      .eq("id", req.existing_id)
      .eq("user_id", uid)
      .select(SUMMARY_COLUMNS)
      .single();
    if (error) throw new Error(`Couldn't save the room — ${error.message}`);
    return data as DesignSummary;
  }
  // Fresh insert. user_id pinned explicitly because the RLS policy
  // requires `with check (auth.uid() = user_id)` — we have to write
  // it, the database won't infer it.
  const { data, error } = await supabase!
    .from("designs")
    .insert({
      user_id: uid,
      name: req.name,
      philosophy: req.philosophy,
      room_state: req.room_state,
    })
    .select(SUMMARY_COLUMNS)
    .single();
  if (error) throw new Error(`Couldn't save the room — ${error.message}`);
  return data as DesignSummary;
}

async function supabaseListDesigns(): Promise<{ designs: DesignSummary[] }> {
  // Anonymous visitors get an empty list (HomeRoute uses this to render
  // nothing). Stub mode also returns empty — no DB to query when
  // Supabase isn't configured.
  const user = useAuthStore.getState().user;
  if (!supabase || !user) return { designs: [] };
  const { data, error } = await supabase
    .from("designs")
    .select(SUMMARY_COLUMNS)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`Couldn't load your rooms — ${error.message}`);
  return { designs: (data ?? []) as DesignSummary[] };
}

async function supabaseLoadDesign(id: string): Promise<DesignSummary & { room_state: RoomState }> {
  requireAuthedSupabase();
  const { data, error } = await supabase!
    .from("designs")
    .select(`${SUMMARY_COLUMNS}, room_state`)
    .eq("id", id)
    .single();
  if (error) throw new Error(`Couldn't open the room — ${error.message}`);
  return data as DesignSummary & { room_state: RoomState };
}

async function supabaseDeleteDesign(id: string): Promise<{ deleted: string }> {
  requireAuthedSupabase();
  const { error } = await supabase!
    .from("designs")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`Couldn't remove the room — ${error.message}`);
  return { deleted: id };
}

export const api = {
  generate: (req: GenerateRequest) => post<GenerateRequest, GenerateResponse>("/generate", req),
  chat: (req: ChatRequest) => post<ChatRequest, ChatResponse>("/chat", req),
  apply: (req: ApplyRequest) => post<ApplyRequest, ApplyResponse>("/apply", req),
  cost: (req: CostRequest) => post<CostRequest, CostBreakdown>("/cost", req),
  export: (req: ExportRequest) => post<ExportRequest, ExportResponse>("/export", req),

  // Per-user persistence — Supabase, not the FastAPI backend.
  // See supabase/migrations/0001_designs.sql for the table + RLS.
  saveDesign:   supabaseSaveDesign,
  listDesigns:  supabaseListDesigns,
  loadDesign:   supabaseLoadDesign,
  deleteDesign: supabaseDeleteDesign,

  sessionId,
};
