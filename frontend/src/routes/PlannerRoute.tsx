/**
 * The Planner — Phase 1 shows the same RoomScene with a simple chat strip
 * and an export CTA. Intent-based editing (tap → "Make bigger / Change fabric
 * / Try style / Remove") is built out in Phase 2.
 */
import { useState } from "react";
import { api } from "@/api/client";
import { RoomScene } from "@/three/RoomScene";
import { useAppStore } from "@/store/useAppStore";

export function PlannerRoute() {
  const { visions, selectedVisionId, setStage } = useAppStore();
  const vision = visions.find((v) => v.id === selectedVisionId) ?? visions[0];
  const [chat, setChat] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  if (!vision) {
    return <div style={{ padding: 32 }}>No room loaded.</div>;
  }

  async function send() {
    if (!draft.trim() || sending) return;
    if (!vision) return;
    const userTurn = { role: "user" as const, content: draft.trim() };
    setChat((c) => [...c, userTurn]);
    setDraft("");
    setSending(true);
    try {
      const res = await api.chat({
        room_state: vision.room_state,
        history: chat,
        message: userTurn.content,
      });
      setChat((c) => [...c, { role: "assistant", content: res.reply }]);
    } catch (e) {
      setChat((c) => [
        ...c,
        { role: "assistant", content: `(error: ${e instanceof Error ? e.message : String(e)})` },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={shell}>
      <div style={sceneWrap}>
        <RoomScene room={vision.room_state} />
      </div>

      <aside style={panel}>
        <h3 style={{ margin: 0 }}>{vision.name}</h3>
        <small style={{ color: "#6b614f" }}>{vision.cost.story.headline}</small>

        <div style={chatLog}>
          {chat.length === 0 && (
            <p style={{ color: "#6b614f", marginTop: 16 }}>
              Tell me what to change — "make the sofa bigger," "warmer feel,"
              "add a study desk by the window."
            </p>
          )}
          {chat.map((m, i) => (
            <div key={i} style={m.role === "user" ? userBubble : aiBubble}>
              {m.content}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask the designer…"
            style={input}
          />
          <button onClick={send} disabled={sending} style={sendBtn}>
            Send
          </button>
        </div>

        <button onClick={() => setStage("export")} style={exportBtn}>
          Generate quotation →
        </button>
      </aside>
    </div>
  );
}

const shell = {
  position: "relative" as const,
  width: "100%",
  height: "100vh",
  background: "#0e0a05",
};
const sceneWrap = { position: "absolute" as const, inset: 0 } as const;
const panel = {
  position: "absolute" as const,
  right: 0,
  top: 0,
  bottom: 0,
  width: 340,
  padding: 20,
  background: "rgba(247, 241, 230, 0.96)",
  display: "flex",
  flexDirection: "column" as const,
  gap: 12,
};
const chatLog = {
  flex: 1,
  overflowY: "auto" as const,
  background: "#fff",
  borderRadius: 12,
  padding: 12,
  display: "flex",
  flexDirection: "column" as const,
  gap: 8,
};
const userBubble = {
  alignSelf: "flex-end" as const,
  background: "#f0e7d3",
  borderRadius: 12,
  padding: "8px 12px",
  maxWidth: "85%",
};
const aiBubble = {
  alignSelf: "flex-start" as const,
  background: "#ede6d8",
  borderRadius: 12,
  padding: "8px 12px",
  maxWidth: "85%",
};
const input = {
  flex: 1,
  padding: "10px 12px",
  border: "1px solid #d8cfba",
  borderRadius: 8,
  font: "inherit",
  background: "#fbf7ee",
};
const sendBtn = {
  background: "var(--warm-ink)",
  color: "#f7f1e6",
  border: "none",
  borderRadius: 8,
  padding: "10px 14px",
};
const exportBtn = {
  background: "transparent",
  color: "var(--warm-ink)",
  border: "1px solid var(--warm-ink)",
  borderRadius: 8,
  padding: "10px 14px",
  fontWeight: 500,
};
