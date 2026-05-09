// ─────────────────────────────────────────────────────────────────────────────
// Build vs Buy — Catalog mapping with carpenter-spec alternatives
//
// In India, a significant portion of furniture is built by local carpenters
// rather than bought off-the-shelf. This module provides:
//
// 1. buildVsBuyMap — maps every catalog item to a "build" alternative with
//    material specs, carpenter labor estimates, and cost comparisons
// 2. generateCarpenterSpecs() — produces a PDF-ready document with:
//    - Cutting list (dimensions for each piece)
//    - Material list (plywood sheets, laminates, hardware)
//    - Carpenter reference (joint types, edge banding, finish)
// 3. getBuildCostEstimate() — rough cost: material + labor based on city tier
// ─────────────────────────────────────────────────────────────────────────────

import type { CatalogItem } from './types';

// ── Types ──

export interface MaterialSpec {
  /** Material name (e.g., "19mm BWP Plywood") */
  material: string;
  /** Quantity needed (sheets, meters, pieces) */
  quantity: number;
  /** Unit (sheet, m, pcs, kg, L) */
  unit: string;
  /** Approx cost per unit in INR */
  unitCost: number;
  /** Notes for carpenter */
  notes?: string;
}

export interface BuildAlternative {
  /** The ID of the catalog item this replaces */
  catalogItemId: string;
  /** Can this be carpentered? */
  buildable: boolean;
  /** Reason if not buildable */
  buildableNote?: string;
  /** Total material cost estimate (INR) */
  materialCost: number;
  /** Labor cost range [min, max] based on complexity and city tier */
  laborCostRange: [number, number];
  /** Estimated build time in days */
  buildDays: number;
  /** Skill level required */
  skillLevel: 'basic' | 'intermediate' | 'advanced';
  /** Material breakdown list */
  materials: MaterialSpec[];
  /** Joint and finishing notes for the carpenter */
  carpenterNotes: string[];
  /** Comparison: buy (retail) vs build (carpenter) savings % */
  savingsPercent: number;
  /** Recommended city tiers where building makes sense */
  recommendedTiers: number[];
}

export interface CarpenterSpecSheet {
  itemName: string;
  catalogItemId: string;
  overallDimensions: string; // "W × D × H in inches"
  cuttingList: { part: string; qty: number; dimensions: string; material: string }[];
  materials: MaterialSpec[];
  toolsNeeded: string[];
  jointTypes: string[];
  finishSteps: string[];
  estimatedTime: string;
  notes: string;
}

// ── City Tier Multipliers (labor cost adjustment) ──

const TIER_MULTIPLIER: Record<number, number> = {
  1: 1.0,  // Mumbai, Delhi, Bangalore, Chennai, Hyderabad, Kolkata, Pune, Ahmedabad
  2: 0.75, // Jaipur, Lucknow, Indore, Nagpur, Coimbatore, etc.
  3: 0.55, // Smaller cities and towns
};

const TIER_LABEL: Record<number, string> = {
  1: 'Tier 1 (Metro)',
  2: 'Tier 2',
  3: 'Tier 3',
};

// ── Standard carpenter daily rates (INR) ──

const CARPENTER_DAILY_RATE: Record<string, Record<number, number>> = {
  basic: { 1: 800, 2: 600, 3: 450 },
  intermediate: { 1: 1200, 2: 900, 3: 650 },
  advanced: { 1: 1800, 2: 1300, 3: 900 },
};

// ── Build-vs-Buy Mapping ──

