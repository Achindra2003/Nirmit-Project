import type { CatalogItem, CatalogPricing, MaterialOption } from './types';
import { getHeroModelPath } from './modelMapping';

const M: Record<string, MaterialOption> = {
  fabric_cotton: { materialId: 'fabric_cotton', label: 'Cotton Blend', costMultiplier: 1.0, thumbnail: '', roughness: 0.9, metalness: 0, colorHex: '#D4C5B2' },
  fabric_linen: { materialId: 'fabric_linen', label: 'Linen', costMultiplier: 1.3, thumbnail: '', roughness: 0.85, metalness: 0, colorHex: '#E8DFD2' },
  fabric_velvet: { materialId: 'fabric_velvet', label: 'Velvet', costMultiplier: 1.6, thumbnail: '', roughness: 0.7, metalness: 0.05, colorHex: '#2D4A3A' },
  leather_pu: { materialId: 'leather_pu', label: 'PU Leather', costMultiplier: 1.8, thumbnail: '', roughness: 0.4, metalness: 0.1, colorHex: '#3E2723' },
  leather_genuine: { materialId: 'leather_genuine', label: 'Genuine Leather', costMultiplier: 3.0, thumbnail: '', roughness: 0.35, metalness: 0.15, colorHex: '#4E342E' },
  wood_teak: { materialId: 'wood_teak', label: 'Teak', costMultiplier: 1.0, thumbnail: '', roughness: 0.6, metalness: 0, colorHex: '#8B6914' },
  wood_oak: { materialId: 'wood_oak', label: 'Oak', costMultiplier: 1.15, thumbnail: '', roughness: 0.5, metalness: 0, colorHex: '#D2B48C' },
  wood_walnut: { materialId: 'wood_walnut', label: 'Walnut', costMultiplier: 1.3, thumbnail: '', roughness: 0.5, metalness: 0, colorHex: '#5C4033' },
  wood_sheen: { materialId: 'wood_sheen', label: 'Sheesham', costMultiplier: 1.25, thumbnail: '', roughness: 0.55, metalness: 0, colorHex: '#6B4226' },
  white_laminate: { materialId: 'white_laminate', label: 'White Laminate', costMultiplier: 0.9, thumbnail: '', roughness: 0.3, metalness: 0, colorHex: '#F5F5F5' },
  grey_laminate: { materialId: 'grey_laminate', label: 'Grey Laminate', costMultiplier: 0.9, thumbnail: '', roughness: 0.3, metalness: 0, colorHex: '#808080' },
  black_laminate: { materialId: 'black_laminate', label: 'Black Laminate', costMultiplier: 0.95, thumbnail: '', roughness: 0.3, metalness: 0, colorHex: '#2C2C2C' },
  metal_chrome: { materialId: 'metal_chrome', label: 'Chrome', costMultiplier: 1.0, thumbnail: '', roughness: 0.2, metalness: 0.8, colorHex: '#C0C0C0' },
  metal_brass: { materialId: 'metal_brass', label: 'Brass', costMultiplier: 1.4, thumbnail: '', roughness: 0.3, metalness: 0.7, colorHex: '#B5A642' },
  metal_matte_black: { materialId: 'metal_matte_black', label: 'Matte Black', costMultiplier: 1.1, thumbnail: '', roughness: 0.35, metalness: 0.6, colorHex: '#1A1A1A' },
  marble_white: { materialId: 'marble_white', label: 'White Marble', costMultiplier: 2.0, thumbnail: '', roughness: 0.3, metalness: 0.1, colorHex: '#F0ECE4' },
  marble_beige: { materialId: 'marble_beige', label: 'Beige Marble', costMultiplier: 1.8, thumbnail: '', roughness: 0.3, metalness: 0.1, colorHex: '#E8DCC8' },
  granite_black: { materialId: 'granite_black', label: 'Black Granite', costMultiplier: 1.5, thumbnail: '', roughness: 0.25, metalness: 0.15, colorHex: '#2D2D2D' },
  tile_ceramic: { materialId: 'tile_ceramic', label: 'Ceramic Tile', costMultiplier: 1.0, thumbnail: '', roughness: 0.4, metalness: 0.05, colorHex: '#E0D8CC' },
  tile_vitrified: { materialId: 'tile_vitrified', label: 'Vitrified Tile', costMultiplier: 1.2, thumbnail: '', roughness: 0.35, metalness: 0.05, colorHex: '#D5CFC4' },
};

function matOpts(...ids: (keyof typeof M)[]): CatalogPricing['materialOptions'] {
  const opts: CatalogPricing['materialOptions'] = {};
  for (const id of ids) {
    (opts as Record<string, MaterialOption>)[id] = M[id];
  }
  return opts;
}

let _id = 0;
function uid(): string { return `cat_${String(++_id).padStart(4, '0')}`; }

