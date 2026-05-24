/**
 * Per-asset render tuning.
 *
 * GlbItem's fit useMemo now grounds every mesh by computing:
 *   floorOffset = -native.min.y * scaleY
 * so the lowest vertex always lands exactly at y=0 without any yNudge help.
 *
 * `scaleMul` — multiply the auto-fit scale (1.0 = use corrected catalog dims).
 * `yNudge`   — metres added ON TOP of the floor anchor. Use only when the item
 *              genuinely needs to be elevated above the floor:
 *                • ceiling-hung items (fan, pendant light)
 *                • wall-mounted items (mirror, sconce, pooja_wall, overhead cabinet)
 *              For all other items leave yNudge at the default (0).
 */
export interface AssetTuning {
  scaleMul: number;
  yNudge: number;
  /** Degrees (multiples of 90) to rotate the mesh about Y inside the scaled group.
   *  Use when an SH3D GLB's "front" doesn't face +Z (backend convention).
   *  Inspect with a top-down render, then hand-tag in OVERRIDES below. */
  yawDeg: number;
}

const DEFAULT: AssetTuning = { scaleMul: 1, yNudge: 0, yawDeg: 0 };

const OVERRIDES: Record<string, Partial<AssetTuning>> = {
  // ── Wall-mounted items ────────────────────────────────────────────────────
  // placement_type="wall" drives groupY = yNudge (absolute mount height in m,
  // measured to the mesh's BOTTOM). Without an override these items render at
  // y=0 and look like a vertical board lying on the floor — the "blocks when
  // I add wall art" symptom.

  // Mirrors — centre at eye level (~1.4 m); 900 mm tall mirror → bottom 0.95.
  "3df/3df_mirror.glb":                       { yNudge: 0.95 },
  "sh3d/contributions_ovalmirror.glb":        { yNudge: 0.95 },
  "sh3d/contributions_rectangularmirror.glb": { yNudge: 1.00 },
  "sh3d/contributions_mirror.glb":            { yNudge: 1.05 },
  "sh3d/lucapresidente_mobilettospecchioblu.glb": { yNudge: 0.30 }, // mirror sits on a cabinet

  // Wall art — bottom 1.05 m so 900 mm-tall art reads at eye-line (~1.5 m).
  "sh3d/scopia_frame1.glb":                                  { yNudge: 1.05 },
  "sh3d/scopia_frame2.glb":                                  { yNudge: 1.05 },
  "sh3d/contributions_frame3verticalsummerphotos.glb":       { yNudge: 1.05 },

  // Floating shelves — at chest height; ~1.2 m clears a sofa.
  "sh3d/lucapresidente_mensolacurvaacero.glb":  { yNudge: 1.25 },
  "sh3d/lucapresidente_mensolaacero.glb":       { yNudge: 1.25 },
  "sh3d/lucapresidente_mensolaciliegio.glb":    { yNudge: 1.25 },
  "sh3d/blendswap_cc_0_shelves.glb":            { yNudge: 1.10 },

  // ── SH3D yaw overrides ────────────────────────────────────────────────────
  // The fit math now centres the mesh BEFORE rotation, so yawDeg is a no-cost
  // correction for meshes whose native "front" doesn't face +z (the backend
  // resolver's rotation_deg=0 convention). Visually QA each room and add an
  // override here when an item shows its back/side to the camera.
  //
  // Convention: yawDeg rotates the mesh CCW (viewed from above). If the mesh's
  // native front is +x, set yawDeg = -90 (or 270). If native front is -z, set
  // 180. If native front is -x, set 90.
};

export function assetTuning(assetUrl: string): AssetTuning {
  return { ...DEFAULT, ...(OVERRIDES[assetUrl] ?? {}) };
}
