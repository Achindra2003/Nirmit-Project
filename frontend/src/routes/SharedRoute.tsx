/**
 * SharedRoute — the collaborative view of a single room, opened via a share
 * link (`/?share=<token>`). Anyone with the link can view AND edit; edits write
 * back to Supabase and a Realtime subscription pushes other people's edits in
 * live (last-write-wins — collaborators take turns; nobody's mid-drag merge).
 *
 * Deliberately self-contained: it holds ONE room_state in local state (not the
 * 3-vision app store), so it can stand alone outside the intake→export flow.
 */
import { useEffect, useRef, useState } from "react";
import { api } from "@/api/client";
import type { CostBreakdown, Intent, RoomState } from "@/api/types";
import { RoomScene } from "@/three/RoomScene";
import { Planner2D } from "@/components/Planner2D";

export function SharedRoute({ token }: { token: string }) {
  const [room, setRoom]     = useState<RoomState | null>(null);
  const [cost, setCost]     = useState<CostBreakdown | null>(null);
  const [name, setName]     = useState("Shared room");
  const [view, setView]     = useState<"3d" | "2d">("3d");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const [draft, setDraft]   = useState("");
  const [sending, setSending] = useState(false);
  const [chat, setChat]     = useState<{ role: "you" | "ai"; text: string }[]>([]);
  const [synced, setSynced] = useState<"live" | "off">("off");

  // Mirror of the current room so the Realtime handler can tell a genuine
  // remote edit from the echo of our own write (which we ignore).
  const roomRef = useRef<RoomState | null>(null);
  roomRef.current = room;

  // Load + subscribe.
  useEffect(() => {
    let unsub = () => {};
    api.getSharedDesign(token)
      .then((d) => {
        setRoom(d.room_state);
        setName(d.name);
        api.cost({ room_state: d.room_state }).then(setCost).catch(() => {});
        // Subscribe by the design's PRIMARY KEY (the reliable filter column).
        unsub = api.subscribeSharedDesign(
          d.id,
          (incoming) => {
            // Ignore the echo of our own write; apply genuine remote edits.
            if (JSON.stringify(incoming) !== JSON.stringify(roomRef.current)) {
              setRoom(incoming);
              setSelectedId(null);
              api.cost({ room_state: incoming }).then(setCost).catch(() => {});
            }
          },
          (status) => {
            // eslint-disable-next-line no-console
            console.log("[share] realtime status:", status);
            setSynced(status === "SUBSCRIBED" ? "live" : "off");
          },
        );
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    return () => unsub();
  }, [token]);

  /** Single write-path: update local, recompute cost, push to everyone. */
  function commit(next: RoomState) {
    setRoom(next);
    roomRef.current = next;
    api.cost({ room_state: next }).then(setCost).catch(() => {});
    void api.updateSharedDesign(token, next).catch((e) =>
      setError(e instanceof Error ? e.message : String(e)),
    );
  }

  async function applyIntent(intent: Intent) {
    if (!room) return;
    try {
      const res = await api.apply({ room_state: room, intents: [intent] });
      commit(res.room_state);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function send() {
    if (!draft.trim() || sending || !room) return;
    const msg = draft.trim();
    setChat((c) => [...c, { role: "you", text: msg }]);
    setDraft("");
    setSending(true);
    try {
      const res = await api.chat({ room_state: room, history: [], message: msg });
      setChat((c) => [...c, { role: "ai", text: res.reply }]);
      if (res.proposed_room_state) commit(res.proposed_room_state);
    } catch {
      setChat((c) => [...c, { role: "ai", text: "I lost the connection for a second — try again." }]);
    } finally {
      setSending(false);
    }
  }

  if (error && !room) {
    return (
      <div className="paper" style={{ height: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <span className="eyebrow" style={{ color: "var(--terra-dk)" }}>Couldn't open this room</span>
          <p style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 16, color: "var(--ink-2)", marginTop: 12 }}>{error}</p>
        </div>
      </div>
    );
  }
  if (!room) {
    return (
      <div className="paper" style={{ height: "100vh", display: "grid", placeItems: "center" }}>
        <p style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 18, color: "var(--ink-3)" }}>Opening the shared room…</p>
      </div>
    );
  }

  const selected = room.items.find((i) => i.id === selectedId) ?? null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", width: "100%", height: "100vh", background: "var(--basalt)" }}>
      {/* Canvas */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ height: 56, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, borderBottom: "1px solid rgba(242,235,221,.08)", background: "rgba(26,23,20,.97)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: "var(--fd)", fontSize: 18, fontWeight: 600, color: "var(--paper)" }}>{name}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--fm)", fontSize: 10, letterSpacing: "0.1em", color: synced === "live" ? "var(--leaf)" : "rgba(242,235,221,.4)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: synced === "live" ? "var(--leaf)" : "rgba(242,235,221,.3)", animation: synced === "live" ? "pulse 2s ease infinite" : "none" }} />
              {synced === "live" ? "SHARED · LIVE" : "SHARED"}
            </span>
          </div>
          <div role="tablist" style={{ display: "flex", background: "rgba(242,235,221,.04)", border: "1px solid rgba(242,235,221,.18)", borderRadius: 4, padding: 3, gap: 2 }}>
            {(["2d", "3d"] as const).map((m) => (
              <button key={m} onClick={() => setView(m)} style={{ padding: "6px 18px", background: view === m ? "var(--terra)" : "transparent", border: "none", borderRadius: 3, color: view === m ? "var(--paper)" : "rgba(242,235,221,.55)", fontFamily: "var(--fm)", fontSize: 11, letterSpacing: "0.12em", cursor: "pointer" }}>{m.toUpperCase()}</button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {view === "3d" ? (
            <RoomScene room={room} selectedItemId={selectedId} onSelectItem={setSelectedId} moveMode={false} view="corner" warmthK={room.lighting_kelvin} showAtmosphere />
          ) : (
            <Planner2D room={room} selectedItemId={selectedId} onSelectItem={setSelectedId} />
          )}
          {selected && (
            <div className="floating-draft-panel" style={{ top: "var(--s-4)", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "var(--fd)", fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{selected.name_en}</span>
              <button onClick={() => { void applyIntent({ kind: "remove", target_item_id: selected.id, parameters: {} }); setSelectedId(null); }} className="tool-action-lnk" style={{ color: "var(--terra)" }}>✕ Remove</button>
              <button onClick={() => setSelectedId(null)} style={{ background: "transparent", border: "none", fontSize: 18, color: "var(--ink-3)", cursor: "pointer" }}>×</button>
            </div>
          )}
        </div>

        <div style={{ height: 48, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, borderTop: "1px solid rgba(242,235,221,.08)", background: "rgba(26,23,20,.97)" }}>
          <span style={{ fontFamily: "var(--fm)", fontSize: 10, color: "rgba(242,235,221,.4)", letterSpacing: "0.1em" }}>Anyone with the link can edit · changes save for everyone</span>
          {cost && (
            <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span className="eyebrow" style={{ color: "rgba(242,235,221,.3)" }}>All-in</span>
              <span style={{ fontFamily: "var(--fd)", fontSize: 20, fontWeight: 600, color: "var(--terra)" }}>₹{Math.round((cost.story.total_inr || 0) / 1000)}k</span>
            </span>
          )}
        </div>
      </div>

      {/* Collaborator panel */}
      <div style={{ display: "flex", flexDirection: "column", borderLeft: "1px solid var(--line)", background: "var(--paper)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
          <span className="eyebrow">Collaborator</span>
          <p style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 13, color: "var(--ink-2)", marginTop: 8 }}>Ask for a change, or tap a piece to remove it. Everyone on this link sees it.</p>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          {chat.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === "you" ? "flex-end" : "flex-start", maxWidth: "85%", background: m.role === "you" ? "var(--terra)" : "var(--paper-3)", color: m.role === "you" ? "var(--paper)" : "var(--ink)", border: m.role === "you" ? "none" : "1px solid var(--line)", padding: "10px 14px", borderRadius: m.role === "you" ? "14px 4px 14px 14px" : "4px 14px 14px 14px", fontFamily: "var(--fd)", fontSize: 14, fontStyle: m.role === "you" ? "italic" : "normal", lineHeight: 1.5 }}>{m.text}</div>
          ))}
          {sending && <div style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 13, color: "var(--ink-3)" }}>thinking…</div>}
        </div>
        <div style={{ padding: "12px 18px 18px", display: "flex", gap: 8, flexShrink: 0, borderTop: "1px solid var(--line)" }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void send(); }} placeholder="Ask for a change…" style={{ flex: 1, border: "none", borderBottom: "1px solid var(--ink)", background: "transparent", padding: "8px 0", fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 15, outline: "none", color: "var(--ink)" }} />
          <button onClick={() => void send()} disabled={sending || !draft.trim()} style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 15, color: sending || !draft.trim() ? "var(--ink-3)" : "var(--terra)" }}>→ Send</button>
        </div>
      </div>
    </div>
  );
}
