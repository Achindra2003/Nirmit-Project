/**
 * LiveSync — one-way live collaboration into the main app.
 *
 * When the current session is bound to a saved design (`activeDesignId`, set on
 * save / share / open-from-archive), this subscribes to that Supabase row and
 * patches the active vision whenever a COLLABORATOR edits it through the share
 * link. Because the planner, materials, and export all read the active vision,
 * all three update — and re-cost — in real time.
 *
 * Deliberately ONE-WAY: the owner's own planner edits stay in memory (they only
 * persist on an explicit Save), so this never writes back here — no echo storms,
 * no merge conflicts. The only events we receive are a collaborator's link edits
 * (applied) and the echo of our own Save (skipped via the room_state compare).
 *
 * Renders nothing; it's a mounted effect.
 */
import { useEffect } from "react";
import { api } from "@/api/client";
import { useAppStore } from "@/store/useAppStore";

export function LiveSync() {
  const activeDesignId = useAppStore((s) => s.activeDesignId);
  const patchActiveVision = useAppStore((s) => s.patchActiveVision);

  useEffect(() => {
    if (!activeDesignId) return;

    const unsub = api.subscribeSharedDesign(
      activeDesignId,
      (incoming) => {
        // Read fresh state at event time (not effect-capture time) so the echo
        // guard compares against the room as it stands right now.
        const { visions, selectedVisionId } = useAppStore.getState();
        const active = visions.find((v) => v.id === selectedVisionId);
        // Skip the echo of our own write — only a genuine remote edit differs.
        if (active && JSON.stringify(active.room_state) === JSON.stringify(incoming)) return;

        // Patch the room immediately for an instant visual update, then refresh
        // the cost (line items + budget story) once the recompute returns.
        patchActiveVision({ room_state: incoming });
        api
          .cost({ room_state: incoming })
          .then((cost) => patchActiveVision({ cost }))
          .catch(() => {});
      },
      (status) => {
        // eslint-disable-next-line no-console
        console.log("[livesync] realtime status:", status);
      },
    );
    return unsub;
  }, [activeDesignId, patchActiveVision]);

  return null;
}
