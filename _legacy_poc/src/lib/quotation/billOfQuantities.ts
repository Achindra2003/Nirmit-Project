import type { Item } from '../../store/useStore';
import { calculateGST, type TaxBreakdown } from '../costing';

export type ProcurementPath = 'buy' | 'build' | 'buy-or-build';
export type ExecutionPhase = 'demolition' | 'civil' | 'electrical' | 'flooring' | 'painting' | 'carpentry' | 'furnishing' | 'finishing';

export interface BOQLineItem {
  slNo: number;
  description: string;
  qty: number;
  unit: string;
  rate: number;
  amount: number;
  category: 'furniture' | 'materials' | 'labor';
  procurement?: ProcurementPath;
  carpenterSpec?: string;
  phase?: ExecutionPhase;
}

export interface ExecutionPhaseSummary {
  phase: ExecutionPhase;
  label: string;
  order: number;
  items: BOQLineItem[];
  phaseTotal: number;
  durationDays: number;
  dependsOn: ExecutionPhase[];
}

export interface BOQ {
  furniture: BOQLineItem[];
  materials: BOQLineItem[];
  labor: BOQLineItem[];
  subtotal: number;
  contingency: number;
  total: number;
  taxBreakdown: TaxBreakdown;
  grandTotal: number;
  executionSequence: ExecutionPhaseSummary[];
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

function classifyProcurement(item: Item): ProcurementPath {
  const name = (item.name ?? '').toLowerCase();
  const brand = (item.brand ?? '').toLowerCase();

  const buildItems = [
    'wardrobe', 'almirah', 'cabinet', 'loft', 'false ceiling', 'puja unit',
    'pooja unit', 'temple unit', 'wall shelf', 'built-in', 'storage unit',
    'mandir', 'puja mandir', 'shoe rack', 'tv unit', 'entertainment unit',
    'breakfast counter', 'bar unit', 'partition', 'panel',
  ];
  const buyItems = [
    'sofa', 'chair', 'bed', 'mattress', 'rug', 'carpet', 'curtain',
    'lamp', 'table lamp', 'floor lamp', 'pendant', 'chandelier', 'mirror',
    'plant', 'art', 'painting', 'cushion', 'throw', 'bean bag',
    'dining table', 'dining chair', 'stool', 'ottoman', 'pouf',
  ];

  if (['ikea', 'urban ladder', 'pepperfry', 'godrej interio', 'royaloak', 'durian'].some(b => brand.includes(b))) {
    return 'buy';
  }

  for (const kw of buildItems) {
    if (name.includes(kw)) return 'build';
  }
  for (const kw of buyItems) {
    if (name.includes(kw)) return 'buy';
  }

  return 'buy-or-build';
}

function generateCarpenterSpec(item: Item): string {
  const specs: string[] = [];
  const name = item.name;
  const w = item.width.toFixed(2);
  const d = item.length.toFixed(2);
  const raw = item as unknown as Record<string, unknown>;
  const h = typeof raw.height === 'number' ? (raw.height as number).toFixed(2) : '2.10';

  specs.push(`${name}: ${w}m (W) × ${d}m (D) × ${h}m (H)`);
  specs.push('Material: 18mm BWP marine ply with laminate finish');
  specs.push('Joinery: dowel + confirmat screw, concealed hinges for doors');
  specs.push('Edges: 2mm PVC edge banding, matching finish');

  return specs.join(' | ');
}

function buildExecutionSequence(items: BOQLineItem[], room: { width: number; length: number }): ExecutionPhaseSummary[] {
  const phases: ExecutionPhaseSummary[] = [
    { phase: 'demolition', label: '1. Site Preparation & Demolition', order: 1, items: [], phaseTotal: 0, durationDays: 2, dependsOn: [] },
    { phase: 'civil', label: '2. Civil Work & Leveling', order: 2, items: [], phaseTotal: 0, durationDays: 3, dependsOn: ['demolition'] },
    { phase: 'electrical', label: '3. Electrical Points & Conduits', order: 3, items: [], phaseTotal: 0, durationDays: 2, dependsOn: ['civil'] },
    { phase: 'flooring', label: '4. Flooring Installation', order: 4, items: [], phaseTotal: 0, durationDays: 3, dependsOn: ['civil'] },
    { phase: 'painting', label: '5. Painting & Finishing', order: 5, items: [], phaseTotal: 0, durationDays: 4, dependsOn: ['civil'] },
    { phase: 'carpentry', label: '6. Carpentry & Built-in Units', order: 6, items: [], phaseTotal: 0, durationDays: 7, dependsOn: ['painting', 'flooring'] },
    { phase: 'furnishing', label: '7. Furniture Installation', order: 7, items: [], phaseTotal: 0, durationDays: 2, dependsOn: ['carpentry'] },
    { phase: 'finishing', label: '8. Final Clean & Handover', order: 8, items: [], phaseTotal: 0, durationDays: 1, dependsOn: ['furnishing', 'electrical'] },
  ];

  const phaseMap = new Map<ExecutionPhase, ExecutionPhaseSummary>();
  for (const p of phases) phaseMap.set(p.phase, p);

  for (const item of items) {
    if (item.category === 'labor') {
      const desc = item.description.toLowerCase();
      if (desc.includes('electrical')) {
        phaseMap.get('electrical')!.items.push(item);
        phaseMap.get('electrical')!.phaseTotal += item.amount;
      } else if (desc.includes('paint')) {
        phaseMap.get('painting')!.items.push(item);
        phaseMap.get('painting')!.phaseTotal += item.amount;
      } else if (desc.includes('flooring')) {
        phaseMap.get('flooring')!.items.push(item);
        phaseMap.get('flooring')!.phaseTotal += item.amount;
      } else if (desc.includes('carpentry') || desc.includes('assembly')) {
        phaseMap.get('carpentry')!.items.push(item);
        phaseMap.get('carpentry')!.phaseTotal += item.amount;
      }
    } else if (item.category === 'materials') {
      const desc = item.description.toLowerCase();
      if (desc.includes('flooring') || desc.includes('skirting')) {
        phaseMap.get('flooring')!.items.push(item);
        phaseMap.get('flooring')!.phaseTotal += item.amount;
      } else if (desc.includes('paint') || desc.includes('putty') || desc.includes('primer')) {
        phaseMap.get('painting')!.items.push(item);
        phaseMap.get('painting')!.phaseTotal += item.amount;
      } else if (desc.includes('wood')) {
        phaseMap.get('carpentry')!.items.push(item);
        phaseMap.get('carpentry')!.phaseTotal += item.amount;
      }
    } else if (item.category === 'furniture') {
      if (item.procurement === 'build' || item.procurement === 'buy-or-build') {
        phaseMap.get('carpentry')!.items.push(item);
        phaseMap.get('carpentry')!.phaseTotal += item.amount;
      } else {
        phaseMap.get('furnishing')!.items.push(item);
        phaseMap.get('furnishing')!.phaseTotal += item.amount;
      }
    }
  }

  return phases.filter(p => p.items.length > 0);
}

export function generateBOQ(
  items: Item[],
  materials: { wallColor: string; flooring: string; woodFinish: string },
  room: { width: number; length: number },
  city: string
): BOQ {
  const labor = getLaborRate(city);
  let slNo = 0;

  const furniture: BOQLineItem[] = items.map(item => {
    slNo++;
    const procurement = classifyProcurement(item);
    const lineItem: BOQLineItem = {
      slNo,
      description: `${item.name} (${item.brand})`,
      qty: 1,
      unit: 'piece',
      rate: item.price,
      amount: item.price,
      category: 'furniture' as const,
      procurement,
    };
    if (procurement === 'build' || procurement === 'buy-or-build') {
      lineItem.carpenterSpec = generateCarpenterSpec(item);
    }
    return lineItem;
  });

  const wallArea = 2 * (room.width + room.length) * 2.8;
  const floorArea = room.width * room.length;
  const perimeter = 2 * (room.width + room.length);

  const materialsBOQ: BOQLineItem[] = [
    { slNo: ++slNo, description: `Wall Paint — ${materials.wallColor}`, qty: Math.ceil(wallArea), unit: 'sqft', rate: 38, amount: Math.ceil(wallArea) * 38, category: 'materials', procurement: 'buy' },
    { slNo: ++slNo, description: 'Wall Putty & Primer', qty: Math.ceil(wallArea), unit: 'sqft', rate: 12, amount: Math.ceil(wallArea) * 12, category: 'materials', procurement: 'buy' },
    { slNo: ++slNo, description: `Flooring — ${materials.flooring.replace('-', ' ')}`, qty: Math.ceil(floorArea), unit: 'sqft', rate: 95, amount: Math.ceil(floorArea) * 95, category: 'materials', procurement: 'buy' },
    { slNo: ++slNo, description: 'Skirting', qty: Math.ceil(perimeter), unit: 'rft', rate: 120, amount: Math.ceil(perimeter) * 120, category: 'materials', procurement: 'buy' },
    { slNo: ++slNo, description: `Wood Finish — ${materials.woodFinish}`, qty: items.length, unit: 'items', rate: 800, amount: items.length * 800, category: 'materials', procurement: 'buy' },
  ];

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
  const taxBreakdown = calculateGST(items);
  const grandTotal = total + taxBreakdown.totalTax;

  const allItems = [...furniture, ...materialsBOQ, ...laborBOQ];
  const executionSequence = buildExecutionSequence(allItems, room);

  return { furniture, materials: materialsBOQ, labor: laborBOQ, subtotal, contingency, total, taxBreakdown, grandTotal, executionSequence };
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN').format(amount);
}

// ─── Hindi Spec Generation ────────────────────────────────────────────

/** Hindi names for furniture items that are commonly built by carpenters */
const HINDI_FURNITURE_GLOSSARY: Record<string, string> = {
  wardrobe: 'अलमारी',
  almirah: 'अलमारी',
  bed: 'पलंग',
  'tv unit': 'टीवी यूनिट',
  'entertainment unit': 'टीवी यूनिट',
  'shoe rack': 'जूता रैक',
  'puja unit': 'पूजा घर / मंदिर',
  'pooja unit': 'पूजा घर / मंदिर',
  'puja mandir': 'पूजा मंदिर',
  'wall shelf': 'दीवार पर शेल्फ',
  'storage unit': 'स्टोरेज यूनिट',
  loft: 'लॉफ्ट / मचान',
  cabinet: 'कैबिनेट',
  'false ceiling': 'फॉल्स सीलिंग',
  partition: 'पार्टीशन',
  panel: 'पैनल',
  'breakfast counter': 'ब्रेकफास्ट काउंटर',
  'bar unit': 'बार यूनिट',
  'dining table': 'डाइनिंग टेबल',
  sofa: 'सोफा',
  chair: 'कुर्सी',
  desk: 'डेस्क / मेज़',
  table: 'टेबल',
  nightstand: 'साइड टेबल',
  dresser: 'ड्रेसर',
  'dressing table': 'ड्रेसिंग टेबल',
};

const HINDI_MATERIAL_GLOSSARY: Record<string, string> = {
  '18mm bwp marine ply': '18mm BWP मरीन प्लाई',
  'laminate finish': 'लैमिनेट फ़िनिश',
  '2mm pvc edge banding': '2mm PVC एज बैंडिंग',
  'dowel + confirmat screw': 'डॉवेल + कन्फ़र्मेट स्क्रू',
  'concealed hinges': 'कंसील्ड हिंज (छुपे हुए कब्ज़े)',
};

type HindiSpec = {
  englishName: string;
  hindiName: string;
  dimensions: string;
  materialSpec: string;
  carpenterNote: string;
};

/** Look up a Hindi furniture name, falling back to transliteration */
function toHindiName(englishName: string): string {
  const lower = englishName.toLowerCase();
  for (const [key, value] of Object.entries(HINDI_FURNITURE_GLOSSARY)) {
    if (lower.includes(key)) return value;
  }
  // Fallback: return the English name as-is (contractor will understand)
  return englishName;
}

/** Generate Hindi carpenter specification for a build item */
export function generateHindiSpec(item: Item): HindiSpec {
  const hindiName = toHindiName(item.name);
  const w = item.width.toFixed(2);
  const d = item.length.toFixed(2);
  const raw = item as unknown as Record<string, unknown>;
  const h = typeof raw.height === 'number' ? (raw.height as number).toFixed(2) : '2.10';

  const dimensions = `साइज़: चौड़ाई ${w}m × गहराई ${d}m × ऊँचाई ${h}m`;
  const materialSpec = `मटेरियल: 18mm BWP मरीन प्लाई, लैमिनेट फ़िनिश के साथ\nजॉइनरी: डॉवेल + कन्फ़र्मेट स्क्रू, कंसील्ड हिंज (दरवाज़ों के लिए)\nकिनारे: 2mm PVC एज बैंडिंग, मैचिंग फ़िनिश`;
  const carpenterNote = `नोट: साइट पर माप लेकर बनाया जाए। फ़्लोर और दीवार से लेवल मैच करें।`;

  return {
    englishName: item.name,
    hindiName,
    dimensions,
    materialSpec,
    carpenterNote,
  };
}

/** Generate Hindi specifications for all build/buy-or-build items in a BOQ */
export function generateHindiSection(boq: BOQ): string {
  const buildItems = boq.furniture.filter(
    f => f.procurement === 'build' || f.procurement === 'buy-or-build'
  );

  if (buildItems.length === 0) return '';

  const lines: string[] = [];
  lines.push('═══════════════════════════════════════');
  lines.push('  कारपेंटर के लिए स्पेसिफ़िकेशन');
  lines.push('  (Carpenter Specification — Hindi)');
  lines.push('═══════════════════════════════════════');
  lines.push('');

  buildItems.forEach((item, idx) => {
    const hindiName = toHindiName(item.description);
    const w = 1.5; // default if we don't have the original Item
    const d = 1.0;
    const wFt = (w * 3.28084).toFixed(1);
    const dFt = (d * 3.28084).toFixed(1);

    lines.push(`${idx + 1}. ${hindiName}`);
    lines.push(`   साइज़ (लगभग): ${wFt}ft × ${dFt}ft (चौड़ाई × गहराई)`);
    lines.push(`   मटेरियल: 18mm BWP मरीन प्लाई — लैमिनेट फ़िनिश`);
    lines.push(`   फ़िटिंग: सॉफ्ट-क्लोज़ कंसील्ड हिंज, हैंडल — स्टेनलेस स्टील`);
    lines.push(`   किनारे की फ़िनिशिंग: 2mm PVC एज बैंडिंग, मैचिंग कलर`);
    lines.push(`   जॉइनरी: डॉवेल + कन्फ़र्मेट स्क्रू, कोई कील नहीं`);
    lines.push(`   इंस्टॉलेशन: दीवार/फ़्लोर से लेवल, स्क्रू कवर कैप के साथ`);
    if (item.carpenterSpec) {
      lines.push(`   (इंग्लिश स्पेक: ${item.carpenterSpec})`);
    }
    lines.push('');
  });

  lines.push('═══════════════════════════════════════');
  lines.push('  सामान्य निर्देश (General Instructions)');
  lines.push('═══════════════════════════════════════');
  lines.push('');
  lines.push('1. साइट पर माप (measurement) लेकर ही कटिंग करें।');
  lines.push('2. सभी प्लाई 18mm BWP मरीन ग्रेड — ISI मार्क वाली हो।');
  lines.push('3. लैमिनेट: 1mm मोटाई, मैचिंग एज बैंड के साथ।');
  lines.push('4. सभी स्क्रू स्टेनलेस स्टील (SS304) — जंग न लगे।');
  lines.push('5. काम ख़त्म होने पर सफ़ाई करके जमा करें।');
  lines.push('6. कोई भी बदलाव करने से पहले मालिक से पूछें।');
  lines.push('');

  return lines.join('\n');
}

// ─── Room Sketch SVG Generator ────────────────────────────────────────

export interface RoomSketchOptions {
  width: number;
  length: number;
  orientation?: number; // rotation in degrees for North
  items?: Array<{ name: string; x: number; y: number; width: number; length: number; rotation: number; code: string }>;
  /** Meter-to-pixel scale override (default: auto-calculated to fit 600px) */
  scaleOverride?: number;
}

/** Generate a clean 2D floor plan SVG string suitable for embedding in a PDF */
export function generateRoomSketchSVG(options: RoomSketchOptions): string {
  const { width, length, orientation = 0, items = [], scaleOverride } = options;
  const viewSize = 600;
  const padding = 40;
  const scale = scaleOverride ?? (viewSize - padding * 2) / Math.max(width, length, 1);
  const roomW = width * scale;
  const roomL = length * scale;
  const centerX = (viewSize - roomW) / 2;
  const centerY = (viewSize - roomL) / 2;

  const toX = (mx: number) => centerX + mx * scale;
  const toY = (my: number) => centerY + my * scale;

  // Rotate helper (rotate around room center for North)
  const cx = centerX + roomW / 2;
  const cy = centerY + roomL / 2;
  const rotTransform = orientation ? `transform="rotate(${orientation},${cx},${cy})"` : '';

  const colorWalls = '#1C1917';
  const colorFill = '#F5F0EB';
  const colorGrid = '#E8E2DA';
  const colorFurniture = '#8B6F52';
  const colorLabel = '#4A4035';
  const colorNorth = '#D4A574';

  // Grid lines (every 1m)
  let gridLines = '';
  for (let x = 0; x <= width; x++) {
    gridLines += `<line x1="${toX(x)}" y1="${toY(0)}" x2="${toX(x)}" y2="${toY(length)}" stroke="${colorGrid}" stroke-width="0.5"/>\n`;
  }
  for (let y = 0; y <= length; y++) {
    gridLines += `<line x1="${toX(0)}" y1="${toY(y)}" x2="${toX(width)}" y2="${toY(y)}" stroke="${colorGrid}" stroke-width="0.5"/>\n`;
  }

  // Door arc symbol (bottom wall)
  const doorX = toX(width * 0.4);
  const doorY = toY(length);
  const doorArc = `<path d="M${doorX},${doorY} A${0.9 * scale},${0.9 * scale} 0 0,0 ${doorX + 0.9 * scale},${doorY - 0.9 * scale}" fill="none" stroke="${colorWalls}" stroke-width="1" stroke-dasharray="3,2"/>\n<text x="${doorX + scale * 0.2}" y="${doorY - 12}" font-size="9" fill="${colorLabel}" font-family="sans-serif">🚪</text>`;

  // Floor label
  const floorArea = (width * length * 10.7639).toFixed(0); // sq meters to sq ft
  const labelW = `${width.toFixed(1)}m`;
  const labelL = `${length.toFixed(1)}m`;

  let furnitureItems = '';
  for (const item of items) {
    const fw = item.width * scale;
    const fl = item.length * scale;
    const fx = toX(item.x) - fw / 2;
    const fy = toY(item.y) - fl / 2;
    const nameShort = item.name.length > 12 ? item.name.slice(0, 10) + '..' : item.name;
    furnitureItems += `<rect x="${fx}" y="${fy}" width="${fw}" height="${fl}" rx="3" fill="${colorFurniture}" fill-opacity="0.4" stroke="${colorFurniture}" stroke-width="1.5" ${rotTransform}/>\n`;
    if (fw > 30 && fl > 16) {
      furnitureItems += `<text x="${fx + fw / 2}" y="${fy + fl / 2 + 4}" font-size="${Math.max(8, Math.min(10, fw / 10))}" fill="white" font-family="sans-serif" text-anchor="middle" ${rotTransform}>${nameShort}</text>\n`;
    }
  }

  const northArrow = `
    <g transform="translate(${centerX + roomW + 18}, ${centerY + 16})">
      <polygon points="0,12 5,0 10,12 5,8" fill="${colorNorth}" opacity="0.9"/>
      <text x="5" y="-2" font-size="8" fill="${colorWalls}" font-family="sans-serif" text-anchor="middle" font-weight="bold">N</text>
    </g>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewSize} ${viewSize}" width="${viewSize}" height="${viewSize}">
  <!-- Background -->
  <rect width="${viewSize}" height="${viewSize}" fill="white"/>

  <!-- Grid -->
  <g opacity="0.5">${gridLines}</g>

  <!-- Room fill -->
  <rect x="${centerX}" y="${centerY}" width="${roomW}" height="${roomL}" fill="${colorFill}" stroke="${colorWalls}" stroke-width="2.5"/>

  <!-- Door arc -->
  ${doorArc}

  <!-- Furniture -->
  <g>${furnitureItems}</g>

  <!-- Dimensions -->
  <text x="${centerX + roomW / 2}" y="${centerY + roomL + 20}" font-size="11" fill="${colorLabel}" font-family="sans-serif" text-anchor="middle">${width.toFixed(1)}m (${(width * 3.28084).toFixed(1)}ft)</text>
  <text x="${centerX - 18}" y="${centerY + roomL / 2}" font-size="11" fill="${colorLabel}" font-family="sans-serif" text-anchor="middle" transform="rotate(-90,${centerX - 18},${centerY + roomL / 2})">${length.toFixed(1)}m (${(length * 3.28084).toFixed(1)}ft)</text>

  <!-- Area label -->
  <text x="${centerX + roomW / 2}" y="${centerY + roomL / 2 - 6}" font-size="12" fill="${colorLabel}" font-family="sans-serif" text-anchor="middle" font-weight="bold">${floorArea} sq ft</text>

  <!-- North arrow -->
  ${northArrow}

  <!-- Scale bar -->
  <line x1="${centerX}" y1="${centerY + roomL + 30}" x2="${centerX + scale}" y2="${centerY + roomL + 30}" stroke="${colorWalls}" stroke-width="2"/>
  <line x1="${centerX}" y1="${centerY + roomL + 27}" x2="${centerX}" y2="${centerY + roomL + 33}" stroke="${colorWalls}" stroke-width="1.5"/>
  <line x1="${centerX + scale}" y1="${centerY + roomL + 27}" x2="${centerX + scale}" y2="${centerY + roomL + 33}" stroke="${colorWalls}" stroke-width="1.5"/>
  <text x="${centerX + scale / 2}" y="${centerY + roomL + 42}" font-size="9" fill="${colorLabel}" font-family="sans-serif" text-anchor="middle">1m</text>
</svg>`;
}