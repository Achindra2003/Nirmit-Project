/**
 * The backend clients. The frontend's only intelligence dependency.
 * Everything else is rendering and event handling.
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

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return (await res.json()) as T;
}

async function delJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) throw new Error(`DELETE ${path} → ${res.status}`);
  return (await res.json()) as T;
}

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

export const api = {
  generate: (req: GenerateRequest) => post<GenerateRequest, GenerateResponse>("/generate", req),
  chat: (req: ChatRequest) => post<ChatRequest, ChatResponse>("/chat", req),
  apply: (req: ApplyRequest) => post<ApplyRequest, ApplyResponse>("/apply", req),
  cost: (req: CostRequest) => post<CostRequest, CostBreakdown>("/cost", req),
  export: (req: ExportRequest) => post<ExportRequest, ExportResponse>("/export", req),

  saveDesign: (req: SaveDesignRequest) => post<SaveDesignRequest, DesignSummary>("/designs", req),
  listDesigns: () => getJson<{ designs: DesignSummary[] }>("/designs"),
  loadDesign: (id: string) =>
    getJson<DesignSummary & { room_state: RoomState }>(`/designs/${id}`),
  deleteDesign: (id: string) => delJson<{ deleted: string }>(`/designs/${id}`),

  sessionId,
};