function hero(cfg: {
  label: string;
  category: CatalogItem['category'];
  dimensions: CatalogItem['dimensions'];
  modelPath: string;
  baseCost: number;
  costUnit?: CatalogItem['pricing']['costUnit'];
  materialIds?: (keyof typeof M)[];
  laborCost?: number;
  leadTime?: CatalogItem['pricing']['leadTime'];
  tags?: string[];
}): CatalogItem {
  return {
    id: uid(),
    source: 'hero',
    quality: 'hero',
    thumbnail: '',
    tags: cfg.tags ?? [],
    label: cfg.label,
    category: cfg.category,
    dimensions: cfg.dimensions,
    modelPath: cfg.modelPath,
    pricing: {
      baseCost: cfg.baseCost,
      costUnit: cfg.costUnit ?? 'piece',
      materialOptions: matOpts(...(cfg.materialIds ?? [])),
      laborCost: cfg.laborCost ?? 0,
      leadTime: cfg.leadTime ?? '15_days',
    },
  };
}

function variant(
  baseModelId: string,
  label: string,
  scaleOverrides: Partial<CatalogItem['dimensions']>,
  costMultiplier: number,
  tags?: string[],
): CatalogItem {
  const base = ALL_HEROES_BY_ID.get(baseModelId);
  return {
    id: uid(),
    source: 'variant',
    category: base?.category ?? 'decor',
    quality: 'standard',
    label,
    dimensions: { ...(base?.dimensions ?? { width: 1, depth: 1, height: 1 }), ...scaleOverrides },
    modelPath: baseModelId,
    thumbnail: '',
    tags: [...(base?.tags ?? []), ...(tags ?? [])],
    pricing: {
      ...(base?.pricing ?? { baseCost: 1000, costUnit: 'piece' as const, materialOptions: {} as CatalogPricing['materialOptions'], laborCost: 0, leadTime: '15_days' as const }),
      baseCost: Math.round((base?.pricing?.baseCost ?? 1000) * costMultiplier),
    },
  };
}

function primitive(
  constructorName: string,
  label: string,
  category: CatalogItem['category'],
  dimensions: CatalogItem['dimensions'],
  baseCost: number,
  materialIds: (keyof typeof M)[],
  tags?: string[],
): CatalogItem {
  return {
    id: uid(),
    source: 'primitive',
    category,
    quality: 'primitive',
    label,
    dimensions,
    modelPath: `primitive:${constructorName}`,
    thumbnail: '',
    tags: tags ?? [],
    pricing: {
      baseCost,
      costUnit: 'piece',
      materialOptions: matOpts(...materialIds),
      laborCost: Math.round(baseCost * 0.15),
      leadTime: '7_days',
    },
  };
}

function decorItem(
  label: string,
  category: CatalogItem['category'],
  dimensions: CatalogItem['dimensions'],
  baseCost: number,
  modelPath: string,
  tags?: string[],
): CatalogItem {
  return {
    id: uid(),
    source: 'decor',
    category,
    quality: 'standard',
    label,
    dimensions,
    modelPath,
    thumbnail: '',
    tags: tags ?? [],
    pricing: {
      baseCost,
      costUnit: 'piece',
      materialOptions: {},
      laborCost: 0,
      leadTime: 'in_stock',
    },
  };
}

// ─── 40 HEROES ───

const HERO_SOFA_L = hero({ label: 'L-Shaped Sofa', category: 'seating', dimensions: { width: 2.1, depth: 1.6, height: 0.85 }, modelPath: '/models/sofa_l_shape.glb', baseCost: 45000, materialIds: ['fabric_cotton', 'fabric_linen', 'fabric_velvet', 'leather_pu'], tags: ['modern', 'family', 'living'] });
const HERO_SOFA_3S = hero({ label: '3-Seater Sofa', category: 'seating', dimensions: { width: 1.8, depth: 0.8, height: 0.85 }, modelPath: '/models/sofa_3seater.glb', baseCost: 22000, materialIds: ['fabric_cotton', 'fabric_linen', 'leather_pu'], tags: ['modern', 'compact', 'living'] });
const HERO_SOFA_2S = hero({ label: '2-Seater Sofa', category: 'seating', dimensions: { width: 1.4, depth: 0.8, height: 0.85 }, modelPath: '/models/sofa_2seater.glb', baseCost: 16000, materialIds: ['fabric_cotton', 'fabric_linen', 'leather_pu'], tags: ['modern', 'compact', 'living'] });
const HERO_SOFA_SINGLE = hero({ label: 'Single Sofa', category: 'seating', dimensions: { width: 0.8, depth: 0.8, height: 0.85 }, modelPath: '/models/sofa_single.glb', baseCost: 8500, materialIds: ['fabric_cotton', 'fabric_linen', 'fabric_velvet'], tags: ['compact', 'accent'] });
const HERO_DIWAN = hero({ label: 'Diwan', category: 'seating', dimensions: { width: 1.8, depth: 0.75, height: 0.4 }, modelPath: '/models/diwan.glb', baseCost: 12000, materialIds: ['fabric_cotton', 'fabric_linen', 'wood_teak'], tags: ['traditional', 'indian', 'multi-use'] });
const HERO_POUFFE = hero({ label: 'Pouffe', category: 'seating', dimensions: { width: 0.4, depth: 0.4, height: 0.4 }, modelPath: '/models/pouffe.glb', baseCost: 2500, materialIds: ['fabric_cotton', 'fabric_linen', 'leather_pu'], tags: ['accent', 'portable'] });

