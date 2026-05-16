export type JourneyScreen =
  | 'demo'
  | 'landing'
  | 'intake'
  | 'generating'
  | 'visions'
  | 'plan'
  | 'style'
  | 'export';

export type HomeType = 'renting' | 'owning' | null;
export type FlooringType = 'vitrified-tiles' | 'wood-laminate' | 'marble';
export type CeilingType = 'plain' | 'pop-cove';
export type HardwareType = 'hettich' | 'hafele' | 'ebco';
export type BudgetType = 'economical' | 'mid-range' | 'premium';
export type RoomPurpose = 'living-room' | 'bedroom' | 'kitchen' | 'study' | 'dining-room';

export interface ContextAnswers {
  homeType: HomeType;
  city: string | null;
  budget: BudgetType | null;
  mustHaves: string[];
  roomType: RoomPurpose | null;
  roomWidth: number; // in feet
  roomLength: number; // in feet
  familyProfile: string[];
  vastuPreference: 'yes' | 'no' | 'somewhat' | null;
  selectedVibeId: string | null;
}

export interface SuggestedFurnitureItem {
  code: string;
  label: string;
  x: number;
  y: number;
  width: number;
  length: number;
  height: number;
  rotation: number;
}

export interface MaterialPreset {
  wallPaintName: string;
  wallPaintCode: string;
  flooring: FlooringType;
  woodFinish: string;
  ceiling: CeilingType;
  hardware: HardwareType;
}

export interface VibeOption {
  id: string;
  name: string;
  subtitle: string;
  textureHint: string;
  palette: [string, string, string, string];
  narrative: string;
  suggestedFurnitureLayout: SuggestedFurnitureItem[];
  materialPreset: MaterialPreset;
}

export interface ResolvedContextAnswers {
  homeType: Exclude<HomeType, null>;
  city: string;
  budget: BudgetType;
  mustHaves: string[];
}

export interface Act1HandoffPayload {
  selectedVibeId: string;
  vibeConfig: VibeOption;
  context: ResolvedContextAnswers;
  meta: {
    completedAt: string;
    version: 'v1';
  };
}

