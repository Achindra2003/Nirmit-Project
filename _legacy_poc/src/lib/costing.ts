import type { Item } from '../store/useStore';

// ─────────────────────────────────────────────────
// GST Configuration
// ─────────────────────────────────────────────────

/** GST rate for standard furniture items */
const GST_FURNITURE_STANDARD = 0.18; // 18%

/** GST rate for luxury/premium items (marble, genuine leather, etc.) */
const GST_LUXURY = 0.28; // 28%

/** Items priced above this threshold are considered luxury */
const LUXURY_PRICE_THRESHOLD = 50000;

/** Luxury material indicators in item codes/names */
const LUXURY_MATERIALS = ['marble', 'genuine_leather', 'leather_genuine', 'granite', 'teak_solid'];

export interface TaxBreakdown {
  /** Central GST (50% of total GST) */
  cgst: number;
  /** State GST (50% of total GST) */
  sgst: number;
  /** Integrated GST (for inter-state, 0 for intra-state by default) */
  igst: number;
  /** Total tax amount */
  totalTax: number;
}

export interface CostSummary {
  city: string;
  furnitureLow: number;
  furnitureHigh: number;
  materialCost: number;
  laborCost: number;
  totalLow: number;
  totalHigh: number;
  /** Tax-exclusive subtotal (low) */
  subtotalExTaxLow: number;
  /** Tax-exclusive subtotal (high) */
  subtotalExTaxHigh: number;
  /** Detailed tax breakdown */
  taxBreakdown: TaxBreakdown;
  /** Tax-inclusive total (low) */
  totalLowWithTax: number;
  /** Tax-inclusive total (high) */
  totalHighWithTax: number;
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

/** Determine if an item qualifies for luxury GST rate */
function isLuxuryItem(item: Item): boolean {
  // High-value items
  if (item.price > LUXURY_PRICE_THRESHOLD) return true;

  // Check for luxury material indicators in the item code
  const codeLower = item.code.toLowerCase();
  for (const mat of LUXURY_MATERIALS) {
    if (codeLower.includes(mat)) return true;
  }

  // Marble flooring or genuine leather furniture
  const nameLower = item.name.toLowerCase();
  if (nameLower.includes('marble') || nameLower.includes('genuine leather')) return true;

  return false;
}

/** Calculate GST for a set of items */
export function calculateGST(items: Item[]): TaxBreakdown {
  let standardTotal = 0;
  let luxuryTotal = 0;

  for (const item of items) {
    const price = item.price && item.price > 0 ? item.price : 0;
    if (isLuxuryItem(item)) {
      luxuryTotal += price;
    } else {
      standardTotal += price;
    }
  }

  const standardTax = Math.round(standardTotal * GST_FURNITURE_STANDARD);
  const luxuryTax = Math.round(luxuryTotal * GST_LUXURY);
  const totalTax = standardTax + luxuryTax;

  // For intra-state transactions: split equally between CGST and SGST
  // IGST is 0 for intra-state (default assumption)
  const cgst = Math.round(totalTax / 2);
  const sgst = totalTax - cgst;

  return {
    cgst,
    sgst,
    igst: 0,
    totalTax,
  };
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

  // Tax-exclusive totals (subtotal before GST)
  const subtotalExTaxLow = roundToHundreds(furniture.low + materialCost + laborCost);
  const subtotalExTaxHigh = roundToHundreds(furniture.high + materialCost + laborCost * 1.08);

  // Calculate GST on furniture only (materials and labor have separate tax treatment)
  const taxBreakdown = calculateGST(items);

  // Tax-inclusive totals
  const totalLowWithTax = subtotalExTaxLow + taxBreakdown.totalTax;
  const totalHighWithTax = subtotalExTaxHigh + taxBreakdown.totalTax;

  // Keep backward-compatible totalLow/totalHigh (tax-exclusive for existing consumers)
  const totalLow = subtotalExTaxLow;
  const totalHigh = subtotalExTaxHigh;

  return {
    city,
    furnitureLow: furniture.low,
    furnitureHigh: furniture.high,
    materialCost,
    laborCost,
    totalLow,
    totalHigh,
    subtotalExTaxLow,
    subtotalExTaxHigh,
    taxBreakdown,
    totalLowWithTax,
    totalHighWithTax,
  };
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

// ─────────────────────────────────────────────────
// Cost Psychology: Budget, Savings, Phase Splitting
// ─────────────────────────────────────────────────

export interface SavingsOpportunity {
  /** Human-readable description of the saving */
  description: string;
  /** Amount saved in INR */
  amount: number;
  /** Category of saving */
  category: 'material' | 'brand' | 'labor' | 'scope';
  /** Difficulty: how much compromise is involved */
  difficulty: 'easy' | 'moderate' | 'hard';
}

export interface BudgetInfo {
  /** User's stated budget (if provided) */
  statedBudget: number | null;
  /** Current cost estimate (low end, tax-inclusive) */
  currentLow: number;
  /** Remaining budget (negative = over budget) */
  remaining: number | null;
  /** Percentage of budget used */
  percentUsed: number | null;
  /** Real-world equivalent (EMI or relatable context) */
  realWorldContext: string;
  /** Available savings opportunities */
  savingsOpportunities: SavingsOpportunity[];
}

export interface CostPhase {
  label: string;
  description: string;
  items: string[];
  cost: number;
  priority: 1 | 2 | 3; // 1 = essential, 2 = recommended, 3 = optional
}

/**
 * Generate real-world cost context — "that's about 3 months of EMI"
 */
export function getRealWorldContext(amount: number): string {
  const emi3month = roundToHundreds(amount / 3);
  const emi6month = roundToHundreds(amount / 6);
  const emi12month = roundToHundreds(amount / 12);

  if (amount < 50000) return `About the cost of a premium phone`;
  if (amount < 100000) return `That's ₹${(emi3month / 1000).toFixed(1)}K/month over 3 months — like a short EMI`;
  if (amount < 300000) return `That's ₹${(emi6month / 1000).toFixed(1)}K/month over 6 months — less than a family dinner out per week`;
  if (amount < 600000) return `That's ₹${(emi12month / 1000).toFixed(1)}K/month over 12 months — about what you'd spend on daily chai and snacks`;
  return `₹${(emi12month / 1000).toFixed(1)}K/month over 12 months — less than rent in most Indian metros`;
}

/**
 * Find savings opportunities by analyzing items
 */
export function findSavingsOpportunities(
  items: Item[],
  costSummary: CostSummary,
): SavingsOpportunity[] {
  const opportunities: SavingsOpportunity[] = [];

  // Sort items by price descending for analysis
  const sortedItems = [...items]
    .filter((i) => i.price && i.price > 0)
    .sort((a, b) => (b.price ?? 0) - (a.price ?? 0));

  // Find the top 3 most expensive items — biggest impact on savings
  const topItems = sortedItems.slice(0, 3);
  for (const item of topItems) {
    const price = item.price ?? 0;

    // Material substitution opportunity
    const codeLower = item.code.toLowerCase();
    if (codeLower.includes('teak') || codeLower.includes('sheesham')) {
      const saving = Math.round(price * 0.35);
      opportunities.push({
        description: `Switch "${item.name || item.code}" from solid wood to engineered wood — same look, ₹${saving.toLocaleString('en-IN')} less`,
        amount: saving,
        category: 'material',
        difficulty: 'moderate',
      });
    }

    // Brand alternative
    if (price > 15000) {
      const saving = Math.round(price * 0.25);
      opportunities.push({
        description: `Source "${item.name || item.code}" from a local manufacturer instead of a premium brand — save ~₹${saving.toLocaleString('en-IN')}`,
        amount: saving,
        category: 'brand',
        difficulty: 'moderate',
      });
    }

    // Scope reduction (only for non-essential items priced above ₹20K)
    if (price > 20000 && !codeLower.includes('bed') && !codeLower.includes('sofa')) {
      opportunities.push({
        description: `Consider skipping "${item.name || item.code}" for now and adding it in Phase 2`,
        amount: price,
        category: 'scope',
        difficulty: 'easy',
      });
    }
  }

  // Labor optimization: if more than 8 items, suggest bundling
  if (items.length > 8) {
    const laborSaving = Math.round(costSummary.laborCost * 0.15);
    if (laborSaving > 0) {
      opportunities.push({
        description: `Bundle all carpentry work with one contractor — save ~₹${laborSaving.toLocaleString('en-IN')} on labor`,
        amount: laborSaving,
        category: 'labor',
        difficulty: 'easy',
      });
    }
  }

  // Material cost optimization: suggest pre-laminated vs painting
  if (items.length > 5) {
    const materialSaving = Math.round(costSummary.materialCost * 0.12);
    if (materialSaving > 0) {
      opportunities.push({
        description: `Use pre-laminated boards instead of post-painting — save ~₹${materialSaving.toLocaleString('en-IN')} on finishing`,
        amount: materialSaving,
        category: 'material',
        difficulty: 'easy',
      });
    }
  }

  // Deduplicate and sort by savings amount (largest first)
  const unique = opportunities.filter(
    (o, i, arr) => arr.findIndex((x) => x.description === o.description) === i,
  );
  return unique.sort((a, b) => b.amount - a.amount).slice(0, 5);
}

/**
 * Split items into execution phases
 */
export function splitIntoPhases(items: Item[], costSummary: CostSummary): CostPhase[] {
  const phases: CostPhase[] = [];

  // Phase 1: Essential (must-have items for the room to be functional)
  const essentialCodes = [
    'bed', 'sofa', 'dining-table', 'wardrobe', 'study-table',
    'tv-unit', 'puja-shelf',
  ];
  const phase1Items = items.filter((i) =>
    essentialCodes.some((code) => i.code.toLowerCase().includes(code)),
  );
  const phase1Cost = phase1Items.reduce((sum, i) => sum + (i.price ?? 0), 0);

  if (phase1Items.length > 0) {
    phases.push({
      label: 'Phase 1 — The Essentials',
      description: 'Everything you need to make the room livable from day one',
      items: phase1Items.map((i) => i.name || i.code),
      cost: roundToHundreds(phase1Cost + costSummary.laborCost * 0.7 + costSummary.materialCost * 0.6),
      priority: 1,
    });
  }

  // Phase 2: Recommended (enhancements that make a visible difference)
  const phase2Items = items.filter(
    (i) => !essentialCodes.some((code) => i.code.toLowerCase().includes(code)),
  );
  const phase2Cost = phase2Items.reduce((sum, i) => sum + (i.price ?? 0), 0);

  if (phase2Items.length > 0) {
    phases.push({
      label: 'Phase 2 — The Finishing Touch',
      description: 'Accessories, decor, and secondary furniture that elevate the space',
      items: phase2Items.map((i) => i.name || i.code),
      cost: roundToHundreds(phase2Cost + costSummary.laborCost * 0.3 + costSummary.materialCost * 0.4),
      priority: 2,
    });
  }

  // Phase 3: Optional upgrades
  phases.push({
    label: 'Phase 3 — Premium Upgrades',
    description: 'Luxury finishes, smart lighting, automation — nice to have, not need to have',
    items: ['Smart lighting', 'Premium hardware (Hafele)', 'Decorative wall panels', 'Automated curtains'],
    cost: roundToHundreds(costSummary.totalHighWithTax * 0.18),
    priority: 3,
  });

  return phases;
}

/**
 * Build complete budget context including savings and phase options
 */
export function buildBudgetContext(
  items: Item[],
  costSummary: CostSummary,
  userBudget?: number | null,
): BudgetInfo {
  const currentLow = costSummary.totalLowWithTax;
  const statedBudget = userBudget ?? null;
  const remaining = statedBudget ? statedBudget - currentLow : null;
  const percentUsed = statedBudget ? Math.round((currentLow / statedBudget) * 100) : null;

  return {
    statedBudget,
    currentLow,
    remaining,
    percentUsed,
    realWorldContext: getRealWorldContext(currentLow),
    savingsOpportunities: findSavingsOpportunities(items, costSummary),
  };
}