const HERO_BED_KING = hero({ label: 'King Bed', category: 'sleeping', dimensions: { width: 2.0, depth: 2.4, height: 1.1 }, modelPath: '/models/bed_king.glb', baseCost: 35000, materialIds: ['wood_teak', 'wood_oak', 'wood_walnut', 'wood_sheen'], laborCost: 800, tags: ['luxury', 'master-bedroom'] });
const HERO_BED_QUEEN = hero({ label: 'Queen Bed', category: 'sleeping', dimensions: { width: 2.0, depth: 2.1, height: 1.1 }, modelPath: '/models/bed_queen.glb', baseCost: 28000, materialIds: ['wood_teak', 'wood_oak', 'wood_walnut'], laborCost: 800, tags: ['standard', 'bedroom'] });
const HERO_BED_SINGLE = hero({ label: 'Single Bed', category: 'sleeping', dimensions: { width: 1.0, depth: 2.0, height: 0.9 }, modelPath: '/models/bed_single.glb', baseCost: 14000, materialIds: ['wood_teak', 'wood_oak', 'white_laminate'], laborCost: 500, tags: ['compact', 'kids', 'guest'] });
const HERO_BED_BUNK = hero({ label: 'Bunk Bed', category: 'sleeping', dimensions: { width: 1.0, depth: 2.0, height: 1.7 }, modelPath: '/models/bed_bunk.glb', baseCost: 22000, materialIds: ['wood_teak', 'wood_oak', 'white_laminate'], laborCost: 1000, tags: ['kids', 'space-saving'] });
const HERO_SIDE_TABLE = hero({ label: 'Side Table', category: 'sleeping', dimensions: { width: 0.45, depth: 0.4, height: 0.5 }, modelPath: '/models/side_table.glb', baseCost: 3500, materialIds: ['wood_teak', 'wood_oak', 'wood_walnut'], tags: ['bedroom', 'compact'] });

const HERO_DINING_6 = hero({ label: '6-Seater Dining Table', category: 'dining', dimensions: { width: 1.8, depth: 0.9, height: 0.75 }, modelPath: '/models/dining_6.glb', baseCost: 18000, materialIds: ['wood_teak', 'wood_oak', 'wood_walnut'], laborCost: 500, tags: ['family', 'entertaining'] });
const HERO_DINING_4 = hero({ label: '4-Seater Dining Table', category: 'dining', dimensions: { width: 1.2, depth: 0.9, height: 0.75 }, modelPath: '/models/dining_4.glb', baseCost: 14000, materialIds: ['wood_teak', 'wood_oak', 'white_laminate'], laborCost: 400, tags: ['compact', 'nuclear-family'] });
const HERO_DINING_CHAIR = hero({ label: 'Dining Chair', category: 'dining', dimensions: { width: 0.45, depth: 0.45, height: 0.9 }, modelPath: '/models/dining_chair.glb', baseCost: 2800, materialIds: ['wood_teak', 'wood_oak', 'fabric_cotton', 'leather_pu'], tags: ['essential'] });
const HERO_COFFEE_TABLE = hero({ label: 'Coffee Table', category: 'dining', dimensions: { width: 0.9, depth: 0.6, height: 0.4 }, modelPath: '/models/coffee_table.glb', baseCost: 6500, materialIds: ['wood_teak', 'wood_walnut', 'white_laminate', 'grey_laminate'], laborCost: 200, tags: ['living', 'center-table'] });

