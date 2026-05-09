/**
 * Export — Phase 1 shows a stub message. The real BOQ + Hindi spec + Buy/Build
 * PDF is produced by the backend /export endpoint once app/domain/boq/ ports
 * the legacy quotation generator.
 */
import { useAppStore } from "@/store/useAppStore";

export function ExportRoute() {
  const { visions, selectedVisionId, setStage, reset } = useAppStore();
  const vision = visions.find((v) => v.id === selectedVisionId) ?? visions[0];

  return (
    <div style={shell}>
      <div style={card}>
        <h2 style={{ margin: 0 }}>Your design is ready.</h2>
        <p style={sub}>
          The carpenter-ready quotation is being wired up. For now, here's what
          ships into it.
        </p>

        {vision && (
          <ul style={list}>
            {vision.room_state.items.map((it) => (
              <li key={it.id} style={row}>
                <strong>{it.name_en}</strong>
                <span style={{ color: "#6b614f" }}>
                  {it.dimensions.width_mm}×{it.dimensions.depth_mm}×{it.dimensions.height_mm} mm
                </span>
                <span>
                  {it.is_buy ? "Buy" : "Build"} · ₹
                  {Math.round(it.price_inr / 1000)}k
                </span>
              </li>
            ))}
          </ul>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button onClick={() => setStage("planner")} style={ghost}>
            Back to planner
          </button>
          <button onClick={reset} style={primary}>
            Start over
          </button>
        </div>
      </div>
    </div>
  );
}

const shell = {
  minHeight: "100%",
  display: "grid",
  placeItems: "center",
  padding: 24,
} as const;
const card = {
  background: "#fff",
  padding: 32,
  borderRadius: 16,
  width: "min(640px, 100%)",
  boxShadow: "0 10px 40px rgba(42, 34, 24, 0.08)",
} as const;
const sub = { color: "#6b614f" } as const;
const list = { listStyle: "none", padding: 0, marginTop: 16 } as const;
const row = {
  display: "grid",
  gridTemplateColumns: "1.5fr 1.5fr 1fr",
  gap: 12,
  padding: "8px 0",
  borderBottom: "1px solid #ede6d8",
} as const;
const ghost = {
  background: "transparent",
  border: "1px solid var(--warm-ink)",
  color: "var(--warm-ink)",
  padding: "10px 14px",
  borderRadius: 8,
} as const;
const primary = {
  background: "var(--warm-ink)",
  color: "#f7f1e6",
  border: "none",
  padding: "10px 14px",
  borderRadius: 8,
} as const;
