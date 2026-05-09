// ─────────────────────────────────────────────────────────────────────────────
// Cultural Context Engine
// Provides Vastu rules, climate-aware material recommendations, and
// Indian cultural design intelligence for layout solving and material
// selection. Used by prompts, solver, and AI services to ground
// recommendations in Indian design context.
// ─────────────────────────────────────────────────────────────────────────────

import type { RoomPurpose } from '../../types/journey';

// ── Types ──

export interface VastuRule {
  /** Rule name for reference */
  name: string;
  /** Description of the rule */
  description: string;
  /** Which room types it applies to */
  appliesTo: RoomPurpose[];
  /** Importance weight (0-1), higher = more critical */
  weight: number;
  /** Whether the user has opted in (via intake vastu context) */
  conditional: boolean;
}

export interface ClimateProfile {
  region: string;
  humidityLevel: 'low' | 'moderate' | 'high' | 'extreme';
  temperatureRange: string;
  materialAdvice: string[];
  avoidMaterials: string[];
  colorRecommendation: string;
  ventilationNote: string;
}

export interface CulturalDesignContext {
  city: string;
  region: string;
  climateProfile: ClimateProfile;
  vastuRules: VastuRule[];
  localMaterialSuggestions: string[];
  regionalStyleNotes: string;
}

// ── Vastu Rules Database ──

const VASTU_RULES: VastuRule[] = [
  {
    name: 'Mandir / Pooja Space Northeast',
    description:
      'The prayer/pooja area should be in the northeast corner (Ishaan kona). This direction receives the most beneficial morning sunlight and is considered the holiest direction.',
    appliesTo: ['living-room', 'bedroom', 'kitchen'],
    weight: 0.9,
    conditional: false,
  },
  {
    name: 'Bed Head South',
    description:
      'The head of the bed should face south while sleeping. This aligns with the earth\'s magnetic field and is believed to promote restful sleep and good health.',
    appliesTo: ['bedroom'],
    weight: 0.85,
    conditional: false,
  },
  {
    name: 'Kitchen Southeast',
    description:
      'The kitchen or cooking area should be in the southeast corner (Agni kona). Fire element items (stove, microwave) work best in this direction.',
    appliesTo: ['kitchen', 'living-room'],
    weight: 0.7,
    conditional: true,
  },
  {
    name: 'Study Northeast or East',
    description:
      'Study tables and desks should face east or northeast for better concentration and positive energy flow.',
    appliesTo: ['study', 'bedroom'],
    weight: 0.6,
    conditional: false,
  },
  {
    name: 'Avoid Beam Over Head',
    description:
      'Avoid placing beds or seating directly under exposed beams. If unavoidable, use a false ceiling to mask the beam.',
    appliesTo: ['living-room', 'bedroom', 'dining-room'],
    weight: 0.5,
    conditional: false,
  },
  {
    name: 'Open Space Northeast',
    description:
      'Keep the northeast area light and uncluttered. Avoid heavy furniture, toilets, or storage in this zone.',
    appliesTo: ['living-room', 'bedroom'],
    weight: 0.7,
    conditional: false,
  },
  {
    name: 'Main Door Not Facing South',
    description:
      'The main entrance should ideally face north, east, or northeast. South-facing entrances require a vastu remedy (threshold, toran, or rangoli).',
    appliesTo: ['living-room'],
    weight: 0.55,
    conditional: true,
  },
  {
    name: 'Mirror Placement',
    description:
      'Avoid mirrors directly facing the bed. Place them on the north or east wall at standing height.',
    appliesTo: ['bedroom'],
    weight: 0.4,
    conditional: false,
  },
  {
    name: 'Water Elements Northeast or North',
    description:
      'Aquariums, water features, or indoor plants requiring water should be in the north or northeast for prosperity.',
    appliesTo: ['living-room'],
    weight: 0.35,
    conditional: false,
  },
  {
    name: 'Tulsi Plant East',
    description:
      'A Tulsi (holy basil) plant on the east-facing window or balcony is considered highly auspicious.',
    appliesTo: ['living-room', 'kitchen'],
    weight: 0.3,
    conditional: false,
  },
];

// ── Climate Profiles by Indian City ──