const BUILD_VS_BUY_MAP: Record<string, BuildAlternative> = {
  // ── Sofas / Seating ──
  'sofa-3seater': {
    catalogItemId: 'sofa-3seater',
    buildable: true,
    materialCost: 18500,
    laborCostRange: [6000, 10000],
    buildDays: 5,
    skillLevel: 'advanced',
    materials: [
      { material: '32mm BWP Plywood (frame)', quantity: 2, unit: 'sheet', unitCost: 3200 },
      { material: '19mm BWP Plywood (base)', quantity: 2, unit: 'sheet', unitCost: 2100 },
      { material: '40-density PU Foam (seat)', quantity: 3, unit: 'sheet', unitCost: 650 },
      { material: '32-density PU Foam (back)', quantity: 2, unit: 'sheet', unitCost: 450 },
      { material: 'Upholstery fabric', quantity: 8, unit: 'm', unitCost: 350 },
      { material: 'Dacron wrap', quantity: 3, unit: 'kg', unitCost: 200 },
      { material: 'Nails, screws, adhesive', quantity: 1, unit: 'lot', unitCost: 600 },
    ],
    carpenterNotes: [
      'Use dowel + screw joinery for frame joints (no nails-only — will loosen in 2 years)',
      'Corner blocks essential for armrest rigidity',
      'Spring base optional — 8-gauge zig-zag springs ₹1500 extra',
      'Edge band all exposed plywood edges before upholstery',
      'Dacron wrap over foam before fabric for wrinkle-free finish',
    ],
    savingsPercent: 45,
    recommendedTiers: [1, 2, 3],
  },

  'sofa-2seater': {
    catalogItemId: 'sofa-2seater',
    buildable: true,
    materialCost: 13000,
    laborCostRange: [4800, 7500],
    buildDays: 4,
    skillLevel: 'intermediate',
    materials: [
      { material: '32mm BWP Plywood (frame)', quantity: 1.5, unit: 'sheet', unitCost: 3200 },
      { material: '19mm BWP Plywood (base)', quantity: 1.5, unit: 'sheet', unitCost: 2100 },
      { material: '40-density PU Foam (seat)', quantity: 2, unit: 'sheet', unitCost: 650 },
      { material: 'Upholstery fabric', quantity: 6, unit: 'm', unitCost: 350 },
      { material: 'Dacron wrap', quantity: 2, unit: 'kg', unitCost: 200 },
      { material: 'Hardware kit', quantity: 1, unit: 'lot', unitCost: 450 },
    ],
    carpenterNotes: [
      'Same construction principles as 3-seater',
      'Consider storage drawer under seat (adds ₹1500 material)',
    ],
    savingsPercent: 48,
    recommendedTiers: [1, 2, 3],
  },

  'sofa-single': {
    catalogItemId: 'sofa-single',
    buildable: true,
    materialCost: 7500,
    laborCostRange: [3000, 5000],
    buildDays: 3,
    skillLevel: 'intermediate',
    materials: [
      { material: '19mm BWP Plywood', quantity: 2, unit: 'sheet', unitCost: 2100 },
      { material: '40-density PU Foam', quantity: 1.5, unit: 'sheet', unitCost: 650 },
      { material: 'Upholstery fabric', quantity: 4, unit: 'm', unitCost: 350 },
      { material: 'Hardware kit', quantity: 1, unit: 'lot', unitCost: 350 },
    ],
    carpenterNotes: [
      'Compact frame — prioritize comfort over slim profile',
      'Armrest padding essential for Indian usage style (lot of leaning)',
    ],
    savingsPercent: 40,
    recommendedTiers: [1, 2, 3],
  },

  // ── Beds ──
  'bed-king': {
    catalogItemId: 'bed-king',
    buildable: true,
    materialCost: 22000,
    laborCostRange: [7000, 12000],
    buildDays: 6,
    skillLevel: 'advanced',
    materials: [
      { material: '19mm BWP Plywood (headboard)', quantity: 2, unit: 'sheet', unitCost: 2100 },
      { material: '19mm BWP Plywood (side rails)', quantity: 2, unit: 'sheet', unitCost: 2100 },
      { material: '50mm × 50mm hardwood battens', quantity: 12, unit: 'm', unitCost: 80 },
      { material: '18mm Plywood slats', quantity: 2, unit: 'sheet', unitCost: 1900 },
      { material: '40-density PU Foam (headboard)', quantity: 1, unit: 'sheet', unitCost: 650 },
      { material: 'Upholstery fabric (headboard)', quantity: 3, unit: 'm', unitCost: 400 },
      { material: 'Laminate (side panels)', quantity: 2, unit: 'sheet', unitCost: 1200 },
      { material: 'Center support beam + legs', quantity: 1, unit: 'lot', unitCost: 1500 },
      { material: 'Hardware (bolts, brackets, screws)', quantity: 1, unit: 'lot', unitCost: 900 },
    ],
    carpenterNotes: [
      'Center support beam is NON-NEGOTIABLE for king size — prevents sagging',
      'Use M8 bolts with barrel nuts for knock-down construction (easy moving)',
      'Minimum 5 cross-battens under slats, spaced 10" apart',
      'Headboard height 36-40" above mattress for comfortable back support',
      'Consider hydraulic storage if user has space constraints (adds ₹3500)',
    ],
    savingsPercent: 50,
    recommendedTiers: [1, 2, 3],
  },

  'bed-queen': {
    catalogItemId: 'bed-queen',
    buildable: true,
    materialCost: 16500,
    laborCostRange: [5500, 9000],
    buildDays: 5,
    skillLevel: 'intermediate',
    materials: [
      { material: '19mm BWP Plywood', quantity: 4, unit: 'sheet', unitCost: 2100 },
      { material: 'Hardwood battens', quantity: 10, unit: 'm', unitCost: 80 },
      { material: 'Plywood slats', quantity: 1.5, unit: 'sheet', unitCost: 1900 },
      { material: 'Laminate', quantity: 1.5, unit: 'sheet', unitCost: 1200 },
      { material: 'Hardware kit', quantity: 1, unit: 'lot', unitCost: 700 },
    ],
    carpenterNotes: [
      'Same structural principles as king bed — center support still recommended',
      'Queen is sweet spot for build-vs-buy savings in all tiers',
    ],
    savingsPercent: 55,
    recommendedTiers: [1, 2, 3],
  },

  // ── Wardrobe ──
  'wardrobe-3door': {
    catalogItemId: 'wardrobe-3door',
    buildable: true,
    materialCost: 32000,
    laborCostRange: [10000, 18000],
    buildDays: 8,
    skillLevel: 'advanced',
    materials: [
      { material: '19mm BWP Plywood (carcass)', quantity: 6, unit: 'sheet', unitCost: 2100 },
      { material: '19mm BWP Plywood (shelves)', quantity: 3, unit: 'sheet', unitCost: 2100 },
      { material: '6mm Plywood (back panel)', quantity: 2, unit: 'sheet', unitCost: 950 },
      { material: '1mm Laminate (exterior)', quantity: 5, unit: 'sheet', unitCost: 1200 },
      { material: '0.8mm Laminate (interior)', quantity: 4, unit: 'sheet', unitCost: 900 },
      { material: 'SS304 Hinges (soft-close)', quantity: 9, unit: 'pcs', unitCost: 180 },
      { material: 'Telescopic drawer channels', quantity: 3, unit: 'pair', unitCost: 350 },
      { material: 'Aluminum hanging rod', quantity: 2, unit: 'pcs', unitCost: 300 },
      { material: 'Edge banding (PVC 2mm)', quantity: 1, unit: 'lot', unitCost: 800 },
      { material: 'Handles (SS)', quantity: 3, unit: 'pcs', unitCost: 150 },
    ],
    carpenterNotes: [
      'Use confirmat screws or cam-locks for carcass assembly — NOT nails',
      'Back panel rabbet into carcass — do not just screw from outside',
      'Adjustable shelf pins at 32mm system spacing (standard hardware)',
      'Soft-close hinges worth the premium (₹180 vs ₹40 regular)',
      'Ventilation holes at back if storing in humid city (Mumbai/Chennai/Kolkata)',
      'Loft space above wardrobe for storage — add ₹3000 for upper cabinet',
    ],
    savingsPercent: 55,
    recommendedTiers: [1, 2],
  },

  'wardrobe-2door': {
    catalogItemId: 'wardrobe-2door',
    buildable: true,
    materialCost: 22000,
    laborCostRange: [7000, 12000],
    buildDays: 6,
    skillLevel: 'intermediate',
    materials: [
      { material: '19mm BWP Plywood', quantity: 5, unit: 'sheet', unitCost: 2100 },
      { material: '6mm Plywood (back)', quantity: 1.5, unit: 'sheet', unitCost: 950 },
      { material: 'Laminate (exterior)', quantity: 4, unit: 'sheet', unitCost: 1200 },
      { material: 'Laminate (interior)', quantity: 3, unit: 'sheet', unitCost: 900 },
      { material: 'Hinges + drawer channels', quantity: 1, unit: 'lot', unitCost: 1800 },
      { material: 'Edge banding + handles', quantity: 1, unit: 'lot', unitCost: 1100 },
    ],
    carpenterNotes: [
      'Same build principles as 3-door — scaled version',
      'Two-door is easier to build and more cost-effective vs buying',
    ],
    savingsPercent: 58,
    recommendedTiers: [1, 2, 3],
  },

  // ── Tables / Desks ──
  'dining-table-6seater': {
    catalogItemId: 'dining-table-6seater',
    buildable: true,
    materialCost: 14500,
    laborCostRange: [4000, 7000],
    buildDays: 4,
    skillLevel: 'intermediate',
    materials: [
      { material: '25mm BWP Plywood (top)', quantity: 1.5, unit: 'sheet', unitCost: 2600 },
      { material: '50mm × 50mm hardwood legs', quantity: 6, unit: 'm', unitCost: 120 },
      { material: '1mm Laminate (top)', quantity: 1, unit: 'sheet', unitCost: 1200 },
      { material: 'PU edge banding', quantity: 1, unit: 'lot', unitCost: 500 },
      { material: 'SS leg brackets + hardware', quantity: 1, unit: 'lot', unitCost: 800 },
      { material: 'Wood finish (melamine)', quantity: 1, unit: 'L', unitCost: 600 },
    ],
    carpenterNotes: [
      'Top MUST be minimum 25mm — 19mm will sag at 6ft span without support',
      'Apron frame under table essential for rigidity',
      'Leg levelers for uneven Indian floors (₹200 for set of 4)',
      'Rounded corners for safety in Indian homes with children/elderly',
    ],
    savingsPercent: 42,
    recommendedTiers: [1, 2, 3],
  },

  'study-table': {
    catalogItemId: 'study-table',
    buildable: true,
    materialCost: 6500,
    laborCostRange: [2500, 4500],
    buildDays: 2,
    skillLevel: 'basic',
    materials: [
      { material: '19mm BWP Plywood', quantity: 2, unit: 'sheet', unitCost: 2100 },
      { material: '1mm Laminate', quantity: 1.5, unit: 'sheet', unitCost: 1200 },
      { material: 'Edge banding', quantity: 1, unit: 'lot', unitCost: 300 },
      { material: 'Drawer channels + hardware', quantity: 1, unit: 'lot', unitCost: 600 },
    ],
    carpenterNotes: [
      'Simple build — good project for less-experienced carpenters',
      'Add cable management hole if used as computer desk',
      'Standard height 30" — do not make shorter, Indian chairs are standard height',
    ],
    savingsPercent: 50,
    recommendedTiers: [1, 2, 3],
  },

  'coffee-table': {
    catalogItemId: 'coffee-table',
    buildable: true,
    materialCost: 4800,
    laborCostRange: [2000, 3500],
    buildDays: 2,
    skillLevel: 'basic',
    materials: [
      { material: '19mm BWP Plywood', quantity: 1.5, unit: 'sheet', unitCost: 2100 },
      { material: '1mm Laminate', quantity: 1, unit: 'sheet', unitCost: 1200 },
      { material: 'Edge banding + hardware', quantity: 1, unit: 'lot', unitCost: 400 },
    ],
    carpenterNotes: [
      'Keep height between 16-18" for Indian sofa compatibility',
      'Consider lift-top mechanism for storage (adds ₹1500)',
    ],
    savingsPercent: 55,
    recommendedTiers: [1, 2, 3],
  },

  // ── TV Unit / Entertainment ──
  'tv-unit': {
    catalogItemId: 'tv-unit',
    buildable: true,
    materialCost: 11000,
    laborCostRange: [4000, 6500],
    buildDays: 4,
    skillLevel: 'intermediate',
    materials: [
      { material: '19mm BWP Plywood', quantity: 3, unit: 'sheet', unitCost: 2100 },
      { material: '1mm Laminate', quantity: 3, unit: 'sheet', unitCost: 1200 },
      { material: 'Edge banding', quantity: 1, unit: 'lot', unitCost: 500 },
      { material: 'Drawer channels + hinges', quantity: 1, unit: 'lot', unitCost: 1200 },
      { material: 'Cable management grommets', quantity: 3, unit: 'pcs', unitCost: 50 },
    ],
    carpenterNotes: [
      'Back panel must have cutout for wires — plan cable management before final assembly',
      'Minimum 45" center height for TV placement (comfortable viewing from sofa)',
      'Ventilation slots needed if enclosing set-top box/DTH',
      'Floating mount possible — use heavy-duty wall anchors (Fischer UX series)',
    ],
    savingsPercent: 50,
    recommendedTiers: [1, 2, 3],
  },

  // ── Shelving ──
  'bookshelf': {
    catalogItemId: 'bookshelf',
    buildable: true,
    materialCost: 7500,
    laborCostRange: [3000, 5000],
    buildDays: 3,
    skillLevel: 'basic',
    materials: [
      { material: '19mm BWP Plywood', quantity: 3, unit: 'sheet', unitCost: 2100 },
      { material: '1mm Laminate', quantity: 2, unit: 'sheet', unitCost: 1200 },
      { material: 'Edge banding + hardware', quantity: 1, unit: 'lot', unitCost: 500 },
    ],
    carpenterNotes: [
      'Fixed shelves stronger than adjustable for bookshelf use',
      'Minimum 12" shelf depth for standard Indian books',
      'Back panel essential for racking resistance — 6mm ply minimum',
    ],
    savingsPercent: 60,
    recommendedTiers: [1, 2, 3],
  },
};

