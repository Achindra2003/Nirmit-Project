import { useEffect, useRef, useState } from "react";
import { api } from "@/api/client";
import type { ChatResponse, Intent, IntentKind, RoomState, Vision } from "@/api/types";
import { RoomScene, type CameraView } from "@/three/RoomScene";
import { Planner2D } from "@/components/Planner2D";
import { useAppStore } from "@/store/useAppStore";

type ViewMode = "3d" | "2d";

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
  const layoutEditMode   = useAppStore((s) => s.layoutEditMode);
  const setLayoutEditMode = useAppStore((s) => s.setLayoutEditMode);

  const baseVision = visions.find((v) => v.id === selectedVisionId) ?? visions[0];

  const [room, setRoom]         = useState<RoomState | null>(baseVision?.room_state ?? null);
  const [roomHistory, setRoomHistory] = useState<RoomState[]>([]);
  const [budgetHeadline, setBH] = useState(baseVision?.cost.story.headline ?? "");
  const [chat, setChat]         = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [draft, setDraft]       = useState("");
  const [sending, setSending]   = useState(false);
  const [pending, setPending]   = useState<ChatResponse | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("2d");
  const [camView, setCamView]   = useState<CameraView>("corner");
  const [advisory, setAdvisory] = useState(false);
  const [backendUp, setBackendUp] = useState(true);
  const [showRoomEdit, setShowRoomEdit] = useState(false);
  const [showCatalogue, setShowCatalogue] = useState(false);
  const [roomW, setRoomW] = useState(baseVision?.room_state.intake.room_dimensions.width_mm ?? 3600);
  const [roomD, setRoomD] = useState(baseVision?.room_state.intake.room_dimensions.depth_mm ?? 4200);
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
    if (viewMode !== "3d" && editMode === "move") setEditMode("browse");
  }, [viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat, sending]);

  // Backend health check — single ping on mount so the user knows immediately if
  // the server isn't running (shows red dot in header, explains API errors).
  useEffect(() => {
    fetch("/health").then((r) => setBackendUp(r.ok)).catch(() => setBackendUp(false));
  }, []);

  if (!baseVision || !room) return (
    <div style={{ height: "100vh", display: "grid", placeItems: "center", background: "var(--basalt)", color: "var(--paper)", fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 20 }}>
      No room loaded.
    </div>
  );

  const selected  = room.items.find((i) => i.id === selectedId) ?? null;
  const moveMode  = editMode === "move" && layoutEditMode;
  const roomDims  = room.intake.room_dimensions;
  const wFt = (roomDims.width_mm / 304.8).toFixed(0);
  const dFt = (roomDims.depth_mm / 304.8).toFixed(0);

  async function applyOneIntent(intent: Intent, echo?: string) {
    if (!room) return;
    const before = room;
    try {
      const res = await api.apply({ room_state: room, intents: [intent], available_visions: visions });
      setRoomHistory((h) => [...h.slice(-19), before]);
      setRoom(res.room_state);
      setBH(res.cost.story.headline);
      if (intent.kind === "remove") setSelectedId(null);
      if (echo) setChat((c) => [...c, { role: "user", content: echo }, { role: "assistant", content: `Done. ${res.cost.story.headline}` }]);
    } catch (e) {
      setChat((c) => [...c, { role: "assistant", content: `I couldn't do that — ${e instanceof Error ? e.message : String(e)}` }]);
    }
  }

  function undo() {
    setRoomHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setRoom(prev);
      return h.slice(0, -1);
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

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



  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", width: "100%", height: "100vh", background: "var(--basalt)" }}>

      {/* ── LEFT: canvas ── */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Canvas header */}
        <div style={{ height: 56, padding: "0 20px 0 24px", display: "flex", alignItems: "center", gap: 16, flexShrink: 0, borderBottom: "1px solid rgba(242,235,221,.08)", background: "rgba(26,23,20,.97)" }}>

          {/* Left — logo */}
          <div onClick={() => setStage("home")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{ fontFamily: "var(--fd)", fontSize: 20, fontWeight: 600, color: "var(--paper)", letterSpacing: "-0.01em" }}>Nirmit</span>
            <span
              title={backendUp ? "Backend connected" : "Backend offline — start the server on port 8000"}
              style={{ width: 7, height: 7, borderRadius: "50%", background: backendUp ? "var(--leaf)" : "#c25a3a", flexShrink: 0 }}
            />
          </div>

          {/* Centre — room name + dims, flex-1 so it fills remaining space and centres naturally */}
          <div style={{ flex: 1, display: "flex", alignItems: "baseline", justifyContent: "center", gap: 10, minWidth: 0, overflow: "hidden" }}>
            <span style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 17, fontWeight: 500, color: "var(--paper)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{baseVision.name}</span>
            <span style={{ fontFamily: "var(--fm)", fontSize: 10, color: "rgba(242,235,221,.35)", letterSpacing: "0.04em", flexShrink: 0 }}>{wFt}′-0″ × {dFt}′-0″</span>
          </div>

          {/* Right — 2D/3D toggle + controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexShrink: 0 }}>
            {/* Prominent segmented view toggle */}
            <div
              role="tablist"
              aria-label="View mode"
              style={{
                display: "flex",
                background: "rgba(242,235,221,.04)",
                border: "1px solid rgba(242,235,221,.18)",
                borderRadius: 4,
                padding: 3,
                gap: 2,
                position: "relative",
              }}
            >
              {(["2d", "3d"] as ViewMode[]).map((m) => {
                const sel = viewMode === m;
                return (
                  <button
                    key={m}
                    role="tab"
                    aria-selected={sel}
                    onClick={() => setViewMode(m)}
                    style={{
                      padding: "8px 22px",
                      background: sel ? "var(--terra)" : "transparent",
                      border: "none",
                      borderRadius: 3,
                      color: sel ? "var(--paper)" : "rgba(242,235,221,.55)",
                      fontFamily: "var(--fm)",
                      fontSize: 11.5,
                      fontWeight: sel ? 600 : 500,
                      letterSpacing: "0.14em",
                      cursor: "pointer",
                      transition: "background .18s ease, color .18s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                    }}
                  >
                    <span aria-hidden style={{ fontSize: 13, lineHeight: 1, opacity: sel ? 1 : 0.55 }}>
                      {m === "2d" ? "▦" : "◰"}
                    </span>
                    {m.toUpperCase()}
                  </button>
                );
              })}
            </div>
            {/* Undo button — shows when history available */}
            {roomHistory.length > 0 && (
              <button
                onClick={undo}
                title="Undo last change (Ctrl/Cmd+Z)"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--fm)",
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  color: "rgba(242,235,221,.5)",
                  padding: "2px 0",
                  transition: "color .2s",
                }}
              >
                ↩ Undo
              </button>
            )}
            {/* Annotative edit toggle */}
            <button
              onClick={() => { setLayoutEditMode(!layoutEditMode); if (layoutEditMode) { setSelectedId(null); setShowCatalogue(false); } }}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--fb)",
                fontSize: 11.5,
                letterSpacing: "0.06em",
                color: layoutEditMode ? "var(--leaf)" : "rgba(242,235,221,.55)",
                borderBottom: `1px solid ${layoutEditMode ? "var(--leaf)" : "rgba(242,235,221,.2)"}`,
                padding: "2px 0",
                transition: "color .2s, border-color .2s",
              }}
            >
              {layoutEditMode ? "✓ Done" : "Edit"}
            </button>
            {layoutEditMode && (
              <button
                onClick={() => setShowCatalogue(v => !v)}
                style={{
                  background: showCatalogue ? "rgba(242,235,221,.1)" : "transparent",
                  border: "1px solid rgba(242,235,221,.2)",
                  cursor: "pointer",
                  fontFamily: "var(--fm)",
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  color: showCatalogue ? "var(--paper)" : "rgba(242,235,221,.45)",
                  padding: "4px 10px",
                  transition: "all .15s",
                }}
              >
                + Furniture
              </button>
            )}
            <button
              onClick={() => setShowRoomEdit(v => !v)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--fm)",
                fontSize: 10,
                letterSpacing: "0.08em",
                color: "rgba(242,235,221,.35)",
                padding: "2px 0",
              }}
              title="Adjust room dimensions"
            >
              ⊡ Size
            </button>
          </div>
        </div>

        {/* Canvas area */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex" }}>
          {/* Main canvas */}
          <div className="canvas-viewport-container" style={{ flex: 1, height: "100%", position: "relative" }}>
            <div className="canvas-corner-mark mark-tl">+</div>
            <div className="canvas-corner-mark mark-tr">+</div>
          {viewMode === "3d" ? (
            <RoomScene
              room={room}
              selectedItemId={selectedId}
              onSelectItem={setSelectedId}
              onMoveItem={layoutEditMode ? moveItem : undefined}
              moveMode={moveMode}
              view={camView}
              warmthK={room.lighting_kelvin}
              showAtmosphere
            />
          ) : (
            <Planner2D
              room={room}
              selectedItemId={selectedId}
              onSelectItem={setSelectedId}
              onMoveItem={layoutEditMode ? moveItem : undefined}
              onRotateItem={layoutEditMode ? rotateItem : undefined}
            />
          )}

          {/* Camera presets (3D) */}
          {viewMode === "3d" && (
            <div className="floating-draft-panel" style={{ bottom: "var(--s-5)", left: "50%", transform: "translateX(-50%)", display: "flex", gap: 16 }}>
              {(["eye", "corner", "top", "walk"] as const).map((v) => (
                <button key={v} className="tool-action-lnk" onClick={() => setCamView(v)} style={{ color: camView === v ? "var(--leaf)" : "var(--ink-2)", borderBottomColor: camView === v ? "var(--leaf)" : "transparent", padding: 0 }}>
                  {{ eye: "Entrance", corner: "3/4 View", top: "Plan", walk: "Walk" }[v]}
                </button>
              ))}
            </div>
          )}

          {/* Room size edit overlay */}
          {showRoomEdit && (
            <div className="floating-draft-panel" style={{ top: "var(--s-4)", right: "var(--s-4)", display: "flex", flexDirection: "column", gap: 12, minWidth: 200 }}>
              <span style={{ fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.14em", color: "var(--ink-3)" }}>ROOM DIMENSIONS</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(["Width", "Depth"] as const).map((axis) => {
                  const val = axis === "Width" ? roomW : roomD;
                  const setter = axis === "Width" ? setRoomW : setRoomD;
                  const ft = (val / 304.8).toFixed(1);
                  return (
                    <div key={axis}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontFamily: "var(--fb)", fontSize: 12, color: "var(--ink-2)" }}>{axis}</span>
                        <span style={{ fontFamily: "var(--fm)", fontSize: 10, color: "var(--ink-3)" }}>{ft}′</span>
                      </div>
                      <input type="range" min={2400} max={7200} step={100} value={val}
                        onChange={(e) => setter(parseInt(e.target.value))}
                        style={{ width: "100%" }}
                      />
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => {
                  if (!room) return;
                  const updated = { ...room, intake: { ...room.intake, room_dimensions: { width_mm: roomW, depth_mm: roomD, height_mm: room.intake.room_dimensions.height_mm } } };
                  setRoom(updated);
                  setShowRoomEdit(false);
                }}
                className="btn-primary"
                style={{ fontSize: 11, padding: "6px 14px" }}
              >Apply</button>
            </div>
          )}

          {/* Selected-item controls — visible whenever an item is selected */}
          {selected && (
            <div className="floating-draft-panel" style={{ top: "var(--s-4)", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 8, maxWidth: "calc(100% - 48px)", flexWrap: "wrap" as const, ...(moveMode ? { outline: "1px solid var(--leaf)", outlineOffset: 2 } : {}) }}>
              <div style={{ display: "flex", flexDirection: "column", marginRight: 6 }}>
                <span style={{ fontFamily: "var(--fd)", fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{selected.name_en}</span>
                <span style={{ fontFamily: "var(--fm)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.06em" }}>
                  {moveMode ? (viewMode === "3d" ? "Drag in the room — orbit is paused" : "Drag in the plan") : `${selected.dimensions.width_mm}×${selected.dimensions.depth_mm} mm · ₹${Math.round(selected.price_inr / 1000)}k`}
                </span>
              </div>
              {/* Move/drag controls — only meaningful in edit mode */}
              {viewMode === "3d" && layoutEditMode && (
                moveMode
                  ? <CBtn onClick={() => setEditMode("browse")} accent>✓ Done</CBtn>
                  : <CBtn onClick={() => setEditMode("move")} bold>↕ Move</CBtn>
              )}
              {layoutEditMode && <CBtn onClick={() => rotateItem(selected.id)}>↻ Rotate</CBtn>}
              {layoutEditMode && <CBtn onClick={() => itemIntent("duplicate", "Duplicate")}>⧉ Dup</CBtn>}
              {/* Intent actions — always available */}
              <CBtn onClick={() => itemIntent("make_bigger", "Make bigger")}>＋</CBtn>
              <CBtn onClick={() => itemIntent("make_smaller", "Make smaller")}>－</CBtn>
              <CBtn onClick={() => itemIntent("change_style", "Style")}>⇄ Style</CBtn>
              <CBtn onClick={() => itemIntent("remove", "Remove")} danger>✕</CBtn>
              <button onClick={() => setSelectedId(null)} style={{ background: "transparent", border: "none", fontSize: 20, lineHeight: 1, color: "var(--ink-3)", cursor: "pointer", marginLeft: 2 }} aria-label="Deselect">×</button>
            </div>
          )}
          </div>

          {/* Furniture catalogue drawer — slides in from right */}
          {showCatalogue && (
            <CatalogueDrawer
              roomType={room.intake.room_type}
              vibe={room.intake.vibe}
              onAdd={(sku, sub_category) => {
                void applyOneIntent({ kind: "add", target_item_id: null, parameters: { sku, sub_category } });
              }}
              onClose={() => setShowCatalogue(false)}
            />
          )}
        </div>

        {/* Canvas footer */}
        <div style={{ height: 56, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, borderTop: "1px solid rgba(242,235,221,.08)", background: "rgba(26,23,20,.97)", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: "var(--fm)", fontSize: 9.5, color: "rgba(242,235,221,.28)", letterSpacing: "0.12em" }}>ESTIMATE</span>
            <span style={{ fontFamily: "var(--fd)", fontSize: 20, fontWeight: 500, color: "var(--terra)" }}>{budgetHeadline.split(" ")[0]}</span>
          </div>
          <button
            className="btn-primary-dark"
            onClick={() => setStage("style")}
            style={{ padding: "10px 24px", fontSize: 11 }}
          >
            Materials & finish →
          </button>
        </div>
      </div>

      {/* ── RIGHT: AI chat (light paper panel) ── */}
      <div style={{ display: "flex", flexDirection: "column", borderLeft: "1px solid var(--line)", background: "var(--paper)", overflow: "hidden" }}>

        {/* Chat header */}
        <div style={{ padding: "16px 24px 16px", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
          <span className="eyebrow">Collaborator</span>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 10 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--terra)", animation: "pulse 2s ease infinite", flexShrink: 0 }} />
            <span style={{ fontFamily: "var(--fb)", fontSize: 13, fontWeight: 500, color: "var(--terra)", lineHeight: 1.4 }}>
              {budgetHeadline || "Calculating…"}
            </span>
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

        {/* Advisory panel */}
        <AdvisoryPanel
          open={advisory}
          onToggle={() => setAdvisory((v) => !v)}
          vastuNotes={room.intake.vastu_matters ? baseVision.reasoning.vastu_notes : []}
          items={room.items}
          roomDepth={room.intake.room_dimensions.depth_mm}
        />

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

function AdvisoryPanel({ open, onToggle, vastuNotes, items, roomDepth }: {
  open: boolean;
  onToggle: () => void;
  vastuNotes: string[];
  items: import("@/api/types").PlacedItem[];
  roomDepth: number;
}) {
  const entryZone = roomDepth - 900;
  const entryBlocked = items.some((i) => i.position.z_mm >= entryZone && i.dimensions.width_mm * i.dimensions.depth_mm > 600 * 600);
  const tooClose = items.some((a) =>
    items.some((b) => {
      if (a.id === b.id) return false;
      const dx = Math.abs(a.position.x_mm - b.position.x_mm) - (a.dimensions.width_mm + b.dimensions.width_mm) / 2;
      const dz = Math.abs(a.position.z_mm - b.position.z_mm) - (a.dimensions.depth_mm + b.dimensions.depth_mm) / 2;
      return Math.max(dx, dz) < 200;
    })
  );

  const notes = [
    ...vastuNotes,
    entryBlocked ? "Entry zone may be obstructed — consider moving items away from the entrance wall." : null,
    tooClose     ? "Some items are less than 200mm apart — walkways may feel tight." : null,
  ].filter(Boolean) as string[];

  if (notes.length === 0) return null;

  return (
    <div style={{ borderTop: "1px solid var(--line)", flexShrink: 0 }}>
      <button
        onClick={onToggle}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 20px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" as const }}
      >
        <span className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--terra)", display: "inline-block", flexShrink: 0 }} />
          Spatial advisory · {notes.length}
        </span>
        <span style={{ fontFamily: "var(--fm)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ padding: "0 20px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
          {notes.map((n, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ color: "var(--terra)", marginTop: 2, flexShrink: 0, fontSize: 10 }}>·</span>
              <span style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>{n}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CBtn({ children, onClick, danger, accent, bold }: { children: React.ReactNode; onClick: () => void; danger?: boolean; accent?: boolean; bold?: boolean }) {
  return (
    <button
      className="tool-action-lnk"
      onClick={onClick}
      style={{ color: danger ? "var(--terra)" : accent ? "var(--leaf)" : undefined, fontWeight: bold ? 600 : 400, marginLeft: "var(--s-2)", whiteSpace: "nowrap" as const }}
    >
      {children}
    </button>
  );
}

/* ── Furniture Catalogue Drawer ── */

interface CatalogItem {
  sku: string;
  name_en: string;
  sub_category: string;
  category: string;
  price_inr: number;
  dimensions: { width_mm: number; depth_mm: number; height_mm: number };
}

function CatalogueDrawer({
  roomType,
  vibe,
  onAdd,
  onClose,
}: {
  roomType: string;
  vibe: string;
  onAdd: (sku: string, sub_category: string) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ room_type: roomType, limit: "60" });
    if (vibe) params.set("vibe", vibe);
    fetch(`/api/catalog?${params}`)
      .then((r) => r.json())
      .then((data) => setItems(data.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [roomType, vibe]);

  return (
    <div className="pane-animated-entrance" style={{
      width: 220,
      height: "100%",
      background: "var(--paper)",
      borderLeft: "1px solid var(--line)",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      overflow: "hidden",
    }}>
      <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.14em", color: "var(--ink-3)" }}>FURNITURE CATALOGUE</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", fontSize: 16, lineHeight: 1 }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {loading ? (
          <div style={{ padding: "24px 16px", fontFamily: "var(--fm)", fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.08em" }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: "24px 16px", fontFamily: "var(--fm)", fontSize: 11, color: "var(--ink-3)" }}>No items found.</div>
        ) : items.map((item) => (
          <div key={item.sku} style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontFamily: "var(--fd)", fontSize: 13, fontWeight: 500, color: "var(--ink)", lineHeight: 1.3 }}>{item.name_en}</span>
            <span style={{ fontFamily: "var(--fm)", fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.06em" }}>
              {item.dimensions.width_mm}×{item.dimensions.depth_mm} mm
            </span>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontFamily: "var(--fd)", fontSize: 13, color: "var(--ink-2)" }}>₹{Math.round(item.price_inr / 1000)}k</span>
              <button
                onClick={() => {
                  setAdding(item.sku);
                  onAdd(item.sku, item.sub_category);
                  setTimeout(() => setAdding(null), 1200);
                }}
                disabled={adding === item.sku}
                style={{
                  background: adding === item.sku ? "var(--leaf)" : "var(--terra)",
                  border: "none",
                  color: "var(--paper)",
                  fontFamily: "var(--fm)",
                  fontSize: 9,
                  letterSpacing: "0.1em",
                  padding: "4px 10px",
                  cursor: adding === item.sku ? "default" : "pointer",
                  transition: "background .3s",
                }}
              >
                {adding === item.sku ? "ADDED" : "+ ADD"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