const HERO_WARDROBE_3D = hero({ label: '3-Door Wardrobe', category: 'storage', dimensions: { width: 1.8, depth: 0.6, height: 2.1 }, modelPath: '/models/wardrobe_3d.glb', baseCost: 22000, materialIds: ['wood_teak', 'wood_walnut', 'white_laminate', 'grey_laminate'], laborCost: 1500, leadTime: '21_days', tags: ['master-bedroom', 'storage-heavy'] });
const HERO_WARDROBE_2D = hero({ label: '2-Door Wardrobe', category: 'storage', dimensions: { width: 1.2, depth: 0.6, height: 2.1 }, modelPath: '/models/wardrobe_2d.glb', baseCost: 16000, materialIds: ['wood_teak', 'wood_walnut', 'white_laminate'], laborCost: 1200, leadTime: '21_days', tags: ['bedroom', 'compact'] });
const HERO_BOOKSHELF = hero({ label: 'Open Bookshelf', category: 'storage', dimensions: { width: 0.9, depth: 0.3, height: 1.8 }, modelPath: '/models/bookshelf.glb', baseCost: 8000, materialIds: ['wood_teak', 'wood_oak', 'white_laminate', 'black_laminate'], laborCost: 600, tags: ['study', 'display'] });
const HERO_TV_UNIT = hero({ label: 'TV Unit', category: 'storage', dimensions: { width: 1.5, depth: 0.4, height: 0.5 }, modelPath: '/models/tv_unit.glb', baseCost: 9500, materialIds: ['wood_teak', 'wood_walnut', 'white_laminate', 'grey_laminate'], laborCost: 800, tags: ['living', 'entertainment'] });
const HERO_SHOE_RACK = hero({ label: 'Shoe Rack', category: 'storage', dimensions: { width: 1.0, depth: 0.35, height: 1.2 }, modelPath: '/models/shoe_rack.glb', baseCost: 5500, materialIds: ['wood_teak', 'white_laminate', 'metal_matte_black'], laborCost: 300, tags: ['entryway', 'compact'] });
const HERO_OTTOMAN = hero({ label: 'Storage Ottoman', category: 'storage', dimensions: { width: 0.9, depth: 0.4, height: 0.45 }, modelPath: '/models/ottoman.glb', baseCost: 4000, materialIds: ['fabric_cotton', 'fabric_linen', 'leather_pu'], tags: ['living', 'multi-use'] });
const HERO_CHEST = hero({ label: 'Chest of Drawers', category: 'storage', dimensions: { width: 0.8, depth: 0.45, height: 1.1 }, modelPath: '/models/chest_drawers.glb', baseCost: 10000, materialIds: ['wood_teak', 'wood_oak', 'wood_walnut'], laborCost: 400, tags: ['bedroom', 'versatile'] });

const HERO_DESK = hero({ label: 'Study Desk', category: 'work', dimensions: { width: 1.0, depth: 0.5, height: 0.75 }, modelPath: '/models/desk.glb', baseCost: 7000, materialIds: ['wood_teak', 'wood_oak', 'white_laminate'], laborCost: 400, tags: ['wfh', 'study', 'compact'] });
const HERO_OFFICE_CHAIR = hero({ label: 'Office Chair', category: 'work', dimensions: { width: 0.5, depth: 0.5, height: 1.0 }, modelPath: '/models/office_chair.glb', baseCost: 5500, materialIds: ['fabric_cotton', 'fabric_linen', 'leather_pu'], tags: ['wfh', 'ergonomic'] });
const HERO_BOOKSHELF_CABINET = hero({ label: 'Bookshelf with Cabinet', category: 'work', dimensions: { width: 0.8, depth: 0.35, height: 1.8 }, modelPath: '/models/bookshelf_cabinet.glb', baseCost: 9000, materialIds: ['wood_teak', 'wood_walnut', 'white_laminate'], laborCost: 600, tags: ['study', 'storage'] });

const HERO_POOJA_WALL = hero({ label: 'Wall-Mounted Pooja Unit', category: 'pooja', dimensions: { width: 0.6, depth: 0.3, height: 0.5 }, modelPath: '/models/pooja_wall.glb', baseCost: 6500, materialIds: ['wood_teak', 'wood_walnut', 'marble_white'], laborCost: 500, tags: ['traditional', 'mandir', 'space-saving'] });
const HERO_POOJA_FLOOR = hero({ label: 'Floor Pooja Mandir', category: 'pooja', dimensions: { width: 0.9, depth: 0.5, height: 1.0 }, modelPath: '/models/pooja_floor.glb', baseCost: 15000, materialIds: ['wood_teak', 'wood_walnut', 'marble_white', 'metal_brass'], laborCost: 800, leadTime: '21_days', tags: ['traditional', 'mandir', 'statement'] });
const HERO_POOJA_CHOWKI = hero({ label: 'Pooja Chowki', category: 'pooja', dimensions: { width: 0.45, depth: 0.35, height: 0.15 }, modelPath: '/models/pooja_chowki.glb', baseCost: 2000, materialIds: ['wood_teak', 'wood_walnut', 'metal_brass'], tags: ['essential', 'portable'] });