// ── Public API ──

/**
 * Get the build alternative for a catalog item.
 * Returns undefined if no mapping exists (non-buildable item).
 */
export function getBuildAlternative(itemId: string): BuildAlternative | undefined {
  return BUILD_VS_BUY_MAP[itemId];
}

/**
 * Estimate total build cost including materials and labor for a given city tier.
 */
export function getBuildCostEstimate(
  itemId: string,
  cityTier: number = 1,
): { materialCost: number; laborCost: number; totalCost: number; savingsPercent: number } | null {
  const alt = BUILD_VS_BUY_MAP[itemId];
  if (!alt) return null;

  const multiplier = TIER_MULTIPLIER[cityTier] ?? 1.0;
  const laborMid = (alt.laborCostRange[0] + alt.laborCostRange[1]) / 2;
  const adjustedLabor = Math.round(laborMid * multiplier);

  return {
    materialCost: alt.materialCost,
    laborCost: adjustedLabor,
    totalCost: alt.materialCost + adjustedLabor,
    savingsPercent: alt.savingsPercent,
  };
}

/**
 * Generate a carpenter-ready specification sheet.
 */
export function generateCarpenterSpecs(
  itemId: string,
  width: number,
  depth: number,
  height: number,
): CarpenterSpecSheet | null {
  const alt = BUILD_VS_BUY_MAP[itemId];
  if (!alt || !alt.buildable) return null;

  // Generate cutting list from dimensions
  const cuttingList = generateCuttingList(alt, width, depth, height);

  return {
    itemName: itemId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    catalogItemId: itemId,
    overallDimensions: `${width}"W × ${depth}"D × ${height}"H`,
    cuttingList,
    materials: alt.materials,
    toolsNeeded: [
      'Circular saw with guide rail',
      'Jigsaw',
      'Router with flush-trim + edge banding bits',
      'Cordless drill/driver',
      'Pocket hole jig (Kreg or equivalent)',
      'Orbital sander (80, 120, 220 grit)',
      'Measuring tape (minimum 5m)',
      'Carpenter square + combination square',
      'Clamps (minimum 4, 24" F-clamps)',
      'PPE: safety glasses, dust mask, ear protection',
    ],
    jointTypes: getJointTypes(alt.skillLevel),
    finishSteps: [
      '1. Sand all faces: 80 grit → 120 grit → 220 grit',
      '2. Apply primer/sealer coat to plywood edges',
      '3. Edge-band all exposed edges with PVC 2mm tape (hot-melt glue or iron-on)',
      '4. Apply laminate with contact cement — roll firmly, no air bubbles',
      '5. Trim laminate flush with router + flush-trim bit',
      '6. Install hardware (hinges, channels, handles)',
      '7. Test-fit before final assembly',
      '8. Touch-up any exposed edges with matching putty/marker',
    ],
    estimatedTime: `${alt.buildDays}-${alt.buildDays + 1} days for 1 skilled carpenter`,
    notes: alt.carpenterNotes.join('\n'),
  };
}

