/**
 * Nirmit Catalog Generator
 * 
 * Run: npx tsx scripts/generate-catalog.ts
 * 
 * Scans 714 GLB models (156 nirmit + 558 Blueprint3D) and generates:
 *   → src/catalog/catalog.ts       (2,200+ CatalogItem entries)
 *   → src/catalog/modelMapping.ts  (hero ID → verified GLB path mapping)
 * 
 * Architecture:
 *   Phase 1: Scan & classify all GLB files by naming convention
 *   Phase 2: Generate hero entries (one per unique furniture type)
 *   Phase 3: Generate size variants (compact/standard/large)
 *   Phase 4: Generate material variants per hero
 *   Phase 5: Generate parametric decor items (primitives)
 *   Phase 6: Generate cultural Indian items
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Configuration ──────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NIRMIT_MODELS_DIR = path.resolve(__dirname, '..', 'public', 'models');
const BLUEPRINT_MODELS_DIR = path.resolve(
  __dirname, '..', '..', 'threejs-3d-room-designer', 'Blueprint3D-assets', 'models', 'glb'
);

const OUTPUT_CATALOG = path.resolve(__dirname, '..', 'src', 'catalog', 'catalog.ts');
const OUTPUT_MODEL_MAPPING = path.resolve(__dirname, '..', 'src', 'catalog', 'modelMapping.ts');

type CatalogCategory = 'seating' | 'sleeping' | 'storage' | 'dining' | 'pooja' | 'kitchen' | 'decor' | 'fixtures' | 'work';
type CatalogSource = 'hero' | 'variant' | 'primitive' | 'decor';
type MaterialId = string;
type CostUnit = 'piece' | 'sqft' | 'running_foot' | 'set';
type LeadTime = 'in_stock' | '7_days' | '15_days' | '21_days' | 'custom';

interface MaterialOption {
  materialId: MaterialId;
  label: string;
  costMultiplier: number;
  roughness: number;
  metalness: number;
  colorHex: string;
}

interface CatalogItem {
  id: string;
  source: CatalogSource;
  category: CatalogCategory;
  label: string;
  dimensions: { width: number; depth: number; height: number };
  modelPath: string;
  thumbnail: string;
  tags: string[];
  quality: 'hero' | 'standard' | 'primitive';
  pricing: {
    baseCost: number;
    costUnit: CostUnit;
    materialIds: MaterialId[];
    laborCost: number;
    leadTime: LeadTime;
  };
}

interface HeroModelEntry {
  heroId: string;
  heroLabel: string;
  furnitureType: string;
  approximateSize: string;
  verifiedModelPath: string;
  sourceAsset: string;
  verified: boolean;
}

interface ModelClassification {
  file: string;
  source: 'nirmit' | 'blueprint3d';
  category: CatalogCategory;
  label: string;
  dimensions: { width: number; depth: number; height: number };
  baseCost: number;
  tags: string[];
  matchedMaterialIds: MaterialId[];
  isHeroMaterial: boolean; // true = this model is a usable hero, not a sub-component
}

// ─── Material Palette ───────────────────────────────────────────

const MATERIALS: Record<string, MaterialOption> = {
  fabric_cotton:      { materialId: 'fabric_cotton', label: 'Cotton Blend', costMultiplier: 1.0, roughness: 0.9, metalness: 0, colorHex: '#D4C5B2' },
  fabric_linen:        { materialId: 'fabric_linen', label: 'Linen', costMultiplier: 1.3, roughness: 0.85, metalness: 0, colorHex: '#E8DFD2' },
  fabric_velvet:       { materialId: 'fabric_velvet', label: 'Velvet', costMultiplier: 1.6, roughness: 0.7, metalness: 0.05, colorHex: '#2D4A3A' },
  fabric_silk_blend:   { materialId: 'fabric_silk_blend', label: 'Silk Blend', costMultiplier: 2.0, roughness: 0.6, metalness: 0.1, colorHex: '#C9A96E' },
  fabric_jute:         { materialId: 'fabric_jute', label: 'Jute', costMultiplier: 0.85, roughness: 0.95, metalness: 0, colorHex: '#C4A882' },
  leather_pu:          { materialId: 'leather_pu', label: 'PU Leather', costMultiplier: 1.8, roughness: 0.4, metalness: 0.1, colorHex: '#3E2723' },
  leather_genuine:     { materialId: 'leather_genuine', label: 'Genuine Leather', costMultiplier: 3.0, roughness: 0.35, metalness: 0.15, colorHex: '#4E342E' },
  wood_teak:           { materialId: 'wood_teak', label: 'Teak', costMultiplier: 1.0, roughness: 0.6, metalness: 0, colorHex: '#8B6914' },
  wood_oak:            { materialId: 'wood_oak', label: 'Oak', costMultiplier: 1.15, roughness: 0.5, metalness: 0, colorHex: '#D2B48C' },
  wood_walnut:         { materialId: 'wood_walnut', label: 'Walnut', costMultiplier: 1.3, roughness: 0.5, metalness: 0, colorHex: '#5C4033' },
  wood_sheen:          { materialId: 'wood_sheen', label: 'Sheesham', costMultiplier: 1.25, roughness: 0.55, metalness: 0, colorHex: '#6B4226' },
  wood_rosewood:       { materialId: 'wood_rosewood', label: 'Rosewood', costMultiplier: 1.6, roughness: 0.5, metalness: 0.05, colorHex: '#4A0000' },
  wood_mango:          { materialId: 'wood_mango', label: 'Mango Wood', costMultiplier: 0.8, roughness: 0.65, metalness: 0, colorHex: '#D4A054' },
  white_laminate:      { materialId: 'white_laminate', label: 'White Laminate', costMultiplier: 0.9, roughness: 0.3, metalness: 0, colorHex: '#F5F5F5' },
  grey_laminate:       { materialId: 'grey_laminate', label: 'Grey Laminate', costMultiplier: 0.9, roughness: 0.3, metalness: 0, colorHex: '#808080' },
  black_laminate:      { materialId: 'black_laminate', label: 'Black Laminate', costMultiplier: 0.95, roughness: 0.3, metalness: 0, colorHex: '#2C2C2C' },
  woodgrain_laminate:  { materialId: 'woodgrain_laminate', label: 'Wood-Grain Laminate', costMultiplier: 0.85, roughness: 0.35, metalness: 0, colorHex: '#A0845C' },
  metal_chrome:        { materialId: 'metal_chrome', label: 'Chrome', costMultiplier: 1.0, roughness: 0.2, metalness: 0.8, colorHex: '#C0C0C0' },
  metal_brass:         { materialId: 'metal_brass', label: 'Brass', costMultiplier: 1.4, roughness: 0.3, metalness: 0.7, colorHex: '#B5A642' },
  metal_matte_black:   { materialId: 'metal_matte_black', label: 'Matte Black', costMultiplier: 1.1, roughness: 0.35, metalness: 0.6, colorHex: '#1A1A1A' },
  marble_white:        { materialId: 'marble_white', label: 'White Marble', costMultiplier: 2.0, roughness: 0.3, metalness: 0.1, colorHex: '#F0ECE4' },
  marble_beige:        { materialId: 'marble_beige', label: 'Beige Marble', costMultiplier: 1.8, roughness: 0.3, metalness: 0.1, colorHex: '#E8DCC8' },
  granite_black:       { materialId: 'granite_black', label: 'Black Granite', costMultiplier: 1.5, roughness: 0.25, metalness: 0.15, colorHex: '#2D2D2D' },
  kota_stone:          { materialId: 'kota_stone', label: 'Kota Stone', costMultiplier: 0.7, roughness: 0.5, metalness: 0.05, colorHex: '#8B8B7A' },
  tile_ceramic:        { materialId: 'tile_ceramic', label: 'Ceramic Tile', costMultiplier: 1.0, roughness: 0.4, metalness: 0.05, colorHex: '#E0D8CC' },
  tile_vitrified:      { materialId: 'tile_vitrified', label: 'Vitrified Tile', costMultiplier: 1.2, roughness: 0.35, metalness: 0.05, colorHex: '#D5CFC4' },
};

// Material sets per category
const FABRIC_MATERIALS: MaterialId[] = ['fabric_cotton', 'fabric_linen', 'fabric_velvet', 'leather_pu'];
const PREMIUM_FABRIC_MATERIALS: MaterialId[] = ['fabric_cotton', 'fabric_linen', 'fabric_velvet', 'fabric_silk_blend', 'leather_pu', 'leather_genuine'];
const WOOD_MATERIALS: MaterialId[] = ['wood_teak', 'wood_oak', 'wood_walnut', 'wood_sheen', 'white_laminate'];
const PREMIUM_WOOD_MATERIALS: MaterialId[] = ['wood_teak', 'wood_oak', 'wood_walnut', 'wood_sheen', 'wood_rosewood', 'white_laminate', 'grey_laminate'];
const LAMINATE_MATERIALS: MaterialId[] = ['white_laminate', 'grey_laminate', 'black_laminate', 'woodgrain_laminate'];
const METAL_MATERIALS: MaterialId[] = ['metal_chrome', 'metal_brass', 'metal_matte_black'];
const KITCHEN_MATERIALS: MaterialId[] = ['wood_teak', 'white_laminate', 'grey_laminate', 'granite_black', 'marble_white'];
const POOJA_MATERIALS: MaterialId[] = ['wood_teak', 'wood_walnut', 'marble_white', 'metal_brass'];

// ─── Category Pricing Tables (Indian Market Rates in INR) ───────

const CATEGORY_BASE_PRICES: Record<CatalogCategory, number> = {
  seating: 12000,
  sleeping: 20000,
  storage: 10000,
  dining: 8000,
  pooja: 8000,
  kitchen: 10000,
  work: 7000,
  decor: 1500,
  fixtures: 4000,
};

const CATEGORY_MATERIAL_SETS: Record<CatalogCategory, MaterialId[]> = {
  seating: FABRIC_MATERIALS,
  sleeping: PREMIUM_WOOD_MATERIALS,
  storage: WOOD_MATERIALS,
  dining: WOOD_MATERIALS,
  pooja: POOJA_MATERIALS,
  kitchen: KITCHEN_MATERIALS,
  work: WOOD_MATERIALS,
  decor: [],
  fixtures: METAL_MATERIALS,
};

const CATEGORY_LABOR: Record<CatalogCategory, number> = {
  seating: 400,
  sleeping: 800,
  storage: 500,
  dining: 400,
  pooja: 600,
  kitchen: 1200,
  work: 400,
  decor: 0,
  fixtures: 300,
};

// ─── Classification Rules ───────────────────────────────────────

/**
 * Map a GLB filename to a category and label using naming conventions.
 * Blueprint3D models use prefix codes (e.g., BSC-*, WARD-*, DESK-*, LST-*).
 * Nirmit models use descriptive names (e.g., loungeSofa, bedDouble, kitchenCabinet).
 */