const CLIMATE_PROFILES: Record<string, ClimateProfile> = {
  // Coastal / High Humidity
  Mumbai: {
    region: 'Coastal West',
    humidityLevel: 'high',
    temperatureRange: '22°C–35°C (year-round warm+humid)',
    materialAdvice: [
      'Use marine-grade plywood (waterproof) for all carpentry — moisture resistance is non-negotiable',
      'Laminate finishes preferred over veneer (less warping)',
      'SS304 stainless steel hardware (Hettich/Ebco anti-rust)',
      'PVC or WPC for bathroom/balcony cabinets',
      'Avoid solid wood — use engineered wood with moisture barrier',
    ],
    avoidMaterials: [
      'Natural veneer (will bubble/peel)',
      'Mild steel hardware (will rust within 2 monsoons)',
      'Particle board (swells in humidity)',
      'Natural leather upholstery (mold risk)',
    ],
    colorRecommendation:
      'Cool tones (greys, blues, sage greens) help offset the heat. Avoid deep reds and oranges which feel oppressive in humidity.',
    ventilationNote:
      'Cross-ventilation is critical. Maximize window openings on opposite walls. Consider exhaust fans in enclosed kitchens.',
  },

  Bangalore: {
    region: 'Deccan Plateau',
    humidityLevel: 'moderate',
    temperatureRange: '15°C–33°C (pleasant, cooler evenings)',
    materialAdvice: [
      'Engineered wood works well — the climate is forgiving',
      'Solid wood is viable (Indian teak, sheesham, mango wood)',
      'Standard plywood (MR grade) is sufficient for most areas',
      'Natural fabrics for upholstery (cotton, linen) — no sweating issues',
      'Large windows to enjoy the year-round pleasant weather',
    ],
    avoidMaterials: [
      'Heavy insulation (not needed)',
      'Dark metals that absorb heat on terraces',
    ],
    colorRecommendation:
      'Earthy tones (terracotta, olive, mustard) complement Bangalore\'s garden-city character. Warm woods pair beautifully.',
    ventilationNote:
      'Natural ventilation works year-round. Consider large operable windows and minimal AC dependency.',
  },

  Delhi: {
    region: 'Northern Plains',
    humidityLevel: 'moderate',
    temperatureRange: '5°C–45°C (extreme seasonal swing)',
    materialAdvice: [
      'Solid wood with proper seasoning to handle expansion/contraction',
      'Double-glazed windows for insulation against extreme temperatures',
      'Heavy curtains or blinds for summer heat management',
      'Rugs/carpets for winter warmth on marble/tile floors',
      'UV-resistant finishes for south-facing furniture (sun bleaching risk)',
    ],
    avoidMaterials: [
      'Pure PVC (becomes brittle in winter)',
      'Dark exterior paints (absorb too much heat in summer)',
      'Unseasoned wood (will crack in dry winter months)',
    ],
    colorRecommendation:
      'Warm neutrals for winter comfort. Light, reflective surfaces for summer. Layering: change cushion covers seasonally.',
    ventilationNote:
      'North-facing windows for winter sun, south-facing shaded. Ceiling fans are essential — Delhi homes need both heating and cooling strategies.',
  },

  Chennai: {
    region: 'Coastal South',
    humidityLevel: 'extreme',
    temperatureRange: '23°C–38°C (hot+humid, coastal)',
    materialAdvice: [
      'Marine ply mandatory — Chennai coastal humidity is aggressive',
      'Stainless steel or brass hardware only',
      'Vitrified tiles over marble (less moisture absorption)',
      'Teak and rubberwood handle humidity better than sheesham',
      'WPC (Wood-Plastic Composite) for any outdoor/semi-covered areas',
    ],
    avoidMaterials: [
      'MDF or particle board — will disintegrate',
      'Iron/steel hardware without anti-corrosion treatment',
      'Leather upholstery (mold, sweat damage)',
      'Wall-to-wall carpeting (traps moisture)',
    ],
    colorRecommendation:
      'Whites and creams to reflect heat. Accents in indigo, sea green, or temple-jewel tones. Avoid black and dark browns that trap heat.',
    ventilationNote:
      'Maximize cross-ventilation with high ceilings if possible (traditional Chettinad architecture principle). Ceiling fans are essential even with AC.',
  },

  Kolkata: {
    region: 'Eastern Plains',
    humidityLevel: 'high',
    temperatureRange: '12°C–38°C (humid subtropical, monsoon heavy)',
    materialAdvice: [
      'Waterproof ply for all carpentry',
      'Terracotta and clay elements work beautifully (traditional Bengal aesthetic)',
      'Wooden louvered shutters for controlled ventilation',
      'Rangoli-tile or mosaic flooring (traditional, moisture-resistant)',
    ],
    avoidMaterials: [
      'Untreated cane/bamboo furniture (mold)',
      'Cheap laminates (peeling in humidity)',
    ],
    colorRecommendation:
      'Deep jewel tones (emerald, ruby, sapphire) reflect Kolkata\'s cultural richness. Pair with cream/ivory for balance.',
    ventilationNote:
      'Monsoon ventilation strategy is critical — louvered windows and deep eaves. Avoid fully sealed AC rooms year-round.',
  },

  Hyderabad: {
    region: 'Deccan Plateau',
    humidityLevel: 'moderate',
    temperatureRange: '15°C–40°C (hot summers, mild winters)',
    materialAdvice: [
      'Granite countertops and flooring (locally available, heat-resistant)',
      'Sandstone cladding for accent walls',
      'Engineered wood with good ventilation',
      'Nawabi-style arches and jali work for cultural aesthetic',
    ],
    avoidMaterials: [
      'Overly dark furnishings (amplify heat perception)',
      'Synthetic carpets (dust accumulation in dry seasons)',
    ],
    colorRecommendation:
      'Pearl whites, sandstone, and touches of Nizami gold. The Hyderabad aesthetic blends Mughal elegance with modern minimalism.',
    ventilationNote:
      'Traditional jali (perforated screens) provide passive cooling — wonderful design element to incorporate.',
  },

  Ahmedabad: {
    region: 'Western Plains',
    humidityLevel: 'low',
    temperatureRange: '12°C–42°C (dry heat, cool winters)',
    materialAdvice: [
      'Wooden carved elements (Gujarati craftsmanship)',
      'Terracotta and ceramic tiles',
      'Lime-plaster walls (traditional cooling technique)',
      'Cotton and khadi fabrics',
    ],
    avoidMaterials: [
      'Over-polished surfaces (dust shows quickly in dry climate)',
      'Heavy drapes (trap heat)',
    ],
    colorRecommendation:
      'Bandhani-inspired jewel tones, indigo, and warm yellows. Gujarati aesthetic is vibrant and celebratory.',
    ventilationNote:
      'Courtyard-style ventilation (traditional pol house design). Stepwell-inspired water features for evaporative cooling.',
  },

  Pune: {
    region: 'Western Ghats Foothills',
    humidityLevel: 'moderate',
    temperatureRange: '10°C–38°C (moderate, pleasant 8 months)',
    materialAdvice: [
      'Standard MR-grade plywood sufficient',
      'Indian teak and mango wood work well',
      'Oxide flooring (traditional, eco-friendly, low-maintenance)',
      'Bamboo and cane furniture for semi-outdoor areas',
    ],
    avoidMaterials: [
      'Marine ply (overkill for Pune\'s moderate humidity)',
      'Heavy winter-specific furnishings (rarely needed)',
    ],
    colorRecommendation:
      'Earthy greens (Pune\'s Western Ghats backdrop). Wadas-inspired stone accents and wooden pillars.',
    ventilationNote:
      'Excellent natural ventilation possible 9 months a year. Large windows and balconies are highly desirable.',
  },
};

