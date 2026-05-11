import { useEffect, useRef, useState } from "react";
import { api } from "@/api/client";
import type { ChatResponse, Intent, IntentKind, RoomState, Vision } from "@/api/types";
import { RoomScene, type CameraView } from "@/three/RoomScene";
import { Planner2D } from "@/components/Planner2D";
import { FinishingPanel } from "@/components/FinishingPanel";
import { useAppStore } from "@/store/useAppStore";

type ViewMode = "3d" | "2d";
type RoomMode = "furniture" | "finishing";

const SUGGESTIONS = ["Make the sofa bigger", "Add more storage", "Make it feel warmer", "Lighter and airier", "Add a study desk"];

export function PlannerRoute() {
  const visions          = useAppStore((s) => s.visions);
  const selectedVisionId = useAppStore((s) => s.selectedVisionId);
  const setStage         = useAppStore((s) => s.setStage);
  const setVisions       = useAppStore((s) => s.setVisions);
  const selectVision     = useAppStore((s) => s.selectVision);
  const selectedId       = useAppStore((s) => s.selectedItemId);
  const setSelectedId    = useAppStore((s) => s.setSelectedItem);
  const editMode         = useAppStore((s) => s.editMode);
  const setEditMode      = useAppStore((s) => s.setEditMode);

  const baseVision = visions.find((v) => v.id === selectedVisionId) ?? visions[0];

  const [room, setRoom]         = useState<RoomState | null>(baseVision?.room_state ?? null);
  const [budgetHeadline, setBH] = useState(baseVision?.cost.story.headline ?? "");
  const [chat, setChat]         = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [draft, setDraft]       = useState("");
  const [sending, setSending]   = useState(false);
  const [pending, setPending]   = useState<ChatResponse | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("3d");
  const [camView, setCamView]   = useState<CameraView>("corner");
  const [roomMode, setRoomMode] = useState<RoomMode>("furniture");
  const [savedId, setSavedId]   = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const scrollRef               = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (baseVision) {
      setRoom(baseVision.room_state);
      setBH(baseVision.cost.story.headline);
      setChat([{
        role: "assistant",
        content: `${baseVision.reasoning.headline} Tap anything to select it — or just tell me what you'd change.`,
      }]);
      setSelectedId(null);
    }
  }, [baseVision?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if ((viewMode !== "3d" || roomMode !== "furniture") && editMode === "move") setEditMode("browse");
  }, [viewMode, roomMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat, sending]);

  if (!baseVision || !room) return (
    <div style={{ height: "100vh", display: "grid", placeItems: "center", background: "var(--basalt)", color: "var(--paper)", fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 20 }}>
      No room loaded.
    </div>
  );

  const selected  = room.items.find((i) => i.id === selectedId) ?? null;
  const moveMode  = editMode === "move";
  const roomDims  = room.intake.room_dimensions;
  const wFt = (roomDims.width_mm / 304.8).toFixed(0);
  const dFt = (roomDims.depth_mm / 304.8).toFixed(0);

  async function applyOneIntent(intent: Intent, echo?: string) {
    if (!room) return;
    try {
      const res = await api.apply({ room_state: room, intents: [intent], available_visions: visions });
      setRoom(res.room_state);
      setBH(res.cost.story.headline);
      if (intent.kind === "remove") setSelectedId(null);
      if (echo) setChat((c) => [...c, { role: "user", content: echo }, { role: "assistant", content: `Done. ${res.cost.story.headline}` }]);
    } catch (e) {
      setChat((c) => [...c, { role: "assistant", content: `I couldn't do that — ${e instanceof Error ? e.message : String(e)}` }]);
    }
  }

  function itemIntent(kind: IntentKind, label: string) {
    if (!selected) return;
    void applyOneIntent({ kind, target_item_id: selected.id, parameters: {} }, `${label}: ${selected.name_en}`);
  }
  function moveItem(id: string, x_mm: number, z_mm: number) {
    void applyOneIntent({ kind: "move", target_item_id: id, parameters: { x_mm, z_mm } });
  }
  function rotateItem(id: string) {
    void applyOneIntent({ kind: "rotate", target_item_id: id, parameters: { delta_deg: 90 } });
  }
  function finishingIntent(intent: Intent) { return applyOneIntent(intent); }

  async function send() {
    if (!draft.trim() || sending || !room) return;
    const turn = { role: "user" as const, content: draft.trim() };
    setChat((c) => [...c, turn]);
    setDraft("");
    setSending(true);
    try {
      const res = await api.chat({ room_state: room, history: chat, message: turn.content, available_visions: visions });
      setChat((c) => [...c, { role: "assistant", content: res.reply }]);
      if (res.proposed_room_state) setPending(res);
    } catch (e) {
      setChat((c) => [...c, { role: "assistant", content: `(error: ${e instanceof Error ? e.message : String(e)})` }]);
    } finally {
      setSending(false);
    }
  }

  function applyPending() {
    if (!pending?.proposed_room_state) return;
    setRoom(pending.proposed_room_state);
    setPending(null);
    if (baseVision) {
      const refreshed: Vision = { ...baseVision, room_state: pending.proposed_room_state };
      setVisions(visions.map((v) => (v.id === baseVision.id ? refreshed : v)));
      selectVision(baseVision.id);
    }
  }

  async function save() {
    if (!room || saving) return;
    setSaving(true);
    try {
      const r = await api.saveDesign({ name: baseVision!.name, philosophy: baseVision!.philosophy, room_state: room, existing_id: savedId });
      setSavedId(r.id);
    } catch (e) {
      console.warn("save failed", e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", width: "100%", height: "100vh", background: "var(--basalt)" }}>

      {/* ── LEFT: canvas ── */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Canvas header */}
        <div style={{ height: 56, padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, borderBottom: "1px solid rgba(242,235,221,.08)", background: "rgba(26,23,20,.97)" }}>
          <div onClick={() => setStage("home")} style={{ cursor: "pointer", display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: "var(--fd)", fontSize: 18, fontWeight: 500, color: "var(--paper)" }}>Nirmit</span>
            <span style={{ fontFamily: "var(--fh)", fontSize: 13, color: "rgba(242,235,221,.45)" }}>निर्मित</span>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontFamily: "var(--fm)", fontSize: 9, color: "rgba(242,235,221,.28)", letterSpacing: "0.12em" }}>DRAWING · </span>
            <span style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 17, fontWeight: 500, color: "var(--paper)" }}>{baseVision.name}</span>
            <span style={{ fontFamily: "var(--fm)", fontSize: 10, color: "rgba(242,235,221,.28)" }}>{wFt}′-0″ × {dFt}′-0″</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <PillSeg
              options={[["furniture", "Furniture"], ["finishing", "Finishing"]]}
              value={roomMode}
              onChange={(v) => setRoomMode(v as RoomMode)}
            />
            <PillSeg
              options={[["3d", "3D"], ["2d", "2D"]]}
              value={viewMode}
              onChange={(v) => setViewMode(v as ViewMode)}
            />
            <button
              onClick={() => setStage("export")}
              style={{ background: "transparent", border: "1px solid rgba(242,235,221,.18)", color: "rgba(242,235,221,.55)", padding: "7px 18px", fontFamily: "var(--fb)", fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", cursor: "pointer", textTransform: "uppercase" as const, transition: "all .2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(242,235,221,.5)"; e.currentTarget.style.color = "var(--paper)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(242,235,221,.18)"; e.currentTarget.style.color = "rgba(242,235,221,.55)"; }}
            >
              Hand off →
            </button>
          </div>
        </div>

        {/* Canvas area */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "var(--basalt)" }}>
          {viewMode === "3d" ? (
            <RoomScene
              room={room}
              selectedItemId={roomMode === "furniture" ? selectedId : null}
              onSelectItem={roomMode === "furniture" ? setSelectedId : () => {}}
              onMoveItem={roomMode === "furniture" ? moveItem : undefined}
              moveMode={roomMode === "furniture" && moveMode}
              view={camView}
              warmthK={room.lighting_kelvin}
              showAtmosphere
            />
          ) : (
            <Planner2D
              room={room}
              selectedItemId={roomMode === "furniture" ? selectedId : null}
              onSelectItem={roomMode === "furniture" ? setSelectedId : () => {}}
              onMoveItem={roomMode === "furniture" ? moveItem : undefined}
              onRotateItem={roomMode === "furniture" ? rotateItem : undefined}
            />
          )}

          {/* Finishing panel slide-in */}
          {roomMode === "finishing" && (
            <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 300, background: "rgba(242,235,221,.97)", borderLeft: "1px solid var(--line)", display: "flex", flexDirection: "column", boxShadow: "-12px 0 30px rgba(0,0,0,.2)" }}>
              <FinishingPanel room={room} onApply={finishingIntent} />
            </div>
          )}

          {/* Camera presets (3D) */}
          {viewMode === "3d" && (
            <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 0, background: "rgba(20,16,12,.7)", backdropFilter: "blur(10px)", border: "1px solid rgba(242,235,221,.1)" }}>
              {(["eye", "corner", "top", "walk"] as const).map((v) => (
                <button key={v} onClick={() => setCamView(v)} style={{ background: camView === v ? "rgba(242,235,221,.12)" : "transparent", border: "none", color: camView === v ? "var(--paper)" : "rgba(242,235,221,.4)", padding: "8px 16px", fontFamily: "var(--fm)", fontSize: 10, letterSpacing: "0.1em", cursor: "pointer", textTransform: "uppercase" as const, transition: "all .2s", borderRight: "1px solid rgba(242,235,221,.08)" }}>
                  {{ eye: "ENTRANCE", corner: "3/4", top: "PLAN", walk: "WALK" }[v]}
                </button>
              ))}
            </div>
          )}

          {/* Selected-item controls */}
          {roomMode === "furniture" && selected && (
            <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 6, background: "rgba(242,235,221,.97)", border: "1px solid var(--line)", padding: "8px 10px", boxShadow: "0 4px 20px rgba(0,0,0,.2)", maxWidth: "calc(100% - 48px)", flexWrap: "wrap" as const, ...(moveMode ? { outline: "2px solid var(--leaf)", outlineOffset: 2 } : {}) }}>
              <div style={{ display: "flex", flexDirection: "column", marginRight: 6 }}>
                <span style={{ fontFamily: "var(--fd)", fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{selected.name_en}</span>
                <span style={{ fontFamily: "var(--fm)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.06em" }}>
                  {moveMode ? (viewMode === "3d" ? "Drag in the room — orbit is paused" : "Drag in the plan") : `${selected.dimensions.width_mm}×${selected.dimensions.depth_mm} mm · ₹${Math.round(selected.price_inr / 1000)}k`}
                </span>
              </div>
              {viewMode === "3d" && (
                moveMode
                  ? <CBtn onClick={() => setEditMode("browse")} accent>✓ Done</CBtn>
                  : <CBtn onClick={() => setEditMode("move")} bold>↕ Move</CBtn>
              )}
              <CBtn onClick={() => rotateItem(selected.id)}>↻ Rotate</CBtn>
              <CBtn onClick={() => itemIntent("duplicate", "Duplicate")}>⧉ Dup</CBtn>
              <CBtn onClick={() => itemIntent("make_bigger", "Make bigger")}>＋</CBtn>
              <CBtn onClick={() => itemIntent("make_smaller", "Make smaller")}>－</CBtn>
              <CBtn onClick={() => itemIntent("change_style", "Style")}>⇄ Style</CBtn>
              <CBtn onClick={() => itemIntent("remove", "Remove")} danger>✕</CBtn>
              <button onClick={() => setSelectedId(null)} style={{ background: "transparent", border: "none", fontSize: 20, lineHeight: 1, color: "var(--ink-3)", cursor: "pointer", marginLeft: 2 }} aria-label="Deselect">×</button>
            </div>
          )}
        </div>

        {/* Canvas footer */}
        <div style={{ height: 44, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, borderTop: "1px solid rgba(242,235,221,.08)", background: "rgba(26,23,20,.97)" }}>
          <button
            onClick={save}
            style={{ background: "transparent", border: "1px solid rgba(242,235,221,.18)", color: "rgba(242,235,221,.5)", padding: "6px 16px", fontFamily: "var(--fb)", fontSize: 11, fontWeight: 500, letterSpacing: "0.04em", cursor: "pointer", textTransform: "uppercase" as const, transition: "all .2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--paper)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(242,235,221,.5)"; }}
          >
            {saving ? "Saving…" : savedId ? "Saved ✓" : "Save to your home"}
          </button>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: "var(--fm)", fontSize: 9, color: "rgba(242,235,221,.3)", letterSpacing: "0.1em" }}>ESTIMATE</span>
            <span style={{ fontFamily: "var(--fd)", fontSize: 18, fontWeight: 500, color: "var(--terra)" }}>{budgetHeadline.split(" ")[0]}</span>
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
      </div>

      {/* ── RIGHT: AI chat (light paper panel) ── */}
      <div style={{ display: "flex", flexDirection: "column", borderLeft: "1px solid var(--line)", background: "var(--paper)", overflow: "hidden" }}>

        {/* Chat header */}
        <div style={{ padding: "18px 24px 16px", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <span className="eyebrow">Collaborator</span>
              <div style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 18, fontWeight: 500, marginTop: 5, color: "var(--ink)" }}>
                {baseVision.name}
              </div>
              <div style={{ fontFamily: "var(--fm)", fontSize: 9.5, color: "var(--terra)", letterSpacing: "0.08em", marginTop: 3 }}>
                {budgetHeadline || "Calculating…"}
              </div>
            </div>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--terra)", animation: "pulse 2s ease infinite" }} />
          </div>
        </div>

        {/* Chat messages */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "20px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {chat.map((m, i) => (
            m.role === "assistant" ? (
              /* AI bubble — left aligned */
              <div key={i} className="fade" style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--terra)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
                  <span style={{ fontFamily: "var(--fm)", fontSize: 10, fontWeight: 600, color: "var(--paper)", letterSpacing: "0.04em" }}>N</span>
                </div>
                <div style={{ background: "rgba(242,235,221,0.65)", border: "1px solid var(--line)", padding: "11px 15px", borderRadius: "4px 14px 14px 14px", fontFamily: "var(--fd)", fontSize: 15, lineHeight: 1.62, color: "var(--ink)", maxWidth: "82%" }}>
                  {m.content}
                </div>
              </div>
            ) : (
              /* User bubble — right aligned */
              <div key={i} className="fade" style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ background: "var(--terra)", padding: "11px 15px", borderRadius: "14px 4px 14px 14px", fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 14.5, lineHeight: 1.62, color: "var(--paper)", maxWidth: "78%" }}>
                  {m.content}
                </div>
              </div>
            )
          ))}

          {/* Typing indicator */}
          {sending && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--terra)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "var(--fm)", fontSize: 10, fontWeight: 600, color: "var(--paper)" }}>N</span>
              </div>
              <div style={{ background: "rgba(242,235,221,0.65)", border: "1px solid var(--line)", padding: "14px 18px", borderRadius: "4px 14px 14px 14px", display: "flex", gap: 5, alignItems: "center" }}>
                {[0, 1, 2].map((i) => (
                  <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ink-3)", display: "inline-block", animation: `typing-dot 1.1s ease ${i * 0.18}s infinite` }} />
                ))}
              </div>
            </div>
          )}

          {/* Proposal card */}
          {pending?.proposed_room_state && (
            <div style={{ background: "var(--paper-3)", border: "1px solid var(--line)", borderLeft: "4px solid var(--terra)", padding: "14px 16px" }}>
              <span className="eyebrow" style={{ display: "block", marginBottom: 6 }}>Proposed change</span>
              <p style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 15, color: "var(--ink)", margin: "0 0 8px" }}>Apply this to the room?</p>
              <div style={{ fontFamily: "var(--fm)", fontSize: 10, color: pending.cost_delta_inr >= 0 ? "var(--terra)" : "var(--leaf)", letterSpacing: "0.08em", marginBottom: 12 }}>
                {pending.cost_delta_inr >= 0 ? "+" : ""}₹{Math.round(pending.cost_delta_inr / 1000)}K COST CHANGE
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={applyPending} style={{ background: "var(--terra)", color: "var(--paper)", border: "none", padding: "8px 18px", fontFamily: "var(--fb)", fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", cursor: "pointer", textTransform: "uppercase" as const }}>
                  Apply
                </button>
                <button onClick={() => setPending(null)} style={{ background: "transparent", border: "1px solid var(--line)", color: "var(--ink-2)", padding: "8px 14px", fontFamily: "var(--fb)", fontSize: 12, cursor: "pointer", textTransform: "uppercase" as const }}>
                  Not yet
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Suggestion chips */}
        <div style={{ padding: "8px 20px 4px", display: "flex", flexWrap: "wrap" as const, gap: 6, flexShrink: 0, borderTop: "1px solid var(--line)" }}>
          {SUGGESTIONS.map((s) => (
            <div
              key={s}
              onClick={() => setDraft(s)}
              style={{ padding: "6px 14px", fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 12.5, border: "1px solid var(--line)", cursor: "pointer", color: "var(--ink-2)", transition: "all .18s ease", whiteSpace: "nowrap" as const, borderRadius: 2 }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--terra)"; e.currentTarget.style.color = "var(--terra-dk)"; e.currentTarget.style.background = "rgba(194,80,46,.04)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--ink-2)"; e.currentTarget.style.background = "transparent"; }}
            >
              {s}
            </div>
          ))}
        </div>

        {/* Input */}
        <div style={{ padding: "12px 20px 20px", display: "flex", alignItems: "center", gap: 0, flexShrink: 0 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
            placeholder="Tell Nirmit what to refine…"
            style={{ flex: 1, border: "none", borderBottom: "1px solid var(--ink)", background: "transparent", padding: "10px 0", fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 16, outline: "none", color: "var(--ink)" }}
            onFocus={(e) => { e.currentTarget.style.borderBottomColor = "var(--terra)"; }}
            onBlur={(e) => { e.currentTarget.style.borderBottomColor = "var(--ink)"; }}
          />
          <button
            onClick={() => void send()}
            disabled={sending || !draft.trim()}
            style={{ background: "transparent", border: "none", cursor: sending || !draft.trim() ? "default" : "pointer", fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 16, color: sending || !draft.trim() ? "var(--ink-3)" : "var(--terra)", padding: "10px 0 10px 14px", transition: "color .2s" }}
          >
            → Send
          </button>
        </div>
      </div>
    </div>
  );
}

function PillSeg({ options, value, onChange }: { options: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", background: "rgba(242,235,221,.06)", padding: 3, gap: 1 }}>
      {options.map(([k, label]) => (
        <div key={k} onClick={() => onChange(k)} style={{ padding: "5px 14px", cursor: "pointer", background: value === k ? "rgba(242,235,221,.12)" : "transparent", color: value === k ? "var(--paper)" : "rgba(242,235,221,.32)", fontFamily: "var(--fm)", fontSize: 10, letterSpacing: "0.08em", transition: "all .18s" }}>
          {label}
        </div>
      ))}
    </div>
  );
}

function CBtn({ children, onClick, danger, accent, bold }: { children: React.ReactNode; onClick: () => void; danger?: boolean; accent?: boolean; bold?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{ background: accent ? "var(--leaf)" : "var(--paper-3)", border: `1px solid ${danger ? "rgba(162,56,56,.3)" : "var(--line)"}`, padding: "6px 10px", fontSize: 12, cursor: "pointer", font: "inherit", whiteSpace: "nowrap" as const, color: danger ? "var(--terra-dk)" : accent ? "var(--paper)" : "var(--ink)", fontWeight: bold ? 600 : 400 }}
    >
      {children}
    </button>
  );
}