export const VIBE_OPTIONS: VibeOption[] = [
  {
    id: 'minimalist-indian',
    name: 'Minimalist Indian',
    subtitle: 'Restrained, warm, practical comfort.',
    textureHint: 'Linen',
    palette: ['#F3EEE4', '#D6C4A3', '#9D8763', '#4B3E2F'],
    narrative: 'A calm Indian home language with breathing room, soft light, and utility-first furniture.',
    suggestedFurnitureLayout: [
      { code: 'sofa-3s', label: '3-Seater Sofa', x: 1.8, y: 3.3, width: 1.8, length: 0.8, height: 0.85, rotation: 0 },
      { code: 'coffee-table', label: 'Coffee Table', x: 1.8, y: 2.3, width: 0.9, length: 0.6, height: 0.4, rotation: 0 },
      { code: 'tv-unit', label: 'TV Unit', x: 1.8, y: 0.3, width: 1.5, length: 0.4, height: 0.5, rotation: 0 },
      { code: 'bookshelf', label: 'Bookshelf', x: 0.3, y: 1.8, width: 0.4, length: 0.9, height: 1.8, rotation: 0 },
      { code: 'sofa-single', label: 'Accent Chair', x: 3.2, y: 2.8, width: 0.75, length: 0.75, height: 0.9, rotation: 90 },
      { code: 'pouffe', label: 'Pouffe', x: 2.8, y: 2.0, width: 0.45, length: 0.45, height: 0.4, rotation: 0 },
      { code: 'ottoman', label: 'Storage Ottoman', x: 0.5, y: 3.2, width: 0.8, length: 0.4, height: 0.45, rotation: 0 },
    ],
    materialPreset: {
      wallPaintName: 'Asian Paints Antique White',
      wallPaintCode: 'AP 8178',
      flooring: 'wood-laminate',
      woodFinish: 'Light Oak',
      ceiling: 'plain',
      hardware: 'hafele'
    }
  },
  {
    id: 'modern-bombay',
    name: 'Modern Bombay',
    subtitle: 'Clean lines, premium everyday living.',
    textureHint: 'Teak',
    palette: ['#F8F5EF', '#D2C8B9', '#9B8F80', '#2E2A27'],
    narrative: 'The aesthetic of a well-traveled Mumbaikar: understated, quality-led, and urban.',
    suggestedFurnitureLayout: [
      { code: 'sofa-l', label: 'L-Shaped Sofa', x: 2.5, y: 3.0, width: 2.1, length: 1.6, height: 0.85, rotation: 0 },
      { code: 'coffee-table', label: 'Coffee Table', x: 2.0, y: 1.8, width: 0.9, length: 0.6, height: 0.4, rotation: 0 },
      { code: 'tv-unit', label: 'TV Unit', x: 2.0, y: 0.3, width: 1.5, length: 0.4, height: 0.5, rotation: 0 },
      { code: 'desk', label: 'WFH Desk', x: 0.5, y: 0.5, width: 1.0, length: 0.5, height: 0.75, rotation: 0 },
      { code: 'pooja-wall', label: 'Wall Mandir', x: 3.5, y: 0.3, width: 0.6, length: 0.3, height: 0.5, rotation: 0 },
      { code: 'sofa-single', label: 'Accent Chair', x: 0.6, y: 2.6, width: 0.75, length: 0.75, height: 0.9, rotation: 0 },
      { code: 'bookshelf', label: 'Bookshelf', x: 3.4, y: 2.0, width: 0.4, length: 0.9, height: 1.8, rotation: 0 },
    ],
    materialPreset: {
      wallPaintName: 'Asian Paints Cane Beige',
      wallPaintCode: 'AP 8422',
      flooring: 'vitrified-tiles',
      woodFinish: 'Teak Grain',
      ceiling: 'pop-cove',
      hardware: 'hettich'
    }
  },
  {
    id: 'chettinad-fusion',
    name: 'Chettinad Fusion',
    subtitle: 'Traditional depth with contemporary flow.',
    textureHint: 'Terracotta',
    palette: ['#F0E4D8', '#C77E56', '#6A3F2C', '#2E1E16'],
    narrative: 'Heritage wood tones and earthy textures adapted to modern apartment proportions.',
    suggestedFurnitureLayout: [
      { code: 'sofa-3s', label: '3-Seater Sofa', x: 1.8, y: 3.3, width: 1.8, length: 0.8, height: 0.85, rotation: 0 },
      { code: 'diwan', label: 'Diwan', x: 3.3, y: 2.8, width: 1.8, length: 0.75, height: 0.4, rotation: 90 },
      { code: 'tv-unit', label: 'TV Unit', x: 1.8, y: 0.3, width: 1.5, length: 0.4, height: 0.5, rotation: 0 },
      { code: 'pooja-floor', label: 'Floor Mandir', x: 3.2, y: 0.5, width: 0.9, length: 0.5, height: 1.0, rotation: 0 },
      { code: 'coffee-table', label: 'Coffee Table', x: 1.8, y: 2.3, width: 0.9, length: 0.6, height: 0.4, rotation: 0 },
      { code: 'ottoman', label: 'Ottoman', x: 0.5, y: 2.2, width: 0.7, length: 0.5, height: 0.45, rotation: 0 },
      { code: 'bookshelf', label: 'Bookshelf', x: 0.3, y: 1.2, width: 0.4, length: 0.9, height: 1.8, rotation: 0 },
    ],
    materialPreset: {
      wallPaintName: 'Asian Paints Clay Pot',
      wallPaintCode: 'AP 9914',
      flooring: 'marble',
      woodFinish: 'Dark Walnut',
      ceiling: 'plain',
      hardware: 'hafele'
    }
  },
  {
    id: 'coastal-kerala',
    name: 'Coastal Kerala',
    subtitle: 'Airy, natural, softly sunlit.',
    textureHint: 'Rattan',
    palette: ['#FAF7F0', '#DCE7DE', '#9CB8A4', '#5B6F63'],
    narrative: 'Whitewash, cane, and natural textures for a breezy, homestay-like atmosphere.',
    suggestedFurnitureLayout: [
      { code: 'sofa-3s', label: '3-Seater Sofa', x: 1.8, y: 3.3, width: 1.8, length: 0.8, height: 0.85, rotation: 0 },
      { code: 'pouffe', label: 'Pouffe', x: 3.2, y: 2.4, width: 0.4, length: 0.4, height: 0.4, rotation: 0 },
      { code: 'coffee-table', label: 'Coffee Table', x: 1.8, y: 2.3, width: 0.9, length: 0.6, height: 0.4, rotation: 0 },
      { code: 'tv-unit', label: 'TV Unit', x: 1.8, y: 0.3, width: 1.5, length: 0.4, height: 0.5, rotation: 0 },
      { code: 'sofa-single', label: 'Accent Chair', x: 3.0, y: 3.0, width: 0.75, length: 0.75, height: 0.9, rotation: 90 },
      { code: 'bookshelf', label: 'Bookshelf', x: 0.3, y: 1.5, width: 0.4, length: 0.9, height: 1.8, rotation: 0 },
      { code: 'ottoman', label: 'Ottoman', x: 0.5, y: 3.0, width: 0.7, length: 0.5, height: 0.45, rotation: 0 },
    ],
    materialPreset: {
      wallPaintName: 'Asian Paints Morning Dew',
      wallPaintCode: 'AP 7552',
      flooring: 'wood-laminate',
      woodFinish: 'Natural Cane Oak',
      ceiling: 'plain',
      hardware: 'ebco'
    }
  },
  {
    id: 'royal-rajasthani',
    name: 'Royal Rajasthani',
    subtitle: 'Rich tones, ornate accents, bold centerpieces.',
    textureHint: 'Brass',
    palette: ['#F6E6C9', '#D48A34', '#8E2E24', '#3D1F1C'],
    narrative: 'A grand yet apartment-compatible palette of jewel tones, carved detail, and warmth.',
    suggestedFurnitureLayout: [
      { code: 'sofa-l', label: 'L-Shaped Sofa', x: 2.5, y: 3.0, width: 2.1, length: 1.6, height: 0.85, rotation: 0 },
      { code: 'coffee-table', label: 'Coffee Table', x: 2.0, y: 1.8, width: 0.9, length: 0.6, height: 0.4, rotation: 0 },
      { code: 'tv-unit', label: 'TV Unit', x: 2.0, y: 0.3, width: 1.9, length: 0.4, height: 0.5, rotation: 0 },
      { code: 'pooja-floor', label: 'Floor Mandir', x: 3.3, y: 0.5, width: 0.9, length: 0.5, height: 1.0, rotation: 0 },
      { code: 'ottoman', label: 'Storage Ottoman', x: 0.5, y: 2.8, width: 0.9, length: 0.4, height: 0.45, rotation: 0 },
      { code: 'diwan', label: 'Diwan', x: 0.5, y: 1.2, width: 1.8, length: 0.75, height: 0.4, rotation: 0 },
      { code: 'bookshelf', label: 'Bookshelf', x: 3.3, y: 2.2, width: 0.4, length: 0.9, height: 1.8, rotation: 0 },
    ],
    materialPreset: {
      wallPaintName: 'Asian Paints Desert Dune',
      wallPaintCode: 'AP 9830',
      flooring: 'marble',
      woodFinish: 'Royal Teak',
      ceiling: 'pop-cove',
      hardware: 'hettich'
    }
  },
  {
    id: 'industrial-delhi',
    name: 'Industrial Delhi',
    subtitle: 'Raw textures with artistic edge.',
    textureHint: 'Concrete',
    palette: ['#E8E6E3', '#B7B1AA', '#6C6761', '#2E2C2A'],
    narrative: 'Metal, concrete, and structured forms inspired by Delhi\'s creative studio culture.',
    suggestedFurnitureLayout: [
      { code: 'sofa-3s', label: '3-Seater Sofa', x: 1.8, y: 3.3, width: 1.8, length: 0.8, height: 0.85, rotation: 0 },
      { code: 'desk', label: 'Work Desk', x: 0.5, y: 0.5, width: 1.0, length: 0.5, height: 0.75, rotation: 0 },
      { code: 'bookshelf', label: 'Bookshelf', x: 0.3, y: 1.8, width: 0.4, length: 0.9, height: 1.8, rotation: 0 },
      { code: 'tv-unit', label: 'TV Unit', x: 1.8, y: 0.3, width: 1.5, length: 0.4, height: 0.5, rotation: 0 },
      { code: 'coffee-table', label: 'Coffee Table', x: 1.8, y: 2.3, width: 0.9, length: 0.6, height: 0.4, rotation: 0 },
      { code: 'sofa-single', label: 'Lounge Chair', x: 3.2, y: 2.8, width: 0.75, length: 0.75, height: 0.9, rotation: 90 },
      { code: 'ottoman', label: 'Ottoman', x: 3.2, y: 1.8, width: 0.7, length: 0.5, height: 0.45, rotation: 0 },
    ],
    materialPreset: {
      wallPaintName: 'Asian Paints Grey Pebble',
      wallPaintCode: 'AP 9146',
      flooring: 'vitrified-tiles',
      woodFinish: 'Wenge',
      ceiling: 'plain',
      hardware: 'hafele'
    }
  },
  {
    id: 'scandinavian-desi',
    name: 'Scandinavian Desi',
    subtitle: 'Light woods, clarity, playful warmth.',
    textureHint: 'Light Oak',
    palette: ['#FCFBF7', '#E6DCC7', '#B9A98D', '#6F6658'],
    narrative: 'A clean Nordic base filtered through Indian color comfort and practical living.',
    suggestedFurnitureLayout: [
      { code: 'sofa-2s', label: '2-Seater Sofa', x: 1.8, y: 3.3, width: 1.4, length: 0.8, height: 0.85, rotation: 0 },
      { code: 'sofa-single', label: 'Accent Chair', x: 3.0, y: 2.8, width: 0.75, length: 0.75, height: 0.85, rotation: 90 },
      { code: 'coffee-table', label: 'Coffee Table', x: 1.8, y: 2.3, width: 0.9, length: 0.6, height: 0.4, rotation: 0 },
      { code: 'tv-unit', label: 'TV Unit', x: 1.8, y: 0.3, width: 1.5, length: 0.4, height: 0.5, rotation: 0 },
      { code: 'desk', label: 'Study Desk', x: 3.3, y: 0.5, width: 1.0, length: 0.5, height: 0.75, rotation: 0 },
      { code: 'bookshelf', label: 'Bookshelf', x: 0.3, y: 1.5, width: 0.4, length: 0.9, height: 1.8, rotation: 0 },
      { code: 'pouffe', label: 'Pouffe', x: 3.0, y: 1.8, width: 0.4, length: 0.4, height: 0.4, rotation: 0 },
    ],
    materialPreset: {
      wallPaintName: 'Asian Paints Soft Linen',
      wallPaintCode: 'AP 8132',
      flooring: 'wood-laminate',
      woodFinish: 'Light Oak',
      ceiling: 'plain',
      hardware: 'ebco'
    }
  },
  {
    id: 'maximalist-mughal',
    name: 'Maximalist Mughal',
    subtitle: 'Pattern, color, and layered confidence.',
    textureHint: 'Inlay',
    palette: ['#F4E4D8', '#B5464A', '#3B5B8A', '#2E1C2F'],
    narrative: 'A high-character style with jewel tones, brass notes, and expressive pattern layering.',
    suggestedFurnitureLayout: [
      { code: 'sofa-l', label: 'L-Shaped Sofa', x: 2.5, y: 3.0, width: 2.1, length: 1.6, height: 0.85, rotation: 0 },
      { code: 'diwan', label: 'Diwan', x: 0.5, y: 2.5, width: 1.8, length: 0.75, height: 0.4, rotation: 0 },
      { code: 'coffee-table', label: 'Coffee Table', x: 2.0, y: 1.8, width: 0.9, length: 0.6, height: 0.4, rotation: 0 },
      { code: 'tv-unit', label: 'TV Unit', x: 2.0, y: 0.3, width: 1.9, length: 0.4, height: 0.5, rotation: 0 },
      { code: 'pooja-floor', label: 'Floor Mandir', x: 3.3, y: 0.5, width: 0.9, length: 0.5, height: 1.0, rotation: 0 },
      { code: 'ottoman', label: 'Storage Ottoman', x: 0.5, y: 1.2, width: 0.9, length: 0.4, height: 0.45, rotation: 0 },
      { code: 'bookshelf', label: 'Bookshelf', x: 3.3, y: 2.2, width: 0.4, length: 0.9, height: 1.8, rotation: 0 },
      { code: 'pouffe', label: 'Pouffe', x: 0.6, y: 3.5, width: 0.45, length: 0.45, height: 0.4, rotation: 0 },
    ],
    materialPreset: {
      wallPaintName: 'Asian Paints Regal Ruby',
      wallPaintCode: 'AP 9902',
      flooring: 'marble',
      woodFinish: 'Dark Cherry',
      ceiling: 'pop-cove',
      hardware: 'hettich'
    }
  }
];

