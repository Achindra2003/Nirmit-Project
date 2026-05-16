import type { Item } from '../store/useStore';

export interface CostSummary {
  city: string;
  furnitureLow: number;
  furnitureHigh: number;
  materialCost: number;
  laborCost: number;
  totalLow: number;
  totalHigh: number;
}

const CITY_LABOR_MULTIPLIER: Record<string, number> = {
  Mumbai: 1.4,
  Pune: 1,
  Bangalore: 1.2,
  Delhi: 1.15,
  Chennai: 1.05,
  Hyderabad: 1.08,
  Ahmedabad: 0.95,
  Kolkata: 0.97
};

function roundToHundreds(value: number): number {
  return Math.round(value / 100) * 100;
}

function estimateFurnitureRange(items: Item[]): { low: number; high: number } {
  const base = items.reduce((sum, item) => {
    if (item.price && item.price > 0) {
      return sum + item.price;
    }
    const volume = item.width * item.length * Math.max(item.height, 0.2);
    return sum + volume * 6500;
  }, 0);

  const low = roundToHundreds(Math.max(base * 0.9, 18000));
  const high = roundToHundreds(Math.max(base * 1.22, 26000));

  return { low, high };
}

export function estimateCostSummary(items: Item[], city: string): CostSummary {
  const cityMultiplier = CITY_LABOR_MULTIPLIER[city] ?? 1.1;
  const furniture = estimateFurnitureRange(items);

  const materialCost = roundToHundreds(items.length * 6400);
  const laborCost = roundToHundreds(furniture.low * 0.22 * cityMultiplier);

  const totalLow = roundToHundreds(furniture.low + materialCost + laborCost);
  const totalHigh = roundToHundreds(furniture.high + materialCost + laborCost * 1.08);

  return {
    city,
    furnitureLow: furniture.low,
    furnitureHigh: furniture.high,
    materialCost,
    laborCost,
    totalLow,
    totalHigh
  };
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}
