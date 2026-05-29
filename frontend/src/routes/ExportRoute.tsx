import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import type { ExportRequest, RoomState } from "@/api/types";
import { api } from "@/api/client";
import { useAppStore } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore";
import { TopNav } from "@/components/shell/TopNav";
import { Planner2D } from "@/components/Planner2D";
import { SceneSnapshot } from "@/three/SceneSnapshot";

interface LanguageInfo {
  code: string;
  name_en: string;
  name_native: string;
  heading_en: string;
  heading_native: string;
}

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
  local_section?: string;
  language?: LanguageInfo;
  valid_until: string;
}

type ExportOption = "pdf" | "whatsapp" | "contractor";

// Visual placeholder used wherever a rupee value would normally appear in the
// Contractor PDF — keeps the document layout intact while making it obvious
// that a figure was deliberately withheld.
const REDACTED = "— — —";

export function ExportRoute() {
  const { visions, selectedVisionId, reset } = useAppStore();
  const setStage = useAppStore((s) => s.setStage);
  const setPendingReturn = useAppStore((s) => s.setPendingReturn);
  // Save targets Supabase — needs an authed user. The Save button's
  // label / click handler / inline message all switch on this.
  const user = useAuthStore((s) => s.user);
  const vision = visions.find((v) => v.id === selectedVisionId) ?? visions[0];

  const [boq, setBoq]           = useState<BOQResponse | null>(null);
  const [downloading, setDl]    = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [selected, setSelected] = useState<ExportOption>("pdf");
  const [saving, setSaving]     = useState(false);
  const [savedId, setSavedId]   = useState<string | null>(null);
  // Inline feedback near the Save button. Split from `error` (which is
  // page-wide / global) so a save failure doesn't blow up the whole
  // page and a save success has somewhere quiet to land. */
  const [saveMsg, setSaveMsg]   = useState<string | null>(null);
  // Captured 3D render dataURL, embedded as <img> in the document and the
  // share card so html2canvas can rasterise it cleanly (WebGL canvases are
  // unreliable to capture directly).
  const [sceneImg, setSceneImg] = useState<string | null>(null);
  const boqRef = useRef<HTMLDivElement>(null);
  const waRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!vision) return;
    const req: ExportRequest = { room_state: vision.room_state, format: "json", include_hindi_section: true };
    fetch("/api/export", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(req) })
      .then((r) => { if (!r.ok) throw new Error(`/export ${r.status}`); return r.json(); })
      .then((d: BOQResponse) => setBoq(d))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [vision?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Render the visible BOQ preview to a multi-page A4 PDF.
   * Used for both the Full Quotation and the Contractor variant — the only
   * difference is the `hidePrices` flag flipped before capture, which the
   * JSX below honours by emitting REDACTED in place of each rupee value. */
  async function downloadPdf(filename: string) {
    if (!boqRef.current) {
      setError("Quotation preview not ready — please wait a moment and try again.");
      return;
    }
    const canvas = await html2canvas(boqRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#F2EBDD",
      logging: false,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pageHeight = pdf.internal.pageSize.getHeight();

    if (pdfHeight <= pageHeight) {
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
    } else {
      let yOffset = 0;
      let remaining = pdfHeight;
      while (remaining > 0) {
        pdf.addImage(imgData, "JPEG", 0, -yOffset, pdfWidth, pdfHeight);
        remaining -= pageHeight;
        yOffset += pageHeight;
        if (remaining > 0) pdf.addPage();
      }
    }
    pdf.save(filename);
  }

  async function downloadWhatsAppImage() {
    if (!waRef.current) {
      setError("Share card not ready — please wait a moment and try again.");
      return;
    }
    const canvas = await html2canvas(waRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#F2EBDD",
      logging: false,
    });
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "nirmit-design.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleDownload() {
    setDl(true);
    setError(null);
    try {
      if (selected === "pdf") {
        await downloadPdf("nirmit-quotation.pdf");
      } else if (selected === "contractor") {
        await downloadPdf("nirmit-contractor-spec.pdf");
      } else {
        await downloadWhatsAppImage();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setDl(false);
    }
  }

  async function save() {
    if (!vision || saving) return;
    // Anonymous users can't save — api.saveDesign would throw "Sign in
    // to save…" with no UI feedback. Route them to login, stashing the
    // current stage in pendingReturn so they land back HERE after auth
    // (LoginRoute / SignupRoute consume that flag on success).
    if (!user) {
      setPendingReturn("export");
      setStage("login");
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    try {
      const r = await api.saveDesign({ name: vision.name, philosophy: vision.philosophy, room_state: vision.room_state, existing_id: savedId });
      setSavedId(r.id);
      setSaveMsg("Saved to your archive.");
      // Clear the success message after a beat so the bar doesn't stay
      // shouting "saved!" forever.
      setTimeout(() => setSaveMsg(null), 4500);
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : String(e));
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

  const hidePrices = selected === "contractor";
  const language = boq?.language;
  // The /export endpoint returns both `local_section` (city-aware) and
  // `hindi_section` (legacy). Prefer the new field; fall back for any
  // response that pre-dates the upgrade.
  const carpenterText = boq?.local_section || boq?.hindi_section || "";
  const carpenterHeading = language
    ? `${language.heading_en} · ${language.heading_native}`
    : "Hindi Specification · बजट और सामग्री";
  const carpenterIntro = language
    ? `The specification below is for your carpenter — written in ${language.name_en} so there is no ambiguity on site.`
    : "The specification below is for your carpenter — written in Hindi so there is no ambiguity on site.";

  const EXPORT_OPTIONS: Array<{ id: ExportOption; label: string; sublabel: string; desc: string; recommended?: boolean }> = [
    {
      id: "pdf",
      label: "Full Quotation PDF",
      sublabel: "For your carpenter",
      desc: `Complete BOQ, ${language?.name_en ?? "Hindi"} specification, floor sketch. Print and hand directly to your carpenter.`,
      recommended: true,
    },
    {
      id: "whatsapp",
      label: "WhatsApp Image",
      sublabel: "Share with family",
      desc: "A shareable card with your room name, vibe, and grand total — clean enough for WhatsApp or Instagram.",
    },
    {
      id: "contractor",
      label: "Contractor PDF",
      sublabel: "Specs without pricing",
      desc: "Same layout, every rupee figure redacted. Hand it to independent contractors so their quote isn't anchored to yours.",
    },
  ];

  const downloadLabel = selected === "whatsapp" ? "Get the image →"
                     : selected === "contractor" ? "Get the contractor PDF →"
                     : "Get your PDF →";

  return (
    <div className="paper" style={{ height: "100vh", display: "flex", flexDirection: "column" }}>

      {/* Hidden 3D snapshot probe — renders the room off-screen, captures the
       *  canvas once GLBs have loaded, then unmounts itself by virtue of
       *  sceneImg flipping to truthy. The captured dataURL embeds in the BOQ
       *  doc and the WhatsApp card as an <img>, which html2canvas captures
       *  reliably (WebGL canvases don't always rasterise cleanly). */}
      {!sceneImg && vision && (
        <SceneSnapshot room={vision.room_state} onCapture={setSceneImg} />
      )}

      {/* Header */}
      <TopNav
        stage="export"
        hideTrail
        rightContent={
          <button
            className="btn-primary"
            onClick={() => void handleDownload()}
            disabled={downloading || !boq}
            style={{ padding: "8px 20px" }}
          >
            {downloading ? "Preparing…" : !boq ? "One moment…" : downloadLabel}
          </button>
        }
      />

      {/* Body — `.export-body` shrinks the option sidebar from 340 to
       *  280 (and 240 below 900px) so the BOQ preview keeps enough room
       *  at tablet sizes. */}
      <div className="export-body" style={{ flex: 1, display: "grid", gridTemplateColumns: "340px 1fr", minHeight: 0 }}>

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
                  onClick={() => setSelected(opt.id)}
                  style={{
                    padding: "16px 18px",
                    border: isSel ? "2px solid var(--terra)" : "1px solid var(--line)",
                    background: isSel ? "var(--paper-3)" : "transparent",
                    cursor: "pointer",
                    transition: "all .2s ease",
                    position: "relative" as const,
                  }}
                  onMouseEnter={(e) => { if (!isSel) { e.currentTarget.style.borderColor = "var(--line-2)"; e.currentTarget.style.background = "rgba(242,235,221,.5)"; } }}
                  onMouseLeave={(e) => { if (!isSel) { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.background = "transparent"; } }}
                >
                  {opt.recommended && (
                    <div style={{ position: "absolute" as const, top: -1, right: 14, background: "var(--terra)", color: "var(--paper)", fontFamily: "var(--fm)", fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", padding: "3px 8px" }}>
                      RECOMMENDED
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
            <p style={{ padding: "16px 32px 0", fontFamily: "var(--fd)", fontStyle: "italic", color: "var(--terra-dk)", fontSize: 14 }}>{error}</p>
          )}
        </div>

        {/* RIGHT — preview pane: BOQ document, or WhatsApp share card */}
        <div style={{ overflow: "auto", padding: "40px 48px" }}>
          {!boq ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16 }}>
              <div style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 20, color: "var(--ink-3)" }}>Drawing up your quotation…</div>
              <div style={{ width: 32, height: 32, border: "2px solid var(--line)", borderTopColor: "var(--terra)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            </div>
          ) : selected === "whatsapp" ? (
            <WhatsAppCard
              outerRef={waRef}
              roomName={vision.name}
              tagline={vision.tagline}
              philosophy={vision.philosophy}
              roomType={vision.room_state.intake.room_type}
              city={boq.city}
              grandTotal={boq.grand_total_inr}
              wFt={wFt}
              dFt={dFt}
              furnitureCount={boq.furniture.length}
              room={vision.room_state}
              sceneImg={sceneImg}
            />
          ) : (
            <div ref={boqRef} className="card-inset" style={{ maxWidth: 740, margin: "0 auto", background: "var(--paper)" }}>

              {/* Document header — with Nirmit / निर्मित logotype */}
              <div style={{ borderBottom: "2px solid var(--ink)", paddingBottom: 20, marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
                    <span style={{ fontFamily: "var(--fd)", fontSize: 26, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em", lineHeight: 1 }}>Nirmit</span>
                    <span style={{ fontFamily: "var(--fh)", fontSize: 16, color: "var(--ink)", opacity: 0.5, lineHeight: 1 }}>निर्मित</span>
                    <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "var(--terra)", margin: "0 4px 2px" }} />
                    <span style={{ fontFamily: "var(--fm)", fontSize: 9.5, letterSpacing: "0.18em", color: "var(--ink-3)", textTransform: "uppercase" as const, lineHeight: 1 }}>{hidePrices ? "Contractor Spec" : "Room Quotation"}</span>
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
                <SummaryCell label="Budget" value={hidePrices ? REDACTED : `₹${(vision.room_state.intake.budget_inr / 100000).toFixed(1)}L`} />
                <SummaryCell label="Total" value={hidePrices ? REDACTED : `₹${(boq.grand_total_inr / 100000).toFixed(2)}L`} accent />
                <SummaryCell label="Remaining" value={hidePrices ? REDACTED : (() => { const r = vision.room_state.intake.budget_inr - boq.grand_total_inr; return `${r >= 0 ? "+" : "−"}${formatAmount(Math.abs(r))}`; })()} />
              </div>

              {/* Drawings — 3D perspective + 2D plan side-by-side. The
                  carpenter / contractor reads the plan; the family looks at
                  the perspective. Both are essential to the document. */}
              <DrawingsBlock room={vision.room_state} sceneImg={sceneImg} />

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
                        const pepperUrl = `https://www.pepperfry.com/site_product/search?q=${encodeURIComponent(it.description)}`;
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
                              {hidePrices ? REDACTED : formatAmount(it.amount_inr)}
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
                          <td style={{ fontFamily: "var(--fd)", fontSize: 14, color: "var(--ink-2)", textAlign: "right" as const, padding: "10px 8px", verticalAlign: "top" as const }}>{hidePrices ? REDACTED : formatRate(m.rate_inr, m.unit)}</td>
                          <td style={{ fontFamily: "var(--fd)", fontSize: 15, color: "var(--ink)", textAlign: "right" as const, padding: "10px 0 10px 8px", verticalAlign: "top" as const }}>{hidePrices ? REDACTED : formatAmount(m.amount_inr)}</td>
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
                          <td style={{ fontFamily: "var(--fd)", fontSize: 14, color: "var(--ink-2)", textAlign: "right" as const, padding: "10px 8px", verticalAlign: "top" as const }}>{hidePrices ? REDACTED : formatRate(l.rate_inr, l.unit)}</td>
                          <td style={{ fontFamily: "var(--fd)", fontSize: 15, color: "var(--ink)", textAlign: "right" as const, padding: "10px 0 10px 8px", verticalAlign: "top" as const }}>{hidePrices ? REDACTED : formatAmount(l.amount_inr)}</td>
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
                    <span style={{ fontFamily: "var(--fd)", fontSize: 15, color: "var(--ink-2)" }}>{hidePrices ? REDACTED : formatAmount(boq.subtotal_inr)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 14, color: "var(--ink-2)" }}>Contingency (10%)</span>
                    <span style={{ fontFamily: "var(--fd)", fontSize: 15, color: "var(--ink-2)" }}>{hidePrices ? REDACTED : formatAmount(boq.contingency_inr)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 14, color: "var(--ink-2)" }}>GST</span>
                    <span style={{ fontFamily: "var(--fd)", fontSize: 15, color: "var(--ink-2)" }}>{hidePrices ? REDACTED : formatAmount(boq.gst_inr)}</span>
                  </div>
                  <div style={{ height: "0.5px", background: "var(--line-2)", margin: "4px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontFamily: "var(--fd)", fontSize: 17, fontWeight: 600, color: "var(--ink)" }}>Grand Total</span>
                    <span style={{ fontFamily: "var(--fd)", fontSize: 22, fontWeight: 600, color: "var(--ink)" }}>{hidePrices ? REDACTED : `₹${(boq.grand_total_inr / 100000).toFixed(2)}L`}</span>
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
                            {!hidePrices && (
                              <span style={{ fontFamily: "var(--fm)", fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.1em" }}>{formatAmount(p.total_inr).toUpperCase()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Carpenter specification — city-aware language */}
              {carpenterText && (
                <div>
                  <span className="eyebrow" style={{ display: "block", marginBottom: 12 }}>{carpenterHeading}</span>
                  <p style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 13, color: "var(--ink-2)", marginBottom: 14, lineHeight: 1.5 }}>
                    {carpenterIntro}
                  </p>
                  <div style={{ fontFamily: "var(--fh)", fontSize: 17, lineHeight: 2.1, color: "var(--ink)", whiteSpace: "pre-wrap" as const, borderTop: "1px solid var(--line)", paddingTop: 16 }}>
                    {hidePrices ? stripPriceLines(carpenterText, language) : carpenterText}
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
        <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0 }}>
          <button
            className="btn-secondary"
            onClick={save}
            disabled={saving}
            style={{ padding: "8px 18px", flexShrink: 0 }}
          >
            {/* Label adapts: anonymous → "Sign in to save"; signed in
             *  → "Save design" / "Saving…" / "Saved ✓" (after success). */}
            {!user
              ? "Sign in to save"
              : saving
                ? "Saving…"
                : savedId
                  ? "Saved ✓"
                  : "Save design"}
          </button>
          <button
            onClick={reset}
            className="tool-action-lnk"
            style={{ padding: 0, flexShrink: 0 }}
          >
            Start a new room →
          </button>
          {/* Inline feedback next to the buttons — green-ish ink for
           *  success, terra for errors. Truncates if the message is
           *  long so the bottom bar height stays steady. */}
          {saveMsg && (
            <span
              style={{
                fontFamily: "var(--fd)",
                fontStyle: "italic",
                fontSize: 13,
                color: saveMsg.startsWith("Saved") ? "var(--ink-2)" : "var(--terra-dk)",
                marginLeft: 4,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 360,
              }}
            >
              {saveMsg}
            </span>
          )}
        </div>
        {boq && !hidePrices && (
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

/** Remove the per-item price lines from the carpenter spec for the Contractor
 *  PDF variant. The spec body uses a "<price label> <amount>" line right
 *  below each item; we drop those lines and keep everything else.
 */
function stripPriceLines(text: string, lang?: LanguageInfo): string {
  if (!lang) {
    // Hindi default — matches the legacy "कीमत:" line
    return text.split("\n").filter((l) => !/कीमत|किंमत|मूल्य|விலை|ధర|ಬೆಲೆ/.test(l)).join("\n");
  }
  // Drop any line containing a numeric figure followed by a digit grouping —
  // those are the only price lines in the generated spec.
  return text.split("\n").filter((l) => !/\d{1,3}(?:,\d{3})+/.test(l)).join("\n");
}


function SummaryCell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.14em", color: "var(--ink-3)", textTransform: "uppercase" as const, marginBottom: 5 }}>{label}</div>
      <div style={{ fontFamily: "var(--fd)", fontSize: 18, fontWeight: 500, color: accent ? "var(--terra)" : "var(--ink)" }}>{value}</div>
    </div>
  );
}


/* ── WhatsApp / share card ───────────────────────────────────────────────
 * Portrait Instagram/WhatsApp-friendly aspect (~4:5). Captured at 2x so the
 * downloaded PNG is sharp on mobile. Keep it visually quiet — this is the
 * artefact a user forwards to their family group, so it should feel like a
 * Nirmit-branded keepsake, not a marketing flyer.
 */
function WhatsAppCard({
  outerRef, roomName, tagline, philosophy, roomType, city, grandTotal, wFt, dFt, furnitureCount, room, sceneImg,
}: {
  outerRef: React.RefObject<HTMLDivElement>;
  roomName: string;
  tagline: string;
  philosophy: string;
  roomType: string;
  city: string;
  grandTotal: number;
  wFt: string;
  dFt: string;
  furnitureCount: number;
  room: RoomState;
  sceneImg: string | null;
}) {
  const philosophyLabel = philosophy.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const roomLabel = roomType.charAt(0).toUpperCase() + roomType.slice(1);
  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <p style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 13, color: "var(--ink-3)", textAlign: "center", marginBottom: 18 }}>
        A clean image you can forward — designed for WhatsApp, Instagram, anywhere.
      </p>
      <div
        ref={outerRef}
        style={{
          width: 520,
          aspectRatio: "4 / 5",
          background: "var(--paper)",
          border: "1px solid var(--line)",
          padding: "32px 36px 28px",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          boxShadow: "0 4px 18px rgba(0,0,0,.08)",
        }}
      >
        {/* Logotype + room name on one row to save vertical space for the
         *  3D hero image below */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontFamily: "var(--fd)", fontSize: 22, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em", lineHeight: 1 }}>Nirmit</span>
            <span style={{ fontFamily: "var(--fh)", fontSize: 13, color: "var(--ink)", opacity: 0.5, lineHeight: 1 }}>निर्मित</span>
          </div>
          <span style={{ fontFamily: "var(--fm)", fontSize: 8, letterSpacing: "0.16em", color: "var(--ink-3)", textTransform: "uppercase" as const }}>
            Designed for our home
          </span>
        </div>

        {/* 3D hero — fills the upper visual zone. The captured frame is
         *  4:3; the share-card cell intentionally matches that ratio so
         *  `objectFit: contain` shows the entire render edge-to-edge
         *  without cropping the ceiling or the floor. Falls back to the
         *  2D plan if the 3D capture isn't ready. */}
        <div style={{ position: "relative" as const, width: "100%", aspectRatio: "4 / 3", marginBottom: 16, overflow: "hidden", border: "1px solid var(--line)", background: "var(--paper-2)", display: "grid", placeItems: "center", padding: 6 }}>
          {sceneImg ? (
            <img src={sceneImg} alt={`3D render of ${roomName}`} style={{ maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto", objectFit: "contain", display: "block" }} />
          ) : (
            <PlanThumb room={room} />
          )}
        </div>

        {/* Room name + tagline */}
        <h2 style={{ fontFamily: "var(--fd)", fontSize: 32, fontWeight: 500, lineHeight: 1.04, color: "var(--ink)", letterSpacing: "-0.02em", marginBottom: 4 }}>
          {roomName}
        </h2>
        <p style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 13, color: "var(--ink-2)", marginBottom: 16, lineHeight: 1.4 }}>
          {tagline}
        </p>

        <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
          <ShareStat label="Room" value={`${roomLabel} · ${wFt}×${dFt} ft`} />
          <ShareStat label="Vibe" value={philosophyLabel} />
          <ShareStat label="City" value={city} />
        </div>

        {/* Footer: grand total + tagline */}
        <div style={{ marginTop: "auto", borderTop: "1px solid var(--line)", paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <div style={{ fontFamily: "var(--fm)", fontSize: 8.5, letterSpacing: "0.18em", color: "var(--ink-3)", textTransform: "uppercase" as const, marginBottom: 3 }}>Grand total · {furnitureCount} pieces</div>
            <div style={{ fontFamily: "var(--fd)", fontSize: 26, fontWeight: 600, color: "var(--terra)", lineHeight: 1 }}>
              ₹{(grandTotal / 100000).toFixed(2)}L
            </div>
          </div>
          <div style={{ textAlign: "right" as const }}>
            <div style={{ fontFamily: "var(--fm)", fontSize: 8, color: "var(--ink-3)", letterSpacing: "0.14em" }}>BUILT FOR INDIAN HOMES</div>
            <div style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 10, color: "var(--ink-3)", marginTop: 2 }}>nirmit.design</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Drawings block — embedded inside the quotation/contractor BOQ.
 * 3D perspective on the left, top-down floor plan on the right. Both are
 * essential: the family looks at the perspective, the carpenter reads the
 * plan. While the 3D snapshot is still capturing, we show a placeholder
 * that mirrors the final layout so the page doesn't reflow on capture. */
function DrawingsBlock({ room, sceneImg }: { room: RoomState; sceneImg: string | null }) {
  // Each cell is a fixed height with the visual using `contain` to fit
  // entirely — the earlier `aspectRatio: 4/3` + `objectFit: cover` combo
  // cropped the 3D image at top/bottom (whenever the cell ended up wider
  // than 4:3) and forced the Planner2D SVG to overflow into hidden space.
  // 280px is tall enough that the room reads at a glance and short enough
  // that the document still fits on one A4 page after the BOQ rows.
  const CELL_H = 280;
  const cellWrap: React.CSSProperties = {
    height: CELL_H,
    border: "1px solid var(--line)",
    position: "relative",
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    padding: 8,
  };
  const cellLabel: React.CSSProperties = {
    position: "absolute",
    bottom: 8,
    left: 10,
    fontFamily: "var(--fm)",
    fontSize: 9,
    letterSpacing: "0.16em",
    color: "var(--ink-3)",
    textTransform: "uppercase",
    background: "rgba(240,230,211,.85)",
    padding: "2px 7px",
  };
  return (
    <div style={{ marginBottom: 32 }}>
      <span className="eyebrow" style={{ display: "block", marginBottom: 14 }}>Drawings · Perspective &amp; Floor Plan</span>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* 3D — left. `objectFit: contain` shows the WHOLE captured frame
            instead of cropping it to the cell aspect ratio. */}
        <div style={{ ...cellWrap, background: "var(--paper-2)" }}>
          {sceneImg ? (
            <img
              src={sceneImg}
              alt="3D perspective of the room"
              style={{ maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto", objectFit: "contain", display: "block" }}
            />
          ) : (
            <div style={{ color: "var(--ink-3)", fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 13 }}>
              Rendering 3D view…
            </div>
          )}
          <div style={cellLabel}>Perspective · 3D</div>
        </div>
        {/* 2D plan — right. Wraps Planner2D in a sized container with no
            flex collapse weirdness; Planner2D's own
            preserveAspectRatio="xMidYMid meet" letterboxes inside. */}
        <div style={{ ...cellWrap, background: "var(--paper)" }}>
          <PlanThumb room={room} />
          <div style={cellLabel}>Floor plan · Top-down</div>
        </div>
      </div>
    </div>
  );
}

/* Thumbnail of Planner2D for the document. The earlier flex+maxHeight
 * wrapper let the SVG render at its intrinsic height, which then exceeded
 * the cell. Sized box + a direct child Planner2D lets preserveAspectRatio
 * do the actual fitting. */
function PlanThumb({ room }: { room: RoomState }) {
  return (
    <div style={{ width: "100%", height: "100%", lineHeight: 0 }}>
      <Planner2D room={room} />
    </div>
  );
}

function ShareStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.16em", color: "var(--ink-3)", textTransform: "uppercase" as const, marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: "var(--fd)", fontSize: 16, fontWeight: 500, color: "var(--ink)" }}>{value}</div>
    </div>
  );
}