/**
 * Get all build-vs-buy alternatives.
 */
export function getAllBuildAlternatives(): BuildAlternative[] {
  return Object.values(BUILD_VS_BUY_MAP);
}

/**
 * Filter build alternatives by skill level.
 */
export function getAlternativesBySkillLevel(level: 'basic' | 'intermediate' | 'advanced'): BuildAlternative[] {
  return Object.values(BUILD_VS_BUY_MAP).filter(a => a.skillLevel === level);
}

/**
 * Get cost savings summary for all items in a city tier.
 */
export function getSavingsSummary(cityTier: number): {
  totalBuyCost: number;
  totalBuildCost: number;
  totalSavings: number;
  savingsPercent: number;
  itemCount: number;
} {
  const items = Object.values(BUILD_VS_BUY_MAP);
  let totalBuyCost = 0;
  let totalBuildCost = 0;

  for (const item of items) {
    const buildEstimate = getBuildCostEstimate(item.catalogItemId, cityTier);
    if (buildEstimate) {
      totalBuildCost += buildEstimate.totalCost;
      // Buy cost = build cost / (1 - savingsPercent)
      const buyCost = buildEstimate.materialCost + buildEstimate.laborCost + 
        (buildEstimate.materialCost + buildEstimate.laborCost) * (item.savingsPercent / (100 - item.savingsPercent));
      totalBuyCost += Math.round(buyCost);
    }
  }

  const totalSavings = totalBuyCost - totalBuildCost;
  const savingsPercent = totalBuyCost > 0 ? Math.round((totalSavings / totalBuyCost) * 100) : 0;

  return {
    totalBuyCost,
    totalBuildCost,
    totalSavings,
    savingsPercent,
    itemCount: items.length,
  };
}

