import type { Item } from '../../store/useStore';

export interface BOQLineItem {
  slNo: number;
  description: string;
  qty: number;
  unit: string;
  rate: number;
  amount: number;
  category: 'furniture' | 'materials' | 'labor';
}

export interface BOQ {
  furniture: BOQLineItem[];
  materials: BOQLineItem[];
  labor: BOQLineItem[];
  subtotal: number;
  contingency: number;
  total: number;
}

const CITY_LABOR_RATES: Record<string, { carpentry: number; painting: number; flooring: number; electrical: number }> = {
  Mumbai: { carpentry: 450, painting: 28, flooring: 35, electrical: 600 },
  Delhi: { carpentry: 400, painting: 25, flooring: 30, electrical: 550 },
  Bangalore: { carpentry: 420, painting: 26, flooring: 32, electrical: 580 },
  Chennai: { carpentry: 380, painting: 24, flooring: 28, electrical: 500 },
  Hyderabad: { carpentry: 390, painting: 25, flooring: 30, electrical: 520 },
  Pune: { carpentry: 410, painting: 26, flooring: 32, electrical: 560 },
  Kolkata: { carpentry: 370, painting: 22, flooring: 28, electrical: 480 },
};

function getLaborRate(city: string) {
  return CITY_LABOR_RATES[city] ?? CITY_LABOR_RATES['Mumbai'];
}

export function generateBOQ(
  items: Item[],
  materials: { wallColor: string; flooring: string; woodFinish: string },
  room: { width: number; length: number },
  city: string
): BOQ {
  const labor = getLaborRate(city);
  let slNo = 0;

  // Furniture
  const furniture: BOQLineItem[] = items.map(item => {
    slNo++;
    return {
      slNo,
      description: `${item.name} (${item.brand})`,
      qty: 1,
      unit: 'piece',
      rate: item.price,
      amount: item.price,
      category: 'furniture' as const,
    };
  });

  // Materials
  const wallArea = 2 * (room.width + room.length) * 2.8; // 2.8m ceiling
  const floorArea = room.width * room.length;
  const perimeter = 2 * (room.width + room.length);

  const materialsBOQ: BOQLineItem[] = [
    { slNo: ++slNo, description: `Wall Paint — ${materials.wallColor}`, qty: Math.ceil(wallArea), unit: 'sqft', rate: 38, amount: Math.ceil(wallArea) * 38, category: 'materials' },
    { slNo: ++slNo, description: 'Wall Putty & Primer', qty: Math.ceil(wallArea), unit: 'sqft', rate: 12, amount: Math.ceil(wallArea) * 12, category: 'materials' },
    { slNo: ++slNo, description: `Flooring — ${materials.flooring.replace('-', ' ')}`, qty: Math.ceil(floorArea), unit: 'sqft', rate: 95, amount: Math.ceil(floorArea) * 95, category: 'materials' },
    { slNo: ++slNo, description: 'Skirting', qty: Math.ceil(perimeter), unit: 'rft', rate: 120, amount: Math.ceil(perimeter) * 120, category: 'materials' },
    { slNo: ++slNo, description: `Wood Finish — ${materials.woodFinish}`, qty: items.length, unit: 'items', rate: 800, amount: items.length * 800, category: 'materials' },
  ];

  // Labor
  const laborBOQ: BOQLineItem[] = [
    { slNo: ++slNo, description: 'Carpentry & Assembly', qty: items.length, unit: 'items', rate: labor.carpentry, amount: items.length * labor.carpentry, category: 'labor' },
    { slNo: ++slNo, description: 'Painting Labor', qty: Math.ceil(wallArea), unit: 'sqft', rate: labor.painting, amount: Math.ceil(wallArea) * labor.painting, category: 'labor' },
    { slNo: ++slNo, description: 'Flooring Installation', qty: Math.ceil(floorArea), unit: 'sqft', rate: labor.flooring, amount: Math.ceil(floorArea) * labor.flooring, category: 'labor' },
    { slNo: ++slNo, description: 'Electrical Points', qty: 4, unit: 'points', rate: labor.electrical, amount: 4 * labor.electrical, category: 'labor' },
  ];

  const furnitureTotal = furniture.reduce((sum, item) => sum + item.amount, 0);
  const materialsTotal = materialsBOQ.reduce((sum, item) => sum + item.amount, 0);
  const laborTotal = laborBOQ.reduce((sum, item) => sum + item.amount, 0);
  const subtotal = furnitureTotal + materialsTotal + laborTotal;
  const contingency = Math.round(subtotal * 0.1);
  const total = subtotal + contingency;

  return {
    furniture,
    materials: materialsBOQ,
    labor: laborBOQ,
    subtotal,
    contingency,
    total,
  };
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN').format(amount);
}