import { create } from 'zustand';

export type Screen = 'cover' | 'intake' | 'drafting' | 'reveal' | 'studio' | 'export';

export type Vibe = 'gathering' | 'breath' | 'keeper' | 'studio';
export type RoomType = 'living' | 'bedroom' | 'kitchen' | 'dining' | 'study';
export type RoomSize = 'compact' | 'standard' | 'large' | 'open';

export interface Brief {
  vibe: Vibe | null;
  roomType: RoomType | null;
  roomSize: RoomSize | null;
  who: string;
  chips: string[];
  budget: number;
  city: string | null;
}

export interface Vision {
  id: string;
  name: string;
  cost: string;
  cushion: string;
  philosophy: string;
  palette: string[];
  materials: string[];
  letter: string[];
  foot: string;
  image: string;
}

interface AppState {
  screen: Screen;
  brief: Brief;
  selectedVision: number;
  setScreen: (screen: Screen) => void;
  setBrief: (brief: Partial<Brief>) => void;
  setSelectedVision: (index: number) => void;
}

export const VISIONS: Vision[] = [
  {
    id: 'gathering',
    name: 'The Gathering',
    cost: '\u20b92,84,000',
    cushion: '\u20b916,000 under budget',
    philosophy: 'Built for your family\'s evenings together.',
    palette: ['#C2502E', '#8E5A35', '#D9C09C', '#2A2018'],
    materials: ['Marine ply (BWR grade)', 'Teak veneer, oiled', 'Cotton-linen upholstery', 'Brass fittings'],
    letter: [
      'For your evenings I drew the sofa first \u2014 oversized, deep, the one your boy will fall asleep on during movie nights. Nine feet, three cushions.',
      'The mandir sits in the northeast where the morning light first enters. Behind every panel I tucked storage; the toys disappear when you want them to.',
      'The desk I placed on the east wall, just out of the main sightline. You can work there in the evenings without taking the room from the family.',
      'Cost runs \u20b92,84,000. Sixteen thousand under your figure \u2014 keep it for the rug.',
    ],
    foot: 'A room that fills up. That is its job.',
    image: '/vibe-gathering.jpg',
  },
  {
    id: 'breath',
    name: 'The Breath',
    cost: '\u20b92,41,000',
    cushion: '\u20b959,000 under budget',
    philosophy: 'Open and minimal \u2014 made for peace.',
    palette: ['#E8E1D2', '#A89E8A', '#3F3A33', '#C2502E'],
    materials: ['Wall-hung cabinetry', 'Limewashed walls', 'Cane and oak', 'Linen, undyed'],
    letter: [
      'The opposite instinct: less. I removed the second cabinet, raised everything off the floor, kept the centre empty.',
      'Storage is built into the walls, not into objects. The mandir is a backlit niche \u2014 subtle, intentional. The sofa is a 2.5-seater, low and lean.',
      'You will lose some places to put things. You will gain a room that breathes.',
      'Cost runs \u20b92,41,000. Use the savings on the right pendant light.',
    ],
    foot: 'A room that holds quiet. That is its job.',
    image: '/vibe-breath.jpg',
  },
  {
    id: 'keeper',
    name: 'The Keeper',
    cost: '\u20b92,96,000',
    cushion: '\u20b94,000 over (fixable)',
    philosophy: 'Storage-first \u2014 nothing wasted.',
    palette: ['#5B3A24', '#8A6244', '#D4BC94', '#2E1C0E'],
    materials: ['Floor-to-ceiling MDF units', 'Walnut veneer, matte lacquer', 'Boucl\u00e9 and velvet', 'Soft-close Hettich hardware'],
    letter: [
      'Storage-first. Floor-to-ceiling on every available wall, drawer beneath every cushion, soft-close on every panel.',
      'Six years from now, this room absorbs everything your family accumulates without showing it.',
      'The trade-off is density. In return, nothing is ever out of place. The mandir gets its own dedicated closed cabinet.',
      'Cost runs \u20b92,96,000 \u2014 four thousand over. Switch one ready-made shelf to carpenter build and it lands back under.',
    ],
    foot: 'A room that holds everything. That is its job.',
    image: '/vibe-keeper.jpg',
  },
];

export const VIBES = [
  { id: 'gathering' as Vibe, name: 'The Gathering', desc: 'Warm, dense, lived-in.', depth: 'For homes that fill up easily \u2014 children, parents, neighbours, plates.' },
  { id: 'breath' as Vibe, name: 'The Breath', desc: 'Open, light, restrained.', depth: 'The luxury of an empty centre and space to move.' },
  { id: 'keeper' as Vibe, name: 'The Keeper', desc: 'Storage-first. Heritage tones.', depth: 'Closed cabinetry. A place for everything you have collected.' },
  { id: 'studio' as Vibe, name: 'The Studio', desc: 'Quiet, considered, urban.', depth: 'Clean lines, good materials, nothing extra.' },
];

export const ROOM_TYPES: { id: RoomType; label: string }[] = [
  { id: 'living', label: 'Living Room' },
  { id: 'bedroom', label: 'Bedroom' },
  { id: 'kitchen', label: 'Kitchen' },
  { id: 'dining', label: 'Dining' },
  { id: 'study', label: 'Study' },
];

export const ROOM_SIZES: { id: RoomSize; label: string; sub: string; note: string }[] = [
  { id: 'compact', label: 'Compact', sub: '\u2264 10\u00d710 ft', note: 'A snug city flat' },
  { id: 'standard', label: 'Standard', sub: '10\u00d714 ft', note: 'Most 2BHKs in metros' },
  { id: 'large', label: 'Large', sub: '16\u00d718 ft', note: 'Generous, well-proportioned' },
  { id: 'open', label: 'Open', sub: '18+ ft', note: 'Combined living-dining' },
];

export const CITIES = ['Mumbai', 'Pune', 'Bangalore', 'Delhi', 'Hyderabad', 'Chennai', 'Kolkata'];

export const WHO_CHIPS = [
  'Young children',
  'Elderly parent',
  'Work from home',
  'Frequent guests',
  'Pets',
  'Just the two of us',
  'Vastu matters',
  'Joint family',
];

export function formatBudget(v: number): string {
  if (v >= 500000) return '\u20b95L+';
  if (v >= 100000) return `\u20b9${(v / 100000).toFixed(1).replace('.0', '')}L`;
  return `\u20b9${(v / 1000).toFixed(0)}K`;
}

export const useStore = create<AppState>((set) => ({
  screen: 'cover',
  brief: {
    vibe: null,
    roomType: null,
    roomSize: null,
    who: '',
    chips: [],
    budget: 300000,
    city: null,
  },
  selectedVision: 0,
  setScreen: (screen) => set({ screen }),
  setBrief: (partial) => set((state) => ({ brief: { ...state.brief, ...partial } })),
  setSelectedVision: (selectedVision) => set({ selectedVision }),
}));
