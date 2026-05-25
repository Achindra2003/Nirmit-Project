import { useEffect, useRef, useState } from "react";
import { api } from "@/api/client";
import type { ChatResponse, Intent, IntentKind, RoomState } from "@/api/types";
import { RoomScene, type CameraView } from "@/three/RoomScene";
import { Planner2D } from "@/components/Planner2D";
import { useAppStore } from "@/store/useAppStore";

type ViewMode = "3d" | "2d";

// Room-aware prompt presets. The chat panel picks the bucket for the active
// room so a bedroom doesn't get "add a coffee table" and a study doesn't get
// "more cushions". Falls back to GENERAL when the room_type isn't mapped.
const PROMPTS_BY_ROOM: Record<string, string[]> = {
  living:  ["Make it feel warmer",      "Add a reading nook",       "Bigger sofa, darker fabric", "Move the TV to the other wall", "Add more storage",       "Show me another style"],
  bedroom: ["A softer, calmer feel",    "Add a small dressing area","Swap the wardrobe for something simpler", "Add a bedside lamp",     "More floor space",       "Show me another style"],
  dining:  ["Seat one more person",     "Bring in a buffet",        "Lighter wood, less heavy",   "Add a pendant light",            "More room for the chairs", "Show me another style"],
  study:   ["Make the desk feel bigger","Add a reading chair",      "More shelf space",           "Better lighting for screen work","Swap the chair for something taller", "Show me another style"],
};
const GENERAL_PROMPTS = ["Add more storage", "Make it feel warmer", "Lighter and airier", "Show me another style"];

function suggestionsFor(roomType: string | undefined): string[] {
  if (!roomType) return GENERAL_PROMPTS;
  return PROMPTS_BY_ROOM[roomType] ?? GENERAL_PROMPTS;
}

// Friendly nouns for the catalog sub_categories the AI uses in suggestions.
// Without this the AI cards show raw slugs like "tv_unit" or "lounge_chair".
// Keyed by sub_category from backend/app/domain/catalog/presets/*.py.
const ITEM_LABEL: Record<string, string> = {
  accent_chair:  "an accent chair",
  bed_king:      "a king bed",
  bed_queen:     "a queen bed",
  bench:         "a bench",
  bookshelf:     "a bookshelf",
  cabinet:       "a cabinet",
  chest:         "a chest of drawers",
  coffee_table:  "a coffee table",
  desk:          "a desk",
  desk_chair:    "a desk chair",
  desk_lamp:     "a desk lamp",
  dining_chair:  "a dining chair",
  dining_table:  "a dining table",
  diwan:         "a diwan",
  dressing_table:"a dressing table",
  fireplace:     "a fireplace",
  floating_shelf:"a floating shelf",
  lamp:          "a floor lamp",
  lounge_chair:  "a lounge chair",
  mirror:        "a mirror",
  pendant_light: "a pendant light",
  plant:         "a plant",
  pouffe:        "a pouffe",
  rug:           "a rug",
  side_table:    "a side table",
  sideboard:     "a sideboard",
  sofa:          "a sofa",
  sofa_l:        "an L-sofa",
  tv_unit:       "a TV unit",
  wall_art:      "wall art",
  wardrobe:      "a wardrobe",
};

// Friendly verb-phrase for each intent kind. Keeps the AI cards readable
// instead of the raw "Mix From Vision" / "Change Fabric" title-case.
const INTENT_VERB: Record<string, string> = {
  add:             "Add",
  remove:          "Remove",
  replace:         "Swap",
  change_style:    "Swap style on",
  change_fabric:   "Change fabric of",
  change_finish:   "Change finish of",
  duplicate:       "Duplicate",
  rotate:          "Rotate",
  move:            "Move",
  make_bigger:     "Make bigger:",
  make_smaller:    "Make smaller:",
  recolor_room:    "Recolour the room",
  mix_from_vision: "Borrow from another vision",
  free_text:       "Adjust",
};

