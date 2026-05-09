import { CATALOG, getItemById, getItemsByCategory, searchCatalog } from './catalog';
import type { CatalogItem, CatalogCategory, MaterialId } from './types';

export class FurnitureFactory {
  static getItem(id: string): CatalogItem | undefined {
    return getItemById(id);
  }

  static getByCategory(category: CatalogCategory): CatalogItem[] {
    return getItemsByCategory(category);
  }

  static search(query: string): (CatalogItem & { searchScore: number })[] {
    return searchCatalog(query);
  }

  static getVariants(heroId: string): CatalogItem[] {
    return CATALOG.filter(item => item.source === 'variant' && item.modelPath === heroId);
  }

  static getPrice(itemId: string, materialId: string): { baseCost: number; adjustedCost: number; materialLabel: string } | null {
    const item = getItemById(itemId);
    if (!item) return null;

    const matOpt = item.pricing.materialOptions[materialId as MaterialId];
    const multiplier = matOpt?.costMultiplier ?? 1;
    const label = matOpt?.label ?? materialId;

    return {
      baseCost: item.pricing.baseCost,
      adjustedCost: Math.round(item.pricing.baseCost * multiplier),
      materialLabel: label,
    };
  }

  static getCategories(): { value: string; label: string; count: number }[] {
    const categories: { value: string; label: string; count: number }[] = [];
    const rawCats: { value: string; label: string }[] = [
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
    for (const c of rawCats) {
      categories.push({
        value: c.value,
        label: c.label,
        count: FurnitureFactory.getByCategory(c.value as CatalogCategory).length,
      });
    }
    return categories;
  }

  static filterByTags(tags: string[]): CatalogItem[] {
    const lowerTags = tags.map(t => t.toLowerCase());
    return CATALOG.filter(item =>
      lowerTags.some(tag => item.tags.some(itemTag => itemTag.toLowerCase().includes(tag)))
    );
  }

  static filterByMaxDimensions(maxWidth: number, maxDepth: number, maxHeight?: number): CatalogItem[] {
    return CATALOG.filter(item =>
      item.dimensions.width <= maxWidth &&
      item.dimensions.depth <= maxDepth &&
      (maxHeight === undefined || item.dimensions.height <= maxHeight)
    );
  }

  static getCatalogSize(): number {
    return CATALOG.length;
  }

  static mapLegacyCode(legacyCode: string): CatalogItem | undefined {
    const mapping: Record<string, string> = {
      'bed-queen': 'cat_0008',
      'bed-king': 'cat_0007',
      'wardrobe-2d': 'cat_0017',
      'wardrobe-3d': 'cat_0016',
      'wardrobe-4d': 'cat_0016',
      'desk': 'cat_0023',
      'tv-unit': 'cat_0019',
      'nightstand': 'cat_0011',
      'dresser': 'cat_0022',
      'bench': 'cat_0005',
      'settee': 'cat_0004',
      'chaise': 'cat_0004',
      'trunk': 'cat_0022',
      'single-chair': 'cat_0004',
      'dining-table': 'cat_0013',
      // Living room items
      'sofa-l': 'cat_0001',
      'sofa-3s': 'cat_0002',
      'sofa-2s': 'cat_0003',
      'sofa-single': 'cat_0004',
      'diwan': 'cat_0005',
      'pouffe': 'cat_0006',
      'coffee-table': 'cat_0015',
      'bookshelf': 'cat_0018',
      'ottoman': 'cat_0021',
      'shoe-rack': 'cat_0020',
      'pooja-wall': 'cat_0026',
      'pooja-floor': 'cat_0027',
      'pooja-chowki': 'cat_0028',
    };

    const catalogId = mapping[legacyCode];
    if (catalogId) {
      return getItemById(catalogId);
    }

    // Fuzzy fallback
    if (legacyCode.includes('sofa')) return getItemsByCategory('seating')[0];
    if (legacyCode.includes('bed')) return getItemsByCategory('sleeping')[0];
    if (legacyCode.includes('wardrobe')) return getItemsByCategory('storage')[0];
    if (legacyCode.includes('chair')) return getItemsByCategory('seating')[0];
    if (legacyCode.includes('desk')) return getItemsByCategory('work')[0];
    if (legacyCode.includes('table')) return getItemsByCategory('dining')[0];
    if (legacyCode.includes('pooja') || legacyCode.includes('mandir')) return getItemsByCategory('pooja')[0];

    return undefined;
  }
}