/**
 * Get city tier label.
 */
export function getTierLabel(tier: number): string {
  return TIER_LABEL[tier] ?? `Tier ${tier}`;
}

// ── Internal helpers ──

function getJointTypes(skillLevel: 'basic' | 'intermediate' | 'advanced'): string[] {
  switch (skillLevel) {
    case 'basic':
      return ['Butt joint with screws + glue', 'Pocket hole joinery (Kreg jig)', 'Edge-to-edge dowel joint'];
    case 'intermediate':
      return ['Rabbet + dado joints', 'Mortise and tenon (simplified)', 'Pocket hole + confirmat screws', 'Dowel joinery'];
    case 'advanced':
      return ['Mortise and tenon (traditional)', 'Dovetail for drawers', 'Bridle joint for frames', 'Sliding dovetail', 'Cam-lock + dowel knock-down', 'Box joint (finger joint)'];
    default:
      return ['Butt joint with screws + glue'];
  }
}

function generateCuttingList(
  alt: BuildAlternative,
  width: number,
  depth: number,
  height: number,
): { part: string; qty: number; dimensions: string; material: string }[] {
  // Generate a reasonable cutting list based on the item type and dimensions
  const parts: { part: string; qty: number; dimensions: string; material: string }[] = [];

  if (alt.catalogItemId.includes('sofa')) {
    parts.push(
      { part: 'Front rail', qty: 1, dimensions: `${Math.round(width * 0.95)}" × 4"`, material: '32mm BWP Ply' },
      { part: 'Back rail', qty: 1, dimensions: `${Math.round(width * 0.95)}" × 4"`, material: '32mm BWP Ply' },
      { part: 'Side rails', qty: 2, dimensions: `${Math.round(depth * 0.9)}" × 4"`, material: '32mm BWP Ply' },
      { part: 'Armrest panels', qty: 2, dimensions: `${Math.round(depth * 0.85)}" × ${Math.round(height * 0.7)}"`, material: '19mm BWP Ply' },
      { part: 'Base panel', qty: 1, dimensions: `${Math.round(width * 0.95)}" × ${Math.round(depth * 0.85)}"`, material: '19mm BWP Ply' },
      { part: 'Back support panel', qty: 1, dimensions: `${Math.round(width * 0.9)}" × ${Math.round(height * 0.6)}"`, material: '19mm BWP Ply' },
      { part: 'Seat cushion base', qty: 1, dimensions: `${Math.round(width * 0.9)}" × ${Math.round(depth * 0.7)}"`, material: '12mm Ply' },
    );
  } else if (alt.catalogItemId.includes('bed')) {
    parts.push(
      { part: 'Headboard', qty: 1, dimensions: `${width}" × ${Math.round(height * 0.6)}"`, material: '19mm BWP Ply' },
      { part: 'Side rails', qty: 2, dimensions: `${Math.round(depth * 0.95)}" × 6"`, material: '19mm BWP Ply' },
      { part: 'Footboard', qty: 1, dimensions: `${width}" × 4"`, material: '19mm BWP Ply' },
      { part: 'Center support beam', qty: 1, dimensions: `${Math.round(depth * 0.9)}" × 3"`, material: 'Hardwood' },
      { part: 'Slats', qty: 10, dimensions: `${Math.round(width * 0.45)}" × 3"`, material: '18mm Ply (strips)' },
      { part: 'Support leg (center)', qty: 2, dimensions: '3" × 3" × 12"', material: 'Hardwood block' },
    );
  } else if (alt.catalogItemId.includes('wardrobe')) {
    parts.push(
      { part: 'Side panels', qty: 2, dimensions: `${depth}" × ${height}"`, material: '19mm BWP Ply' },
      { part: 'Top/Bottom panels', qty: 2, dimensions: `${width}" × ${depth}"`, material: '19mm BWP Ply' },
      { part: 'Shelves (fixed)', qty: 3, dimensions: `${width}" × ${Math.round(depth * 0.85)}"`, material: '19mm BWP Ply' },
      { part: 'Doors', qty: alt.catalogItemId.includes('3door') ? 3 : 2, dimensions: `${Math.round(width / (alt.catalogItemId.includes('3door') ? 3 : 2))}" × ${height}"`, material: '19mm BWP Ply' },
      { part: 'Back panel', qty: 1, dimensions: `${width}" × ${height}"`, material: '6mm Ply' },
      { part: 'Hanging rod', qty: 1, dimensions: `${Math.round(width * 0.9)}"`, material: 'Aluminum tube 25mm dia' },
    );
  } else {
    parts.push(
      { part: 'Top panel', qty: 1, dimensions: `${width}" × ${depth}"`, material: '25mm BWP Ply' },
      { part: 'Side/Leg panels', qty: 2, dimensions: `${depth}" × ${height}"`, material: '19mm BWP Ply' },
      { part: 'Bottom shelf', qty: 1, dimensions: `${Math.round(width * 0.9)}" × ${Math.round(depth * 0.85)}"`, material: '19mm BWP Ply' },
      { part: 'Back stretcher', qty: 1, dimensions: `${Math.round(width * 0.8)}" × 3"`, material: '19mm BWP Ply' },
    );
  }

  return parts;
}