function classifyModel(file: string, source: 'nirmit' | 'blueprint3d'): ModelClassification | null {
  const lower = file.toLowerCase();
  const baseName = file.replace('.glb', '');

  // ── Blueprint3D Office Furniture ──
  if (source === 'blueprint3d') {
    // Bookcases: BSC-*
    if (baseName.startsWith('BSC-')) {
      const label = formatLabel(baseName, 'Bookcase');
      return {
        file, source, category: 'storage',
        label, dimensions: { width: 0.9, depth: 0.35, height: 1.8 },
        baseCost: 12000, tags: ['study', 'office', 'display'],
        matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true,
      };
    }
    // Desks: DESK-*, PDESK-*
    if (baseName.startsWith('DESK-') || baseName.startsWith('PDESK-')) {
      const isLShaped = baseName.includes('ECUL') || baseName.includes('ECUR');
      const label = isLShaped ? `L-Desk ${formatLabel(baseName, 'Desk')}` : `Desk ${formatLabel(baseName, 'Desk')}`;
      return {
        file, source, category: 'work',
        label, dimensions: isLShaped ? { width: 1.5, depth: 1.5, height: 0.75 } : { width: 1.2, depth: 0.6, height: 0.75 },
        baseCost: isLShaped ? 18000 : 9000, tags: ['wfh', 'study', 'office'],
        matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true,
      };
    }
    // Filing cabinets: FILING-*
    if (baseName.startsWith('FILING-')) {
      return {
        file, source, category: 'storage',
        label: `Filing Cabinet ${formatLabel(baseName, 'Filing')}`,
        dimensions: { width: 0.5, depth: 0.6, height: 1.3 },
        baseCost: 8500, tags: ['office', 'storage'],
        matchedMaterialIds: METAL_MATERIALS, isHeroMaterial: true,
      };
    }
    // Hutches: HUTCH-*
    if (baseName.startsWith('HUTCH-')) {
      return {
        file, source, category: 'storage',
        label: `Hutch ${formatLabel(baseName, 'Hutch')}`,
        dimensions: { width: 1.2, depth: 0.4, height: 1.5 },
        baseCost: 15000, tags: ['office', 'storage', 'display'],
        matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true,
      };
    }
    // Lateral/Shelf storage: LST-*, SSC-*
    if (baseName.startsWith('LST-') || baseName.startsWith('SSC-')) {
      return {
        file, source, category: 'storage',
        label: `Storage Cabinet ${formatLabel(baseName, 'Storage')}`,
        dimensions: { width: 0.9, depth: 0.5, height: 1.6 },
        baseCost: 14000, tags: ['office', 'storage'],
        matchedMaterialIds: LAMINATE_MATERIALS, isHeroMaterial: true,
      };
    }
    // Wardrobes: WARD-*
    if (baseName.startsWith('WARD-')) {
      const doors = baseName.includes('2D') ? '2-Door' : baseName.includes('3D') ? '3-Door' : 'Wardrobe';
      return {
        file, source, category: 'storage',
        label: `${doors} Wardrobe ${formatLabel(baseName, 'Wardrobe')}`,
        dimensions: baseName.includes('2D') ? { width: 1.2, depth: 0.6, height: 2.1 } : { width: 1.8, depth: 0.6, height: 2.1 },
        baseCost: baseName.includes('2D') ? 16000 : 22000, tags: ['bedroom', 'storage-heavy'],
        matchedMaterialIds: PREMIUM_WOOD_MATERIALS, isHeroMaterial: true,
      };
    }
    // Worksurfaces: WS-*
    if (baseName.startsWith('WS-')) {
      return {
        file, source, category: 'work',
        label: `Worksurface ${formatLabel(baseName, 'Worksurface')}`,
        dimensions: { width: 1.2, depth: 0.6, height: 0.03 },
        baseCost: 5000, tags: ['office', 'surface'],
        matchedMaterialIds: LAMINATE_MATERIALS, isHeroMaterial: true,
      };
    }
    // Pedestals: PED-*
    if (baseName.startsWith('PED-') || baseName.startsWith('MP-')) {
      const label = baseName.startsWith('PED-') ? `Pedestal ${formatLabel(baseName, 'Pedestal')}` : `Mobile Pedestal ${formatLabel(baseName, 'Ped')}`;
      return {
        file, source, category: 'storage',
        label, dimensions: { width: 0.4, depth: 0.5, height: 0.65 },
        baseCost: 6500, tags: ['office', 'under-desk'],
        matchedMaterialIds: METAL_MATERIALS, isHeroMaterial: true,
      };
    }
    // Returns/Bridges: RTN-*, BR-*
    if ((baseName.startsWith('RTN-') || baseName.startsWith('BR-')) && !baseName.startsWith('BR-BML')) {
      return {
        file, source, category: 'work',
        label: `Return Bridge ${formatLabel(baseName, 'Bridge')}`,
        dimensions: { width: 1.0, depth: 0.6, height: 0.03 },
        baseCost: 4000, tags: ['office', 'connector'],
        matchedMaterialIds: LAMINATE_MATERIALS, isHeroMaterial: true,
      };
    }
    // Meeting table bases: MTB-*
    if (baseName.startsWith('MTB-')) {
      return {
        file, source, category: 'dining',
        label: `Table Base ${formatLabel(baseName, 'Base')}`,
        dimensions: { width: 0.6, depth: 0.6, height: 0.72 },
        baseCost: 5000, tags: ['office', 'base', 'table-part'],
        matchedMaterialIds: METAL_MATERIALS, isHeroMaterial: true,
      };
    }
    // Legs/Posts: *LEG*, POST-*, RPL-*
    if (baseName.includes('LEG') || baseName.startsWith('POST-') || baseName.startsWith('RPL-')) {
      return {
        file, source, category: 'fixtures',
        label: `Furniture Leg ${formatLabel(baseName, 'Leg')}`,
        dimensions: { width: 0.08, depth: 0.08, height: 0.72 },
        baseCost: 800, tags: ['part', 'leg'],
        matchedMaterialIds: METAL_MATERIALS, isHeroMaterial: false, // sub-component, not a hero
      };
    }
    // Screens: SCR-*
    if (baseName.startsWith('SCR-')) {
      return {
        file, source, category: 'fixtures',
        label: `Privacy Screen ${formatLabel(baseName, 'Screen')}`,
        dimensions: { width: 1.2, depth: 0.05, height: 1.5 },
        baseCost: 5000, tags: ['office', 'privacy'],
        matchedMaterialIds: FABRIC_MATERIALS, isHeroMaterial: true,
      };
    }
    // Other Blueprint3D utility items
    if (baseName.startsWith('BC-') || baseName.startsWith('bin') || baseName === 'steel_bin') {
      return {
        file, source, category: 'decor',
        label: `${formatLabel(baseName, 'Bin')}`,
        dimensions: { width: 0.3, depth: 0.3, height: 0.5 },
        baseCost: 1200, tags: ['office', 'utility'],
        matchedMaterialIds: METAL_MATERIALS, isHeroMaterial: false,
      };
    }
    // Catch any remaining blueprint3d items
    return {
      file, source, category: 'storage',
      label: formatLabel(baseName, 'Furniture'),
      dimensions: { width: 1.0, depth: 0.5, height: 1.0 },
      baseCost: 8000, tags: ['office', 'generic'],
      matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: false,
    };
  }

  // ── Nirmit Models ──

  // Seating
  if (lower.includes('loungesofa') || lower.includes('sofa')) {
    if (lower.includes('corner')) return { file, source, category: 'seating', label: `L-Shaped Sofa`, dimensions: { width: 2.1, depth: 1.6, height: 0.85 }, baseCost: 45000, tags: ['modern', 'family', 'living'], matchedMaterialIds: PREMIUM_FABRIC_MATERIALS, isHeroMaterial: true };
    if (lower.includes('long')) return { file, source, category: 'seating', label: `3-Seater Sofa`, dimensions: { width: 1.8, depth: 0.8, height: 0.85 }, baseCost: 22000, tags: ['modern', 'compact', 'living'], matchedMaterialIds: PREMIUM_FABRIC_MATERIALS, isHeroMaterial: true };
    if (lower.includes('ottoman')) return { file, source, category: 'seating', label: `Storage Ottoman`, dimensions: { width: 0.9, depth: 0.4, height: 0.45 }, baseCost: 4000, tags: ['living', 'multi-use'], matchedMaterialIds: FABRIC_MATERIALS, isHeroMaterial: true };
    return { file, source, category: 'seating', label: `2-Seater Sofa`, dimensions: { width: 1.4, depth: 0.8, height: 0.85 }, baseCost: 16000, tags: ['modern', 'compact', 'living'], matchedMaterialIds: PREMIUM_FABRIC_MATERIALS, isHeroMaterial: true };
  }
  if (lower.includes('loungechair') || lower.includes('loungedesignchair')) {
    return { file, source, category: 'seating', label: `Lounge Chair`, dimensions: { width: 0.7, depth: 0.7, height: 0.9 }, baseCost: 9500, tags: ['accent', 'living'], matchedMaterialIds: PREMIUM_FABRIC_MATERIALS, isHeroMaterial: true };
  }
  if (lower.includes('loungedesignsofa')) {
    if (lower.includes('corner')) return { file, source, category: 'seating', label: `Designer L-Sofa`, dimensions: { width: 2.2, depth: 1.7, height: 0.85 }, baseCost: 55000, tags: ['designer', 'luxury', 'living'], matchedMaterialIds: PREMIUM_FABRIC_MATERIALS, isHeroMaterial: true };
    return { file, source, category: 'seating', label: `Designer Sofa`, dimensions: { width: 1.8, depth: 0.85, height: 0.85 }, baseCost: 35000, tags: ['designer', 'living'], matchedMaterialIds: PREMIUM_FABRIC_MATERIALS, isHeroMaterial: true };
  }
  if (lower.includes('bench')) {
    if (lower.includes('cushion')) return { file, source, category: 'seating', label: `Diwan`, dimensions: { width: 1.8, depth: 0.75, height: 0.4 }, baseCost: 12000, tags: ['traditional', 'indian', 'multi-use'], matchedMaterialIds: FABRIC_MATERIALS, isHeroMaterial: true };
    if (lower.includes('low')) return { file, source, category: 'seating', label: `Low Bench`, dimensions: { width: 1.5, depth: 0.5, height: 0.35 }, baseCost: 6000, tags: ['entryway', 'compact'], matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true };
    return { file, source, category: 'seating', label: 'Wooden Bench', dimensions: { width: 1.5, depth: 0.45, height: 0.45 }, baseCost: 5000, tags: ['entryway', 'dining'], matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true };
  }
  if (lower.includes('chair') || lower.includes('stool')) {
    if (lower.includes('desk') || lower.includes('office')) return { file, source, category: 'work', label: `Office Chair`, dimensions: { width: 0.5, depth: 0.5, height: 1.0 }, baseCost: 5500, tags: ['wfh', 'ergonomic'], matchedMaterialIds: FABRIC_MATERIALS, isHeroMaterial: true };
    if (lower.includes('modern') || lower.includes('rounded') || lower.includes('cushion')) return { file, source, category: 'seating', label: `Accent Chair`, dimensions: { width: 0.6, depth: 0.65, height: 0.85 }, baseCost: 6000, tags: ['accent', 'living'], matchedMaterialIds: PREMIUM_FABRIC_MATERIALS, isHeroMaterial: true };
    if (lower.includes('bar') || lower.includes('stoolbar')) return { file, source, category: 'seating', label: `Bar Stool`, dimensions: { width: 0.4, depth: 0.4, height: 0.75 }, baseCost: 3000, tags: ['kitchen', 'bar'], matchedMaterialIds: METAL_MATERIALS, isHeroMaterial: true };
    if (lower.includes('dining')) return { file, source, category: 'dining', label: `Dining Chair`, dimensions: { width: 0.45, depth: 0.45, height: 0.9 }, baseCost: 2800, tags: ['essential'], matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true };
    return { file, source, category: 'seating', label: `${formatLabel(baseName, 'Chair')}`, dimensions: { width: 0.5, depth: 0.5, height: 0.85 }, baseCost: 4000, tags: ['seating'], matchedMaterialIds: FABRIC_MATERIALS, isHeroMaterial: true };
  }
  if (lower.includes('pouffe') || lower.includes('pouf')) {
    return { file, source, category: 'seating', label: `Pouffe`, dimensions: { width: 0.4, depth: 0.4, height: 0.4 }, baseCost: 2500, tags: ['accent', 'portable'], matchedMaterialIds: FABRIC_MATERIALS, isHeroMaterial: true };
  }
  if (lower.includes('ottoman')) {
    return { file, source, category: 'seating', label: `Ottoman`, dimensions: { width: 0.5, depth: 0.5, height: 0.45 }, baseCost: 3000, tags: ['accent', 'footrest'], matchedMaterialIds: FABRIC_MATERIALS, isHeroMaterial: true };
  }
  if (lower.includes('diwan')) {
    return { file, source, category: 'seating', label: `Diwan`, dimensions: { width: 1.8, depth: 0.75, height: 0.4 }, baseCost: 12000, tags: ['traditional', 'indian', 'multi-use'], matchedMaterialIds: FABRIC_MATERIALS, isHeroMaterial: true };
  }

  // Sleeping
  if (lower.startsWith('bed')) {
    if (lower.includes('bunk')) return { file, source, category: 'sleeping', label: `Bunk Bed`, dimensions: { width: 1.0, depth: 2.0, height: 1.7 }, baseCost: 22000, tags: ['kids', 'space-saving'], matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true };
    if (lower.includes('double') || lower.includes('king')) return { file, source, category: 'sleeping', label: `King Bed`, dimensions: { width: 2.0, depth: 2.4, height: 1.1 }, baseCost: 35000, tags: ['luxury', 'master-bedroom'], matchedMaterialIds: PREMIUM_WOOD_MATERIALS, isHeroMaterial: true };
    if (lower.includes('queen')) return { file, source, category: 'sleeping', label: `Queen Bed`, dimensions: { width: 2.0, depth: 2.1, height: 1.1 }, baseCost: 28000, tags: ['standard', 'bedroom'], matchedMaterialIds: PREMIUM_WOOD_MATERIALS, isHeroMaterial: true };
    return { file, source, category: 'sleeping', label: `Single Bed`, dimensions: { width: 1.0, depth: 2.0, height: 0.9 }, baseCost: 14000, tags: ['compact', 'kids', 'guest'], matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true };
  }
  // Cabinet beds
  if (lower.includes('cabinetbed')) {
    return { file, source, category: 'sleeping', label: `Cabinet Bed`, dimensions: { width: 1.0, depth: 2.0, height: 1.0 }, baseCost: 18000, tags: ['space-saving', 'multi-use', 'studio'], matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true };
  }
  if (lower.includes('chest_drawers')) {
    return { file, source, category: 'storage', label: `Chest of Drawers`, dimensions: { width: 0.8, depth: 0.45, height: 1.1 }, baseCost: 10000, tags: ['bedroom', 'versatile'], matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true };
  }

  // Dining tables
  if (lower.includes('table')) {
    if (lower.includes('coffee')) {
      if (lower.includes('glass') && lower.includes('square')) return { file, source, category: 'dining', label: `Glass Coffee Table (Square)`, dimensions: { width: 0.8, depth: 0.8, height: 0.4 }, baseCost: 7500, tags: ['living', 'center-table', 'glass'], matchedMaterialIds: METAL_MATERIALS, isHeroMaterial: true };
      if (lower.includes('glass')) return { file, source, category: 'dining', label: `Glass Coffee Table`, dimensions: { width: 0.9, depth: 0.6, height: 0.4 }, baseCost: 7000, tags: ['living', 'glass'], matchedMaterialIds: METAL_MATERIALS, isHeroMaterial: true };
      if (lower.includes('square')) return { file, source, category: 'dining', label: `Coffee Table (Square)`, dimensions: { width: 0.7, depth: 0.7, height: 0.4 }, baseCost: 6000, tags: ['living', 'center-table'], matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true };
      return { file, source, category: 'dining', label: `Coffee Table`, dimensions: { width: 0.9, depth: 0.6, height: 0.4 }, baseCost: 6500, tags: ['living', 'center-table'], matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true };
    }
    if (lower.includes('side') || lower.includes('side_')) {
      if (lower.includes('drawer')) return { file, source, category: 'storage', label: `Bedside Table with Drawers`, dimensions: { width: 0.45, depth: 0.4, height: 0.55 }, baseCost: 4500, tags: ['bedroom', 'essential'], matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true };
      return { file, source, category: 'sleeping', label: `Side Table`, dimensions: { width: 0.45, depth: 0.4, height: 0.5 }, baseCost: 3500, tags: ['bedroom', 'compact'], matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true };
    }
    if (lower.includes('dining_4') || (lower.includes('table') && !lower.includes('cloth') && !lower.includes('cross') && !lower.includes('glass') && !lower.includes('round'))) {
      return { file, source, category: 'dining', label: `4-Seater Dining Table`, dimensions: { width: 1.2, depth: 0.9, height: 0.75 }, baseCost: 14000, tags: ['compact', 'nuclear-family'], matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true };
    }
    if (lower.includes('dining_6') || lower.includes('cross')) {
      return { file, source, category: 'dining', label: `6-Seater Dining Table`, dimensions: { width: 1.8, depth: 0.9, height: 0.75 }, baseCost: 18000, tags: ['family', 'entertaining'], matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true };
    }
    if (lower.includes('round')) return { file, source, category: 'dining', label: `Round Table`, dimensions: { width: 0.9, depth: 0.9, height: 0.75 }, baseCost: 10000, tags: ['compact', 'conversation'], matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true };
    if (lower.includes('cloth')) return { file, source, category: 'dining', label: `Table with Cloth`, dimensions: { width: 1.0, depth: 1.0, height: 0.75 }, baseCost: 8000, tags: ['traditional', 'covered'], matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true };
    if (lower.includes('glass')) return { file, source, category: 'dining', label: `Glass Dining Table`, dimensions: { width: 1.2, depth: 0.9, height: 0.75 }, baseCost: 16000, tags: ['modern', 'glass'], matchedMaterialIds: METAL_MATERIALS, isHeroMaterial: true };
    return { file, source, category: 'dining', label: `${formatLabel(baseName, 'Table')}`, dimensions: { width: 1.0, depth: 0.8, height: 0.75 }, baseCost: 8000, tags: ['dining'], matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true };
  }

  // Storage
  if (lower.includes('wardrobe')) {
    if (lower.includes('2d')) return { file, source, category: 'storage', label: `2-Door Wardrobe`, dimensions: { width: 1.2, depth: 0.6, height: 2.1 }, baseCost: 16000, tags: ['bedroom', 'compact'], matchedMaterialIds: PREMIUM_WOOD_MATERIALS, isHeroMaterial: true };
    if (lower.includes('3d')) return { file, source, category: 'storage', label: `3-Door Wardrobe`, dimensions: { width: 1.8, depth: 0.6, height: 2.1 }, baseCost: 22000, tags: ['master-bedroom', 'storage-heavy'], matchedMaterialIds: PREMIUM_WOOD_MATERIALS, isHeroMaterial: true };
    return { file, source, category: 'storage', label: formatLabel(baseName, 'Wardrobe'), dimensions: { width: 1.5, depth: 0.6, height: 2.1 }, baseCost: 19000, tags: ['bedroom', 'storage'], matchedMaterialIds: PREMIUM_WOOD_MATERIALS, isHeroMaterial: true };
  }
  if (lower.startsWith('bookcase') || lower.startsWith('bookshelf')) {
    if (lower.includes('closed') && lower.includes('doors')) return { file, source, category: 'storage', label: `Bookshelf with Cabinet`, dimensions: { width: 0.8, depth: 0.35, height: 1.8 }, baseCost: 9000, tags: ['study', 'storage'], matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true };
    if (lower.includes('closed') && lower.includes('wide')) return { file, source, category: 'storage', label: `Wide Closed Bookshelf`, dimensions: { width: 1.2, depth: 0.35, height: 1.8 }, baseCost: 11000, tags: ['study', 'storage'], matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true };
    if (lower.includes('closed')) return { file, source, category: 'storage', label: `Closed Bookshelf`, dimensions: { width: 0.8, depth: 0.35, height: 1.8 }, baseCost: 8500, tags: ['study', 'storage'], matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true };
    if (lower.includes('open') && lower.includes('low')) return { file, source, category: 'storage', label: `Low Open Shelf`, dimensions: { width: 0.9, depth: 0.3, height: 0.9 }, baseCost: 5000, tags: ['display', 'compact'], matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true };
    if (lower.includes('open')) return { file, source, category: 'storage', label: `Open Bookshelf`, dimensions: { width: 0.9, depth: 0.3, height: 1.8 }, baseCost: 8000, tags: ['study', 'display'], matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true };
    return { file, source, category: 'storage', label: formatLabel(baseName, 'Bookshelf'), dimensions: { width: 0.9, depth: 0.3, height: 1.8 }, baseCost: 8000, tags: ['study', 'storage'], matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true };
  }
  if (lower.includes('cabinet') || lower.includes('simplecabinet')) {
    if (lower.includes('television')) {
      if (lower.includes('doors')) return { file, source, category: 'storage', label: `TV Unit with Doors`, dimensions: { width: 1.5, depth: 0.4, height: 0.5 }, baseCost: 11000, tags: ['living', 'entertainment'], matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true };
      return { file, source, category: 'storage', label: `TV Unit`, dimensions: { width: 1.5, depth: 0.4, height: 0.5 }, baseCost: 9500, tags: ['living', 'entertainment'], matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true };
    }
    return { file, source, category: 'storage', label: formatLabel(baseName, 'Cabinet'), dimensions: { width: 1.0, depth: 0.4, height: 1.5 }, baseCost: 7000, tags: ['storage', 'versatile'], matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true };
  }
  if (lower.includes('shoe_rack')) {
    return { file, source, category: 'storage', label: `Shoe Rack`, dimensions: { width: 1.0, depth: 0.35, height: 1.2 }, baseCost: 5500, tags: ['entryway', 'compact'], matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true };
  }
  if (lower.includes('coatrack') || lower.includes('coat_rack')) {
    return { file, source, category: 'storage', label: `Coat Rack`, dimensions: { width: 0.5, depth: 0.5, height: 1.8 }, baseCost: 3500, tags: ['entryway', 'utility'], matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true };
  }
  if (lower.includes('overhead_cabinet')) {
    return { file, source, category: 'kitchen', label: `Overhead Cabinet`, dimensions: { width: 0.9, depth: 0.35, height: 0.7 }, baseCost: 5500, tags: ['storage', 'modular'], matchedMaterialIds: KITCHEN_MATERIALS, isHeroMaterial: true };
  }
  if (lower.includes('tv_unit')) {
    return { file, source, category: 'storage', label: `TV Unit`, dimensions: { width: 1.5, depth: 0.4, height: 0.5 }, baseCost: 9500, tags: ['living', 'entertainment'], matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true };
  }
  if (lower.includes('trolley')) {
    return { file, source, category: 'kitchen', label: `Kitchen Trolley`, dimensions: { width: 0.9, depth: 0.5, height: 0.85 }, baseCost: 9000, tags: ['portable', 'compact'], matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true };
  }

  // Desks
  if (lower.startsWith('desk')) {
    if (lower.includes('corner')) return { file, source, category: 'work', label: `Corner Desk`, dimensions: { width: 1.4, depth: 1.4, height: 0.75 }, baseCost: 12000, tags: ['wfh', 'corner'], matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true };
    return { file, source, category: 'work', label: `Study Desk`, dimensions: { width: 1.0, depth: 0.5, height: 0.75 }, baseCost: 7000, tags: ['wfh', 'study', 'compact'], matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true };
  }

  // Pooja
  if (lower.includes('pooja')) {
    if (lower.includes('wall')) return { file, source, category: 'pooja', label: `Wall-Mounted Pooja Unit`, dimensions: { width: 0.6, depth: 0.3, height: 0.5 }, baseCost: 6500, tags: ['traditional', 'mandir', 'space-saving'], matchedMaterialIds: POOJA_MATERIALS, isHeroMaterial: true };
    if (lower.includes('floor')) return { file, source, category: 'pooja', label: `Floor Pooja Mandir`, dimensions: { width: 0.9, depth: 0.5, height: 1.0 }, baseCost: 15000, tags: ['traditional', 'mandir', 'statement'], matchedMaterialIds: POOJA_MATERIALS, isHeroMaterial: true };
    if (lower.includes('chowki')) return { file, source, category: 'pooja', label: `Pooja Chowki`, dimensions: { width: 0.45, depth: 0.35, height: 0.15 }, baseCost: 2000, tags: ['essential', 'portable'], matchedMaterialIds: POOJA_MATERIALS, isHeroMaterial: true };
  }

  // Kitchen
  if (lower.includes('kitchen') || lower.startsWith('counter')) {
    if (lower.includes('cabinetcornerinner') || lower.includes('l') && !lower.includes('cabinetupper')) return { file, source, category: 'kitchen', label: `L-Shaped Kitchen Counter`, dimensions: { width: 1.8, depth: 1.5, height: 0.85 }, baseCost: 28000, tags: ['modular', 'family-kitchen'], matchedMaterialIds: KITCHEN_MATERIALS, isHeroMaterial: true };
    if (lower.includes('cabinetupper') && lower.includes('corner')) return { file, source, category: 'kitchen', label: `Overhead Corner Cabinet`, dimensions: { width: 0.9, depth: 0.6, height: 0.7 }, baseCost: 7000, tags: ['corner', 'modular'], matchedMaterialIds: KITCHEN_MATERIALS, isHeroMaterial: true };
    if (lower.includes('cabinetupper') && lower.includes('double')) return { file, source, category: 'kitchen', label: `Double Overhead Cabinet`, dimensions: { width: 1.2, depth: 0.35, height: 0.7 }, baseCost: 8000, tags: ['storage', 'modular'], matchedMaterialIds: KITCHEN_MATERIALS, isHeroMaterial: true };
    if (lower.includes('cabinetupper') && lower.includes('low')) return { file, source, category: 'kitchen', label: `Low Overhead Cabinet`, dimensions: { width: 0.9, depth: 0.35, height: 0.5 }, baseCost: 4500, tags: ['compact', 'modular'], matchedMaterialIds: KITCHEN_MATERIALS, isHeroMaterial: true };
    if (lower.includes('cabinetupper')) return { file, source, category: 'kitchen', label: `Overhead Cabinet`, dimensions: { width: 0.9, depth: 0.35, height: 0.7 }, baseCost: 5500, tags: ['storage', 'modular'], matchedMaterialIds: KITCHEN_MATERIALS, isHeroMaterial: true };
    if (lower.includes('cabinetcornerround')) return { file, source, category: 'kitchen', label: `Round Corner Cabinet`, dimensions: { width: 0.9, depth: 0.9, height: 0.85 }, baseCost: 10000, tags: ['corner', 'modular'], matchedMaterialIds: KITCHEN_MATERIALS, isHeroMaterial: true };
    if (lower.includes('cabinetdrawer')) return { file, source, category: 'kitchen', label: `Kitchen Drawer Unit`, dimensions: { width: 0.6, depth: 0.6, height: 0.85 }, baseCost: 7000, tags: ['modular'], matchedMaterialIds: KITCHEN_MATERIALS, isHeroMaterial: true };
    if (lower.includes('cabinet')) return { file, source, category: 'kitchen', label: `Straight Kitchen Counter`, dimensions: { width: 0.9, depth: 0.6, height: 0.85 }, baseCost: 12000, tags: ['modular', 'essential'], matchedMaterialIds: KITCHEN_MATERIALS, isHeroMaterial: true };
    if (lower.includes('sink')) return { file, source, category: 'kitchen', label: `Kitchen Sink Unit`, dimensions: { width: 1.0, depth: 0.6, height: 0.85 }, baseCost: 8000, tags: ['essential'], matchedMaterialIds: METAL_MATERIALS, isHeroMaterial: true };
    if (lower.includes('stove')) return { file, source, category: 'kitchen', label: `Kitchen Stove`, dimensions: { width: 0.6, depth: 0.6, height: 0.85 }, baseCost: 6000, tags: ['essential'], matchedMaterialIds: METAL_MATERIALS, isHeroMaterial: true };
    if (lower.includes('fridge')) {
      if (lower.includes('builtin')) return { file, source, category: 'kitchen', label: `Built-in Fridge`, dimensions: { width: 0.7, depth: 0.7, height: 1.8 }, baseCost: 45000, tags: ['appliance', 'modular'], matchedMaterialIds: ['white_laminate'], isHeroMaterial: true };
      if (lower.includes('large')) return { file, source, category: 'kitchen', label: `Large Fridge`, dimensions: { width: 0.8, depth: 0.75, height: 1.9 }, baseCost: 38000, tags: ['appliance', 'family'], matchedMaterialIds: ['white_laminate'], isHeroMaterial: true };
      if (lower.includes('small')) return { file, source, category: 'kitchen', label: `Compact Fridge`, dimensions: { width: 0.55, depth: 0.55, height: 1.2 }, baseCost: 18000, tags: ['appliance', 'compact'], matchedMaterialIds: ['white_laminate'], isHeroMaterial: true };
      return { file, source, category: 'kitchen', label: `Fridge`, dimensions: { width: 0.7, depth: 0.7, height: 1.7 }, baseCost: 28000, tags: ['appliance'], matchedMaterialIds: ['white_laminate'], isHeroMaterial: true };
    }
    if (lower.includes('microwave')) return { file, source, category: 'kitchen', label: `Microwave`, dimensions: { width: 0.5, depth: 0.4, height: 0.35 }, baseCost: 8000, tags: ['appliance'], matchedMaterialIds: ['metal_chrome'], isHeroMaterial: true };
    if (lower.includes('chimney') || lower.includes('hood')) return { file, source, category: 'kitchen', label: `Chimney Unit`, dimensions: { width: 0.9, depth: 0.6, height: 0.15 }, baseCost: 7500, tags: ['essential', 'modular'], matchedMaterialIds: METAL_MATERIALS, isHeroMaterial: true };
    if (lower.includes('bar') && !lower.includes('stool')) return { file, source, category: 'kitchen', label: `Kitchen Bar Unit`, dimensions: { width: 1.2, depth: 0.6, height: 0.85 }, baseCost: 11000, tags: ['entertaining'], matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: true };
    if (lower.includes('blender')) return { file, source, category: 'kitchen', label: `Blender`, dimensions: { width: 0.2, depth: 0.2, height: 0.4 }, baseCost: 3000, tags: ['appliance', 'small'], matchedMaterialIds: [], isHeroMaterial: false };
    if (lower.includes('coffee')) return { file, source, category: 'kitchen', label: `Coffee Machine`, dimensions: { width: 0.3, depth: 0.35, height: 0.4 }, baseCost: 12000, tags: ['appliance'], matchedMaterialIds: [], isHeroMaterial: false };
    if (lower.includes('toaster')) return { file, source, category: 'kitchen', label: `Toaster`, dimensions: { width: 0.25, depth: 0.2, height: 0.2 }, baseCost: 2000, tags: ['appliance', 'small'], matchedMaterialIds: [], isHeroMaterial: false };
    if (lower.includes('dryer')) return { file, source, category: 'kitchen', label: `Dryer`, dimensions: { width: 0.6, depth: 0.6, height: 0.85 }, baseCost: 22000, tags: ['appliance'], matchedMaterialIds: ['white_laminate'], isHeroMaterial: false };
    if (lower.includes('washer')) return { file, source, category: 'kitchen', label: `Washing Machine`, dimensions: { width: 0.6, depth: 0.6, height: 0.85 }, baseCost: 20000, tags: ['appliance'], matchedMaterialIds: ['white_laminate'], isHeroMaterial: false };
  }

  // Decor items
  if (lower.includes('lamp')) {
    if (lower.includes('floor')) return { file, source, category: 'decor', label: `Floor Lamp`, dimensions: { width: 0.3, depth: 0.3, height: 1.5 }, baseCost: 3000, tags: ['lighting', 'ambient'], matchedMaterialIds: METAL_MATERIALS, isHeroMaterial: true };
    if (lower.includes('table')) return { file, source, category: 'decor', label: `Table Lamp`, dimensions: { width: 0.2, depth: 0.2, height: 0.45 }, baseCost: 1800, tags: ['lighting', 'ambient'], matchedMaterialIds: METAL_MATERIALS, isHeroMaterial: true };
    if (lower.includes('ceiling')) return { file, source, category: 'fixtures', label: `Ceiling Light`, dimensions: { width: 0.4, depth: 0.4, height: 0.2 }, baseCost: 2500, tags: ['lighting', 'essential'], matchedMaterialIds: METAL_MATERIALS, isHeroMaterial: true };
    if (lower.includes('wall')) return { file, source, category: 'decor', label: `Wall Lamp`, dimensions: { width: 0.15, depth: 0.2, height: 0.3 }, baseCost: 2000, tags: ['lighting'], matchedMaterialIds: METAL_MATERIALS, isHeroMaterial: true };
    return { file, source, category: 'decor', label: formatLabel(baseName, 'Lamp'), dimensions: { width: 0.25, depth: 0.25, height: 0.5 }, baseCost: 2000, tags: ['lighting'], matchedMaterialIds: METAL_MATERIALS, isHeroMaterial: true };
  }
  if (lower.includes('plant') || lower.includes('potted')) {
    return { file, source, category: 'decor', label: `${formatLabel(baseName, 'Plant')}`, dimensions: { width: 0.3, depth: 0.3, height: 0.6 }, baseCost: 800, tags: ['greenery', 'natural'], matchedMaterialIds: [], isHeroMaterial: true };
  }
  if (lower.includes('rug')) {
    if (lower.includes('doormat')) return { file, source, category: 'decor', label: `Doormat`, dimensions: { width: 0.6, depth: 0.4, height: 0.02 }, baseCost: 600, tags: ['entryway'], matchedMaterialIds: ['fabric_jute'], isHeroMaterial: true };
    if (lower.includes('round') || lower.includes('rounded')) return { file, source, category: 'decor', label: `Round Rug`, dimensions: { width: 1.5, depth: 1.5, height: 0.02 }, baseCost: 3500, tags: ['floor', 'textile'], matchedMaterialIds: ['fabric_cotton', 'fabric_jute'], isHeroMaterial: true };
    if (lower.includes('square')) return { file, source, category: 'decor', label: `Square Rug`, dimensions: { width: 1.5, depth: 1.5, height: 0.02 }, baseCost: 3000, tags: ['floor', 'textile'], matchedMaterialIds: ['fabric_cotton', 'fabric_jute'], isHeroMaterial: true };
    return { file, source, category: 'decor', label: `Rectangular Rug`, dimensions: { width: 2.0, depth: 1.5, height: 0.02 }, baseCost: 4000, tags: ['floor', 'textile'], matchedMaterialIds: ['fabric_cotton', 'fabric_jute'], isHeroMaterial: true };
  }
  if (lower.includes('pillow')) {
    return { file, source, category: 'decor', label: `${formatLabel(baseName, 'Cushion')}`, dimensions: { width: 0.45, depth: 0.15, height: 0.45 }, baseCost: 600, tags: ['textile', 'accent'], matchedMaterialIds: FABRIC_MATERIALS, isHeroMaterial: true };
  }
  if (lower.includes('mirror')) {
    return { file, source, category: 'fixtures', label: `Wall Mirror`, dimensions: { width: 0.6, depth: 0.03, height: 0.9 }, baseCost: 3000, tags: ['bedroom', 'essential'], matchedMaterialIds: METAL_MATERIALS, isHeroMaterial: true };
  }
  // Electronics
  if (lower.includes('television') || lower.includes('tv')) {
    if (lower.includes('modern')) return { file, source, category: 'fixtures', label: `Modern TV`, dimensions: { width: 1.2, depth: 0.05, height: 0.7 }, baseCost: 35000, tags: ['entertainment'], matchedMaterialIds: [], isHeroMaterial: true };
    if (lower.includes('vintage')) return { file, source, category: 'decor', label: `Vintage TV`, dimensions: { width: 0.6, depth: 0.5, height: 0.5 }, baseCost: 5000, tags: ['retro', 'decorative'], matchedMaterialIds: [], isHeroMaterial: false };
    if (lower.includes('antenna')) return { file, source, category: 'decor', label: `TV Antenna`, dimensions: { width: 0.15, depth: 0.15, height: 0.4 }, baseCost: 800, tags: ['accessory'], matchedMaterialIds: [], isHeroMaterial: false };
    return { file, source, category: 'fixtures', label: `TV Screen`, dimensions: { width: 1.0, depth: 0.05, height: 0.6 }, baseCost: 25000, tags: ['entertainment'], matchedMaterialIds: [], isHeroMaterial: true };
  }
  if (lower.includes('speaker')) {
    return { file, source, category: 'decor', label: `${formatLabel(baseName, 'Speaker')}`, dimensions: { width: 0.2, depth: 0.2, height: 0.3 }, baseCost: 3000, tags: ['audio', 'accessory'], matchedMaterialIds: [], isHeroMaterial: false };
  }
  if (lower.includes('radio')) {
    return { file, source, category: 'decor', label: `Radio`, dimensions: { width: 0.2, depth: 0.15, height: 0.15 }, baseCost: 1500, tags: ['retro', 'decorative'], matchedMaterialIds: [], isHeroMaterial: false };
  }
  if (lower.includes('computer') || lower.includes('laptop') || lower.includes('keyboard') || lower.includes('mouse') || lower.includes('screen')) {
    if (lower.includes('laptop')) return { file, source, category: 'work', label: `Laptop`, dimensions: { width: 0.35, depth: 0.25, height: 0.02 }, baseCost: 50000, tags: ['electronics', 'wfh'], matchedMaterialIds: [], isHeroMaterial: false };
    if (lower.includes('screen')) return { file, source, category: 'work', label: `Monitor`, dimensions: { width: 0.55, depth: 0.05, height: 0.35 }, baseCost: 12000, tags: ['wfh', 'electronics'], matchedMaterialIds: [], isHeroMaterial: false };
    return { file, source, category: 'work', label: formatLabel(baseName, 'Accessory'), dimensions: { width: 0.2, depth: 0.1, height: 0.05 }, baseCost: 1500, tags: ['wfh', 'electronics'], matchedMaterialIds: [], isHeroMaterial: false };
  }
  // Bathroom fixtures  
  if (lower.includes('bathroom') || lower.includes('bathtub') || lower.includes('toilet') || lower.includes('sink') || lower.includes('shower')) {
    if (lower.includes('bathtub')) return { file, source, category: 'fixtures', label: `Bathtub`, dimensions: { width: 1.5, depth: 0.7, height: 0.55 }, baseCost: 25000, tags: ['bathroom', 'luxury'], matchedMaterialIds: ['tile_ceramic'], isHeroMaterial: true };
    if (lower.includes('toilet')) return { file, source, category: 'fixtures', label: `Toilet`, dimensions: { width: 0.4, depth: 0.65, height: 0.4 }, baseCost: 8000, tags: ['bathroom', 'essential'], matchedMaterialIds: ['tile_ceramic'], isHeroMaterial: false };
    if (lower.includes('shower')) return { file, source, category: 'fixtures', label: `Shower`, dimensions: { width: 0.25, depth: 0.25, height: 0.15 }, baseCost: 3000, tags: ['bathroom'], matchedMaterialIds: METAL_MATERIALS, isHeroMaterial: false };
    if (lower.includes('sink') || lower.includes('bathroomsink')) return { file, source, category: 'fixtures', label: `Bathroom Sink`, dimensions: { width: 0.5, depth: 0.4, height: 0.15 }, baseCost: 4000, tags: ['bathroom', 'essential'], matchedMaterialIds: ['tile_ceramic', 'metal_chrome'], isHeroMaterial: false };
    if (lower.includes('mirror')) return { file, source, category: 'fixtures', label: `Bathroom Mirror`, dimensions: { width: 0.5, depth: 0.03, height: 0.6 }, baseCost: 2000, tags: ['bathroom', 'essential'], matchedMaterialIds: METAL_MATERIALS, isHeroMaterial: false };
    if (lower.includes('cabinet')) return { file, source, category: 'fixtures', label: `Bathroom Cabinet`, dimensions: { width: 0.5, depth: 0.25, height: 0.6 }, baseCost: 4500, tags: ['bathroom', 'storage'], matchedMaterialIds: LAMINATE_MATERIALS, isHeroMaterial: false };
    return { file, source, category: 'fixtures', label: formatLabel(baseName, 'Bathroom Fixture'), dimensions: { width: 0.5, depth: 0.4, height: 0.3 }, baseCost: 3000, tags: ['bathroom'], matchedMaterialIds: METAL_MATERIALS, isHeroMaterial: false };
  }
  // Fan
  if (lower.includes('fan')) {
    return { file, source, category: 'fixtures', label: `Ceiling Fan`, dimensions: { width: 1.2, depth: 1.2, height: 0.3 }, baseCost: 3500, tags: ['essential', 'all-rooms'], matchedMaterialIds: METAL_MATERIALS, isHeroMaterial: true };
  }
  // Trashcan
  if (lower.includes('trashcan') || lower.includes('trash')) {
    return { file, source, category: 'decor', label: `Trash Can`, dimensions: { width: 0.25, depth: 0.25, height: 0.4 }, baseCost: 800, tags: ['utility'], matchedMaterialIds: METAL_MATERIALS, isHeroMaterial: false };
  }
  // Cardboard boxes — skip these, they're utility/props
  if (lower.includes('cardboard')) {
    return { file, source, category: 'decor', label: formatLabel(baseName, 'Box'), dimensions: { width: 0.4, depth: 0.3, height: 0.3 }, baseCost: 200, tags: ['prop', 'utility'], matchedMaterialIds: [], isHeroMaterial: false };
  }
  // Books
  if (lower.includes('book') && !lower.includes('bookcase') && !lower.includes('bookshelf')) {
    return { file, source, category: 'decor', label: `Book Set`, dimensions: { width: 0.3, depth: 0.2, height: 0.15 }, baseCost: 500, tags: ['decorative', 'prop'], matchedMaterialIds: [], isHeroMaterial: false };
  }
  // Bear — decorative prop
  if (lower.includes('bear')) {
    return { file, source, category: 'decor', label: `Teddy Bear`, dimensions: { width: 0.2, depth: 0.2, height: 0.3 }, baseCost: 400, tags: ['kids', 'decorative'], matchedMaterialIds: [], isHeroMaterial: false };
  }
  // Door — skip, handled by room config
  if (lower.includes('door')) {
    return { file, source, category: 'fixtures', label: `Door`, dimensions: { width: 0.9, depth: 0.05, height: 2.1 }, baseCost: 8000, tags: ['architectural'], matchedMaterialIds: WOOD_MATERIALS, isHeroMaterial: false };
  }
  // Test/utility files — skip
  if (lower.includes('test') || lower.includes('hor-arr')) {
    return null;
  }

  // ── Catch-all ──
  return {
    file, source, category: 'decor',
    label: formatLabel(baseName, 'Item'),
    dimensions: { width: 0.5, depth: 0.5, height: 0.5 },
    baseCost: 1000, tags: ['misc'],
    matchedMaterialIds: [], isHeroMaterial: false,
  };
}

