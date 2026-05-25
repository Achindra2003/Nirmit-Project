/**
 * SceneSnapshot — render a hidden RoomScene off-screen, wait for assets to
 * load, then call `gl.domElement.toDataURL()` and hand the dataURL back via
 * onCapture.
 *
 * Used by ExportRoute so the quotation PDF, contractor PDF and WhatsApp share
 * card can embed a real 3D render of the user's room, not just numbers and
 * tables. The capture happens once per vision; subsequent renders of the
 * export page reuse the cached dataURL.
 *
 * Why off-screen instead of overlapping the visible BOQ:
 *   - The export route already has its own scrolling document preview. A
 *     visible second Canvas would steal layout space and confuse the user.
 *   - WebGL contexts don't pause when their host element scrolls out of view
 *     in fixed positioning — three.js renders to its buffer regardless of CSS
 *     visibility. So a position:fixed; left:-10000px container works.
 *
 * Loading detection uses drei's useProgress so we don't capture before GLB
 * meshes have arrived. A short post-load settle delay (PROGRESS_SETTLE_MS)
 * gives shadows + lighting one extra frame to stabilise before the snapshot.
 */
import { useEffect, useRef } from "react";
import { useProgress } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import type { RoomState } from "@/api/types";
import { RoomScene } from "./RoomScene";

const SNAPSHOT_W = 960;   // 4:3 ratio reads well at thumbnail size in the PDF
const SNAPSHOT_H = 720;
const PROGRESS_SETTLE_MS = 900;  // 1 frame for materials, several for shadows

interface Props {
  room: RoomState;
  onCapture: (dataUrl: string) => void;
}

export function SceneSnapshot({ room, onCapture }: Props) {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        left: -100000,
        top: 0,
        width: SNAPSHOT_W,
        height: SNAPSHOT_H,
        pointerEvents: "none",
      }}
    >
      <RoomScene
        room={room}
        view="corner"
        showAtmosphere
        snapshotProbe={<CaptureProbe onCapture={onCapture} />}
      />
    </div>
  );
}

/** The probe must live inside RoomScene's Canvas tree (useThree is bound to
 *  the Canvas's React context). RoomScene exposes a `snapshotProbe` slot
 *  that we render here as its child. */
function CaptureProbe({ onCapture }: { onCapture: (url: string) => void }) {
  const { gl } = useThree();
  const progress = useProgress();
  const fired = useRef(false);
  const targetRef = useRef(onCapture);
  targetRef.current = onCapture;

  useEffect(() => {
    if (fired.current) return;
    // `active` flips to false once every pending GLB / texture has loaded.
    if (progress.active) return;
    const t = window.setTimeout(() => {
      if (fired.current) return;
      try {
        const url = gl.domElement.toDataURL("image/png");
        fired.current = true;
        targetRef.current(url);
      } catch (e) {
        // WebGL context lost, or canvas tainted by a cross-origin texture.
        // Surface as a warning so the export still works, just without the 3D.
        // eslint-disable-next-line no-console
        console.warn("3D snapshot failed:", e);
      }
    }, PROGRESS_SETTLE_MS);
    return () => window.clearTimeout(t);
  }, [progress.active, gl]);

  return null;
}
