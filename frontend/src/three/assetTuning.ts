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
}

const DEFAULT: AssetTuning = { scaleMul: 1, yNudge: 0 };

const OVERRIDES: Record<string, Partial<AssetTuning>> = {
  // ── Ceiling-hung items ────────────────────────────────────────────────────
  // placement_type="ceiling" drives groupY = roomHeight - itemHeight.
  // yNudge=0 here; the group position handles all elevation.
  "fan.glb":               { yNudge: 0 },
  "lampSquareCeiling.glb": { yNudge: 0 },

  // ── Wall-mounted items ────────────────────────────────────────────────────
  // placement_type="wall" drives groupY = yNudge (absolute mount height in m).
  // mirror centre at eye level ~1.4 m; mirror h = 435 mm → bottom at ~1.18 m
  "mirror.glb":            { yNudge: 1.18 },
  // wall mandir bottom at ~0.9 m
  "pooja_wall.glb":        { yNudge: 0.90 },
  // wall sconce centre at ~1.6 m; lamp h = 160 mm → bottom at ~1.52 m
  "lampWall.glb":          { yNudge: 1.52 },
  // bathroom mirror bottom at ~1.2 m
  "bathroomMirror.glb":    { yNudge: 1.20 },
  // kitchen overhead cabinet bottom at countertop height ~900 mm + gap ~50 mm
  "overhead_cabinet.glb":  { yNudge: 0.95 },

  // ── Rugs: tiny lift to prevent z-fighting with the floor plane ─────────
  "rug.glb":               { yNudge: 0.004 },
  "rugRectangle.glb":      { yNudge: 0.004 },
  "rugRound.glb":          { yNudge: 0.004 },
  "rugRounded.glb":        { yNudge: 0.004 },
  "rugSquare.glb":         { yNudge: 0.004 },
  "rugDoormat.glb":        { yNudge: 0.004 },
};

export function assetTuning(assetUrl: string): AssetTuning {
  return { ...DEFAULT, ...(OVERRIDES[assetUrl] ?? {}) };
}