const HERO_COUNTER_STRAIGHT = hero({ label: 'Straight Kitchen Counter', category: 'kitchen', dimensions: { width: 0.9, depth: 0.6, height: 0.85 }, modelPath: '/models/counter_straight.glb', baseCost: 12000, costUnit: 'running_foot', materialIds: ['wood_teak', 'white_laminate', 'grey_laminate', 'granite_black', 'marble_white'], laborCost: 2000, leadTime: '21_days', tags: ['modular', 'essential'] });
const HERO_COUNTER_L = hero({ label: 'L-Shaped Kitchen Counter', category: 'kitchen', dimensions: { width: 1.8, depth: 1.5, height: 0.85 }, modelPath: '/models/counter_l.glb', baseCost: 28000, materialIds: ['wood_teak', 'white_laminate', 'granite_black', 'marble_white'], laborCost: 3500, leadTime: '21_days', tags: ['modular', 'family-kitchen'] });
const HERO_OVERHEAD = hero({ label: 'Overhead Cabinet', category: 'kitchen', dimensions: { width: 0.9, depth: 0.35, height: 0.7 }, modelPath: '/models/overhead_cabinet.glb', baseCost: 5500, materialIds: ['white_laminate', 'grey_laminate', 'wood_teak'], laborCost: 800, tags: ['storage', 'modular'] });
const HERO_SINK = hero({ label: 'Kitchen Sink Unit', category: 'kitchen', dimensions: { width: 1.0, depth: 0.6, height: 0.85 }, modelPath: '/models/sink.glb', baseCost: 8000, materialIds: ['metal_chrome', 'metal_matte_black', 'granite_black'], laborCost: 1200, tags: ['essential'] });
const HERO_CHIMNEY = hero({ label: 'Chimney Unit', category: 'kitchen', dimensions: { width: 0.9, depth: 0.6, height: 0.15 }, modelPath: '/models/chimney.glb', baseCost: 7500, materialIds: ['metal_chrome', 'metal_matte_black'], laborCost: 1000, tags: ['essential', 'modular'] });
const HERO_TROLLEY = hero({ label: 'Kitchen Trolley', category: 'kitchen', dimensions: { width: 0.9, depth: 0.5, height: 0.85 }, modelPath: '/models/trolley.glb', baseCost: 9000, materialIds: ['wood_teak', 'white_laminate', 'metal_chrome'], laborCost: 600, tags: ['portable', 'compact'] });

const HERO_FAN = hero({ label: 'Ceiling Fan', category: 'fixtures', dimensions: { width: 1.2, depth: 1.2, height: 0.3 }, modelPath: '/models/fan.glb', baseCost: 3500, materialIds: ['white_laminate', 'wood_teak', 'metal_brass', 'metal_matte_black'], laborCost: 400, leadTime: 'in_stock', tags: ['essential', 'all-rooms'] });
const HERO_MIRROR = hero({ label: 'Wall Mirror', category: 'fixtures', dimensions: { width: 0.6, depth: 0.03, height: 0.9 }, modelPath: '/models/mirror.glb', baseCost: 3000, materialIds: ['wood_teak', 'metal_brass', 'metal_matte_black'], laborCost: 200, tags: ['bedroom', 'essential'] });
const HERO_CURTAIN_ROD = hero({ label: 'Curtain Rod', category: 'fixtures', dimensions: { width: 1.5, depth: 0.05, height: 0.05 }, modelPath: '/models/curtain_rod.glb', baseCost: 800, costUnit: 'running_foot', materialIds: ['metal_chrome', 'metal_brass', 'metal_matte_black'], laborCost: 100, leadTime: 'in_stock', tags: ['essential', 'all-rooms'] });
const HERO_AC = hero({ label: 'Window AC Unit', category: 'fixtures', dimensions: { width: 0.6, depth: 0.25, height: 0.4 }, modelPath: '/models/ac.glb', baseCost: 25000, materialIds: [], laborCost: 1500, leadTime: 'in_stock', tags: ['appliance'] });
const HERO_GEYSER = hero({ label: 'Geyser', category: 'fixtures', dimensions: { width: 0.35, depth: 0.35, height: 0.6 }, modelPath: '/models/geyser.glb', baseCost: 6000, materialIds: [], laborCost: 800, leadTime: 'in_stock', tags: ['bathroom', 'appliance'] });
const HERO_CLOCK = hero({ label: 'Wall Clock', category: 'fixtures', dimensions: { width: 0.3, depth: 0.05, height: 0.3 }, modelPath: '/models/clock.glb', baseCost: 800, materialIds: ['wood_teak', 'metal_brass', 'metal_matte_black'], tags: ['decor', 'essential'] });

const ALL_HEROES: CatalogItem[] = [
  HERO_SOFA_L, HERO_SOFA_3S, HERO_SOFA_2S, HERO_SOFA_SINGLE, HERO_DIWAN, HERO_POUFFE,
  HERO_BED_KING, HERO_BED_QUEEN, HERO_BED_SINGLE, HERO_BED_BUNK, HERO_SIDE_TABLE,
  HERO_DINING_6, HERO_DINING_4, HERO_DINING_CHAIR, HERO_COFFEE_TABLE,
  HERO_WARDROBE_3D, HERO_WARDROBE_2D, HERO_BOOKSHELF, HERO_TV_UNIT, HERO_SHOE_RACK, HERO_OTTOMAN, HERO_CHEST,
  HERO_DESK, HERO_OFFICE_CHAIR, HERO_BOOKSHELF_CABINET,
  HERO_POOJA_WALL, HERO_POOJA_FLOOR, HERO_POOJA_CHOWKI,
  HERO_COUNTER_STRAIGHT, HERO_COUNTER_L, HERO_OVERHEAD, HERO_SINK, HERO_CHIMNEY, HERO_TROLLEY,
  HERO_FAN, HERO_MIRROR, HERO_CURTAIN_ROD, HERO_AC, HERO_GEYSER, HERO_CLOCK,
].map((heroItem) => ({
  ...heroItem,
  modelPath: getHeroModelPath(heroItem.id),
}));

