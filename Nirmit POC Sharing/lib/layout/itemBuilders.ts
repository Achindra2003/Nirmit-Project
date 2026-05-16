import { FurnitureFactory } from '../../catalog/FurnitureFactory';
import type { CatalogItem } from '../../catalog/types';
import type { FurniturePlacement } from '../../solver/layoutSolver';
import type { Item, ItemDraft } from '../../store/useStore';
import type { SuggestedFurnitureItem } from '../../types/journey';

interface PlacementOverrides {
  x?: number;
  y?: number;
  rotation?: number;
}

function makeItemId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function getDefaultColor(item: CatalogItem): string {
  return (
    item.pricing.materialOptions['wood_teak']?.colorHex
    ?? item.pricing.materialOptions['fabric_cotton']?.colorHex
    ?? item.pricing.materialOptions['white_laminate']?.colorHex
    ?? '#8B6914'
  );
}

export function mapLegacyCodeToCatalogItem(code: string): CatalogItem | undefined {
  return FurnitureFactory.mapLegacyCode(code);
}

export function buildDraftFromCatalog(item: CatalogItem, overrides?: PlacementOverrides): ItemDraft {
  return {
    code: item.id,
    name: item.label,
    x: overrides?.x ?? 5,
    y: overrides?.y ?? 5,
    width: item.dimensions.width,
    length: item.dimensions.depth,
    height: item.dimensions.height,
    rotation: overrides?.rotation ?? 0,
    color: getDefaultColor(item),
    modelPath: item.modelPath.startsWith('primitive:') ? '' : item.modelPath,
    price: item.pricing.baseCost,
    brand: 'Nirmit Catalog',
  };
}

export function buildItemFromCatalog(item: CatalogItem, overrides?: PlacementOverrides): Item {
  return {
    id: makeItemId(),
    ...buildDraftFromCatalog(item, overrides),
  };
}

export function buildItemFromVibeSuggestion(input: SuggestedFurnitureItem): Item {
  const catalogItem = mapLegacyCodeToCatalogItem(input.code);
  if (catalogItem) {
    return buildItemFromCatalog(catalogItem, { x: input.x, y: input.y, rotation: input.rotation });
  }

  return {
    id: makeItemId(),
    code: input.code,
    name: input.label,
    x: input.x,
    y: input.y,
    width: input.width,
    length: input.length,
    height: input.height,
    rotation: input.rotation,
    color: '#8B6914',
    modelPath: '',
    price: 10000,
    brand: 'Generic',
  };
}

export function buildItemsFromVibeSuggestions(layout: SuggestedFurnitureItem[]): Item[] {
  return layout.map((entry) => buildItemFromVibeSuggestion(entry));
}

export function buildItemsFromSolverPlacements(placements: FurniturePlacement[]): Item[] {
  const items: Item[] = [];

  for (const placement of placements) {
    const catalogItem = FurnitureFactory.getItem(placement.catalogId);
    if (!catalogItem) {
      continue;
    }

    items.push(
      buildItemFromCatalog(catalogItem, {
        x: placement.x,
        y: placement.y,
        rotation: placement.rotation,
      }),
    );
  }

  return items;
}