export const CONTEXT_CITIES = [
  'Mumbai',
  'Pune',
  'Bangalore',
  'Delhi',
  'Chennai',
  'Hyderabad',
  'Ahmedabad',
  'Kolkata'
] as const;

export const ROOM_TYPES: { value: RoomPurpose; label: string; icon: string; description: string }[] = [
  { value: 'living-room', label: 'Living Room', icon: '🛋', description: 'Where the family gathers' },
  { value: 'bedroom', label: 'Bedroom', icon: '🛏', description: 'Rest & personal space' },
  { value: 'kitchen', label: 'Kitchen', icon: '🍳', description: 'The heart of the home' },
  { value: 'study', label: 'Study / Office', icon: '💻', description: 'Focus & productivity' },
  { value: 'dining-room', label: 'Dining Room', icon: '🍽', description: 'Meals & conversations' },
];

export const COMMON_ROOM_SIZES: Record<RoomPurpose, { width: number; length: number; label: string }[]> = {
  'living-room': [
    { width: 12, length: 14, label: '12 × 14 ft (Standard 2BHK)' },
    { width: 14, length: 16, label: '14 × 16 ft (Large 2BHK)' },
    { width: 16, length: 20, label: '16 × 20 ft (3BHK)' },
    { width: 10, length: 12, label: '10 × 12 ft (Compact)' },
  ],
  'bedroom': [
    { width: 10, length: 12, label: '10 × 12 ft (Standard)' },
    { width: 12, length: 14, label: '12 × 14 ft (Master)' },
    { width: 10, length: 10, label: '10 × 10 ft (Compact)' },
  ],
  'kitchen': [
    { width: 8, length: 10, label: '8 × 10 ft (Standard)' },
    { width: 10, length: 12, label: '10 × 12 ft (Large)' },
    { width: 6, length: 10, label: '6 × 10 ft (Galley)' },
  ],
  'study': [
    { width: 8, length: 10, label: '8 × 10 ft (Standard)' },
    { width: 10, length: 10, label: '10 × 10 ft (Roomy)' },
    { width: 6, length: 8, label: '6 × 8 ft (Compact)' },
  ],
  'dining-room': [
    { width: 10, length: 12, label: '10 × 12 ft (Standard)' },
    { width: 12, length: 14, label: '12 × 14 ft (Large)' },
    { width: 8, length: 10, label: '8 × 10 ft (Compact)' },
  ],
};

