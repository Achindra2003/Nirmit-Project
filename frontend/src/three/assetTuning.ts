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
  // ── Hero catalog GLBs (declared dims = native — uniform 1.0 auto-fit) ──
  "sofa_3seat.glb": { yNudge: 0.0 },
  "sofa_2seater.glb": { yNudge: 0.003 },
  "sofa_l.glb": { yNudge: 0.003 },
  "diwan.glb": { yNudge: 0.003 },
  "tv_unit.glb": { yNudge: 0.003 },
  "coffee_table.glb": { yNudge: 0.003 },
  "tableRound.glb": { yNudge: 0.003 },
  "lounge_chair.glb": { yNudge: 0.003 },
  "chair.glb": { yNudge: 0.003 },
  "chairDesk.glb": { yNudge: 0.003 },
  "ottoman.glb": { yNudge: 0.003 },
  "bookshelf.glb": { yNudge: 0.003 },
  "bookcaseClosed.glb": { yNudge: 0.003 },
  "bookcaseClosedWide.glb": { yNudge: 0.003 },
  "bookshelf_cabinet.glb": { yNudge: 0.003 },
  "chest_drawers.glb": { yNudge: 0.003 },
  "sideTableDrawers.glb": { yNudge: 0.003 },
  "shoe_rack.glb": { yNudge: 0.003 },
  "bed_queen.glb": { yNudge: 0.003 },
  "bed_king.glb": { yNudge: 0.003 },
  "desk.glb": { yNudge: 0.003 },
  "dining_6.glb": { yNudge: 0.003 },
  "dining_chair.glb": { yNudge: 0.003 },
  "lamp_floor.glb": { yNudge: 0.003 },
  "lampRoundTable.glb": { yNudge: 0.003 },
  "rug.glb": { yNudge: 0.003 },
  "plant.glb": { yNudge: 0.003 },
  "plantSmall1.glb": { yNudge: 0.003 },
  "pooja_floor.glb": { yNudge: 0.003 },
  "pooja_chowki.glb": { yNudge: 0.003 },
  // Ceiling fan — hangs from a 3.0 m ceiling, fan body height ~470 mm
  "fan.glb": { yNudge: 2.53 },
  // Wall mirror — mounted at ~1.0 m (eye-level start)
  "mirror.glb": { yNudge: 1.0 },

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
