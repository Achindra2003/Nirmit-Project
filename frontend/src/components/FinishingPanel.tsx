/**
 * Finishing mode — wall paint / flooring / lighting warmth / curtain choice.
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
}

export function FinishingPanel({ room, onApply }: Props) {
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

  return (
    <div style={shell}>
      <Section title="Wall paint" hint="Asian Paints, Berger, Nerolac">
        <div style={swatchGrid}>
          {options.paint_swatches.map((s) => (
            <button
              key={s.id}
              onClick={() => applyPaint(s)}
              style={{
                ...swatchBtn,
                background: s.hex,
                outline: room.palette.wall === s.hex ? "3px solid var(--warm-accent)" : "1px solid #d8cfba",
              }}
              title={`${s.brand} ${s.product} - ${s.color_name} (${s.finish})`}
            >
              <span style={swatchLabel}>
                {s.color_name}
                <small>{s.brand}</small>
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Flooring" hint="Pergo, Kajaria, local">
        <div style={swatchGrid}>
          {options.flooring.map((f) => (
            <button
              key={f.id}
              onClick={() => applyFloor(f)}
              style={{
                ...swatchBtn,
                background: f.hex,
                outline: room.palette.floor === f.hex ? "3px solid var(--warm-accent)" : "1px solid #d8cfba",
              }}
              title={`${f.brand} - ${f.label}`}
            >
              <span style={swatchLabel}>
                {f.label}
                <small>{f.brand}</small>
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Lighting warmth" hint="Sun temperature in the scene">
        <input
          type="range"
          min={2400}
          max={4000}
          step={100}
          value={room.lighting_kelvin}
          onChange={(e) => applyWarmth(parseInt(e.target.value, 10))}
          style={{ width: "100%" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b614f" }}>
          <span>Candlelit</span>
          <strong>{room.lighting_kelvin} K</strong>
          <span>Daylight</span>
        </div>
        <div style={presetsRow}>
          {options.warmth_presets.map((p) => (
            <button
              key={p.id}
              onClick={() => applyWarmth(p.kelvin)}
              style={{
                ...presetBtn,
                ...(room.lighting_kelvin === p.kelvin ? presetBtnOn : null),
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={sectionStyle}>
      <header style={sectionHeader}>
        <strong>{title}</strong>
        {hint && <small style={{ color: "#8a7d5e" }}>{hint}</small>}
      </header>
      {children}
    </section>
  );
}

const shell = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 16,
  padding: 16,
  overflowY: "auto" as const,
  flex: 1,
};
const loading = { padding: 16, color: "#6b614f" };
const sectionStyle = { display: "flex", flexDirection: "column" as const, gap: 8 } as const;
const sectionHeader = { display: "flex", justifyContent: "space-between", alignItems: "baseline" } as const;
const swatchGrid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 } as const;
const swatchBtn = {
  height: 64,
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  position: "relative" as const,
  display: "flex",
  alignItems: "flex-end",
};
const swatchLabel = {
  background: "rgba(0,0,0,0.55)",
  color: "#fff",
  width: "100%",
  padding: "6px 8px",
  borderRadius: "0 0 8px 8px",
  fontSize: 11,
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "flex-start",
} as const;
const presetsRow = { display: "flex", gap: 6, flexWrap: "wrap" as const, marginTop: 8 } as const;
const presetBtn = {
  background: "#fff",
  border: "1px solid #d8cfba",
  borderRadius: 999,
  padding: "4px 10px",
  fontSize: 12,
  cursor: "pointer",
} as const;
const presetBtnOn = { background: "var(--warm-ink)", color: "#f7f1e6", borderColor: "var(--warm-ink)" };