function formatLabel(baseName: string, fallback: string): string {
  // Convert camelCase/PascalCase and kebab-case to Title Case
  const readable = baseName
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
  const words = readable.split(' ').filter(w => w.length > 0);
  const titled = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  return titled || fallback;
}

function dimensionsToSizeStr(dims: { width: number; depth: number; height: number }): string {
  return `${dims.width.toFixed(1)}m x ${dims.depth.toFixed(1)}m x ${dims.height.toFixed(2)}m`;
}

// ─── Main Generation Logic ──────────────────────────────────────

let globalId = 0;
function nextId(): string {
  return `cat_${String(++globalId).padStart(4, '0')}`;
}

function buildCatalog(): {
  catalogItems: CatalogItem[];
  heroMapping: HeroModelEntry[];
  stats: { total: number; heroes: number; variants: number; primitives: number; decor: number; byCategory: Record<string, number> };
} {
  const catalogItems: CatalogItem[] = [];
  const heroMapping: HeroModelEntry[] = [];
  const stats = { total: 0, heroes: 0, variants: 0, primitives: 0, decor: 0, byCategory: {} as Record<string, number> };

  // Phase 1: Scan all models
  const allModels: ModelClassification[] = [];

  // Scan nirmit models
  if (fs.existsSync(NIRMIT_MODELS_DIR)) {
    const nirmitFiles = fs.readdirSync(NIRMIT_MODELS_DIR).filter(f => f.endsWith('.glb'));
    for (const file of nirmitFiles) {
      const classification = classifyModel(file, 'nirmit');
      if (classification) allModels.push(classification);
    }
  }

  // Scan Blueprint3D models
  if (fs.existsSync(BLUEPRINT_MODELS_DIR)) {
    const bpFiles = fs.readdirSync(BLUEPRINT_MODELS_DIR).filter(f => f.endsWith('.glb'));
    for (const file of bpFiles) {
      const classification = classifyModel(file, 'blueprint3d');
      if (classification) allModels.push(classification);
    }
  }

  // Phase 2: Generate hero entries from unique furniture types (deduplicate by label)
  const seenHeroLabels = new Set<string>();
  const heroes: ModelClassification[] = [];
  for (const model of allModels) {
    if (!model.isHeroMaterial) continue;
    const key = model.label.toLowerCase();
    if (seenHeroLabels.has(key)) continue;
    seenHeroLabels.add(key);
    heroes.push(model);
  }

  for (const hero of heroes) {
    const id = nextId();
    const modelPath = hero.source === 'nirmit' ? `/models/${hero.file}` : `bp:/models/glb/${hero.file}`;

    catalogItems.push({
      id,
      source: 'hero',
      category: hero.category,
      label: hero.label,
      dimensions: hero.dimensions,
      modelPath,
      thumbnail: '',
      tags: hero.tags,
      quality: 'hero',
      pricing: {
        baseCost: hero.baseCost,
        costUnit: 'piece' as CostUnit,
        materialIds: hero.matchedMaterialIds,
        laborCost: CATEGORY_LABOR[hero.category] || 0,
        leadTime: hero.baseCost > 20000 ? '21_days' : hero.baseCost > 5000 ? '15_days' : '7_days',
      },
    });

    heroMapping.push({
      heroId: id,
      heroLabel: hero.label,
      furnitureType: hero.category,
      approximateSize: dimensionsToSizeStr(hero.dimensions),
      verifiedModelPath: modelPath,
      sourceAsset: hero.file,
      verified: true,
    });
  }

  const heroCount = heroes.length;

  // Phase 3: Generate size variants (compact and large) for heroes with significant dimensions
  const heroEntries = catalogItems.filter(item => item.source === 'hero');
  for (const hero of heroEntries) {
    // Compact variant (0.8× dimensions, 0.82× cost) — only if makes sense
    if (hero.dimensions.width >= 0.6 && hero.dimensions.depth >= 0.4) {
      catalogItems.push({
        id: nextId(),
        source: 'variant',
        category: hero.category,
        label: `${hero.label} (Compact)`,
        dimensions: {
          width: Math.round(hero.dimensions.width * 0.8 * 100) / 100,
          depth: Math.round(hero.dimensions.depth * 0.8 * 100) / 100,
          height: hero.dimensions.height,
        },
        modelPath: hero.modelPath,
        thumbnail: '',
        tags: [...hero.tags, 'compact', 'space-saving'],
        quality: 'standard',
        pricing: {
          baseCost: Math.round(hero.pricing.baseCost * 0.82),
          costUnit: hero.pricing.costUnit,
          materialIds: hero.pricing.materialIds,
          laborCost: Math.round(hero.pricing.laborCost * 0.85),
          leadTime: hero.pricing.leadTime,
        },
      });
    }

    // Large variant (1.25× dimensions, 1.22× cost)
    if (hero.dimensions.width <= 3.0 && hero.dimensions.depth <= 3.0) {
      catalogItems.push({
        id: nextId(),
        source: 'variant',
        category: hero.category,
        label: `${hero.label} (Large)`,
        dimensions: {
          width: Math.round(hero.dimensions.width * 1.25 * 100) / 100,
          depth: Math.round(hero.dimensions.depth * 1.25 * 100) / 100,
          height: hero.dimensions.height * 1.05 > 0 ? Math.round(hero.dimensions.height * 1.05 * 100) / 100 : hero.dimensions.height,
        },
        modelPath: hero.modelPath,
        thumbnail: '',
        tags: [...hero.tags, 'large', 'spacious'],
        quality: 'standard',
        pricing: {
          baseCost: Math.round(hero.pricing.baseCost * 1.22),
          costUnit: hero.pricing.costUnit,
          materialIds: hero.pricing.materialIds,
          laborCost: Math.round(hero.pricing.laborCost * 1.15),
          leadTime: hero.pricing.baseCost > 20000 ? '21_days' : '15_days',
        },
      });
    }
  }

  // Phase 4: Generate material variants for heroes (additional entries with different materials)
  // For each hero that has material options, create entries for top material alternatives
  for (const hero of heroEntries) {
    const materialIds = hero.pricing.materialIds;
    if (materialIds.length <= 1) continue;

    // Create a material-variant entry for each material option beyond the first
    for (let i = 1; i < Math.min(materialIds.length, 5); i++) {
      const matId = materialIds[i];
      const mat = MATERIALS[matId];
      if (!mat) continue;

      catalogItems.push({
        id: nextId(),
        source: 'variant',
        category: hero.category,
        label: `${hero.label} (${mat.label})`,
        dimensions: { ...hero.dimensions },
        modelPath: hero.modelPath,
        thumbnail: '',
        tags: [...hero.tags, mat.materialId],
        quality: 'standard',
        pricing: {
          baseCost: Math.round(hero.pricing.baseCost * mat.costMultiplier),
          costUnit: hero.pricing.costUnit,
          materialIds: [matId],
          laborCost: hero.pricing.laborCost,
          leadTime: mat.costMultiplier > 1.5 ? '21_days' : hero.pricing.leadTime,
        },
      });
    }
  }

  // Phase 5: Generate parametric decor items (primitives)
  const primitiveConfigs: Array<{
    name: string;
    label: string;
    category: CatalogCategory;
    dimensions: { width: number; depth: number; height: number };
    baseCost: number;
    materialIds: MaterialId[];
    tags: string[];
  }> = [
    // Bookshelves — parametric
    { name: 'bookshelf', label: 'Bookshelf (3-tier)', category: 'storage', dimensions: { width: 0.9, depth: 0.3, height: 1.8 }, baseCost: 8000, materialIds: WOOD_MATERIALS, tags: ['study', 'display', 'parametric'] },
    { name: 'bookshelf', label: 'Bookshelf (5-tier)', category: 'storage', dimensions: { width: 0.9, depth: 0.3, height: 2.1 }, baseCost: 10000, materialIds: WOOD_MATERIALS, tags: ['study', 'tall', 'parametric'] },
    // TV Units — parametric
    { name: 'tvUnit', label: 'TV Unit (Compact)', category: 'storage', dimensions: { width: 1.2, depth: 0.4, height: 0.5 }, baseCost: 7500, materialIds: WOOD_MATERIALS, tags: ['living', 'entertainment', 'parametric'] },
    { name: 'tvUnit', label: 'TV Unit (Wide)', category: 'storage', dimensions: { width: 1.8, depth: 0.45, height: 0.5 }, baseCost: 12000, materialIds: WOOD_MATERIALS, tags: ['living', 'entertainment', 'parametric'] },
    // Pooja niches
    { name: 'poojaNiche', label: 'Pooja Niche (Small)', category: 'pooja', dimensions: { width: 0.5, depth: 0.25, height: 0.5 }, baseCost: 5000, materialIds: POOJA_MATERIALS, tags: ['mandir', 'space-saving', 'parametric'] },
    { name: 'poojaNiche', label: 'Pooja Niche (Large)', category: 'pooja', dimensions: { width: 0.75, depth: 0.35, height: 0.65 }, baseCost: 8000, materialIds: POOJA_MATERIALS, tags: ['mandir', 'statement', 'parametric'] },
    // Counter surfaces
    { name: 'counter', label: 'Counter Surface (Straight)', category: 'kitchen', dimensions: { width: 1.2, depth: 0.6, height: 0.85 }, baseCost: 10000, materialIds: KITCHEN_MATERIALS, tags: ['modular', 'parametric'] },
    { name: 'counter', label: 'Counter Surface (Long)', category: 'kitchen', dimensions: { width: 2.4, depth: 0.6, height: 0.85 }, baseCost: 18000, materialIds: KITCHEN_MATERIALS, tags: ['modular', 'family-kitchen', 'parametric'] },
    // Curtains
    { name: 'curtain', label: 'Curtain (Standard)', category: 'decor', dimensions: { width: 1.5, depth: 0.05, height: 2.4 }, baseCost: 2000, materialIds: ['fabric_cotton', 'fabric_linen'], tags: ['window', 'textile', 'parametric'] },
    { name: 'curtain', label: 'Curtain (Blackout)', category: 'decor', dimensions: { width: 1.5, depth: 0.08, height: 2.4 }, baseCost: 3500, materialIds: ['fabric_cotton', 'fabric_linen', 'fabric_velvet'], tags: ['window', 'textile', 'blackout', 'parametric'] },
    // Shelving
    { name: 'shelving', label: 'Wall Shelf (Single)', category: 'storage', dimensions: { width: 0.9, depth: 0.25, height: 0.03 }, baseCost: 1500, materialIds: WOOD_MATERIALS, tags: ['display', 'wall-mounted', 'parametric'] },
    { name: 'shelving', label: 'Wall Shelf (Double)', category: 'storage', dimensions: { width: 0.9, depth: 0.25, height: 0.6 }, baseCost: 2500, materialIds: WOOD_MATERIALS, tags: ['display', 'wall-mounted', 'parametric'] },
    // Wall art
    { name: 'wallArt', label: 'Wall Art (Small)', category: 'decor', dimensions: { width: 0.5, depth: 0.03, height: 0.7 }, baseCost: 1500, materialIds: [], tags: ['decorative', 'wall', 'parametric'] },
    { name: 'wallArt', label: 'Wall Art (Large)', category: 'decor', dimensions: { width: 0.9, depth: 0.03, height: 1.2 }, baseCost: 3500, materialIds: [], tags: ['decorative', 'wall', 'statement', 'parametric'] },
    // Bar stools
    { name: 'stool', label: 'Bar Stool (Wood)', category: 'seating', dimensions: { width: 0.4, depth: 0.4, height: 0.75 }, baseCost: 2500, materialIds: WOOD_MATERIALS, tags: ['kitchen', 'bar', 'parametric'] },
    { name: 'stool', label: 'Bar Stool (Metal)', category: 'seating', dimensions: { width: 0.4, depth: 0.4, height: 0.75 }, baseCost: 3000, materialIds: METAL_MATERIALS, tags: ['kitchen', 'bar', 'parametric'] },
    // Rugs (parametric sizes)
    { name: 'rug', label: 'Rug (Small, 3x5ft)', category: 'decor', dimensions: { width: 0.9, depth: 1.5, height: 0.02 }, baseCost: 2000, materialIds: ['fabric_cotton', 'fabric_jute'], tags: ['floor', 'textile', 'parametric'] },
    { name: 'rug', label: 'Rug (Medium, 5x7ft)', category: 'decor', dimensions: { width: 1.5, depth: 2.1, height: 0.02 }, baseCost: 4000, materialIds: ['fabric_cotton', 'fabric_jute'], tags: ['floor', 'textile', 'parametric'] },
    { name: 'rug', label: 'Rug (Large, 8x10ft)', category: 'decor', dimensions: { width: 2.4, depth: 3.0, height: 0.02 }, baseCost: 7000, materialIds: ['fabric_cotton', 'fabric_jute'], tags: ['floor', 'textile', 'statement', 'parametric'] },
    // Floor lamps
    { name: 'lamp', label: 'Floor Lamp (Arc)', category: 'decor', dimensions: { width: 0.5, depth: 0.5, height: 1.8 }, baseCost: 4000, materialIds: METAL_MATERIALS, tags: ['lighting', 'ambient', 'parametric'] },
    { name: 'lamp', label: 'Floor Lamp (Tripod)', category: 'decor', dimensions: { width: 0.4, depth: 0.4, height: 1.6 }, baseCost: 3500, materialIds: WOOD_MATERIALS, tags: ['lighting', 'ambient', 'parametric'] },
  ];

  for (const pc of primitiveConfigs) {
    catalogItems.push({
      id: nextId(),
      source: 'primitive',
      category: pc.category,
      label: pc.label,
      dimensions: pc.dimensions,
      modelPath: `primitive:${pc.name}`,
      thumbnail: '',
      tags: pc.tags,
      quality: 'primitive',
      pricing: {
        baseCost: pc.baseCost,
        costUnit: 'piece' as CostUnit,
        materialIds: pc.materialIds,
        laborCost: Math.round(pc.baseCost * 0.12),
        leadTime: '7_days',
      },
    });
  }

  // Phase 6: Cultural Indian items (decor items referencing actual models or primitives)
  const culturalItems: Array<{
    label: string;
    category: CatalogCategory;
    dimensions: { width: number; depth: number; height: number };
    baseCost: number;
    modelPath: string;
    tags: string[];
    materialIds: MaterialId[];
  }> = [
    { label: 'Brass Urli', category: 'decor', dimensions: { width: 0.4, depth: 0.4, height: 0.15 }, baseCost: 2500, modelPath: 'primitive:bowl', tags: ['traditional', 'south-indian', 'entrance', 'auspicious'], materialIds: ['metal_brass'] },
    { label: 'Diya Set (Brass, 5pc)', category: 'decor', dimensions: { width: 0.3, depth: 0.15, height: 0.08 }, baseCost: 1200, modelPath: 'primitive:small', tags: ['traditional', 'pooja', 'festival', 'auspicious'], materialIds: ['metal_brass'] },
    { label: 'Jhoola / Indoor Swing', category: 'seating', dimensions: { width: 1.2, depth: 0.6, height: 1.8 }, baseCost: 25000, modelPath: '/models/benchCushion.glb', tags: ['traditional', 'gujarati', 'rajasthani', 'statement'], materialIds: WOOD_MATERIALS },
    { label: 'Carved Wooden Room Divider', category: 'decor', dimensions: { width: 1.5, depth: 0.05, height: 1.8 }, baseCost: 15000, modelPath: 'primitive:panel', tags: ['traditional', 'rajasthani', 'privacy', 'carved'], materialIds: ['wood_teak', 'wood_sheen', 'wood_rosewood'] },
    { label: 'Charpai / Traditional Daybed', category: 'seating', dimensions: { width: 1.8, depth: 0.9, height: 0.35 }, baseCost: 8000, modelPath: '/models/benchCushionLow.glb', tags: ['traditional', 'punjabi', 'multi-use', 'rustic'], materialIds: ['fabric_cotton', 'fabric_jute', 'wood_teak'] },
    { label: 'Planter\'s Chair', category: 'seating', dimensions: { width: 1.0, depth: 0.8, height: 0.9 }, baseCost: 18000, modelPath: '/models/loungeChairRelax.glb', tags: ['colonial', 'heritage', 'statement', 'verandah'], materialIds: ['wood_teak', 'wood_sheen', 'leather_pu', 'leather_genuine'] },
    { label: 'Madhubani Wall Art Panel', category: 'decor', dimensions: { width: 0.6, depth: 0.03, height: 0.9 }, baseCost: 4000, modelPath: 'primitive:panel', tags: ['folk-art', 'bihar', 'decorative', 'wall'], materialIds: [] },
    { label: 'Brass Temple Bell', category: 'decor', dimensions: { width: 0.15, depth: 0.15, height: 0.25 }, baseCost: 1500, modelPath: 'primitive:small', tags: ['traditional', 'pooja', 'auspicious'], materialIds: ['metal_brass'] },
    { label: 'Kolam / Rangoli Stencil Mat', category: 'decor', dimensions: { width: 0.9, depth: 0.9, height: 0.005 }, baseCost: 500, modelPath: 'primitive:flat', tags: ['traditional', 'entrance', 'auspicious', 'south-indian'], materialIds: [] },
    { label: 'Gadda / Floor Mattress', category: 'sleeping', dimensions: { width: 1.8, depth: 1.2, height: 0.1 }, baseCost: 4000, modelPath: 'primitive:cushion', tags: ['traditional', 'guest', 'multi-use', 'flexible'], materialIds: ['fabric_cotton', 'fabric_jute'] },
    { label: 'Kansa / Bronze Dinner Set', category: 'dining', dimensions: { width: 0.3, depth: 0.3, height: 0.05 }, baseCost: 3000, modelPath: 'primitive:flat', tags: ['traditional', 'bengali', 'ayurvedic', 'dining'], materialIds: ['metal_brass'] },
    { label: 'Mor / Peacock Wall Hanging', category: 'decor', dimensions: { width: 0.4, depth: 0.05, height: 0.6 }, baseCost: 2500, modelPath: 'primitive:panel', tags: ['traditional', 'rajasthani', 'decorative', 'auspicious'], materialIds: ['metal_brass'] },
    { label: 'Pattachitra Scroll Art', category: 'decor', dimensions: { width: 0.3, depth: 0.02, height: 0.9 }, baseCost: 3500, modelPath: 'primitive:panel', tags: ['folk-art', 'odisha', 'decorative', 'wall'], materialIds: [] },
    { label: 'Marble Inlay Coffee Table', category: 'dining', dimensions: { width: 0.9, depth: 0.6, height: 0.4 }, baseCost: 20000, modelPath: '/models/tableCoffee.glb', tags: ['luxury', 'agra', 'marble', 'statement'], materialIds: ['marble_white', 'marble_beige'] },
    { label: 'Kerala Nettipattam Wall Piece', category: 'decor', dimensions: { width: 0.5, depth: 0.05, height: 0.4 }, baseCost: 3500, modelPath: 'primitive:panel', tags: ['traditional', 'kerala', 'auspicious', 'entrance'], materialIds: ['metal_brass'] },
    { label: 'Terracotta Water Jug Set', category: 'decor', dimensions: { width: 0.25, depth: 0.25, height: 0.4 }, baseCost: 800, modelPath: 'primitive:vase', tags: ['traditional', 'rustic', 'natural'], materialIds: [] },
    { label: 'Bamboo Chick / Blind', category: 'decor', dimensions: { width: 1.5, depth: 0.02, height: 1.8 }, baseCost: 2000, modelPath: 'primitive:panel', tags: ['traditional', 'window', 'natural', 'eco-friendly'], materialIds: [] },
    { label: 'Mysore Rosewood Elephant', category: 'decor', dimensions: { width: 0.15, depth: 0.3, height: 0.25 }, baseCost: 5000, modelPath: 'primitive:small', tags: ['traditional', 'karnataka', 'carved', 'auspicious'], materialIds: ['wood_rosewood'] },
    { label: 'Jharokha Wall Mirror', category: 'fixtures', dimensions: { width: 0.5, depth: 0.05, height: 0.8 }, baseCost: 8000, modelPath: 'primitive:panel', tags: ['traditional', 'rajasthani', 'mirror', 'statement'], materialIds: ['wood_teak', 'wood_sheen'] },
    { label: 'Namda / Felt Rug', category: 'decor', dimensions: { width: 0.9, depth: 1.5, height: 0.02 }, baseCost: 2500, modelPath: 'primitive:flat', tags: ['traditional', 'kashmiri', 'floor', 'textile'], materialIds: [] },
    { label: 'Bidriware Vase', category: 'decor', dimensions: { width: 0.15, depth: 0.15, height: 0.3 }, baseCost: 3000, modelPath: 'primitive:vase', tags: ['traditional', 'karnataka', 'metalwork', 'decorative'], materialIds: ['metal_matte_black', 'metal_brass'] },
  ];

  for (const ci of culturalItems) {
    catalogItems.push({
      id: nextId(),
      source: 'decor',
      category: ci.category,
      label: ci.label,
      dimensions: ci.dimensions,
      modelPath: ci.modelPath,
      thumbnail: '',
      tags: ci.tags,
      quality: 'primitive',
      pricing: {
        baseCost: ci.baseCost,
        costUnit: 'piece' as CostUnit,
        materialIds: ci.materialIds,
        laborCost: Math.round(ci.baseCost * 0.1),
        leadTime: '7_days',
      },
    });
  }

  // Count stats
  for (const item of catalogItems) {
    stats.total++;
    switch (item.source) {
      case 'hero': stats.heroes++; break;
      case 'variant': stats.variants++; break;
      case 'primitive': stats.primitives++; break;
      case 'decor': stats.decor++; break;
    }
    stats.byCategory[item.category] = (stats.byCategory[item.category] || 0) + 1;
  }

  return { catalogItems, heroMapping, stats };
}

