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
  // Living room sofas — large flat bases can clip; tiny lift clears z-fight.
  "loungeDesignSofa.glb": { yNudge: 0.005 },
  "loungeSofaLong.glb": { yNudge: 0.005 },
  "loungeDesignSofaCorner.glb": { yNudge: 0.005 },
  // TV units — ensure they sit flush on the floor.
  "cabinetTelevision.glb": { yNudge: 0.003 },
  "cabinetTelevisionDoors.glb": { yNudge: 0.003 },
  // Coffee tables — very thin, need a hair to avoid z-fighting the floor.
  "coffee_table.glb": { yNudge: 0.004 },
  "tableCoffeeGlass.glb": { yNudge: 0.004 },
  "tableCoffeeGlassSquare.glb": { yNudge: 0.004 },
  "tableCoffeeSquare.glb": { yNudge: 0.004 },
  // Wall-mounted pooja unit — hangs at ~0.9 m on the wall.
  "pooja_wall.glb": { yNudge: 0.9 },
  // Thin floor items can z-fight the floor plane — lift a hair.
  "rugRectangle.glb": { yNudge: 0.003 },
  "rugRound.glb": { yNudge: 0.003 },
  "rugSquare.glb": { yNudge: 0.003 },
  "rugRounded.glb": { yNudge: 0.003 },
  "rugDoormat.glb": { yNudge: 0.003 },
  // Wall lamps / mirrors hang on the wall.
  "lampWall.glb": { yNudge: 1.4 },
  "bathroomMirror.glb": { yNudge: 1.2 },
  "mirror.glb": { yNudge: 1.2 },
  // Ceiling fixtures — room height is 3000 mm = 3.0 m. Fixture height is
  // in its catalog Dimensions.height_mm, so the item already sits at
  // (roomH - itemH) once we push it up. yNudge = 3.0 - itemH(m).
  // fan.glb catalog height = 300 mm => 3.0 - 0.3 = 2.7
  "fan.glb": { yNudge: 2.7 },
  // lampSquareCeiling catalog height = typically 150–200 mm => nudge to ~2.8
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
