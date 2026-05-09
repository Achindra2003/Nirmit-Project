export type CatalogSource = 'hero' | 'variant' | 'primitive' | 'decor';

export type CatalogCategory =
  | 'seating'
  | 'sleeping'
  | 'storage'
  | 'dining'
  | 'pooja'
  | 'kitchen'
  | 'decor'
  | 'fixtures'
  | 'work';

export type MaterialId =
  | 'fabric_cotton'
  | 'fabric_linen'
  | 'fabric_velvet'
  | 'fabric_silk_blend'
  | 'fabric_jute'
  | 'leather_pu'
  | 'leather_genuine'
  | 'wood_teak'
  | 'wood_oak'
  | 'wood_walnut'
  | 'wood_rosewood'
  | 'wood_mango'
  | 'wood_sheen'
  | 'woodgrain_laminate'
  | 'white_laminate'
  | 'grey_laminate'
  | 'black_laminate'
  | 'metal_chrome'
  | 'metal_brass'
  | 'metal_matte_black'
  | 'marble_white'
  | 'marble_beige'
  | 'granite_black'
  | 'kota_stone'
  | 'tile_ceramic'
  | 'tile_vitrified';

export type CostUnit = 'piece' | 'sqft' | 'running_foot' | 'set';
export type LeadTime = 'in_stock' | '7_days' | '15_days' | '21_days' | 'custom';

export interface MaterialOption {
  materialId: MaterialId;
  label: string;
  costMultiplier: number;
  thumbnail: string;
  roughness?: number;
  metalness?: number;
  colorHex?: string;
}

export interface CatalogPricing {
  baseCost: number;
  costUnit: CostUnit;
  materialOptions: Partial<Record<MaterialId, MaterialOption>>;
  laborCost: number;
  leadTime: LeadTime;
}

export interface CatalogDimensions {
  width: number;
  depth: number;
  height: number;
}

export interface CatalogItem {
  id: string;
  source: CatalogSource;
  category: CatalogCategory;
  label: string;
  dimensions: CatalogDimensions;
  modelPath: string;
  thumbnail: string;
  tags: string[];
  quality: 'hero' | 'standard' | 'primitive';
  pricing: CatalogPricing;
}

export interface VariantConfig {
  baseModelId: string;
  id: string;
  label: string;
  scaleOverrides: Partial<CatalogDimensions>;
  materialOverrides: Partial<Record<string, MaterialId>>;
  costMultiplier: number;
}

export interface PrimitiveConfig {
  constructorName:
    | 'bookshelf'
    | 'tvUnit'
    | 'poojaNiche'
    | 'counter'
    | 'curtain'
    | 'shelving'
    | 'wallArt'
    | 'stool'
    | 'rug'
    | 'lamp';
  params: Record<string, number | string | boolean>;
}

export interface PrimitivePricingConfig {
  baseRatePerSqft: number;
  laborCostPerUnit: number;
  materialOptions: Partial<Record<MaterialId, MaterialOption>>;
}

export interface CatalogSearchResult extends CatalogItem {
  relevanceScore: number;
}

export type LegacyCode = string;

export interface CatalogMapping {
  legacyCode: string;
  catalogId: string;
}