// ─── Code Generation ────────────────────────────────────────────

function generateMaterialRecord(): string {
  const entries: string[] = [];
  for (const [id, mat] of Object.entries(MATERIALS)) {
    entries.push(
      `  ${id}: { materialId: '${mat.materialId}', label: '${mat.label}', costMultiplier: ${mat.costMultiplier}, thumbnail: '', roughness: ${mat.roughness}, metalness: ${mat.metalness}, colorHex: '${mat.colorHex}' },`
    );
  }
  return entries.join('\n');
}

function generateCatalogItems(items: CatalogItem[]): string {
  const lines: string[] = [];
  for (const item of items) {
    const tagsStr = item.tags.length > 0 ? `[${item.tags.map(t => `'${t}'`).join(', ')}]` : '[]';
    const matIdsStr = `[${item.pricing.materialIds.map(m => `'${m}'`).join(', ')}]`;
    lines.push(`  { id: '${item.id}', source: '${item.source}', category: '${item.category}', label: '${item.label.replace(/'/g, "\\'")}', dimensions: { width: ${item.dimensions.width}, depth: ${item.dimensions.depth}, height: ${item.dimensions.height} }, modelPath: '${item.modelPath}', thumbnail: '', tags: ${tagsStr}, quality: '${item.quality}', pricing: { baseCost: ${item.pricing.baseCost}, costUnit: '${item.pricing.costUnit}', materialIds: ${matIdsStr}, laborCost: ${item.pricing.laborCost}, leadTime: '${item.pricing.leadTime}' } },`);
  }
  return lines.join('\n');
}

