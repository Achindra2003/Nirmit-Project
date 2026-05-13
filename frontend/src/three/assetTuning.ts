/**
 * Per-asset render tuning — the knob for the gnarliest demo-prep task.
 *
 * Every placed item auto-fits its GLB to the declared footprint and grounds
 * the lowest vertex to y=0 (see GlbItem.GlbMesh). For ~80 reused models with
 * wildly different native scales / pivots, "auto" gets you 80% there; this
 * table is where you nail the last 20% by eyeballing screenshots in Chrome.
 *
 * `scaleMul` — multiply the auto-fit scale (1 = no change; >1 bigger).
 * `yNudge`   — metres to lift (+) or lower (−) the model AFTER grounding.
 *              Use for wall-mounted items that should float (pooja_wall,
 *              mirrors, wall lamps) or for thin items that z-fight the floor.
 *
 * Workflow: see a model that looks wrong in the 3D scene → add/adjust its
 * entry here → HMR reloads → repeat. Keyed by GLB filename (`asset_url`).
 */
export interface AssetTuning {
  scaleMul: number;
  yNudge: number;
}

const DEFAULT: AssetTuning = { scaleMul: 1, yNudge: 0 };

/**
 * Seed entries — VERIFY/REPLACE these by looking at the actual render. They're
 * educated guesses, not measured. Wall-mounted items are the obvious early
 * wins (they should sit ~0.7–1.0 m up, not on the floor).
 */
const OVERRIDES: Record<string, Partial<AssetTuning>> = {
  // ── New living-room GLBs (12 replacements) ──────────────────────────────
  // sofa_3seat origin is at base of mesh — no y-lift needed.
  "sofa_3seat.glb": { yNudge: 0.0 },
  // sofa_l (L-shape) — flat base, tiny lift clears z-fight.
  "sofa_l.glb": { yNudge: 0.003 },
  // tv_unit sits flush on the floor.
  "tv_unit.glb": { yNudge: 0.003 },
  // coffee_table — thin, small lift to prevent z-fight.
  "coffee_table.glb": { yNudge: 0.003 },
  // lounge_chair — standard floor clearance.
  "lounge_chair.glb": { yNudge: 0.003 },
  // ottoman — standard floor clearance.
  "ottoman.glb": { yNudge: 0.003 },
  // bookshelf — tall upright, flush to floor.
  "bookshelf.glb": { yNudge: 0.003 },
  // lamp_floor — tall floor lamp, standard clearance.
  "lamp_floor.glb": { yNudge: 0.003 },
  // rug — very flat; tiny lift prevents z-fight with floor plane.
  "rug.glb": { yNudge: 0.003 },
  // chair — standard floor clearance.
  "chair.glb": { yNudge: 0.003 },
  // fan — ceiling-mounted; catalog height=470 mm => nudge = 3.0 - 0.47 = 2.53
  "fan.glb": { yNudge: 2.53 },
  // plant — standard floor clearance.
  "plant.glb": { yNudge: 0.003 },

  // ── Legacy GLBs (kept for backwards compat with non-living-room entries) ──
  "loungeDesignSofa.glb": { yNudge: 0.005 },
  "loungeSofaLong.glb": { yNudge: 0.005 },
  "loungeDesignSofaCorner.glb": { yNudge: 0.005 },
  "cabinetTelevision.glb": { yNudge: 0.003 },
  "cabinetTelevisionDoors.glb": { yNudge: 0.003 },
  "tableCoffeeGlass.glb": { yNudge: 0.004 },
  "tableCoffeeGlassSquare.glb": { yNudge: 0.004 },
  "tableCoffeeSquare.glb": { yNudge: 0.004 },
  // Wall-mounted pooja unit — hangs at ~0.9 m on the wall.
  "pooja_wall.glb": { yNudge: 0.9 },
  // Thin floor rugs — z-fight prevention.
  "rugRectangle.glb": { yNudge: 0.003 },
  "rugRound.glb": { yNudge: 0.003 },
  "rugSquare.glb": { yNudge: 0.003 },
  "rugRounded.glb": { yNudge: 0.003 },
  "rugDoormat.glb": { yNudge: 0.003 },
  // Wall lamps / mirrors hang on the wall.
  "lampWall.glb": { yNudge: 1.4 },
  "bathroomMirror.glb": { yNudge: 1.2 },
  "mirror.glb": { yNudge: 1.2 },
  // Ceiling fixtures.
  "lampSquareCeiling.glb": { yNudge: 2.85 },
  // Wardrobes — large GLBs may have off-centre pivots; scaleMul 1 = auto-fit unchanged.
  "wardrobe_2d.glb": { scaleMul: 1.0 },
  "wardrobe_3d.glb": { scaleMul: 1.0 },
  "WARD-2DHCR-2CR.glb": { scaleMul: 1.0 },
  "WARD-2DS-2CR.glb": { scaleMul: 1.0 },
  // Overhead storage cabinet — slightly raised to clear countertop height.
  "overhead_cabinet.glb": { yNudge: 1.4 },
};

export function assetTuning(assetUrl: string): AssetTuning {
  return { ...DEFAULT, ...(OVERRIDES[assetUrl] ?? {}) };
}
