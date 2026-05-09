/**
 * The five backend clients. The frontend's only intelligence dependency.
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
} from "./types";

const BASE = "/api"; // proxied to http://127.0.0.1:8000 (vite.config.ts)

async function post<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} → ${res.status}: ${text}`);
  }
  return (await res.json()) as TRes;
}

export const api = {
  generate: (req: GenerateRequest) => post<GenerateRequest, GenerateResponse>("/generate", req),
  chat: (req: ChatRequest) => post<ChatRequest, ChatResponse>("/chat", req),
  apply: (req: ApplyRequest) => post<ApplyRequest, ApplyResponse>("/apply", req),
  cost: (req: CostRequest) => post<CostRequest, CostBreakdown>("/cost", req),
  export: (req: ExportRequest) => post<ExportRequest, ExportResponse>("/export", req),
};