// Last-ditch noun from a SKU string. SKUs look like "blendswap_cc_0_couch" or
// "sh3d/foo_bar_chair" — strip path / dataset prefixes and surface the trailing
// noun. Result is always lower-case English, no underscores, no slashes.
function nounFromSku(sku: string): string {
  const tail = sku.split("/").pop() ?? sku;
  const noNoise = tail
    .replace(/\.(glb|gltf|obj|fbx)$/i, "")
    .replace(/^(blendswap|sh3d|threedfront|3dfront|cgaxis|polyhaven|polypizza)_?/i, "")
    .replace(/^(cc|by|nc)_/i, "")
    .replace(/^\d+_/, "");
  const tokens = noNoise.split(/[_\-]+/).filter(Boolean);
  return (tokens[tokens.length - 1] ?? "piece").toLowerCase();
}

function humanLabel(
  intent: import("@/api/types").Intent,
  items: import("@/api/types").PlacedItem[],
  skuName: Map<string, string>,
): string {
  const sub  = typeof intent.parameters.sub_category === "string" ? intent.parameters.sub_category : null;
  const sku  = typeof intent.parameters.sku === "string" ? intent.parameters.sku : null;
  const verb = INTENT_VERB[intent.kind] ?? intent.kind.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  if (intent.kind === "add") {
    // Preference order:
    //   1. Real catalog name_en for the SKU (fetched once per room from /api/catalog).
    //   2. Friendly noun from the sub_category map (covers AI's slug-only intents).
    //   3. Title-cased sub_category as a last-readable fallback.
    //   4. SKU-derived noun (strips file/dataset prefixes — never shows raw SKU).
    const catalogName = sku ? skuName.get(sku) : null;
    if (catalogName) return `Add ${catalogName.toLowerCase().startsWith("a ") || catalogName.toLowerCase().startsWith("an ") ? catalogName : `a ${catalogName}`}`;
    const fromSub = sub ? ITEM_LABEL[sub] : null;
    if (fromSub) return `Add ${fromSub}`;
    if (sub) return `Add a ${sub.replace(/_/g, " ")}`;
    if (sku) return `Add a ${nounFromSku(sku)}`;
    return "Add something";
  }
  if (intent.target_item_id) {
    const target = items.find((i) => i.id === intent.target_item_id);
    if (target?.name_en) return `${verb} ${target.name_en}`;
  }
  return verb;
}

