export interface Vibe {
  id: string;
  name: string;
  hi: string;
  desc: string;
  depth: string;
}

export interface Vision {
  n: string;
  name: string;
  hi: string;
  cost: string;
  cushion: string;
  palette: string[];
  materials: string[];
  letter: string[];
  foot: string;
  image: string;
}

export interface Brief {
  vibe: string;
  room: string;
  size: string;
  who: string;
  chips: string[];
  budget: number;
  city: string;
}

export const VIBES: Vibe[] = [
  { id: 'gather', name: 'The Gathering', hi: 'सभा', desc: 'Warm, dense, lived-in.', depth: 'For homes that fill up easily — children, parents, plates.' },
  { id: 'breath', name: 'The Breath', hi: 'विश्राम', desc: 'Open, light, restrained.', depth: 'The luxury of an empty centre and space to move.' },
  { id: 'keeper', name: 'The Keeper', hi: 'संग्रह', desc: 'Storage-first. Heritage tones.', depth: 'Closed cabinetry, dark wood, a place for everything collected.' },
  { id: 'studio', name: 'The Studio', hi: 'कक्ष', desc: 'Quiet, considered, urban.', depth: 'Clean lines, quality material, nothing unnecessary.' },
  { id: 'bazaar', name: 'The Bazaar', hi: 'बाज़ार', desc: 'Colour, pattern, personality.', depth: 'Indian-maximalist, executed with restraint.' },
];

export const ROOMS: [string, string, string][] = [
  ['living', 'Living Room', 'बैठक'],
  ['bed', 'Bedroom', 'शयन कक्ष'],
  ['kitchen', 'Kitchen', 'रसोई'],
  ['dining', 'Dining', 'भोजन कक्ष'],
  ['study', 'Study', 'अध्ययन कक्ष'],
];

export const SIZES = [
  { id: 'compact', en: 'Compact', hi: '≤10×10', desc: 'A snug city flat', w: 34, h: 34 },
  { id: 'standard', en: 'Standard', hi: '10×14', desc: 'Most 2BHKs in metros', w: 40, h: 56 },
  { id: 'large', en: 'Large', hi: '16×18', desc: 'Generous, well-proportioned', w: 56, h: 64 },
  { id: 'open', en: 'Open', hi: '18ft+', desc: 'Combined living-dining', w: 70, h: 70 },
];

export const CITIES = ['Mumbai', 'Pune', 'Bangalore', 'Delhi', 'Hyderabad', 'Chennai', 'Kolkata'];

export const WHO_CHIPS = ['Young children', 'Elderly parent', 'Work from home', 'Frequent guests', 'Pets', 'Just the two of us', 'Vastu matters', 'Joint family'];

export const GEN_STAGES = [
  { en: 'Reading your room…', hi: 'कमरा पढ़ना' },
  { en: 'Placing the major furniture…', hi: 'मुख्य फ़र्निचर' },
  { en: 'Arranging the details…', hi: 'छोटे तत्व' },
  { en: 'Honouring Vastu, lining up the light…', hi: 'वास्तु और प्रकाश' },
  { en: 'Materials, prices, totals…', hi: 'सामग्री और मूल्य' },
];

export const GEN_NOTES = [
  '12 \u00d7 14 ft. Mumbai 2nd floor. Window faces east.',
  'Family of four. Mother-in-law visits.',
  'Sofa: south wall, 9 feet. For movie nights.',
  'मन्दिर \u2014 northeast corner. East-facing for the morning sun.',
  'Marine ply, BWR grade. Mumbai humidity.',
  'Total: \u20b92,84,000. Sixteen thousand under budget.',
];

export const VISIONS: Vision[] = [
  {
    n: 'I',
    name: 'The Gathering',
    hi: 'सभा',
    cost: '\u20b92,84,000',
    cushion: '\u20b916,000 under budget',
    palette: ['#C2552D', '#8E5432', '#D4BE9C', '#2A2018'],
    materials: ['Marine ply (BWR grade)', 'Teak veneer, oiled', 'Cotton-linen upholstery', 'Solid brass fittings'],
    letter: [
      'For your evenings I drew the sofa first \u2014 oversized, deep, the kind a four-year-old falls asleep on during movie nights. Nine feet, three cushions.',
      'The mandir sits in the northeast where the morning light first enters. Behind every panel I tucked storage. The toys disappear when you want them to.',
      'The desk I placed on the east wall, just out of the main sightline. You can work there in the evenings without taking the room from the family.',
      'Cost runs \u20b92,84,000. Sixteen thousand under your figure \u2014 keep it for a good rug.',
    ],
    foot: 'A room that fills up. That is its job.',
    image: '/vision-gathering.jpg',
  },
  {
    n: 'II',
    name: 'The Breath',
    hi: 'विश्राम',
    cost: '\u20b92,41,000',
    cushion: '\u20b959,000 under budget',
    palette: ['#E0D8C8', '#A89C8A', '#38342E', '#C2552D'],
    materials: ['Wall-hung cabinetry', 'Limewashed plaster', 'Cane and natural oak', 'Undyed linen'],
    letter: [
      'The opposite instinct: less. I removed the second cabinet, raised everything off the floor, held the centre empty.',
      'Storage is built into the walls, not into objects. The mandir is a backlit niche \u2014 subtle, intentional. The sofa is a 2.5-seater, low and lean.',
      'You will lose some places to put things. You will gain a room that breathes.',
      'Cost runs \u20b92,41,000. Use the savings on the right pendant light.',
    ],
    foot: 'A room that holds quiet. That is its job.',
    image: '/vision-breath.jpg',
  },
  {
    n: 'III',
    name: 'The Keeper',
    hi: 'संग्रह',
    cost: '\u20b92,96,000',
    cushion: '\u20b94,000 over (fixable)',
    palette: ['#5B3A24', '#8A6244', '#D4BC94', '#2E1C0E'],
    materials: ['Floor-to-ceiling MDF units', 'Walnut veneer, matte lacquer', 'Boucl\u00e9 and velvet', 'Soft-close Hettich hardware'],
    letter: [
      'Storage-first. Floor-to-ceiling on every available wall, drawer beneath every cushion, soft-close on every panel.',
      'Six years from now, this room absorbs everything your family accumulates without showing it.',
      'The trade-off is density. In return, nothing is ever out of place. The mandir gets its own dedicated closed cabinet.',
      'Cost runs \u20b92,96,000 \u2014 four thousand over. Switch one ready-made shelf to carpenter build and it lands back under.',
    ],
    foot: 'A room that holds everything. That is its job.',
    image: '/vision-keeper.jpg',
  },
];

export const CHAT_INIT = [
  { role: 'ai', text: 'I have your room open. The mandir faces northeast for the morning light, the centre is held clear for the children, the sofa is oversized for evenings together. Tell me what to refine.' },
  { role: 'user', text: 'Make the sofa bigger. Dark leather.' },
  { role: 'ai', text: 'Done. A 9-foot 3-seater in deep brown PU leather. The walkway stays at 36 inches \u2014 generous. \u20b938,000 instead of \u20b922,000. New total: \u20b93,00,000 \u2014 exactly on budget. I would not go further unless we trade something else down.' },
];

export function fmtBudget(v: number): string {
  if (v >= 500000) return '\u20b95L+';
  if (v >= 100000) return `\u20b9${(v / 100000).toFixed(1).replace('.0', '')}L`;
  return `\u20b9${(v / 1000).toFixed(0)}K`;
}

export function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '\u2026' : s;
}