// ── Default profile for cities not in the database ──

const DEFAULT_CLIMATE_PROFILE: ClimateProfile = {
  region: 'Central India',
  humidityLevel: 'moderate',
  temperatureRange: '10°C–40°C',
  materialAdvice: [
    'Engineered wood or plywood with MR grade is sufficient',
    'Standard hardware with occasional anti-rust treatment',
    'Laminates for easy maintenance',
  ],
  avoidMaterials: [
    'Extremely moisture-sensitive materials',
    'Unseasoned solid wood',
  ],
  colorRecommendation:
    'Neutral palette with regional accent colors. Consider local architectural traditions.',
  ventilationNote:
    'Good cross-ventilation recommended. Ceiling fans are essential in all Indian climates.',
};

// ── Regional Style Notes ──

const REGIONAL_STYLES: Record<string, string> = {
  Mumbai:
    'Contemporary Bombay apartment style: space-efficient multi-functional furniture, subtle luxury, art deco accents, balcony garden. The "maximum city" aesthetic — everything earns its footprint.',
  Bangalore:
    'Garden-city aesthetic: indoor plants, natural light, earthy materials, mid-century modern meets South Indian craftsmanship. Laid-back sophistication.',
  Delhi:
    'Lutyens-meets-Punjab: grand proportions where possible, rich fabrics, chandelier moments, Mughal motifs. Even modest homes borrow miniature versions of this aesthetic.',
  Chennai:
    'Chettinad-modern fusion: Athangudi tiles, dark teak wood, brass accents, temple-inspired niches. Tamil design heritage updated for contemporary living.',
  Kolkata:
    'Bengal renaissance aesthetic: bookshelves as furniture, terracotta accents, kantha-stitch textiles, colonial-meets-creative. Intellectual and artistic.',
  Hyderabad:
    'Nawabi minimalism: pearl inlay references, jali screens, sandstone, grand chandeliers. Understated luxury with Islamic geometric precision.',
  Ahmedabad:
    'Pol house modern: courtyard concepts adapted for apartments, le Corbusier-meets-Gujarat, carved wooden accents, vibrant textiles, swing (jhoola) as centerpiece.',
  Pune: 'Wadas-meets-contemporary: stone accent walls, oxide flooring, large windows opening to greenery, Maratha-crafted wooden pillars, the "cultural capital" warmth.',
};