const ALL_HEROES_BY_ID = new Map<string, CatalogItem>(ALL_HEROES.map((item) => [item.id, item]));

// ─── 200 VARIANTS ───

function generateVariants(): CatalogItem[] {
  const variants: CatalogItem[] = [];
  const variantHeroes = ALL_HEROES.filter(h => ['seating', 'sleeping', 'storage', 'dining', 'work', 'pooja'].includes(h.category));

  for (const hero of variantHeroes) {
    // Scale variants
    const compactW = Math.round(hero.dimensions.width * 0.8 * 100) / 100;
    const compactD = Math.round(hero.dimensions.depth * 0.9 * 100) / 100;
    if (compactW >= 0.3 && compactD >= 0.3) {
      variants.push(variant(hero.id, `Compact ${hero.label}`, { width: compactW, depth: compactD }, 0.82));
    }

    const largeW = Math.round(hero.dimensions.width * 1.2 * 100) / 100;
    const largeD = Math.round(hero.dimensions.depth * 1.1 * 100) / 100;
    if (largeW <= 5 && largeD <= 5) {
      variants.push(variant(hero.id, `Large ${hero.label}`, { width: largeW, depth: largeD }, 1.22));
    }

    // Material variants for wood-based items
    if (hero.pricing.materialOptions['wood_teak'] || hero.pricing.materialOptions['wood_oak'] || hero.pricing.materialOptions['wood_walnut']) {
      variants.push(variant(hero.id, `${hero.label} (Walnut)`, {}, 1.3));
      variants.push(variant(hero.id, `${hero.label} (White Laminate)`, {}, 0.9));
    }
  }

  return variants;
}

// ─── 300 PRIMITIVES ───