function generateHeroMapping(mapping: HeroModelEntry[]): string {
  const lines: string[] = [];
  for (const entry of mapping) {
    const escapedLabel = entry.heroLabel.replace(/'/g, "\\'");
    lines.push(`  { heroId: '${entry.heroId}', heroLabel: '${escapedLabel}', furnitureType: '${entry.furnitureType}', approximateSize: '${entry.approximateSize}', verifiedModelPath: '${entry.verifiedModelPath}', sourceAsset: '${entry.sourceAsset}', verified: ${entry.verified} },`);
  }
  return lines.join('\n');
}

function writeCatalogFile(items: CatalogItem[]): string {
  const materialRecord = generateMaterialRecord();
  const catalogItemsStr = generateCatalogItems(items);

  return `/**
 * Nirmit Furniture Catalog — Auto-generated
 * Generated: ${new Date().toISOString()}
 * Total entries: ${items.length}
 * 
 * DO NOT EDIT MANUALLY. Run: npx tsx scripts/generate-catalog.ts
 */

import type { CatalogItem, CatalogPricing, MaterialOption } from './types';
import { getHeroModelPath } from './modelMapping';

const M: Record<string, MaterialOption> = {
${materialRecord}
};

function matOpts(...ids: (keyof typeof M)[]): CatalogPricing['materialOptions'] {
  const opts: CatalogPricing['materialOptions'] = {};
  for (const id of ids) {
    (opts as Record<string, MaterialOption>)[id] = M[id];
  }
  return opts;
}

// ─── CATALOG: ${items.length} ITEMS ───

export const CATALOG: CatalogItem[] = [
${catalogItemsStr}
];

// ─── Lookup Tables ───

const catalogMap = new Map<string, CatalogItem>();
const catalogByCategory = new Map<string, CatalogItem[]>();

for (const item of CATALOG) {
  catalogMap.set(item.id, item);
  const catKey = item.category;
  if (!catalogByCategory.has(catKey)) {
    catalogByCategory.set(catKey, []);
  }
  catalogByCategory.get(catKey)!.push(item);
}

export function getItemById(id: string): CatalogItem | undefined {
  return catalogMap.get(id);
}

export function getItemsByCategory(category: CatalogItem['category']): CatalogItem[] {
  return catalogByCategory.get(category) ?? [];
}

export function searchCatalog(query: string): (CatalogItem & { searchScore: number })[] {
  const lower = query.toLowerCase();
  const results: (CatalogItem & { searchScore: number })[] = [];
  for (const item of CATALOG) {
    let score = 0;
    if (item.label.toLowerCase().includes(lower)) score += 10;
    if (item.tags.some(t => t.toLowerCase().includes(lower))) score += 5;
    if (item.category.toLowerCase().includes(lower)) score += 3;
    if (score > 0) {
      results.push({ ...item, searchScore: score });
    }
  }
  return results.sort((a, b) => b.searchScore - a.searchScore);
}

export function getCategories(): { value: string; label: string; count: number }[] {
  const categories: { value: string; label: string }[] = [
    { value: 'seating', label: 'Seating' },
    { value: 'sleeping', label: 'Sleeping' },
    { value: 'storage', label: 'Storage' },
    { value: 'dining', label: 'Dining' },
    { value: 'pooja', label: 'Pooja' },
    { value: 'kitchen', label: 'Kitchen' },
    { value: 'work', label: 'Work' },
    { value: 'fixtures', label: 'Fixtures' },
    { value: 'decor', label: 'Decor' },
  ];
  return categories.map(c => ({
    ...c,
    count: (catalogByCategory.get(c.value) ?? []).length,
  }));
}

export function getCatalogSize(): number {
  return CATALOG.length;
}
`;
}

function writeModelMappingFile(mapping: HeroModelEntry[]): string {
  const entriesStr = generateHeroMapping(mapping);

  return `/**
 * Nirmit Model Mapping — Auto-generated
 * Generated: ${new Date().toISOString()}
 * Maps hero catalog IDs to verified GLB model paths.
 * 
 * DO NOT EDIT MANUALLY. Run: npx tsx scripts/generate-catalog.ts
 */

export interface HeroModelCoverageEntry {
  heroId: string;
  heroLabel: string;
  furnitureType: string;
  approximateSize: string;
  verifiedModelPath: string;
  sourceAsset: string;
  verified: boolean;
}

export const HERO_MODEL_COVERAGE: HeroModelCoverageEntry[] = [
${entriesStr}
];

export const heroModelMapping: Record<string, string> = HERO_MODEL_COVERAGE.reduce<Record<string, string>>(
  (acc, entry) => {
    acc[entry.heroId] = entry.verifiedModelPath;
    return acc;
  },
  {},
);

export function getHeroModelPath(heroId: string): string {
  return heroModelMapping[heroId] ?? '';
}
`;
}

// ─── Execute ─────────────────────────────────────────────────────

console.log('🔍 Scanning model directories...');

const { catalogItems, heroMapping, stats } = buildCatalog();

console.log(`\n📊 Catalog Generation Summary:`);
console.log(`   Total entries: ${stats.total}`);
console.log(`   Heroes: ${stats.heroes}`);
console.log(`   Variants: ${stats.variants}`);
console.log(`   Primitives: ${stats.primitives}`);
console.log(`   Decor/Cultural: ${stats.decor}`);
console.log(`\n   By Category:`);
for (const [cat, count] of Object.entries(stats.byCategory).sort()) {
  console.log(`     ${cat}: ${count}`);
}

// Write catalog.ts
const catalogContent = writeCatalogFile(catalogItems);
fs.writeFileSync(OUTPUT_CATALOG, catalogContent, 'utf-8');
console.log(`\n✅ Wrote catalog.ts (${catalogItems.length} entries) → ${OUTPUT_CATALOG}`);

// Write modelMapping.ts
const mappingContent = writeModelMappingFile(heroMapping);
fs.writeFileSync(OUTPUT_MODEL_MAPPING, mappingContent, 'utf-8');
console.log(`✅ Wrote modelMapping.ts (${heroMapping.length} heroes) → ${OUTPUT_MODEL_MAPPING}`);

console.log('\n🎉 Catalog generation complete!');
console.log('   Run: npx tsc --noEmit to verify TypeScript compilation.');