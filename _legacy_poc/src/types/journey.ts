/**
 * Journey types — canonical spec merged from PROJECT.md + grand-strategy.md.
 *
 * The intake flow collects exactly 4 questions (no more, no less):
 *   Q1 — Vibe tile (emotive design direction)
 *   Q2 — Room type + dimensions
 *   Q3 — Household profile (elders / kids / pets + free-text notes)
 *   Q4 — Budget tier + city (for local pricing context)
 *
 * Everything downstream (generation, costing, export) is derived from this
 * single IntakePayload blob.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Q1 — Vibe
// ═══════════════════════════════════════════════════════════════════════════════

export interface VibeMaterialPreset {
  flooring: string;
  woodFinish: string;
  hardware?: string;
  wallPaintName?: string;
  wallPaintCode?: string;
}

export interface VibeTile {
  id: string;
  label: string;
  name?: string; // Alias for label (legacy compatibility)
  description: string;
  gradient: string; // CSS gradient (e.g. "linear-gradient(135deg, #667eea 0%, #764ba2 100%)")
  materialPreset?: VibeMaterialPreset;
  palette?: string[];
}

export const VIBE_TILES: VibeTile[] = [
  {
    id: 'minimal-modern',
    label: 'Clean & Minimal',
    description: 'Uncluttered, airy spaces with neutral palettes and crisp lines',
    gradient: 'linear-gradient(135deg, #ECE9E6 0%, #FFFFFF 100%)',
  },
  {
    id: 'warm-earthy',
    label: 'Warm & Earthy',
    description: 'Terracotta tones, natural wood, and handcrafted textures',
    gradient: 'linear-gradient(135deg, #C49A6C 0%, #8B6914 100%)',
  },
  {
    id: 'bold-dramatic',
    label: 'Bold & Dramatic',
    description: 'Deep jewel tones, statement pieces, high-contrast drama',
    gradient: 'linear-gradient(135deg, #2C3E50 0%, #4A235A 100%)',
  },
  {
    id: 'cozy-traditional',
    label: 'Cozy & Traditional',
    description: 'Classic Indian warmth with carved wood, brass, and vibrant textiles',
    gradient: 'linear-gradient(135deg, #D4A574 0%, #A0522D 100%)',
  },
  {
    id: 'boho-eclectic',
    label: 'Boho & Eclectic',
    description: 'Playful mix of patterns, plants, and global influences',
    gradient: 'linear-gradient(135deg, #F093FB 0%, #F5576C 50%, #FFD200 100%)',
  },
  {
    id: 'industrial-loft',
    label: 'Industrial Loft',
    description: 'Exposed brick, matte black metal, raw concrete finishes',
    gradient: 'linear-gradient(135deg, #434343 0%, #1A1A1A 100%)',
  },
];

/** @deprecated Use VibeTile instead */
export type VibeOption = VibeTile;

// ═══════════════════════════════════════════════════════════════════════════════
// Q2 — Room type + dimensions
// ═══════════════════════════════════════════════════════════════════════════════

export type RoomType = 'living-room' | 'bedroom' | 'kitchen' | 'study' | 'dining-room';

export interface RoomTypeOption {
  value: RoomType;
  label: string;
}

export const ROOM_TYPES: RoomTypeOption[] = [
  { value: 'living-room', label: 'Living Room' },
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'study', label: 'Study / WFH' },
  { value: 'dining-room', label: 'Dining Room' },
];

export interface RoomSizePreset {
  label: string;
  width: number; // feet — use 0 to trigger "custom" mode
  length: number;
}

export const COMMON_ROOM_SIZES: RoomSizePreset[] = [
  { label: '10 × 10 ft', width: 10, length: 10 },
  { label: '10 × 12 ft', width: 10, length: 12 },
  { label: '12 × 14 ft', width: 12, length: 14 },
  { label: '14 × 16 ft', width: 14, length: 16 },
  { label: 'Custom', width: 0, length: 0 },
];

