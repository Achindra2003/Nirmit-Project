import { useState } from "react";
import type { Intent, RoomState } from "@/api/types";
import { api } from "@/api/client";
import { RoomScene } from "@/three/RoomScene";
import { FinishingPanel } from "@/components/FinishingPanel";
import { useAppStore } from "@/store/useAppStore";

type MaterialTab = "paint" | "flooring" | "lighting";

export function StyleRoute() {
  const visions          = useAppStore((s) => s.visions);
  const selectedVisionId = useAppStore((s) => s.selectedVisionId);
  const setStage         = useAppStore((s) => s.setStage);
  const setVisions       = useAppStore((s) => s.setVisions);

  const baseVision = visions.find((v) => v.id === selectedVisionId) ?? visions[0];
  const [room, setRoom] = useState<RoomState | null>(baseVision?.room_state ?? null);
  const [tab, setTab]   = useState<MaterialTab>("paint");

  if (!baseVision || room === null) return (
    <div style={{ height: "100vh", display: "grid", placeItems: "center", background: "var(--basalt)", color: "var(--paper)", fontFamily: "var(--fd)", fontSize: 20 }}>
      No room loaded.
    </div>
  );

  async function applyFinishing(intent: Intent) {
    if (!room) return;
    try {
      const res = await api.apply({ room_state: room, intents: [intent], available_visions: visions });
      setRoom(res.room_state);
      const updated = visions.map((v) =>
        v.id === baseVision!.id ? { ...v, room_state: res.room_state } : v
      );
      setVisions(updated);
    } catch (e) {
      console.warn("finishing apply failed", e);
    }
  }

  const TABS: Array<{ id: MaterialTab; label: string; icon: string }> = [
    { id: "paint",    label: "Wall Paint", icon: "◧" },
    { id: "flooring", label: "Flooring",   icon: "◫" },
    { id: "lighting", label: "Lighting",   icon: "☀" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", width: "100%", height: "100vh", background: "var(--basalt)" }}>

      {/* Left — materials panel */}
      <div style={{ display: "flex", flexDirection: "column", background: "var(--paper)", borderRight: "1px solid var(--line)", overflow: "hidden" }}>

        {/* Panel header */}
        <div style={{ padding: "28px 28px 20px", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
          <h2 style={{ fontFamily: "var(--fd)", fontSize: 32, fontWeight: 600, lineHeight: 1.05, color: "var(--ink)", marginBottom: 6 }}>
            Materials & <span style={{ fontStyle: "italic", fontWeight: 400, color: "var(--terra)" }}>finish</span>
          </h2>
          <p style={{ fontFamily: "var(--fb)", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.5 }}>
            Set the tone for walls, floors, and light.
          </p>
        </div>

        {/* Material tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
          {TABS.map((t) => {
            const sel = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  flex: 1,
                  padding: "14px 8px",
                  background: sel ? "var(--paper-3)" : "transparent",
                  border: "none",
                  borderBottom: sel ? "2.5px solid var(--terra)" : "2.5px solid transparent",
                  cursor: "pointer",
                  transition: "all .2s ease",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 18, opacity: sel ? 1 : 0.4 }}>{t.icon}</span>
                <span style={{ fontFamily: "var(--fb)", fontSize: 12, fontWeight: sel ? 600 : 400, color: sel ? "var(--terra)" : "var(--ink-3)", letterSpacing: "0.02em" }}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content area — only the active tab, no scrolling between sections */}
        <div style={{ flex: 1, overflow: "auto" }}>
          <FinishingPanel room={room} onApply={applyFinishing} activeSection={tab} />
        </div>

        {/* Footer CTA */}
        <div style={{ padding: "16px 28px 20px", borderTop: "1px solid var(--line)", flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            className="btn-primary"
            onClick={() => setStage("export")}
            style={{ width: "100%" }}
          >
            Generate quotation →
          </button>
          <button
            className="btn-ghost"
            onClick={() => setStage("planner")}
            style={{ width: "100%", justifyContent: "center" }}
          >
            ← Back to design
          </button>
        </div>
      </div>

      {/* Right — full-bleed 3D preview */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Minimal dark header */}
        <div style={{ height: 56, padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, borderBottom: "1px solid rgba(242,235,221,.08)", background: "rgba(26,23,20,.97)" }}>
          <span style={{ fontFamily: "var(--fd)", fontSize: 18, fontWeight: 600, color: "var(--paper)", letterSpacing: "-0.01em" }}>{baseVision.name}</span>
          <span className="eyebrow" style={{ color: "rgba(242,235,221,.3)" }}>Materials Preview</span>
        </div>

        {/* 3D scene */}
        <div style={{ flex: 1, position: "relative" }}>
          <div className="canvas-viewport-container" style={{ width: "100%", height: "100%", position: "relative" }}>
            <div className="canvas-corner-mark mark-tl">+</div>
            <div className="canvas-corner-mark mark-tr">+</div>
            <RoomScene
            room={room}
            selectedItemId={null}
            onSelectItem={() => {}}
            moveMode={false}
            view="corner"
            warmthK={room.lighting_kelvin}
            showAtmosphere
          />

          {/* Cost impact badge */}
          <div className="floating-draft-panel" style={{
            bottom: "var(--s-5)", left: "50%", transform: "translateX(-50%)",
            display: "flex", alignItems: "baseline", gap: 12,
          }}>
            <span style={{ fontFamily: "var(--fm)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em" }}>ESTIMATE</span>
            <span style={{ fontFamily: "var(--fd)", fontSize: 20, fontWeight: 600, color: "var(--terra)" }}>
              ₹{Math.round((baseVision.cost.story.total_inr || 0) / 1000)}k
            </span>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