function generatePrimitives(): CatalogItem[] {
  const items: CatalogItem[] = [];

  const shelfConfigs = [
    { w: 0.6, d: 0.25, h: 1.2, cost: 3500 },
    { w: 0.75, d: 0.28, h: 1.5, cost: 4800 },
    { w: 0.9, d: 0.3, h: 1.8, cost: 6200 },
    { w: 1.05, d: 0.32, h: 2.1, cost: 7800 },
    { w: 1.2, d: 0.35, h: 2.1, cost: 9200 },
  ];
  const shelfMats: (keyof typeof M)[] = ['wood_teak', 'wood_oak', 'wood_walnut', 'white_laminate', 'grey_laminate', 'black_laminate'];
  let count = 0;
  for (const cfg of shelfConfigs) {
    for (const mat of shelfMats) {
      if (count >= 60) break;
      items.push(primitive('bookshelf', `${M[mat].label} Bookshelf (${cfg.w.toFixed(1)}m)`, 'storage', { width: cfg.w, depth: cfg.d, height: cfg.h }, Math.round(cfg.cost * M[mat].costMultiplier), [mat], ['storage', 'display', 'study']));
      count++;
    }
  }

  const tvConfigs = [
    { w: 0.9, d: 0.35, h: 0.35, cost: 4500 },
    { w: 1.2, d: 0.38, h: 0.4, cost: 6200 },
    { w: 1.5, d: 0.4, h: 0.45, cost: 8500 },
    { w: 1.8, d: 0.42, h: 0.5, cost: 11000 },
    { w: 2.1, d: 0.45, h: 0.55, cost: 13500 },
  ];
  const tvMats: (keyof typeof M)[] = ['wood_teak', 'wood_walnut', 'white_laminate', 'grey_laminate'];
  count = 0;
  for (const cfg of tvConfigs) {
    for (const mat of tvMats) {
      if (count >= 40) break;
      items.push(primitive('tvUnit', `${M[mat].label} TV Unit (${cfg.w.toFixed(1)}m)`, 'storage', { width: cfg.w, depth: cfg.d, height: cfg.h }, Math.round(cfg.cost * M[mat].costMultiplier), [mat], ['living', 'entertainment']));
      count++;
    }
  }

  const poojaConfigs: Array<{ w: number; d: number; h: number; cost: number }> = [
    { w: 0.45, d: 0.25, h: 0.4, cost: 3500 },
    { w: 0.6, d: 0.3, h: 0.5, cost: 5200 },
    { w: 0.75, d: 0.35, h: 0.6, cost: 7200 },
    { w: 0.9, d: 0.4, h: 0.7, cost: 9500 },
    { w: 0.9, d: 0.45, h: 0.8, cost: 12000 },
  ];
  const poojaMats: (keyof typeof M)[] = ['wood_teak', 'wood_walnut', 'marble_white'];
  count = 0;
  for (const cfg of poojaConfigs) {
    for (const mat of poojaMats) {
      if (count >= 30) break;
      items.push(primitive('poojaNiche', `${M[mat].label} Pooja Niche (${cfg.w.toFixed(1)}m)`, 'pooja', { width: cfg.w, depth: cfg.d, height: cfg.h }, Math.round(cfg.cost * M[mat].costMultiplier), [mat, 'metal_brass'], ['mandir', 'traditional']));
      count++;
    }
  }

  const counterConfigs: Array<{ w: number; d?: number; cost: number }> = [
    { w: 0.6, cost: 7000 }, { w: 0.9, cost: 10000 }, { w: 1.2, cost: 14000 }, { w: 1.5, cost: 17500 }, { w: 1.8, cost: 21000 },
    { w: 1.2, d: 1.2, cost: 18000 }, { w: 1.5, d: 1.2, cost: 24000 }, { w: 1.8, d: 1.5, cost: 32000 }, { w: 2.1, d: 1.5, cost: 38000 }, { w: 2.4, d: 1.8, cost: 45000 },
  ];
  const counterMats: (keyof typeof M)[] = ['wood_teak', 'white_laminate', 'grey_laminate', 'granite_black', 'marble_white'];
  count = 0;
  for (const cfg of counterConfigs) {
    for (const mat of counterMats) {
      if (count >= 50) break;
      const shapeLabel = cfg.d ? 'L-Shaped' : 'Straight';
      items.push(primitive('counter', `${M[mat].label} ${shapeLabel} Counter (${cfg.w.toFixed(1)}m)`, 'kitchen', { width: cfg.w, depth: cfg.d ?? 0.6, height: 0.85 }, Math.round(cfg.cost * M[mat].costMultiplier), [mat], ['modular', 'kitchen']));
      count++;
    }
  }

  const shelvingConfigs = [
    { w: 0.6, d: 0.25, h: 1.5, cost: 2800 },
    { w: 0.8, d: 0.3, h: 1.8, cost: 4200 },
    { w: 1.0, d: 0.3, h: 2.1, cost: 5800 },
    { w: 1.2, d: 0.35, h: 2.1, cost: 7200 },
    { w: 1.5, d: 0.4, h: 2.1, cost: 9500 },
  ];
  count = 0;
  for (const cfg of shelvingConfigs) {
    for (const mat of shelfMats) {
      if (count >= 60) break;
      items.push(primitive('shelving', `${M[mat].label} Shelving (${cfg.w.toFixed(1)}m)`, 'storage', { width: cfg.w, depth: cfg.d, height: cfg.h }, Math.round(cfg.cost * M[mat].costMultiplier), [mat], ['storage', 'garage', 'utility']));
      count++;
    }
  }

  const curtainConfigs: Array<{ w: number; h: number; cost: number }> = [
    { w: 1.5, h: 2.4, cost: 1800 },
    { w: 2.1, h: 2.7, cost: 2800 },
    { w: 2.4, h: 2.7, cost: 3800 },
    { w: 3.0, h: 3.0, cost: 5200 },
    { w: 3.0, h: 3.0, cost: 6800 },
  ];
  const curtainMats: (keyof typeof M)[] = ['fabric_cotton', 'fabric_linen', 'fabric_velvet'];
  count = 0;
  for (const cfg of curtainConfigs) {
    for (const mat of curtainMats) {
      if (count >= 30) break;
      items.push(primitive('curtain', `${M[mat].label} Curtain (${cfg.w.toFixed(1)}m)`, 'decor', { width: cfg.w, depth: 0.1, height: cfg.h }, Math.round(cfg.cost * M[mat].costMultiplier), [mat], ['window', 'soft-furnishing']));
      count++;
    }
  }

  const artConfigs: Array<{ w: number; h: number; cost: number }> = [
    { w: 0.3, h: 0.4, cost: 800 },
    { w: 0.45, h: 0.6, cost: 1500 },
    { w: 0.6, h: 0.45, cost: 2200 },
    { w: 0.9, h: 0.6, cost: 3500 },
    { w: 1.2, h: 0.8, cost: 5000 },
  ];
  const artMats: (keyof typeof M)[] = ['wood_teak', 'metal_brass', 'metal_matte_black'];
  count = 0;
  for (const cfg of artConfigs) {
    for (const mat of artMats) {
      if (count >= 30) break;
      items.push(primitive('wallArt', `${M[mat].label} Wall Art (${cfg.w.toFixed(1)}m)`, 'decor', { width: cfg.w, depth: 0.03, height: cfg.h }, Math.round(cfg.cost * M[mat].costMultiplier), [mat], ['wall', 'decor']));
      count++;
    }
  }

  for (let i = 0; i < 8 && items.length < 300; i++) {
    items.push(primitive('stool', `Wooden Stool (${0.35 + i * 0.05}m)`, 'seating', { width: 0.35 + i * 0.05, depth: 0.35 + i * 0.05, height: 0.45 }, 1200 + i * 300, ['wood_teak', 'wood_oak', 'wood_walnut'], ['portable', 'accent']));
  }
  for (let i = 0; i < 6 && items.length < 300; i++) {
    items.push(primitive('rug', `Area Rug (${1.2 + i * 0.3}x${1.8 + i * 0.3}m)`, 'decor', { width: 1.2 + i * 0.3, depth: 1.8 + i * 0.3, height: 0.01 }, 3000 + i * 2000, ['fabric_cotton', 'fabric_linen'], ['floor', 'soft-furnishing']));
  }
  for (let i = 0; i < 6 && items.length < 300; i++) {
    items.push(primitive('lamp', `Table Lamp (${0.25 + i * 0.05}m)`, 'decor', { width: 0.25 + i * 0.05, depth: 0.25 + i * 0.05, height: 0.4 + i * 0.1 }, 1200 + i * 800, ['fabric_cotton', 'metal_brass', 'metal_chrome'], ['lighting', 'accent']));
  }

  return items.slice(0, 300);
}

