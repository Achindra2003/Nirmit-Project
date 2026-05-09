import { describe, it, expect } from 'vitest';
import { CATALOG, getItemById, getItemsByCategory, searchCatalog } from '../catalog';
import { HERO_MODEL_COVERAGE, getHeroModelPath, heroModelMapping } from '../modelMapping';
import type { CatalogCategory } from '../types';

describe('Catalog', () => {
  it('has at least 40 hero items', () => {
    const heroes = CATALOG.filter((item) => item.source === 'hero');
    expect(heroes.length).toBeGreaterThanOrEqual(40);
  });

  it('has items across all categories', () => {
    const categories = new Set(CATALOG.map((item) => item.category));
    expect(categories.has('seating')).toBe(true);
    expect(categories.has('sleeping')).toBe(true);
    expect(categories.has('storage')).toBe(true);
    expect(categories.has('dining')).toBe(true);
    expect(categories.has('kitchen')).toBe(true);
    expect(categories.has('pooja')).toBe(true);
    expect(categories.has('work')).toBe(true);
    expect(categories.has('fixtures')).toBe(true);
  });

  it('getItemById returns correct item', () => {
    const item = getItemById('cat_0001');
    expect(item).toBeDefined();
    expect(item!.label).toBe('Bathroom Cabinet');
    expect(item!.category).toBe('storage');
  });

  it('getItemById returns undefined for non-existent ID', () => {
    const item = getItemById('non_existent_id');
    expect(item).toBeUndefined();
  });

  it('getItemsByCategory returns only items of that category', () => {
    const seating = getItemsByCategory('seating');
    expect(seating.length).toBeGreaterThan(0);
    for (const item of seating) {
      expect(item.category).toBe('seating');
    }
  });

  it('getItemsByCategory returns empty for invalid category', () => {
    const items = getItemsByCategory('invalid' as CatalogCategory);
    expect(items).toEqual([]);
  });

  it('searchCatalog finds items by label', () => {
    const results = searchCatalog('sofa');
    expect(results.length).toBeGreaterThan(0);
    const labels = results.map((r) => r.label.toLowerCase());
    expect(labels.some((l) => l.includes('sofa'))).toBe(true);
  });

  it('searchCatalog finds items by tag', () => {
    const results = searchCatalog('traditional');
    expect(results.length).toBeGreaterThan(0);
  });

  it('searchCatalog returns empty for gibberish query', () => {
    const results = searchCatalog('xyznonexistent12345');
    expect(results).toEqual([]);
  });

  it('every hero item has a valid modelPath or empty string', () => {
    const heroes = CATALOG.filter((item) => item.source === 'hero');
    for (const hero of heroes) {
      expect(typeof hero.modelPath).toBe('string');
    }
  });

  it('every catalog item has required fields', () => {
    for (const item of CATALOG) {
      expect(item.id).toBeTruthy();
      expect(item.label).toBeTruthy();
      expect(item.category).toBeTruthy();
      expect(item.dimensions.width).toBeGreaterThan(0);
      expect(item.dimensions.depth).toBeGreaterThan(0);
      expect(item.dimensions.height).toBeGreaterThan(0);
      expect(item.pricing.baseCost).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(item.tags)).toBe(true);
    }
  });
});

describe('Model Mapping', () => {
  it('has at least 40 hero coverage entries', () => {
    expect(HERO_MODEL_COVERAGE.length).toBeGreaterThanOrEqual(40);
  });

  it('all entries are verified with model paths', () => {
    const verified = HERO_MODEL_COVERAGE.filter((e) => e.verified);
    const unverified = HERO_MODEL_COVERAGE.filter((e) => !e.verified);
    expect(verified.length).toBeGreaterThanOrEqual(40);
    expect(unverified.length).toBe(0);
  });

  it('verified entries have non-empty modelPath', () => {
    const verified = HERO_MODEL_COVERAGE.filter((e) => e.verified);
    for (const entry of verified) {
      expect(entry.verifiedModelPath).toBeTruthy();
      // Model paths may be /models/... (nirmit local) or bp:/models/glb/... (Blueprint3D)
      expect(entry.verifiedModelPath).toMatch(/^(\/models\/|bp:\/models\/glb\/).+\.glb$/);
    }
  });

  it('getHeroModelPath returns path for known hero', () => {
    const path = getHeroModelPath('cat_0001');
    expect(path).toBe('/models/bathroomCabinet.glb');
  });

  it('getHeroModelPath returns empty string for unknown hero', () => {
    const path = getHeroModelPath('cat_9999');
    expect(path).toBe('');
  });

  it('heroModelMapping has entries for all heroes', () => {
    const keys = Object.keys(heroModelMapping);
    expect(keys.length).toBeGreaterThanOrEqual(40);
  });

  it('all hero mappings have model paths', () => {
    for (const [key, path] of Object.entries(heroModelMapping)) {
      expect(path).toBeTruthy();
      expect(path).toMatch(/^(\/models\/|bp:\/models\/glb\/).+\.glb$/);
    }
  });
});
