import { useEffect, useState } from "react";
import type { ExportRequest, RoomState } from "@/api/types";
import { api } from "@/api/client";
import { useAppStore } from "@/store/useAppStore";
import { TopNav } from "@/components/shell/TopNav";

interface BOQResponse {
  city: string;
  subtotal_inr: number;
  contingency_inr: number;
  gst_inr: number;
  grand_total_inr: number;
  furniture: Array<{
    sl_no: number;
    description: string;
    amount_inr: number;
    procurement: "buy" | "build";
    carpenter_spec: string | null;
  }>;
  materials: Array<{
    sl_no: number;
    description: string;
    qty: number;
    unit: string;
    rate_inr: number;
    amount_inr: number;
  }>;
  labor: Array<{
    sl_no: number;
    description: string;
    qty: number;
    unit: string;
    rate_inr: number;
    amount_inr: number;
  }>;
  execution_phases: Array<{ label: string; duration_days: number; total_inr: number }>;
  hindi_section: string;
  valid_until: string;
}

type ExportOption = "pdf" | "whatsapp" | "contractor";

export function ExportRoute() {
  const { visions, selectedVisionId, reset } = useAppStore();
  const vision = visions.find((v) => v.id === selectedVisionId) ?? visions[0];

  const [boq, setBoq]           = useState<BOQResponse | null>(null);
  const [downloading, setDl]    = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [selected, setSelected] = useState<ExportOption>("pdf");
  const [saving, setSaving]     = useState(false);
  const [savedId, setSavedId]   = useState<string | null>(null);

  useEffect(() => {
    if (!vision) return;
    const req: ExportRequest = { room_state: vision.room_state, format: "json", include_hindi_section: true };
    fetch("/api/export", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(req) })
      .then((r) => { if (!r.ok) throw new Error(`/export ${r.status}`); return r.json(); })
      .then((d: BOQResponse) => setBoq(d))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [vision?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function downloadPdf(roomState: RoomState) {
    setDl(true);
    setError(null);
    try {
      const res = await fetch("/api/export", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ room_state: roomState, format: "pdf", include_hindi_section: true }) });
      if (!res.ok) throw new Error(`/export ${res.status}`);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = "nirmit-quotation.pdf";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDl(false);
    }
  }

  async function save() {
    if (!vision || saving) return;
    setSaving(true);
    try {
      const r = await api.saveDesign({ name: vision.name, philosophy: vision.philosophy, room_state: vision.room_state, existing_id: savedId });
      setSavedId(r.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (!vision) {
    return (
      <div className="paper" style={{ height: "100vh", display: "grid", placeItems: "center" }}>
        <p style={{ fontFamily: "var(--fd)", fontStyle: "italic", color: "var(--ink-2)" }}>No design loaded.</p>
      </div>
    );
  }

  const roomDims = vision.room_state.intake.room_dimensions;
  const wFt = (roomDims.width_mm / 304.8).toFixed(0);
  const dFt = (roomDims.depth_mm / 304.8).toFixed(0);

  const EXPORT_OPTIONS: Array<{ id: ExportOption; label: string; sublabel: string; desc: string; recommended?: boolean; disabled?: boolean }> = [
    {
      id: "pdf",
      label: "Full Quotation PDF",
      sublabel: "For your carpenter",
      desc: "Complete BOQ, Hindi specification, floor sketch. Print and hand directly to Suresh.",
      recommended: true,
    },
    {
      id: "whatsapp",
      label: "WhatsApp Image",
      sublabel: "Share with family",
      desc: "Room render with cost summary — one image you can share on any platform.",
      disabled: true,
    },
    {
      id: "contractor",
      label: "Contractor PDF",
      sublabel: "Materials & specs only",
      desc: "Item list and specifications without pricing — useful for separate labour quotes.",
      disabled: true,
    },
  ];

  return (
    <div className="paper" style={{ height: "100vh", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <TopNav
        stage="export"
        hideTrail
        rightContent={
          <button
            className="btn-primary"
            onClick={() => downloadPdf(vision.room_state)}
            disabled={downloading}
            style={{ padding: "8px 20px" }}
          >
            {downloading ? "Preparing…" : "Download PDF →"}
          </button>
        }
      />

      {/* Body */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "340px 1fr", minHeight: 0 }}>

        {/* LEFT — export options + cost */}
        <div style={{ borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", overflow: "auto" }}>

          {/* Header block */}
          <div style={{ padding: "40px 32px 24px" }}>
            <span className="eyebrow" style={{ display: "block", marginBottom: 12 }}>Your design is ready.</span>
            <h2 style={{ fontFamily: "var(--fd)", fontSize: 36, fontWeight: 500, lineHeight: 1.1, letterSpacing: "-0.018em", color: "var(--ink)" }}>
              Download<br />
              <span style={{ fontStyle: "italic", fontWeight: 400, color: "var(--terra)" }}>or share.</span>
            </h2>
          </div>

          {/* Export option cards */}
          <div style={{ padding: "0 24px", display: "flex", flexDirection: "column", gap: 10 }}>
            {EXPORT_OPTIONS.map((opt) => {
              const isSel = selected === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => { if (!opt.disabled) setSelected(opt.id); }}
                  style={{
                    padding: "16px 18px",
                    border: isSel ? "2px solid var(--terra)" : "1px solid var(--line)",
                    background: isSel ? "var(--paper-3)" : "transparent",
                    cursor: opt.disabled ? "default" : "pointer",
                    opacity: opt.disabled ? 0.42 : 1,
                    transition: "all .2s ease",
                    position: "relative" as const,
                  }}
                  onMouseEnter={(e) => { if (!opt.disabled && !isSel) { e.currentTarget.style.borderColor = "var(--line-2)"; e.currentTarget.style.background = "rgba(242,235,221,.5)"; } }}
                  onMouseLeave={(e) => { if (!opt.disabled && !isSel) { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.background = "transparent"; } }}
                >
                  {opt.recommended && (
                    <div style={{ position: "absolute" as const, top: -1, right: 14, background: "var(--terra)", color: "var(--paper)", fontFamily: "var(--fm)", fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", padding: "3px 8px" }}>
                      RECOMMENDED
                    </div>
                  )}
                  {opt.disabled && (
                    <div style={{ position: "absolute" as const, top: -1, right: 14, background: "var(--line-2)", color: "var(--ink-3)", fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.1em", padding: "3px 8px" }}>
                      COMING SOON
                    </div>
                  )}
                  <div style={{ fontFamily: "var(--fd)", fontSize: 17, fontWeight: 500, color: "var(--ink)", marginBottom: 2 }}>{opt.label}</div>
                  <div style={{ fontFamily: "var(--fm)", fontSize: 9.5, color: isSel ? "var(--terra)" : "var(--ink-3)", letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" as const }}>{opt.sublabel}</div>
                  <div style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>{opt.desc}</div>
                </div>
              );
            })}
          </div>

          {error && (
            <p style={{ padding: "0 32px 16px", fontFamily: "var(--fd)", fontStyle: "italic", color: "var(--terra-dk)", fontSize: 14 }}>{error}</p>
          )}
        </div>

        {/* RIGHT — PDF preview / BOQ content */}
        <div style={{ overflow: "auto", padding: "40px 48px" }}>
          {!boq ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16 }}>
              <div style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 20, color: "var(--ink-3)" }}>Computing quotation…</div>
              <div style={{ width: 32, height: 32, border: "2px solid var(--line)", borderTopColor: "var(--terra)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            </div>
          ) : (
            <div className="card-inset" style={{ maxWidth: 740, margin: "0 auto", background: "var(--paper)" }}>

              {/* Document header — with Nirmit / निर्मित logotype */}
              <div style={{ borderBottom: "2px solid var(--ink)", paddingBottom: 20, marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
                    <span style={{ fontFamily: "var(--fd)", fontSize: 26, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em", lineHeight: 1 }}>Nirmit</span>
                    <span style={{ fontFamily: "var(--fh)", fontSize: 16, color: "var(--ink)", opacity: 0.5, lineHeight: 1 }}>निर्मित</span>
                    <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "var(--terra)", margin: "0 4px 2px" }} />
                    <span style={{ fontFamily: "var(--fm)", fontSize: 9.5, letterSpacing: "0.18em", color: "var(--ink-3)", textTransform: "uppercase" as const, lineHeight: 1 }}>Room Quotation</span>
                  </div>
                  <div style={{ fontFamily: "var(--fd)", fontSize: 28, fontWeight: 500, color: "var(--ink)" }}>{vision.name}</div>
                  <div style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 14, color: "var(--ink-2)", marginTop: 4 }}>{vision.tagline}</div>
                </div>
                <div style={{ textAlign: "right" as const }}>
                  <div style={{ fontFamily: "var(--fm)", fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.1em" }}>DRAWING NO. 0042</div>
                  <div style={{ fontFamily: "var(--fm)", fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.1em", marginTop: 4 }}>{wFt}′-0″ × {dFt}′-0″</div>
                </div>
              </div>

              {/* Summary grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 32, padding: "18px 0", borderBottom: "1px solid var(--line)" }}>
                <SummaryCell label="Room" value={vision.room_state.intake.room_type.charAt(0).toUpperCase() + vision.room_state.intake.room_type.slice(1)} />
                <SummaryCell label="City" value={boq.city || "—"} />
                <SummaryCell label="Vibe" value={vision.philosophy.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())} />
                <SummaryCell label="Budget" value={`₹${(vision.room_state.intake.budget_inr / 100000).toFixed(1)}L`} />
                <SummaryCell label="Total" value={`₹${(boq.grand_total_inr / 100000).toFixed(2)}L`} accent />
                <SummaryCell label="Remaining" value={(() => { const r = vision.room_state.intake.budget_inr - boq.grand_total_inr; return `${r >= 0 ? "+" : "−"}${formatAmount(Math.abs(r))}`; })()} />
              </div>

              {/* Furniture BOQ */}
              <div style={{ marginBottom: 28 }}>
                <span className="eyebrow" style={{ display: "block", marginBottom: 14 }}>A — Furniture & Furnishings</span>
                <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--ink)" }}>
                      <th style={{ fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.12em", color: "var(--ink-3)", textAlign: "left" as const, padding: "0 0 8px", fontWeight: 500 }}>#</th>
                      <th style={{ fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.12em", color: "var(--ink-3)", textAlign: "left" as const, padding: "0 0 8px", fontWeight: 500 }}>Item</th>
                      <th style={{ fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.12em", color: "var(--ink-3)", textAlign: "center" as const, padding: "0 0 8px", fontWeight: 500 }}>Qty</th>
                      <th style={{ fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.12em", color: "var(--ink-3)", textAlign: "center" as const, padding: "0 0 8px", fontWeight: 500 }}>How to get</th>
                      <th style={{ fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.12em", color: "var(--ink-3)", textAlign: "right" as const, padding: "0 0 8px", fontWeight: 500 }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Group identical items by description
                      const grouped = new Map<string, typeof boq.furniture[0] & { qty: number }>();
                      boq.furniture.forEach((it) => {
                        const key = it.description.toLowerCase().trim();
                        if (grouped.has(key)) {
                          const existing = grouped.get(key)!;
                          existing.qty += 1;
                          existing.amount_inr += it.amount_inr;
                        } else {
                          grouped.set(key, { ...it, qty: 1 });
                        }
                      });
                      return Array.from(grouped.values()).map((it, idx) => {
                        const pepperQuery = encodeURIComponent(it.description.replace(/\s+/g, "+"));
                        const pepperUrl = `https://www.pepperfry.com/search?q=${pepperQuery}`;
                        return (
                          <tr key={it.sl_no} style={{ borderBottom: "1px solid var(--line)" }}>
                            <td style={{ fontFamily: "var(--fm)", fontSize: 10, color: "var(--ink-3)", padding: "12px 12px 12px 0", verticalAlign: "top" as const }}>{String(idx + 1).padStart(2, "0")}</td>
                            <td style={{ padding: "12px 12px", verticalAlign: "top" as const }}>
                              <div style={{ fontFamily: "var(--fd)", fontSize: 15, fontWeight: 500, color: "var(--ink)", lineHeight: 1.3 }}>{it.description}</div>
                              {it.carpenter_spec && (
                                <div style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 12, color: "var(--ink-3)", marginTop: 3 }}>{it.carpenter_spec}</div>
                              )}
                            </td>
                            <td style={{ fontFamily: "var(--fm)", fontSize: 12, color: "var(--ink-2)", textAlign: "center" as const, verticalAlign: "top" as const, padding: "12px 8px" }}>{it.qty}</td>
                            <td style={{ textAlign: "center" as const, verticalAlign: "top" as const, padding: "12px 8px" }}>
                              {it.procurement === "build" ? (
                                <span style={{ fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.1em", color: "var(--leaf)", border: "1px solid var(--leaf)", padding: "3px 7px" }}>CARPENTER</span>
                              ) : (
                                <a
                                  href={pepperUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.1em", color: "var(--terra)", border: "1px solid var(--terra)", padding: "3px 7px", textDecoration: "none", display: "inline-block" }}
                                >
                                  BUY ↗
                                </a>
                              )}
                            </td>
                            <td style={{ fontFamily: "var(--fd)", fontSize: 15, color: "var(--ink)", textAlign: "right" as const, verticalAlign: "top" as const, padding: "12px 0 12px 8px" }}>
                              {formatAmount(it.amount_inr)}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Materials BOQ */}
              {boq.materials.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <span className="eyebrow" style={{ display: "block", marginBottom: 14 }}>B — Materials & Finishing</span>
                  <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--ink)" }}>
                        <th style={{ fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.12em", color: "var(--ink-3)", textAlign: "left" as const, padding: "0 0 8px", fontWeight: 500 }}>#</th>
                        <th style={{ fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.12em", color: "var(--ink-3)", textAlign: "left" as const, padding: "0 0 8px", fontWeight: 500 }}>Description</th>
                        <th style={{ fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.12em", color: "var(--ink-3)", textAlign: "center" as const, padding: "0 0 8px", fontWeight: 500 }}>Qty</th>
                        <th style={{ fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.12em", color: "var(--ink-3)", textAlign: "right" as const, padding: "0 0 8px", fontWeight: 500 }}>Rate</th>
                        <th style={{ fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.12em", color: "var(--ink-3)", textAlign: "right" as const, padding: "0 0 8px", fontWeight: 500 }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {boq.materials.map((m) => (
                        <tr key={m.sl_no} style={{ borderBottom: "1px solid var(--line)" }}>
                          <td style={{ fontFamily: "var(--fm)", fontSize: 10, color: "var(--ink-3)", padding: "10px 12px 10px 0", verticalAlign: "top" as const }}>{String(m.sl_no).padStart(2, "0")}</td>
                          <td style={{ fontFamily: "var(--fd)", fontSize: 15, fontWeight: 500, color: "var(--ink)", padding: "10px 12px", verticalAlign: "top" as const }}>{m.description}</td>
                          <td style={{ fontFamily: "var(--fm)", fontSize: 11, color: "var(--ink-2)", textAlign: "center" as const, padding: "10px 8px", verticalAlign: "top" as const }}>{m.qty} {m.unit}</td>
                          <td style={{ fontFamily: "var(--fd)", fontSize: 14, color: "var(--ink-2)", textAlign: "right" as const, padding: "10px 8px", verticalAlign: "top" as const }}>{formatRate(m.rate_inr, m.unit)}</td>
                          <td style={{ fontFamily: "var(--fd)", fontSize: 15, color: "var(--ink)", textAlign: "right" as const, padding: "10px 0 10px 8px", verticalAlign: "top" as const }}>{formatAmount(m.amount_inr)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Labour BOQ */}
              {boq.labor.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <span className="eyebrow" style={{ display: "block", marginBottom: 14 }}>C — Labour</span>
                  <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--ink)" }}>
                        <th style={{ fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.12em", color: "var(--ink-3)", textAlign: "left" as const, padding: "0 0 8px", fontWeight: 500 }}>#</th>
                        <th style={{ fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.12em", color: "var(--ink-3)", textAlign: "left" as const, padding: "0 0 8px", fontWeight: 500 }}>Work Item</th>
                        <th style={{ fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.12em", color: "var(--ink-3)", textAlign: "center" as const, padding: "0 0 8px", fontWeight: 500 }}>Qty</th>
                        <th style={{ fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.12em", color: "var(--ink-3)", textAlign: "right" as const, padding: "0 0 8px", fontWeight: 500 }}>Rate</th>
                        <th style={{ fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.12em", color: "var(--ink-3)", textAlign: "right" as const, padding: "0 0 8px", fontWeight: 500 }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {boq.labor.map((l) => (
                        <tr key={l.sl_no} style={{ borderBottom: "1px solid var(--line)" }}>
                          <td style={{ fontFamily: "var(--fm)", fontSize: 10, color: "var(--ink-3)", padding: "10px 12px 10px 0", verticalAlign: "top" as const }}>{String(l.sl_no).padStart(2, "0")}</td>
                          <td style={{ fontFamily: "var(--fd)", fontSize: 15, fontWeight: 500, color: "var(--ink)", padding: "10px 12px", verticalAlign: "top" as const }}>{l.description}</td>
                          <td style={{ fontFamily: "var(--fm)", fontSize: 11, color: "var(--ink-2)", textAlign: "center" as const, padding: "10px 8px", verticalAlign: "top" as const }}>{l.qty} {l.unit}</td>
                          <td style={{ fontFamily: "var(--fd)", fontSize: 14, color: "var(--ink-2)", textAlign: "right" as const, padding: "10px 8px", verticalAlign: "top" as const }}>{formatRate(l.rate_inr, l.unit)}</td>
                          <td style={{ fontFamily: "var(--fd)", fontSize: 15, color: "var(--ink)", textAlign: "right" as const, padding: "10px 0 10px 8px", verticalAlign: "top" as const }}>{formatAmount(l.amount_inr)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Cost summary — always after all line items */}
              <div style={{ marginBottom: 32, padding: "18px 20px", background: "var(--paper-3)", border: "1px solid var(--line)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 14, color: "var(--ink-2)" }}>Subtotal (A + B + C)</span>
                    <span style={{ fontFamily: "var(--fd)", fontSize: 15, color: "var(--ink-2)" }}>{formatAmount(boq.subtotal_inr)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 14, color: "var(--ink-2)" }}>Contingency (10%)</span>
                    <span style={{ fontFamily: "var(--fd)", fontSize: 15, color: "var(--ink-2)" }}>{formatAmount(boq.contingency_inr)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 14, color: "var(--ink-2)" }}>GST</span>
                    <span style={{ fontFamily: "var(--fd)", fontSize: 15, color: "var(--ink-2)" }}>{formatAmount(boq.gst_inr)}</span>
                  </div>
                  <div style={{ height: "0.5px", background: "var(--line-2)", margin: "4px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontFamily: "var(--fd)", fontSize: 17, fontWeight: 600, color: "var(--ink)" }}>Grand Total</span>
                    <span style={{ fontFamily: "var(--fd)", fontSize: 22, fontWeight: 600, color: "var(--ink)" }}>₹{(boq.grand_total_inr / 100000).toFixed(2)}L</span>
                  </div>
                </div>
              </div>

              {/* Execution phases */}
              {boq.execution_phases.length > 0 && (
                <div style={{ marginBottom: 32 }}>
                  <span className="eyebrow" style={{ display: "block", marginBottom: 14 }}>Execution Sequence</span>
                  <p style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 14, color: "var(--ink-2)", marginBottom: 16, lineHeight: 1.5 }}>
                    Give this sequence to your contractor. Each phase builds on the one before — do not reorder.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {boq.execution_phases.map((p, i) => (
                      <div key={i} style={{ display: "flex", gap: 20, alignItems: "flex-start", paddingBottom: 12, borderBottom: i < boq.execution_phases.length - 1 ? "1px solid var(--line)" : "none" }}>
                        <span style={{ fontFamily: "var(--fm)", fontSize: 20, fontWeight: 500, color: "var(--ink-3)", lineHeight: 1, minWidth: 32 }}>{String(i + 1).padStart(2, "0")}</span>
                        <div>
                          <div style={{ fontFamily: "var(--fd)", fontSize: 16, fontWeight: 500, color: "var(--ink)" }}>{p.label.replace(/^\d+\.\s*/, "")}</div>
                          <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
                            <span style={{ fontFamily: "var(--fm)", fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.1em" }}>~{p.duration_days} DAYS</span>
                            <span style={{ fontFamily: "var(--fm)", fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.1em" }}>{formatAmount(p.total_inr).toUpperCase()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hindi specification */}
              {boq.hindi_section && (
                <div>
                  <span className="eyebrow" style={{ display: "block", marginBottom: 12 }}>Hindi Specification · बजट और सामग्री</span>
                  <p style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 13, color: "var(--ink-2)", marginBottom: 14, lineHeight: 1.5 }}>
                    The specification below is for your carpenter — written in Hindi so there is no ambiguity on site.
                  </p>
                  <div style={{ fontFamily: "var(--fh)", fontSize: 17, lineHeight: 2.1, color: "var(--ink)", whiteSpace: "pre-wrap" as const, borderTop: "1px solid var(--line)", paddingTop: 16 }}>
                    {boq.hindi_section}
                  </div>
                </div>
              )}

              {/* Document footer */}
              <div style={{ borderTop: "1px solid var(--line)", marginTop: 32, paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontFamily: "var(--fm)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.12em" }}>NIRMIT · BUILT FOR YOUR HOME</span>
                <span style={{ fontFamily: "var(--fm)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em" }}>DRAWING 0042-A · SCALE 1:48</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ height: 52, padding: "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, borderTop: "1px solid var(--line)", background: "var(--paper-2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            className="btn-secondary"
            onClick={save}
            disabled={saving}
            style={{ padding: "8px 18px" }}
          >
            {saving ? "Saving…" : savedId ? "Saved ✓" : "← Save design"}
          </button>
          <button
            onClick={reset}
            className="tool-action-lnk"
            style={{ padding: 0 }}
          >
            Start a new room →
          </button>
        </div>
        {boq && (
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span className="eyebrow">Grand total</span>
            <span style={{ fontFamily: "var(--fd)", fontSize: 22, fontWeight: 500, color: "var(--ink)" }}>
              ₹{(boq.grand_total_inr / 100000).toFixed(2)}L
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Format a rupee amount for display: small values in plain rupees, larger
 * values abbreviated (k for thousands, L for lakhs). Avoids the bug where
 * dividing ₹38/sqft by 1000 displays as "₹0k".
 */
function formatAmount(inr: number): string {
  if (!Number.isFinite(inr)) return "—";
  const abs = Math.abs(inr);
  if (abs >= 100000) return `₹${(inr / 100000).toFixed(2)}L`;
  if (abs >= 1000)   return `₹${Math.round(inr / 1000)}k`;
  return `₹${Math.round(inr)}`;
}

/** Per-unit rate (₹38/sqft, ₹120/rft, ₹2.5k/each, etc.) */
function formatRate(rate: number, unit: string): string {
  return `${formatAmount(rate)}/${unit}`;
}


function SummaryCell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.14em", color: "var(--ink-3)", textTransform: "uppercase" as const, marginBottom: 5 }}>{label}</div>
      <div style={{ fontFamily: "var(--fd)", fontSize: 18, fontWeight: 500, color: accent ? "var(--terra)" : "var(--ink)" }}>{value}</div>
    </div>
  );
}
