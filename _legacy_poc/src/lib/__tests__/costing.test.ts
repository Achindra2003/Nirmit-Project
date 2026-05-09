import { describe, it, expect } from 'vitest';
import { estimateCostSummary, calculateGST, formatINR, type CostSummary, type TaxBreakdown } from '../costing';
import type { Item } from '../../store/useStore';

// Helper to create a mock item
function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'test-1',
    code: 'sofa-3s',
    name: '3-Seater Sofa',
    x: 0,
    y: 0,
    width: 1.8,
    length: 0.8,
    height: 0.85,
    rotation: 0,
    color: '#8B7355',
    modelPath: '/models/loungeSofaLong.glb',
    price: 22000,
    brand: 'Godrej Interio',
    ...overrides,
  };
}

describe('calculateGST', () => {
  it('calculates 18% GST on standard furniture', () => {
    const items = [makeItem({ price: 22000 }), makeItem({ id: 'test-2', price: 16000 })];
    const tax = calculateGST(items);
    // 18% of 38000 = 6840
    expect(tax.totalTax).toBe(6840);
    expect(tax.cgst).toBe(3420);
    expect(tax.sgst).toBe(3420);
    expect(tax.igst).toBe(0);
  });

  it('calculates 28% GST on luxury items (price > 50000)', () => {
    const items = [makeItem({ price: 75000 })];
    const tax = calculateGST(items);
    // 28% of 75000 = 21000
    expect(tax.totalTax).toBe(21000);
    expect(tax.cgst).toBe(10500);
    expect(tax.sgst).toBe(10500);
  });

  it('calculates 28% GST on marble items', () => {
    const items = [makeItem({ price: 30000, code: 'marble_white', name: 'Marble Flooring' })];
    const tax = calculateGST(items);
    // 28% of 30000 = 8400
    expect(tax.totalTax).toBe(8400);
  });

  it('calculates 28% GST on genuine leather items', () => {
    const items = [makeItem({ price: 40000, code: 'leather_genuine', name: 'Genuine Leather Sofa' })];
    const tax = calculateGST(items);
    // 28% of 40000 = 11200
    expect(tax.totalTax).toBe(11200);
  });

  it('handles mixed standard and luxury items', () => {
    const items = [
      makeItem({ id: 'std-1', price: 22000 }),
      makeItem({ id: 'lux-1', price: 75000 }),
    ];
    const tax = calculateGST(items);
    // 18% of 22000 = 3960, 28% of 75000 = 21000, total = 24960
    expect(tax.totalTax).toBe(24960);
  });

  it('handles empty items array', () => {
    const tax = calculateGST([]);
    expect(tax.totalTax).toBe(0);
    expect(tax.cgst).toBe(0);
    expect(tax.sgst).toBe(0);
  });

  it('handles items with zero price', () => {
    const items = [makeItem({ price: 0 })];
    const tax = calculateGST(items);
    expect(tax.totalTax).toBe(0);
  });
});

describe('estimateCostSummary', () => {
  it('returns a valid CostSummary with all required fields', () => {
    const items = [makeItem()];
    const summary = estimateCostSummary(items, 'Mumbai');

    expect(summary).toHaveProperty('city', 'Mumbai');
    expect(summary).toHaveProperty('furnitureLow');
    expect(summary).toHaveProperty('furnitureHigh');
    expect(summary).toHaveProperty('materialCost');
    expect(summary).toHaveProperty('laborCost');
    expect(summary).toHaveProperty('totalLow');
    expect(summary).toHaveProperty('totalHigh');
    expect(summary).toHaveProperty('subtotalExTaxLow');
    expect(summary).toHaveProperty('subtotalExTaxHigh');
    expect(summary).toHaveProperty('taxBreakdown');
    expect(summary).toHaveProperty('totalLowWithTax');
    expect(summary).toHaveProperty('totalHighWithTax');
  });

  it('calculates tax-inclusive total higher than tax-exclusive', () => {
    const items = [makeItem({ price: 22000 })];
    const summary = estimateCostSummary(items, 'Mumbai');

    expect(summary.totalLowWithTax).toBeGreaterThan(summary.totalLow);
    expect(summary.totalHighWithTax).toBeGreaterThan(summary.totalHigh);
  });

  it('applies city labor multiplier', () => {
    const items = [makeItem()];
    const mumbai = estimateCostSummary(items, 'Mumbai');
    const pune = estimateCostSummary(items, 'Pune');

    // Mumbai has 1.4x multiplier, Pune has 1.0x
    expect(mumbai.laborCost).toBeGreaterThan(pune.laborCost);
  });

  it('handles unknown city with default multiplier', () => {
    const items = [makeItem()];
    const summary = estimateCostSummary(items, 'UnknownCity');
    expect(summary.city).toBe('UnknownCity');
    expect(summary.totalLow).toBeGreaterThan(0);
  });

  it('returns positive values for all cost fields', () => {
    const items = [makeItem()];
    const summary = estimateCostSummary(items, 'Mumbai');

    expect(summary.furnitureLow).toBeGreaterThan(0);
    expect(summary.furnitureHigh).toBeGreaterThan(0);
    expect(summary.materialCost).toBeGreaterThan(0);
    expect(summary.laborCost).toBeGreaterThan(0);
    expect(summary.totalLow).toBeGreaterThan(0);
    expect(summary.totalHigh).toBeGreaterThan(0);
  });

  it('handles empty items array', () => {
    const summary = estimateCostSummary([], 'Mumbai');
    expect(summary.furnitureLow).toBeGreaterThanOrEqual(18000); // minimum
    expect(summary.totalLow).toBeGreaterThan(0);
  });
});

describe('formatINR', () => {
  it('formats numbers as Indian currency', () => {
    const result = formatINR(50000);
    expect(result).toContain('50,000');
  });

  it('formats zero', () => {
    const result = formatINR(0);
    expect(result).toContain('0');
  });

  it('formats large numbers with Indian grouping', () => {
    const result = formatINR(1500000);
    expect(result).toContain('15,00,000');
  });
});