// ─── 60 DECOR ───

function generateDecor(): CatalogItem[] {
  const items: CatalogItem[] = [];

  const plants: Array<[string, number, number, number]> = [
    ['Small Succulent', 0.15, 500, 0],
    ['Small Snake Plant', 0.2, 700, 0],
    ['Small Peace Lily', 0.22, 900, 0],
    ['Medium Areca Palm', 0.35, 1800, 0],
    ['Medium Fiddle Leaf', 0.4, 2400, 0],
    ['Medium Rubber Plant', 0.38, 2200, 0],
    ['Large Monstera', 0.55, 3500, 0],
    ['Large Bird of Paradise', 0.6, 4200, 0],
    ['Hanging Pothos', 0.25, 800, 0],
    ['Tabletop Bonsai', 0.2, 1200, 0],
    ['Tall Bamboo', 0.35, 1600, 0],
    ['Desk Cactus', 0.1, 350, 0],
    ['Corner Palm', 0.5, 3000, 0],
    ['Balcony Fern', 0.3, 1100, 0],
    ['Indoor Money Plant', 0.25, 650, 0],
  ];
  for (const [label, w, cost] of plants) {
    items.push(decorItem(label, 'decor', { width: w as number, depth: w as number, height: w as number * 1.5 }, cost as number, '/models/plant.glb', ['plants', 'greenery']));
  }

  for (let i = 0; i < 10; i++) {
    const w = 0.25 + i * 0.02;
    items.push(decorItem(`Table Lamp ${i + 1}`, 'decor', { width: w, depth: w, height: 0.45 + i * 0.08 }, 1200 + i * 350, '/models/lamp_table.glb', ['lighting', 'accent']));
  }
  for (let i = 0; i < 5; i++) {
    items.push(decorItem(`Floor Lamp ${i + 1}`, 'decor', { width: 0.3, depth: 0.3, height: 1.5 + i * 0.1 }, 3500 + i * 1200, '/models/lamp_floor.glb', ['lighting', 'ambient']));
  }
  const rugs: Array<[string, number, number, number]> = [
    ['Small Cotton Rug', 1.2, 1.8, 3000],
    ['Medium Cotton Rug', 1.5, 2.1, 5000],
    ['Large Cotton Rug', 2.4, 3.0, 12000],
    ['Small Jute Rug', 1.2, 1.8, 3500],
    ['Medium Jute Rug', 1.5, 2.1, 6000],
    ['Small Persian-Style Rug', 1.0, 1.5, 8000],
    ['Medium Persian-Style Rug', 1.5, 2.1, 15000],
    ['Large Persian-Style Rug', 2.4, 3.0, 25000],
    ['Runner Rug', 0.8, 2.4, 4500],
    ['Round Rug', 1.5, 1.5, 7000],
  ];
  for (const [label, w, d, cost] of rugs) {
    items.push(decorItem(label, 'decor', { width: w as number, depth: d as number, height: 0.01 }, cost as number, '/models/rug.glb', ['floor', 'soft-furnishing']));
  }
  for (let i = 0; i < 10; i++) {
    items.push(decorItem(`Throw Cushion ${i + 1}`, 'decor', { width: 0.4, depth: 0.1, height: 0.4 }, 600 + i * 150, '/models/cushion.glb', ['accent', 'soft-furnishing']));
  }
  for (let i = 0; i < 5; i++) {
    items.push(decorItem(`Wall Tapestry ${i + 1}`, 'decor', { width: 0.6 + i * 0.15, depth: 0.02, height: 0.9 + i * 0.2 }, 2000 + i * 1500, '/models/tapestry.glb', ['wall', 'traditional']));
  }
  for (let i = 0; i < 5; i++) {
    items.push(decorItem(`Designer Ceiling Fan ${i + 1}`, 'fixtures', { width: 1.2, depth: 1.2, height: 0.35 }, 4000 + i * 2000, '/models/fan_decor.glb', ['lighting', 'premium']));
  }

  return items;
}

// ─── ASSEMBLE ───

const VARIANTS = generateVariants();
const PRIMITIVES = generatePrimitives();
const DECOR = generateDecor();

export const CATALOG: CatalogItem[] = [
  ...ALL_HEROES,
  ...VARIANTS,
  ...PRIMITIVES,
  ...DECOR,
];

// ─── INDEXES ───

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