// ── Local Material Suggestions ──

const LOCAL_MATERIALS: Record<string, string[]> = {
  Mumbai: [
    'Marine-grade plywood (waterproof)',
    'SS304 stainless steel hardware',
    'PVC/WPC bathroom cabinets',
    'Vitrified tiles (moisture-resistant)',
    'Laminated MDF (better than raw MDF in humidity)',
  ],
  Bangalore: [
    'Indian teak and sheesham (solid wood)',
    'Cane and bamboo (light, breathable)',
    'Natural stone (locally quarried granite)',
    'Organic cotton and linen fabrics',
    'Terracotta and clay elements',
  ],
  Delhi: [
    'Seasoned Indian rosewood',
    'Marble (Makrana, Italian)',
    'Brass and copper accents',
    'Hand-knotted carpets',
    'Double-glazed window systems',
  ],
  Chennai: [
    'Teak and rubberwood',
    'Athangudi tiles (handmade, vibrant)',
    'Brass and bronze hardware',
    'Granite countertops',
    'WPC for moisture-prone areas',
  ],
};

// ── Public API ──

/**
 * Resolve the climate profile for a given city.
 */
export function getClimateProfile(city: string): ClimateProfile {
  const normalized = city.trim();
  return CLIMATE_PROFILES[normalized] ?? { ...DEFAULT_CLIMATE_PROFILE, region: `${normalized} (default)` };
}

/**
 * Get Vastu rules relevant to a room type and user's vastu stance.
 */
export function getVastuRules(
  roomType: RoomPurpose,
  vastuEnabled: boolean,
): VastuRule[] {
  if (!vastuEnabled) return [];

  return VASTU_RULES.filter((rule) => {
    if (rule.conditional && !vastuEnabled) return false;
    return rule.appliesTo.includes(roomType);
  }).sort((a, b) => b.weight - a.weight);
}

/**
 * Get all Vastu rules (unfiltered) for reference.
 */
export function getAllVastuRules(): VastuRule[] {
  return [...VASTU_RULES];
}

/**
 * Get local material suggestions for a city.
 */
export function getLocalMaterials(city: string): string[] {
  return LOCAL_MATERIALS[city.trim()] ?? [
    'Engineered wood (BWP/MR grade)',
    'Standard plywood',
    'Laminated finishes',
    'Local hardware brands',
  ];
}

/**
 * Get regional style notes for a city.
 */
export function getRegionalStyleNotes(city: string): string {
  return REGIONAL_STYLES[city.trim()] ?? 'Contemporary Indian style: blend of modern minimalism with local craftsmanship and materials.';
}

/**
 * Build a complete cultural design context for a user's location and preferences.
 */
export function buildCulturalContext(
  city: string,
  roomType: RoomPurpose,
  vastuEnabled: boolean,
): CulturalDesignContext {
  const climateProfile = getClimateProfile(city);

  return {
    city,
    region: climateProfile.region,
    climateProfile,
    vastuRules: getVastuRules(roomType, vastuEnabled),
    localMaterialSuggestions: getLocalMaterials(city),
    regionalStyleNotes: getRegionalStyleNotes(city),
  };
}

/**
 * Generate a compact cultural summary for embedding in AI prompts.
 * This is what gets injected into the system prompt for context-aware generation.
 */
export function generateCulturalPromptInjection(context: CulturalDesignContext): string {
  const vastuSection =
    context.vastuRules.length > 0
      ? `\nVASTU RULES TO RESPECT:\n${context.vastuRules
          .map((r) => `- ${r.name}: ${r.description}`)
          .join('\n')}`
      : '';

  return `LOCATION: ${context.city}, ${context.region}
CLIMATE: ${context.climateProfile.humidityLevel} humidity, ${context.climateProfile.temperatureRange}
${context.climateProfile.ventilationNote}
MATERIAL ADVICE: ${context.climateProfile.materialAdvice.join('; ')}
AVOID: ${context.climateProfile.avoidMaterials.join('; ')}
COLOR PALETTE: ${context.climateProfile.colorRecommendation}
REGIONAL STYLE: ${context.regionalStyleNotes}
LOCAL MATERIALS: ${context.localMaterialSuggestions.join(', ')}${vastuSection}`;
}