export function PlannerRoute() {
  const visions             = useAppStore((s) => s.visions);
  const selectedVisionId    = useAppStore((s) => s.selectedVisionId);
  const setStage            = useAppStore((s) => s.setStage);
  const patchActiveVision   = useAppStore((s) => s.patchActiveVision);
  const selectedId          = useAppStore((s) => s.selectedItemId);
  const setSelectedId       = useAppStore((s) => s.setSelectedItem);
  const editMode            = useAppStore((s) => s.editMode);
  const setEditMode         = useAppStore((s) => s.setEditMode);
  const layoutEditMode      = useAppStore((s) => s.layoutEditMode);
  const setLayoutEditMode   = useAppStore((s) => s.setLayoutEditMode);

  const baseVision = visions.find((v) => v.id === selectedVisionId) ?? visions[0];

  // Single source of truth for the room is the store's vision. Local React
  // state is just a roomHistory ring for Undo — everything visible on the
  // canvas reads from baseVision.room_state, so StyleRoute / ExportRoute see
  // exactly what the user sees here.
  const room: RoomState | null = baseVision?.room_state ?? null;
  const budgetHeadline = baseVision?.cost.story.headline ?? "";
  const [roomHistory, setRoomHistory] = useState<RoomState[]>([]);
  const [chat, setChat]         = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [draft, setDraft]       = useState("");
  const [sending, setSending]   = useState(false);
  const [pending, setPending]   = useState<ChatResponse | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("2d");
  const [camView, setCamView]   = useState<CameraView>("corner");
  const [advisory, setAdvisory] = useState(false);
  // Prompt-presets panel — collapsed by default so the chat stays focused on
  // the conversation; user can expand when they want a nudge.
  const [showPrompts, setShowPrompts] = useState(false);
  const [backendUp, setBackendUp] = useState(true);
  const [firstLookSuggestions, setFirstLookSuggestions] = useState<Intent[]>([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<number>>(new Set());
  const [showRoomEdit, setShowRoomEdit] = useState(false);
  const [showCatalogue, setShowCatalogue] = useState(false);
  // AI collaborator panel is collapsible to the right edge so the canvas can
  // breathe when the user wants to focus on the room itself.
  const [aiOpen, setAiOpen] = useState(true);
  const [roomW, setRoomW] = useState(baseVision?.room_state.intake.room_dimensions.width_mm ?? 3600);
  const [roomD, setRoomD] = useState(baseVision?.room_state.intake.room_dimensions.depth_mm ?? 4200);
  // sku → human name_en, populated from /api/catalog so the AI's suggested
  // actions can show real catalog names ("Add a Hand-Knotted Rug") instead of
  // dataset-prefixed SKU slugs ("blendswap_cc_0_couch") when the AI omits
  // sub_category.
  const [skuName, setSkuName] = useState<Map<string, string>>(new Map());
  const scrollRef               = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (baseVision) {
      setChat([{
        role: "assistant",
        content: `${baseVision.reasoning.headline} Tap anything to select it — or just tell me what you'd change.`,
      }]);
      setSelectedId(null);
      setRoomHistory([]);
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

  // Build the sku → name_en cache from the same curated menu the catalogue
  // drawer uses. Fires when room_type/vibe/philosophy change. Suggested-action
  // cards rely on this map to avoid showing raw SKU slugs.
  useEffect(() => {
    if (!room) return;
    const params = new URLSearchParams({ room_type: room.intake.room_type, limit: "120" });
    if (room.intake.vibe) params.set("vibe", room.intake.vibe);
    if (baseVision?.philosophy) params.set("philosophy", baseVision.philosophy);
    fetch(`/api/catalog?${params}`)
      .then((r) => r.json())
      .then((data) => {
        const m = new Map<string, string>();
        for (const it of data.items ?? []) {
          if (it.sku && it.name_en) m.set(it.sku, it.name_en);
        }
        setSkuName(m);
      })
      .catch(() => {});
  }, [room?.intake.room_type, room?.intake.vibe, baseVision?.philosophy]); // eslint-disable-line react-hooks/exhaustive-deps

  // First-look proactive suggestions — fire once when a room loads
  useEffect(() => {
    if (!room) return;
    setFirstLookSuggestions([]);
    setDismissedSuggestions(new Set());
    fetch("/api/chat/first-look", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ room_state: room, history: [], message: "__FIRST_LOOK__", available_visions: visions }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.intents?.length > 0) setFirstLookSuggestions(res.intents.slice(0, 3));
      })
      .catch(() => {});
  }, [baseVision?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
      // Single write-path — every edit ends up in the store so cost downstream
      // (StyleRoute, ExportRoute, header chip, footer chip) stays in sync.
      patchActiveVision({ room_state: res.room_state, cost: res.cost });
      if (intent.kind === "remove") setSelectedId(null);
      if (echo) setChat((c) => [...c, { role: "user", content: echo }, { role: "assistant", content: `Done. ${res.cost.story.headline}` }]);
    } catch (e) {
      setChat((c) => [...c, { role: "assistant", content: `I couldn't do that — ${e instanceof Error ? e.message : String(e)}` }]);
    }
  }

  function undo() {
    if (roomHistory.length === 0 || !room) return;
    const prev = roomHistory[roomHistory.length - 1];
    setRoomHistory((h) => h.slice(0, -1));
    // Round-trip undo through /cost so the cost is recomputed for the prior
    // room_state — otherwise the cost shown would lag behind by one step.
    api.cost({ room_state: prev })
      .then((c) => patchActiveVision({ room_state: prev, cost: c }))
      .catch(() => patchActiveVision({ room_state: prev }));
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
    const proposed = pending.proposed_room_state;
    setPending(null);
    // Round-trip /cost so the chat-applied change re-prices the room (avoids
    // a stale headline after the user accepts a proposal).
    api.cost({ room_state: proposed })
      .then((c) => patchActiveVision({ room_state: proposed, cost: c }))
      .catch(() => patchActiveVision({ room_state: proposed }));
  }



  return (
    <div style={{ display: "grid", gridTemplateColumns: aiOpen ? "1fr 380px" : "1fr 44px", width: "100%", height: "100vh", background: "var(--basalt)", transition: "grid-template-columns .28s ease" }}>

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

          {/* Centre — spacer. Room name + dims were moved to the footer
              (next to the estimate) because the Edit / + Furniture / Size
              cluster on the right was hiding them in narrow viewports. */}
          <div style={{ flex: 1, minWidth: 0 }} />

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
            {/* Edit / Furniture / Size — solid pill buttons so they read as
                affordances at a glance. Active state uses --leaf (green) for
                Edit and a filled --terra background for the actions inside
                edit mode. */}
            <button
              onClick={() => { setLayoutEditMode(!layoutEditMode); if (layoutEditMode) { setSelectedId(null); setShowCatalogue(false); } }}
              style={{
                background: layoutEditMode ? "var(--leaf)" : "rgba(242,235,221,.08)",
                border: `1px solid ${layoutEditMode ? "var(--leaf)" : "rgba(242,235,221,.28)"}`,
                cursor: "pointer",
                fontFamily: "var(--fb)",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.08em",
                color: layoutEditMode ? "var(--paper)" : "rgba(242,235,221,.88)",
                padding: "6px 14px",
                borderRadius: 3,
                transition: "all .18s",
                textTransform: "uppercase" as const,
              }}
            >
              {layoutEditMode ? "✓ Done editing" : "✎ Edit"}
            </button>
            {layoutEditMode && (
              <button
                onClick={() => setShowCatalogue(v => !v)}
                style={{
                  background: showCatalogue ? "var(--terra)" : "rgba(184,67,42,.18)",
                  border: `1px solid ${showCatalogue ? "var(--terra)" : "rgba(184,67,42,.42)"}`,
                  cursor: "pointer",
                  fontFamily: "var(--fb)",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  color: showCatalogue ? "var(--paper)" : "rgba(242,235,221,.88)",
                  padding: "6px 14px",
                  borderRadius: 3,
                  transition: "all .18s",
                  textTransform: "uppercase" as const,
                }}
              >
                + Furniture
              </button>
            )}
            <button
              onClick={() => setShowRoomEdit(v => !v)}
              style={{
                background: showRoomEdit ? "rgba(242,235,221,.14)" : "transparent",
                border: "1px solid rgba(242,235,221,.28)",
                cursor: "pointer",
                fontFamily: "var(--fb)",
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: "0.08em",
                color: "rgba(242,235,221,.78)",
                padding: "6px 12px",
                borderRadius: 3,
                transition: "all .18s",
                textTransform: "uppercase" as const,
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
            {/* Edit-mode hint banner removed 2026-05-25 — the active state of
                the Edit button in the header is signal enough; floating the
                instruction over the canvas competed with the room itself. */}
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
                  const updated: RoomState = {
                    ...room,
                    intake: {
                      ...room.intake,
                      room_dimensions: { width_mm: roomW, depth_mm: roomD, height_mm: room.intake.room_dimensions.height_mm },
                    },
                  };
                  // Re-price after dimension change (some line items scale with
                  // floor area). Persist room + cost so all downstream screens
                  // pick up the new size.
                  api.cost({ room_state: updated })
                    .then((c) => patchActiveVision({ room_state: updated, cost: c }))
                    .catch(() => patchActiveVision({ room_state: updated }));
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
              {layoutEditMode && <CBtn onClick={() => itemIntent("duplicate", "Duplicate")}>⧉ Duplicate</CBtn>}
              {/* Intent actions — always available. The legacy +/- size
                  buttons were dropped on 2026-05-25; resizing a single piece
                  rarely matches what the user means by "make this bigger"
                  (which is usually "pick a different SKU"). Style swap covers
                  that path. */}
              <CBtn onClick={() => itemIntent("change_style", "Style")}>⇄ Style</CBtn>
              <CBtn onClick={() => itemIntent("remove", "Remove")} danger>✕ Remove</CBtn>
              <button onClick={() => setSelectedId(null)} style={{ background: "transparent", border: "none", fontSize: 20, lineHeight: 1, color: "var(--ink-3)", cursor: "pointer", marginLeft: 2 }} aria-label="Deselect">×</button>
            </div>
          )}
          </div>

          {/* Furniture catalogue drawer — slides in from right */}
          {showCatalogue && (
            <CatalogueDrawer
              roomType={room.intake.room_type}
              vibe={room.intake.vibe}
              philosophy={baseVision.philosophy}
              onAdd={(sku, sub_category) => {
                void applyOneIntent({ kind: "add", target_item_id: null, parameters: { sku, sub_category } });
              }}
              onClose={() => setShowCatalogue(false)}
            />
          )}
        </div>

        {/* Canvas footer — room identity + live cost + next-stage CTA.
            Reads structured cost.story directly (not a parse of the headline
            string) so the number is always current after a drag, intent, AI
            proposal, or material change. Room name + size moved here from
            the canvas header so the Edit / Furniture / Size button cluster
            never crowds them out. */}
        <div style={{ height: 56, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, borderTop: "1px solid rgba(242,235,221,.08)", background: "rgba(26,23,20,.97)", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 28, minWidth: 0, flex: 1 }}>
            {/* Room identity */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, minWidth: 0 }}>
              <span style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 16, fontWeight: 500, color: "var(--paper)", whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>
                {baseVision.name}
              </span>
              <span style={{ fontFamily: "var(--fm)", fontSize: 11, fontWeight: 500, color: "rgba(242,235,221,.55)", letterSpacing: "0.08em", flexShrink: 0 }}>
                {wFt}′ × {dFt}′
              </span>
            </div>
            {/* Estimate */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, paddingLeft: 24, borderLeft: "1px solid rgba(242,235,221,.10)" }}>
              <span style={{ fontFamily: "var(--fm)", fontSize: 9.5, color: "rgba(242,235,221,.28)", letterSpacing: "0.12em" }}>ESTIMATE</span>
              <span style={{ fontFamily: "var(--fd)", fontSize: 22, fontWeight: 600, color: "var(--terra)" }}>
                ₹{Math.round((baseVision.cost.story.total_inr || 0) / 1000)}k
              </span>
              <span style={{ fontFamily: "var(--fm)", fontSize: 9.5, color: "rgba(242,235,221,.45)", letterSpacing: "0.08em" }}>
                of ₹{Math.round((baseVision.cost.story.budget_inr || 0) / 1000)}k
              </span>
              {baseVision.cost.story.remaining_inr < 0 && (
                <span style={{ fontFamily: "var(--fm)", fontSize: 9.5, color: "#E07A5F", letterSpacing: "0.08em" }}>
                  · ₹{Math.round(Math.abs(baseVision.cost.story.remaining_inr) / 1000)}k OVER
                </span>
              )}
            </div>
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

      {/* ── RIGHT: AI chat (light paper panel) ──
          Collapsible. When closed, the panel becomes a thin rail with a vertical
          handle so the canvas takes the full width. When open, normal 380px chat
          experience. The grid-template-columns transition above animates the
          width change. */}
      {!aiOpen ? (
        <button
          onClick={() => setAiOpen(true)}
          title="Open collaborator"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: 12,
            padding: "16px 0",
            borderLeft: "1px solid var(--line)",
            background: "var(--paper)",
            cursor: "pointer",
            overflow: "hidden",
          }}
        >
          <span style={{ fontFamily: "var(--fm)", fontSize: 14, color: "var(--terra)", lineHeight: 1 }}>‹</span>
          <span style={{
            fontFamily: "var(--fm)",
            fontSize: 9.5,
            letterSpacing: "0.22em",
            color: "var(--ink-3)",
            textTransform: "uppercase" as const,
            writingMode: "vertical-rl" as const,
            transform: "rotate(180deg)",
            marginTop: 10,
          }}>
            Collaborator
          </span>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--terra)", animation: "pulse 2s ease infinite", marginTop: 10 }} />
        </button>
      ) : (
      <div style={{ display: "flex", flexDirection: "column", borderLeft: "1px solid var(--line)", background: "var(--paper)", overflow: "hidden" }}>

        {/* Chat header */}
        <div style={{ padding: "16px 24px 16px", borderBottom: "1px solid var(--line)", flexShrink: 0, display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span className="eyebrow">Collaborator</span>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 10 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--terra)", animation: "pulse 2s ease infinite", flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--fb)", fontSize: 13, fontWeight: 500, color: "var(--terra)", lineHeight: 1.4 }}>
                {budgetHeadline || "Calculating…"}
              </span>
            </div>
          </div>
          <button
            onClick={() => setAiOpen(false)}
            title="Collapse collaborator — give the room more room"
            aria-label="Collapse collaborator panel"
            style={{
              background: "transparent",
              border: "1px solid var(--line)",
              color: "var(--ink-3)",
              cursor: "pointer",
              padding: "4px 8px",
              fontSize: 13,
              lineHeight: 1,
              borderRadius: 2,
              flexShrink: 0,
            }}
          >›</button>
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

        {/* First-look suggestion cards */}
        {firstLookSuggestions.length > 0 && firstLookSuggestions.some((_, i) => !dismissedSuggestions.has(i)) && (
          <div style={{ padding: "8px 20px", borderTop: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
            <span style={{ fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.12em", color: "var(--ink-3)" }}>SUGGESTED IMPROVEMENTS</span>
            {firstLookSuggestions.map((intent, i) => {
              if (dismissedSuggestions.has(i)) return null;
              // humanLabel: catalog-aware label so suggestions read like
              // "Add a bookshelf" instead of "Add bookshelf" or worse the
              // raw SKU "blendswap_cc_0_bookcase". skuName resolves SKUs to
              // their human name_en when the AI omits sub_category.
              const label = humanLabel(intent, room.items, skuName);
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--paper-3)", border: "1px solid var(--line)", borderLeft: "3px solid var(--terra)" }}>
                  <span style={{ flex: 1, fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.4 }}>{label}</span>
                  <button
                    onClick={() => { void applyOneIntent(intent); setDismissedSuggestions((s) => new Set([...s, i])); }}
                    style={{ background: "var(--terra)", border: "none", color: "var(--paper)", fontFamily: "var(--fm)", fontSize: 9, letterSpacing: "0.1em", padding: "4px 10px", cursor: "pointer" }}
                  >APPLY</button>
                  <button
                    onClick={() => setDismissedSuggestions((s) => new Set([...s, i]))}
                    style={{ background: "transparent", border: "1px solid var(--line)", color: "var(--ink-3)", fontFamily: "var(--fm)", fontSize: 9, padding: "4px 8px", cursor: "pointer" }}
                  >SKIP</button>
                </div>
              );
            })}
          </div>
        )}

        {/* Suggestion chips — collapsible, room-aware. Header is always
            visible so the user knows the affordance exists; the chips
            themselves are tucked away until they tap to expand. */}
        <div style={{ flexShrink: 0, borderTop: "1px solid var(--line)" }}>
          <button
            onClick={() => setShowPrompts((v) => !v)}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 20px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" as const }}
          >
            <span className="eyebrow">Try asking · {suggestionsFor(room?.intake.room_type).length}</span>
            <span style={{ fontFamily: "var(--fm)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em" }}>{showPrompts ? "▲" : "▼"}</span>
          </button>
          {showPrompts && (
            <div style={{ padding: "0 20px 10px", display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
              {suggestionsFor(room?.intake.room_type).map((s) => (
                <div
                  key={s}
                  onClick={() => { setDraft(s); setShowPrompts(false); }}
                  style={{ padding: "6px 14px", fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 12.5, border: "1px solid var(--line)", cursor: "pointer", color: "var(--ink-2)", transition: "all .18s ease", whiteSpace: "nowrap" as const, borderRadius: 2 }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--terra)"; e.currentTarget.style.color = "var(--terra-dk)"; e.currentTarget.style.background = "rgba(194,80,46,.04)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--ink-2)"; e.currentTarget.style.background = "transparent"; }}
                >
                  {s}
                </div>
              ))}
            </div>
          )}
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
      )}
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
  philosophy,
  onAdd,
  onClose,
}: {
  roomType: string;
  vibe: string;
  philosophy: string;
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
    // philosophy selects the curated menu for this room character; the backend
    // falls back to the global hero catalog if it's missing.
    if (philosophy) params.set("philosophy", philosophy);
    fetch(`/api/catalog?${params}`)
      .then((r) => r.json())
      .then((data) => setItems(data.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [roomType, vibe, philosophy]);

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
