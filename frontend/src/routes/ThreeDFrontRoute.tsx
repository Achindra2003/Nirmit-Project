/**
 * Dev-only route: renders a single raw 3D-FRONT room.
 *
 * Reached via `?dev=3dfront` in the URL — App.tsx short-circuits to this
 * before the normal stage routing. Not part of the user-facing flow.
 *
 * LICENSE: 3D-FRONT (huanngzh/3D-Front) is cc-by-nc-4.0 — prototyping only.
 */
import { ThreeDFrontRoom } from "@/three/ThreeDFrontRoom";

const SAMPLE_ROOM_URL = "/3d-front/sample";

export function ThreeDFrontRoute() {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", background: "#0e0d0b" }}>
      <header
        style={{
          padding: "10px 18px",
          color: "#d4c5ad",
          fontFamily: "ui-sans-serif, system-ui",
          fontSize: 13,
          letterSpacing: 0.4,
          borderBottom: "1px solid #2a2520",
          display: "flex",
          gap: 16,
          alignItems: "baseline",
        }}
      >
        <strong style={{ color: "#e8d9bb" }}>3D-FRONT viewer (dev)</strong>
        <span style={{ opacity: 0.7 }}>LivingRoom-2549477 · 10 GLBs · cc-by-nc-4.0 — prototype only</span>
        <span style={{ marginLeft: "auto", opacity: 0.5 }}>drag to orbit · scroll to zoom</span>
      </header>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ThreeDFrontRoom roomUrl={SAMPLE_ROOM_URL} />
      </div>
    </div>
  );
}
