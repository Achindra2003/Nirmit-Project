import { useState } from "react";
import type { Intent, RoomState } from "@/api/types";
import { api } from "@/api/client";
import { RoomScene } from "@/three/RoomScene";
import { FinishingPanel } from "@/components/FinishingPanel";
import { useAppStore } from "@/store/useAppStore";

export function StyleRoute() {
  const visions          = useAppStore((s) => s.visions);
  const selectedVisionId = useAppStore((s) => s.selectedVisionId);
  const setStage         = useAppStore((s) => s.setStage);
  const setVisions       = useAppStore((s) => s.setVisions);

  const baseVision = visions.find((v) => v.id === selectedVisionId) ?? visions[0];
  const [room, setRoom] = useState<RoomState | null>(baseVision?.room_state ?? null);

  if (!baseVision || !room) return (
    <div style={{ height: "100vh", display: "grid", placeItems: "center", background: "var(--basalt)", color: "var(--paper)", fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 20 }}>
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

  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", width: "100%", height: "100vh", background: "var(--basalt)" }}>

      {/* Left — finishing panel */}
      <div style={{ display: "flex", flexDirection: "column", background: "var(--paper)", borderRight: "1px solid var(--line)", overflow: "hidden" }}>

        {/* Panel header */}
        <div style={{ height: 56, padding: "0 24px", display: "flex", alignItems: "center", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
          <div>
            <span className="eyebrow">Materials · IV.</span>
            <div style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 16, fontWeight: 500, color: "var(--ink)", marginTop: 3 }}>
              Walls, floors, light
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto" }}>
          <FinishingPanel room={room} onApply={applyFinishing} />
        </div>
      </div>

      {/* Right — 3D preview */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Top bar */}
        <div style={{ height: 56, padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, borderBottom: "1px solid rgba(242,235,221,.08)", background: "rgba(26,23,20,.97)" }}>
          <button
            onClick={() => setStage("planner")}
            style={{ background: "transparent", border: "none", color: "rgba(242,235,221,.5)", fontFamily: "var(--fb)", fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", cursor: "pointer", textTransform: "uppercase" as const, transition: "color .2s", display: "flex", alignItems: "center", gap: 6 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--paper)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(242,235,221,.5)"; }}
          >
            ← Back to planner
          </button>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: "var(--fd)", fontSize: 17, fontWeight: 500, color: "var(--paper)" }}>{baseVision.name}</span>
            <span style={{ fontFamily: "var(--fm)", fontSize: 9, color: "rgba(242,235,221,.3)", letterSpacing: "0.1em" }}>MATERIALS</span>
          </div>
          <button
            onClick={() => setStage("export")}
            style={{ background: "var(--terra)", color: "var(--paper)", border: "none", padding: "8px 20px", fontFamily: "var(--fb)", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", cursor: "pointer", textTransform: "uppercase" as const, transition: "background .2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--terra-dk)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--terra)"; }}
          >
            Generate quotation →
          </button>
        </div>

        {/* 3D scene */}
        <div style={{ flex: 1, position: "relative" }}>
          <RoomScene
            room={room}
            selectedItemId={null}
            onSelectItem={() => {}}
            moveMode={false}
            view="corner"
            warmthK={room.lighting_kelvin}
            showAtmosphere
          />
        </div>
      </div>
    </div>
  );
}
