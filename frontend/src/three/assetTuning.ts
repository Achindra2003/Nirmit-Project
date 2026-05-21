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
  // ── 3D-FRONT wall-mounted items ───────────────────────────────────────────
  // placement_type="wall" drives groupY = yNudge (absolute mount height in m).
  // Mirror centre at eye level ~1.4 m; mirror h = 900 mm → bottom at ~0.95 m.
  "3df/3df_mirror.glb":    { yNudge: 0.95 },
};

export function assetTuning(assetUrl: string): AssetTuning {
  return { ...DEFAULT, ...(OVERRIDES[assetUrl] ?? {}) };
}
