import { useEffect, useState } from "react";
import type { ExportRequest, RoomState } from "@/api/types";
import { useAppStore } from "@/store/useAppStore";

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
  const { visions, selectedVisionId, setStage, reset } = useAppStore();
  const vision = visions.find((v) => v.id === selectedVisionId) ?? visions[0];

  const [boq, setBoq]           = useState<BOQResponse | null>(null);
  const [downloading, setDl]    = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [selected, setSelected] = useState<ExportOption>("pdf");

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
      <div style={{ height: 62, padding: "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, borderBottom: "1px solid var(--line)" }}>
        <div onClick={() => setStage("planner")} style={{ cursor: "pointer", display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontFamily: "var(--fd)", fontSize: 20, fontWeight: 500, color: "var(--ink)" }}>Nirmit</span>
          <span style={{ fontFamily: "var(--fh)", fontSize: 15, color: "var(--ink-3)" }}>निर्मित</span>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span className="eyebrow">Drawing No. 0042 · </span>
          <span style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 18, fontWeight: 500, color: "var(--ink)" }}>{vision.name}</span>
          <span style={{ fontFamily: "var(--fm)", fontSize: 11, color: "var(--ink-3)" }}>{wFt}′-0″ × {dFt}′-0″</span>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            onClick={() => setStage("planner")}
            style={{ background: "transparent", border: "1px solid var(--line)", color: "var(--ink-2)", padding: "9px 20px", fontFamily: "var(--fb)", fontSize: 12, fontWeight: 500, letterSpacing: "0.04em", cursor: "pointer", textTransform: "uppercase" as const, transition: "all .2s ease" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--ink)"; e.currentTarget.style.color = "var(--ink)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--ink-2)"; }}
          >
            ← Back to planner
          </button>
          <button
            onClick={() => downloadPdf(vision.room_state)}
            disabled={downloading}
            style={{ background: "var(--ink)", color: "var(--paper)", border: "none", padding: "9px 22px", fontFamily: "var(--fb)", fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", cursor: downloading ? "default" : "pointer", textTransform: "uppercase" as const, opacity: downloading ? 0.5 : 1, transition: "background .2s" }}
            onMouseEnter={(e) => { if (!downloading) e.currentTarget.style.background = "var(--terra)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--ink)"; }}
          >
            {downloading ? "Preparing…" : "Download PDF →"}
          </button>
        </div>
      </div>

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

          {/* Cost breakdown */}
          {boq && (
            <div style={{ padding: "28px 32px", marginTop: 8 }}>
              <span className="eyebrow" style={{ display: "block", marginBottom: 14 }}>Cost breakdown</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                <AmountRow label="Subtotal"        value={boq.subtotal_inr} />
                <AmountRow label="Contingency 10%" value={boq.contingency_inr} />
                <AmountRow label="GST"             value={boq.gst_inr} />
                <div style={{ height: 1, background: "var(--line)", margin: "3px 0" }} />
                <AmountRow label="Grand total"     value={boq.grand_total_inr} bold />
              </div>
              {boq.valid_until && (
                <div style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 12.5, color: "var(--ink-3)", marginTop: 12 }}>
                  Valid until {boq.valid_until}
                </div>
              )}
            </div>
          )}

          {error && (
            <p style={{ padding: "0 32px", fontFamily: "var(--fd)", fontStyle: "italic", color: "var(--terra-dk)", fontSize: 14 }}>{error}</p>
          )}

          <button
            onClick={reset}
            style={{ background: "transparent", border: "none", color: "var(--ink-3)", fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 15, cursor: "pointer", textAlign: "left" as const, padding: "16px 32px", marginTop: "auto" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--ink)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--ink-3)"; }}
          >
            Start a new room →
          </button>
        </div>

        {/* RIGHT — PDF preview / BOQ content */}
        <div style={{ overflow: "auto", padding: "40px 48px" }}>
          {!boq ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16 }}>
              <div style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 20, color: "var(--ink-3)" }}>Computing quotation…</div>
              <div style={{ width: 32, height: 32, border: "2px solid var(--line)", borderTopColor: "var(--terra)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            </div>
          ) : (
            <div style={{ background: "white", border: "1px solid var(--line)", boxShadow: "0 2px 20px rgba(0,0,0,.07)", padding: "40px 44px", maxWidth: 740, margin: "0 auto" }}>

              {/* Document header */}
              <div style={{ borderBottom: "2px solid var(--ink)", paddingBottom: 20, marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontFamily: "var(--fm)", fontSize: 10, letterSpacing: "0.2em", color: "var(--ink-3)", marginBottom: 8, textTransform: "uppercase" as const }}>Nirmit · Room Quotation</div>
                  <div style={{ fontFamily: "var(--fd)", fontSize: 28, fontWeight: 500, color: "var(--ink)" }}>{vision.name}</div>
                  <div style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 14, color: "var(--ink-2)", marginTop: 4 }}>{vision.tagline}</div>
                </div>
                <div style={{ textAlign: "right" as const }}>
                  <div style={{ fontFamily: "var(--fm)", fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.1em" }}>DRAWING NO. 0042</div>
                  <div style={{ fontFamily: "var(--fm)", fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.1em", marginTop: 4 }}>{wFt}′-0″ × {dFt}′-0″</div>
                  {boq.valid_until && (
                    <div style={{ fontFamily: "var(--fm)", fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.1em", marginTop: 4 }}>VALID UNTIL {boq.valid_until}</div>
                  )}
                </div>
              </div>

              {/* Summary grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 32, padding: "18px 0", borderBottom: "1px solid var(--line)" }}>
                <SummaryCell label="Room" value={vision.room_state.intake.room_type.charAt(0).toUpperCase() + vision.room_state.intake.room_type.slice(1)} />
                <SummaryCell label="City" value={boq.city || "—"} />
                <SummaryCell label="Vibe" value={vision.philosophy.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())} />
                <SummaryCell label="Budget" value={`₹${(vision.room_state.intake.budget_inr / 100000).toFixed(1)}L`} />
                <SummaryCell label="Total" value={`₹${(boq.grand_total_inr / 100000).toFixed(2)}L`} accent />
                <SummaryCell label="Remaining" value={(() => { const r = vision.room_state.intake.budget_inr - boq.grand_total_inr; return r >= 0 ? `+₹${Math.round(r/1000)}k` : `-₹${Math.round(Math.abs(r)/1000)}k`; })()} />
              </div>

              {/* Furniture BOQ */}
              <div style={{ marginBottom: 32 }}>
                <span className="eyebrow" style={{ display: "block", marginBottom: 14 }}>Furniture & Materials</span>
                <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--ink)" }}>
                      <th style={{ fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.12em", color: "var(--ink-3)", textAlign: "left" as const, padding: "0 0 8px", fontWeight: 500 }}>#</th>
                      <th style={{ fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.12em", color: "var(--ink-3)", textAlign: "left" as const, padding: "0 0 8px", fontWeight: 500 }}>Description</th>
                      <th style={{ fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.12em", color: "var(--ink-3)", textAlign: "center" as const, padding: "0 0 8px", fontWeight: 500 }}>Type</th>
                      <th style={{ fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.12em", color: "var(--ink-3)", textAlign: "right" as const, padding: "0 0 8px", fontWeight: 500 }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boq.furniture.map((it) => (
                      <tr key={it.sl_no} style={{ borderBottom: "1px solid var(--line)" }}>
                        <td style={{ fontFamily: "var(--fm)", fontSize: 10, color: "var(--ink-3)", padding: "12px 12px 12px 0", verticalAlign: "top" as const }}>{String(it.sl_no).padStart(2, "0")}</td>
                        <td style={{ padding: "12px 12px", verticalAlign: "top" as const }}>
                          <div style={{ fontFamily: "var(--fd)", fontSize: 16, fontWeight: 500, color: "var(--ink)" }}>{it.description}</div>
                          {it.carpenter_spec && (
                            <div style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 12.5, color: "var(--ink-3)", marginTop: 2 }}>{it.carpenter_spec}</div>
                          )}
                        </td>
                        <td style={{ textAlign: "center" as const, verticalAlign: "top" as const, padding: "12px 8px" }}>
                          <span style={{ fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.1em", color: it.procurement === "build" ? "var(--leaf)" : "var(--ink-3)", border: `1px solid ${it.procurement === "build" ? "var(--leaf)" : "var(--line)"}`, padding: "3px 7px" }}>
                            {it.procurement.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ fontFamily: "var(--fd)", fontSize: 16, color: "var(--ink)", textAlign: "right" as const, verticalAlign: "top" as const, padding: "12px 0 12px 8px" }}>
                          ₹{Math.round(it.amount_inr / 1000)}k
                        </td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: "2px solid var(--ink)" }}>
                      <td colSpan={3} style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 15, color: "var(--ink)", padding: "14px 12px 0 0", textAlign: "right" as const }}>Grand total</td>
                      <td style={{ fontFamily: "var(--fd)", fontSize: 20, fontWeight: 500, color: "var(--ink)", textAlign: "right" as const, padding: "14px 0 0" }}>
                        ₹{(boq.grand_total_inr / 100000).toFixed(2)}L
                      </td>
                    </tr>
                  </tbody>
                </table>
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
                            <span style={{ fontFamily: "var(--fm)", fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.1em" }}>₹{Math.round(p.total_inr / 1000)}K</span>
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
                <span style={{ fontFamily: "var(--fm)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.12em" }}>NIRMIT · निर्मित · SURESH CAN BUILD THIS</span>
                <span style={{ fontFamily: "var(--fm)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em" }}>DRAWING 0042-A · SCALE 1:48</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grand total bar */}
      {boq && (
        <div style={{ height: 48, padding: "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, borderTop: "1px solid var(--line)", background: "var(--paper-2)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span className="eyebrow">Grand total</span>
            <span style={{ fontFamily: "var(--fd)", fontSize: 22, fontWeight: 500, color: "var(--ink)" }}>
              ₹{(boq.grand_total_inr / 100000).toFixed(2)}L
            </span>
          </div>
          <span style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 13.5, color: "var(--ink-3)" }}>
            Valid until {boq.valid_until} · Suresh can build this.
          </span>
        </div>
      )}
    </div>
  );
}

function AmountRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 14, color: bold ? "var(--ink)" : "var(--ink-2)", fontWeight: bold ? 500 : 400 }}>{label}</span>
      <span style={{ fontFamily: "var(--fd)", fontSize: bold ? 18 : 15, fontWeight: bold ? 600 : 400, color: bold ? "var(--ink)" : "var(--ink-2)" }}>₹{Math.round(value / 1000)}k</span>
    </div>
  );
}

function SummaryCell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.14em", color: "var(--ink-3)", textTransform: "uppercase" as const, marginBottom: 5 }}>{label}</div>
      <div style={{ fontFamily: "var(--fd)", fontSize: 18, fontWeight: 500, color: accent ? "var(--terra)" : "var(--ink)" }}>{value}</div>
    </div>
  );
}
