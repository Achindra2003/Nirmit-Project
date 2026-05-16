/**
 * Finishing mode — wall paint / flooring / lighting warmth.
 * After furniture placement the user can tune how the room *looks* without
 * touching the furniture.
 *
 * Each change is sent to /apply via a `recolor_room` intent so the backend's
 * cost engine and BOQ stay in sync.
 */
import { useEffect, useState } from "react";
import type {
  FinishingFlooringOption,
  FinishingOptions,
  FinishingPaintSwatch,
  Intent,
  RoomState,
} from "@/api/types";

interface Props {
  room: RoomState;
  onApply: (intent: Intent) => Promise<void>;
  activeSection?: "paint" | "flooring" | "lighting";
}

export function FinishingPanel({ room, onApply, activeSection }: Props) {
  const [options, setOptions] = useState<FinishingOptions | null>(null);

  useEffect(() => {
    fetch("/api/finishing/options")
      .then((r) => r.json())
      .then(setOptions)
      .catch(() => setOptions(null));
  }, []);

  if (!options) {
    return <div style={loading}>Loading finishes…</div>;
  }

  function applyPaint(s: FinishingPaintSwatch) {
    void onApply({
      kind: "recolor_room",
      target_item_id: null,
      parameters: { wall: s.hex, wall_finish: `${s.brand} ${s.product} (${s.color_name})` },
    });
  }
  function applyFloor(f: FinishingFlooringOption) {
    void onApply({
      kind: "recolor_room",
      target_item_id: null,
      parameters: { floor: f.hex, flooring: `${f.brand} ${f.product} (${f.label})` },
    });
  }
  function applyWarmth(k: number) {
    void onApply({
      kind: "recolor_room",
      target_item_id: null,
      parameters: { lighting_kelvin: k },
    });
  }

  const show = (section: "paint" | "flooring" | "lighting") =>
    !activeSection || activeSection === section;

  // Currently selected swatch (for preview header)
  const activePaint = options.paint_swatches.find((s) => s.hex === room.palette.wall);
  const activeFloor = options.flooring.find((f) => f.hex === room.palette.floor);

  return (
    <div style={shell}>

      {show("paint") && (
        <>
          {/* Preview header */}
          <div style={previewHeader}>
            <div style={{ ...previewSwatch, background: activePaint?.hex ?? room.palette.wall }} />
            <div style={previewMeta}>
              <span style={previewLabel}>Currently on wall</span>
              <span style={previewName}>{activePaint?.color_name ?? "Custom"}</span>
              <span style={previewSub}>
                {activePaint
                  ? `${activePaint.brand} · ${activePaint.product}`
                  : room.palette.wall.toUpperCase()}
              </span>
            </div>
          </div>

          <Section title="Wall paint" sub={`${options.paint_swatches.length} swatches · Asian Paints · Berger · Nerolac`}>
            <div style={paintGrid}>
              {options.paint_swatches.map((s) => {
                const sel = room.palette.wall === s.hex;
                return (
                  <button
                    key={s.id}
                    onClick={() => applyPaint(s)}
                    title={`${s.brand} ${s.product} - ${s.color_name} (${s.finish})`}
                    style={{
                      ...paintCard,
                      borderColor: sel ? "var(--terra)" : "var(--line)",
                      boxShadow: sel ? "0 0 0 2px rgba(184,67,42,.18)" : "none",
                    }}
                  >
                    <div style={{ ...paintTile, background: s.hex }}>
                      {sel && (
                        <span style={paintCheck} aria-hidden>
                          <svg width="12" height="12" viewBox="0 0 14 14"><path d="M2.5 7l3.5 3.5 5.5-7" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </span>
                      )}
                    </div>
                    <div style={paintMeta}>
                      <span style={paintName}>{s.color_name}</span>
                      <span style={paintBrand}>{s.brand} · {s.finish}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Section>
        </>
      )}

      {show("flooring") && (
        <>
          {/* Preview header */}
          <div style={previewHeader}>
            <div style={{ ...previewSwatch, background: activeFloor?.hex ?? room.palette.floor }} />
            <div style={previewMeta}>
              <span style={previewLabel}>Currently on floor</span>
              <span style={previewName}>{activeFloor?.label ?? "Custom"}</span>
              <span style={previewSub}>
                {activeFloor
                  ? `${activeFloor.brand} · ${activeFloor.product}`
                  : room.palette.floor.toUpperCase()}
              </span>
            </div>
          </div>

          <Section title="Flooring" sub={`${options.flooring.length} options · Pergo · Kajaria · local stone`}>
            <div style={floorGrid}>
              {options.flooring.map((f) => {
                const sel = room.palette.floor === f.hex;
                return (
                  <button
                    key={f.id}
                    onClick={() => applyFloor(f)}
                    title={`${f.brand} - ${f.label}`}
                    style={{
                      ...floorCard,
                      borderColor: sel ? "var(--terra)" : "var(--line)",
                      boxShadow: sel ? "0 0 0 2px rgba(184,67,42,.18)" : "none",
                    }}
                  >
                    <div style={{ ...floorTile, background: f.hex }}>
                      {sel && (
                        <span style={paintCheck} aria-hidden>
                          <svg width="12" height="12" viewBox="0 0 14 14"><path d="M2.5 7l3.5 3.5 5.5-7" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </span>
                      )}
                    </div>
                    <div style={paintMeta}>
                      <span style={paintName}>{f.label}</span>
                      <span style={paintBrand}>{f.brand}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Section>
        </>
      )}

      {show("lighting") && (
        <>
          {/* Preview header — shows current temperature */}
          <div style={previewHeader}>
            <div style={{
              ...previewSwatch,
              background: warmthHex(room.lighting_kelvin),
              boxShadow: `inset 0 0 18px ${warmthHex(room.lighting_kelvin)}`,
            }} />
            <div style={previewMeta}>
              <span style={previewLabel}>Light temperature</span>
              <span style={previewName}>{warmthLabel(room.lighting_kelvin)}</span>
              <span style={previewSub}>{room.lighting_kelvin} K</span>
            </div>
          </div>

          <Section title="Lighting warmth" sub="Scene temperature · sets the room's mood">
            {/* Visual gradient scrubber */}
            <div style={{ position: "relative", marginTop: 8, marginBottom: 8 }}>
              <div style={{
                height: 36,
                background: "linear-gradient(to right, #FF8A2A 0%, #FFD580 38%, #FFEDCC 60%, #F0F4FF 100%)",
                position: "relative",
                border: "1px solid var(--line)",
              }}>
                {/* Thumb */}
                <div style={{
                  position: "absolute",
                  left: `${((room.lighting_kelvin - 2400) / (4000 - 2400)) * 100}%`,
                  top: -3,
                  bottom: -3,
                  width: 6,
                  transform: "translateX(-50%)",
                  background: "var(--ink)",
                  pointerEvents: "none",
                  boxShadow: "0 1px 4px rgba(0,0,0,.25)",
                }} />
              </div>
              <input
                type="range"
                min={2400} max={4000} step={50}
                value={room.lighting_kelvin}
                onChange={(e) => applyWarmth(parseInt(e.target.value, 10))}
                style={{ width: "100%", opacity: 0, position: "absolute", top: 0, left: 0, height: 36, cursor: "ew-resize", margin: 0 }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
              <span style={{ fontFamily: "var(--fm)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>2400K · Candle</span>
              <span style={{ fontFamily: "var(--fm)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>4000K · Daylight</span>
            </div>

            {/* Scene presets */}
            <span style={{ fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.14em", color: "var(--ink-3)", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
              Or pick a preset
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 0, borderTop: "1px solid var(--line)" }}>
              {options.warmth_presets.map((p) => {
                const sel = room.lighting_kelvin === p.kelvin;
                return (
                  <div
                    key={p.id}
                    onClick={() => applyWarmth(p.kelvin)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 4px",
                      borderBottom: "1px solid var(--line)",
                      cursor: "pointer",
                      transition: "background .15s ease",
                      background: sel ? "rgba(184,67,42,.06)" : "transparent",
                    }}
                    onMouseEnter={(e) => { if (!sel) e.currentTarget.style.background = "rgba(0,0,0,.025)"; }}
                    onMouseLeave={(e) => { if (!sel) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 20, height: 20,
                        background: warmthHex(p.kelvin),
                        border: sel ? "2px solid var(--terra)" : "1px solid var(--line)",
                        flexShrink: 0,
                        borderRadius: 2,
                      }} />
                      <span style={{ fontFamily: "var(--fd)", fontSize: 14.5, color: sel ? "var(--terra)" : "var(--ink)", fontWeight: sel ? 500 : 400 }}>{p.label}</span>
                    </div>
                    <span style={{ fontFamily: "var(--fm)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.08em" }}>{p.kelvin} K</span>
                  </div>
                );
              })}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

function Section({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={sectionStyle}>
      <header style={sectionHeader}>
        <h3 style={sectionTitle}>{title}</h3>
        {sub && <span style={sectionSub}>{sub}</span>}
      </header>
      <div style={{ marginTop: 12 }}>
        {children}
      </div>
    </section>
  );
}

// ── helpers ───────────────────────────────────────────────────────────
function warmthHex(k: number): string {
  if (k < 2700) return "#FF8A2A";
  if (k < 3100) return "#FFB257";
  if (k < 3400) return "#FFD580";
  if (k < 3700) return "#FFEDCC";
  return "#F0F4FF";
}
function warmthLabel(k: number): string {
  if (k < 2700) return "Candlelit";
  if (k < 3100) return "Lamp";
  if (k < 3400) return "Warm white";
  if (k < 3700) return "Neutral";
  return "Daylight";
}

// ── styles ────────────────────────────────────────────────────────────
const shell = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 24,
  padding: "20px 24px 28px",
  overflowY: "auto" as const,
  flex: 1,
};
const loading = { padding: 24, color: "var(--ink-2)", fontFamily: "var(--fb)" };

const previewHeader = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "12px 14px",
  border: "1px solid var(--line)",
  background: "var(--paper-2)",
} as const;
const previewSwatch = {
  width: 52,
  height: 52,
  flexShrink: 0,
  border: "1px solid var(--line)",
} as const;
const previewMeta = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 1,
  minWidth: 0,
  flex: 1,
};
const previewLabel = {
  fontFamily: "var(--fm)",
  fontSize: 9,
  letterSpacing: "0.14em",
  textTransform: "uppercase" as const,
  color: "var(--ink-3)",
};
const previewName = {
  fontFamily: "var(--fd)",
  fontSize: 16,
  fontWeight: 500,
  color: "var(--ink)",
  lineHeight: 1.2,
};
const previewSub = {
  fontFamily: "var(--fb)",
  fontSize: 11,
  color: "var(--ink-2)",
  letterSpacing: "0.02em",
};

const sectionStyle = { display: "flex", flexDirection: "column" as const } as const;
const sectionHeader = { display: "flex", flexDirection: "column" as const, gap: 3 } as const;
const sectionTitle = {
  fontFamily: "var(--fd)",
  fontSize: 18,
  fontWeight: 500,
  letterSpacing: "-0.005em",
  color: "var(--ink)",
  margin: 0,
} as const;
const sectionSub = {
  fontFamily: "var(--fm)",
  fontSize: 9.5,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: "var(--ink-3)",
} as const;

const paintGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
} as const;
const paintCard = {
  display: "flex",
  flexDirection: "column" as const,
  border: "1px solid var(--line)",
  background: "var(--paper)",
  cursor: "pointer",
  padding: 0,
  overflow: "hidden" as const,
  transition: "border-color .18s ease, box-shadow .18s ease",
  textAlign: "left" as const,
};
const paintTile = {
  width: "100%",
  aspectRatio: "5 / 3",
  position: "relative" as const,
} as const;
const paintCheck = {
  position: "absolute" as const,
  top: 7,
  right: 7,
  width: 22,
  height: 22,
  borderRadius: "50%",
  background: "var(--terra)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 1px 4px rgba(0,0,0,.25)",
};
const paintMeta = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 2,
  padding: "8px 10px 10px",
  borderTop: "1px solid var(--line)",
  background: "var(--paper)",
};
const paintName = {
  fontFamily: "var(--fd)",
  fontSize: 13,
  fontWeight: 500,
  color: "var(--ink)",
  lineHeight: 1.2,
} as const;
const paintBrand = {
  fontFamily: "var(--fm)",
  fontSize: 9,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: "var(--ink-3)",
} as const;

const floorGrid = paintGrid;
const floorCard = paintCard;
const floorTile = {
  width: "100%",
  aspectRatio: "5 / 3",
  position: "relative" as const,
} as const;