export interface RoomDimensions {
  width: number;
  length: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Q3 — Household profile
// ═══════════════════════════════════════════════════════════════════════════════

export interface HouseholdProfile {
  hasSeniors: boolean;
  hasChildren: boolean;
  hasPets: boolean;
  otherNotes: string; // free-text cultural/personal notes ("jhoola corner", "prayer room", etc.)
}

// ═══════════════════════════════════════════════════════════════════════════════
// Q4 — Budget + City
// ═══════════════════════════════════════════════════════════════════════════════

export type BudgetTier = 'budget' | 'mid-range' | 'premium' | 'luxury';
/** @deprecated Use BudgetTier instead */
export type BudgetType = 'economical' | 'mid-range' | 'premium';

export interface BudgetTierOption {
  value: BudgetTier;
  label: string;
  range: string;
  desc: string;
}

export const BUDGET_TIERS: BudgetTierOption[] = [
  { value: 'budget', label: 'Budget', range: '₹50K–1.5L', desc: 'Smart basics, value-first picks' },
  { value: 'mid-range', label: 'Mid-Range', range: '₹1.5L–4L', desc: 'Balance of quality and cost' },
  { value: 'premium', label: 'Premium', range: '₹4L–10L', desc: 'Designer brands, custom finishes' },
  { value: 'luxury', label: 'Luxury', range: '₹10L+', desc: 'Bespoke, imported, one-of-a-kind' },
];

/**
 * Supported cities for local pricing context.
 * Mirrors the Indian metro + tier-2 cities from the spec.
 */
export type CityName =
  | 'Mumbai'
  | 'Delhi'
  | 'Bangalore'
  | 'Hyderabad'
  | 'Chennai'
  | 'Kolkata'
  | 'Pune'
  | 'Ahmedabad'
  | 'Jaipur'
  | 'Lucknow'
  | 'Chandigarh'
  | 'Indore'
  | 'Kochi'
  | 'Nagpur'
  | 'Other';

export const CONTEXT_CITIES: CityName[] = [
  'Mumbai',
  'Delhi',
  'Bangalore',
  'Hyderabad',
  'Chennai',
  'Kolkata',
  'Pune',
  'Ahmedabad',
  'Jaipur',
  'Lucknow',
  'Chandigarh',
  'Indore',
  'Kochi',
  'Nagpur',
  'Other',
];

// ═══════════════════════════════════════════════════════════════════════════════
// Composite payload — the single source of truth for everything downstream
// ═══════════════════════════════════════════════════════════════════════════════

export interface IntakePayload {
  vibe: VibeTile;
  roomType: RoomType;
  room: RoomDimensions;
  household: HouseholdProfile;
  budgetTier: BudgetTier;
  city: CityName | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Legacy compatibility — derived from IntakePayload for screens still migrating
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Derives a legacy "context-answers" shape from the modern IntakePayload.
 * Used by PlannerScreen and ExportScreen to bridge old prop shapes during migration.
 */
export interface LegacyContextFromIntake {
  roomWidth: number;
  roomLength: number;
  roomType: string;
  city: string;
  whoIsThisRoomFor: string;
  mustHaves: string[];
  desiredFeeling: string;
  currentRoomFrustration: string;
  lovedItemToKeep: string;
  vastuContext: string;
  budget: BudgetTier | null;
  budgetPhase: 'full' | 'phase1' | 'unsure';
  homeType?: string;
}

/**
 * Derives a legacy "vibe-config" shape from the modern VibeTile.
 */
export interface LegacyVibeFromIntake {
  id: string;
  name: string;
  description: string;
  palette: string[];
  materialPreset: { flooring: string; woodFinish: string };
  suggestedFurnitureLayout: { code: string; qty: number }[];
}

export function deriveLegacyContext(p: IntakePayload): LegacyContextFromIntake {
  const who = [];
  if (p.household.hasSeniors) who.push('elders');
  if (p.household.hasChildren) who.push('children');
  return {
    roomWidth: p.room.width,
    roomLength: p.room.length,
    roomType: p.roomType,
    city: p.city ?? 'Mumbai',
    whoIsThisRoomFor: who.length ? `family with ${who.join(' & ')}` : '',
    mustHaves: [],
    desiredFeeling: p.vibe.description ?? '',
    currentRoomFrustration: '',
    lovedItemToKeep: '',
    vastuContext: p.household.otherNotes ?? '',
    budget: p.budgetTier,
    budgetPhase: p.budgetTier === 'budget' ? 'phase1' : p.budgetTier === 'luxury' ? 'full' : 'full',
  };
}

export function deriveLegacyVibe(p: IntakePayload): LegacyVibeFromIntake {
  return {
    id: p.vibe.id,
    name: p.vibe.label,
    description: p.vibe.description,
    palette: ['#F5F0E8', '#D4C5B2', '#C8A96E'],
    materialPreset: { flooring: 'vitrified-tiles', woodFinish: 'wood_teak' },
    suggestedFurnitureLayout: [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Legacy types for backwards compatibility
// ═══════════════════════════════════════════════════════════════════════════════

/** @deprecated Use IntakePayload instead */
export type ContextAnswers = LegacyContextFromIntake;

/** @deprecated Use RoomType instead */
export type RoomPurpose = RoomType;

/** Journey screen identifiers for navigation */
export type JourneyScreen =
  | 'landing'
  | 'intake'
  | 'generating'
  | 'visions'
  | 'planner'
  | 'plan'
  | 'style'
  | 'export';

/** Must-have options for intake */
export const MUST_HAVE_OPTIONS: readonly string[] = [
  'Heavy Storage',
  'Reading Nook',
  'Mandir Space',
  'WFH Desk',
  'Guest Seating',
  'Entertainment Unit',
] as const;

/** Suggested furniture item for layout generation */
export interface SuggestedFurnitureItem {
  code: string;
  qty: number;
  x?: number;
  y?: number;
  rotation?: number;
  label?: string;
  width?: number;
  length?: number;
  height?: number;
}

/** @deprecated Legacy payload for Act1 handoff */
export interface Act1HandoffPayload {
  context: LegacyContextFromIntake;
  vibeConfig: LegacyVibeFromIntake;
  rankings: unknown[];
  contextAnswers: LegacyContextFromIntake;
}
