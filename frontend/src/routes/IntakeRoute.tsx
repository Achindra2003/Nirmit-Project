/**
 * The four-question intake. VISION.md: "Less Is the Answer."
 *
 * Phase 1 keeps this minimal — clean form, no animation polish yet. The voice
 * and pacing get tuned in Phase 2 when this becomes the trust-building moment.
 */
import { useState } from "react";
import { api } from "@/api/client";
import type { Intake, Vibe } from "@/api/types";
import { useAppStore } from "@/store/useAppStore";

const VIBES: { id: Vibe; label: string; hint: string }[] = [
  { id: "warm_traditional", label: "Warm + traditional", hint: "Wood, brass, layered textiles." },
  { id: "modern_minimal", label: "Modern + minimal", hint: "Clean lines, neutral palette." },
  { id: "earthy_crafted", label: "Earthy + crafted", hint: "Natural fibre, terracotta, handmade." },
  { id: "light_airy", label: "Light + airy", hint: "Pale wood, white walls, breathing space." },
];

export function IntakeRoute() {
  const setIntake = useAppStore((s) => s.setIntake);
  const setStage = useAppStore((s) => s.setStage);
  const setVisions = useAppStore((s) => s.setVisions);

  const [width, setWidth] = useState(4200);
  const [depth, setDepth] = useState(3600);
  const [whoLivesHere, setWhoLivesHere] = useState("");
  const [vibe, setVibe] = useState<Vibe>("warm_traditional");
  const [budget, setBudget] = useState(300_000);
  const [vastu, setVastu] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    const intake: Intake = {
      room_type: "living",
      room_dimensions: { width_mm: width, depth_mm: depth, height_mm: 3000 },
      entrance_direction: "S",
      who_lives_here: whoLivesHere || "family at home",
      vibe,
      budget_inr: budget,
      keep_existing: null,
      vastu_matters: vastu,
    };
    setIntake(intake);
    setStage("generating");
    try {
      const res = await api.generate({ intake });
      setVisions(res.visions);
      setStage("reveal");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStage("intake");
    }
  }

  return (
    <div style={layout.shell}>
      <div style={layout.card}>
        <h1 style={layout.h1}>Tell us about your room.</h1>
        <p style={layout.sub}>Four answers. Then we design.</p>

        <label style={layout.label}>How big is the room? (in metres, roughly)</label>
        <div style={{ display: "flex", gap: 12 }}>
          <input
            type="number"
            min={2}
            max={20}
            step={0.1}
            value={width / 1000}
            onChange={(e) => setWidth(Math.round(parseFloat(e.target.value || "0") * 1000))}
            style={layout.input}
            placeholder="width"
          />
          <span style={{ alignSelf: "center" }}>×</span>
          <input
            type="number"
            min={2}
            max={20}
            step={0.1}
            value={depth / 1000}
            onChange={(e) => setDepth(Math.round(parseFloat(e.target.value || "0") * 1000))}
            style={layout.input}
            placeholder="depth"
          />
        </div>

        <label style={layout.label}>Who's this room really for?</label>
        <textarea
          rows={2}
          value={whoLivesHere}
          onChange={(e) => setWhoLivesHere(e.target.value)}
          style={{ ...layout.input, resize: "vertical" }}
          placeholder="e.g. family with two kids, mother-in-law visits often"
        />

        <label style={layout.label}>Which vibe pulls you?</label>
        <div style={layout.vibeGrid}>
          {VIBES.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setVibe(v.id)}
              style={{
                ...layout.vibeBtn,
                outline: vibe === v.id ? "2px solid var(--warm-accent)" : "1px solid #d8cfba",
              }}
            >
              <strong>{v.label}</strong>
              <small style={{ color: "#6b614f" }}>{v.hint}</small>
            </button>
          ))}
        </div>

        <label style={layout.label}>Budget</label>
        <input
          type="range"
          min={100000}
          max={1000000}
          step={25000}
          value={budget}
          onChange={(e) => setBudget(parseInt(e.target.value, 10))}
          style={{ width: "100%" }}
        />
        <div style={{ textAlign: "right", color: "#6b614f" }}>
          ₹{(budget / 1000).toFixed(0)}k
        </div>

        <label style={{ ...layout.label, display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={vastu} onChange={(e) => setVastu(e.target.checked)} />
          Vastu matters in how this room feels.
        </label>

        {error && <p style={{ color: "#a23838", marginTop: 12 }}>{error}</p>}

        <button onClick={submit} style={layout.cta}>
          Design my room
        </button>
      </div>
    </div>
  );
}

const layout = {
  shell: {
    minHeight: "100%",
    display: "grid",
    placeItems: "center",
    padding: 24,
  } as const,
  card: {
    background: "#fff",
    padding: 32,
    borderRadius: 16,
    width: "min(560px, 100%)",
    boxShadow: "0 10px 40px rgba(42, 34, 24, 0.08)",
  } as const,
  h1: { margin: 0, fontSize: 28, fontWeight: 600 } as const,
  sub: { marginTop: 4, marginBottom: 24, color: "#6b614f" } as const,
  label: {
    display: "block",
    marginTop: 20,
    marginBottom: 8,
    fontWeight: 500,
  } as const,
  input: {
    flex: 1,
    padding: "10px 12px",
    border: "1px solid #d8cfba",
    borderRadius: 8,
    background: "#fbf7ee",
    font: "inherit",
  } as const,
  vibeGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  } as const,
  vibeBtn: {
    background: "#fbf7ee",
    border: "1px solid #d8cfba",
    borderRadius: 8,
    padding: 12,
    textAlign: "left" as const,
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
  } as const,
  cta: {
    marginTop: 28,
    width: "100%",
    background: "var(--warm-ink)",
    color: "#f7f1e6",
    padding: "14px 16px",
    border: "none",
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 16,
  } as const,
};