export const FAMILY_PROFILES = [
  { id: 'couple', label: 'Couple', icon: '👫' },
  { id: 'kids', label: 'Young Kids', icon: '👶' },
  { id: 'teens', label: 'Teenagers', icon: '🧑‍🎓' },
  { id: 'elderly', label: 'Elderly Parents', icon: '👴' },
  { id: 'wfh', label: 'Work from Home', icon: '💻' },
  { id: 'pets', label: 'Pets', icon: '🐕' },
  { id: 'guests', label: 'Frequent Guests', icon: '🏠' },
] as const;

export const MUST_HAVE_OPTIONS_EXPANDED: { id: string; label: string; icon: string; forRoom: RoomPurpose[] }[] = [
  { id: 'big-sofa', label: 'Big Comfortable Sofa', icon: '🛋', forRoom: ['living-room'] },
  { id: 'mandir', label: 'Pooja / Mandir Space', icon: '🙏', forRoom: ['living-room', 'bedroom', 'kitchen'] },
  { id: 'heavy-storage', label: 'Maximum Storage', icon: '🗄', forRoom: ['living-room', 'bedroom', 'kitchen'] },
  { id: 'wfh-desk', label: 'WFH Desk', icon: '💻', forRoom: ['living-room', 'bedroom', 'study'] },
  { id: 'tv-unit', label: 'TV / Entertainment Unit', icon: '📺', forRoom: ['living-room', 'bedroom'] },
  { id: 'dining-corner', label: 'Dining Corner', icon: '🍽', forRoom: ['living-room', 'dining-room'] },
  { id: 'kids-play', label: 'Kids Play Area', icon: '🧸', forRoom: ['living-room', 'bedroom'] },
  { id: 'reading-nook', label: 'Reading Nook', icon: '📚', forRoom: ['living-room', 'bedroom', 'study'] },
  { id: 'shoe-rack', label: 'Shoe Rack / Entryway', icon: '👟', forRoom: ['living-room'] },
  { id: 'pet-zone', label: 'Pet-Friendly Zone', icon: '🐾', forRoom: ['living-room', 'bedroom'] },
  { id: 'wardrobe', label: 'Large Wardrobe', icon: '👔', forRoom: ['bedroom'] },
  { id: 'vanity', label: 'Dressing / Vanity', icon: '💄', forRoom: ['bedroom'] },
];

export const MUST_HAVE_OPTIONS = [
  'Mandir Space',
  'WFH Desk',
  'Heavy Storage',
  'Maid-Friendly Layout',
  'Pet Zone',
  'Reading Nook'
] as const;

export function getCurrentStep(screen: JourneyScreen): number {
  switch (screen) {
    case 'intake':
    case 'generating':
      return 1;
    case 'visions':
      return 2;
    case 'plan':
      return 3;
    case 'style':
      return 4;
    case 'export':
      return 5;
    default:
      return 0;
  }
}

export function buildAct1HandoffPayload(
  selectedVibe: VibeOption | undefined,
  context: ContextAnswers
): Act1HandoffPayload | null {
  if (!selectedVibe || !context.city || !context.homeType || !context.budget) {
    return null;
  }

  return {
    selectedVibeId: selectedVibe.id,
    vibeConfig: selectedVibe,
    context: {
      homeType: context.homeType,
      city: context.city,
      budget: context.budget,
      mustHaves: context.mustHaves
    },
    meta: {
      completedAt: new Date().toISOString(),
      version: 'v1'
    }
  };
}
