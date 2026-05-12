/**
 * State Contract — TypeScript mirror of backend/app/schemas/state.py.
 *
 * For Phase 1 these types are hand-written so the frontend can compile before
 * the schema-generation tooling lands (task #4 — shared/contracts/). Once that
 * step is wired this file becomes generated; do not extend the contract here
 * once that happens — extend the Pydantic models and regenerate.
 */

export type RoomType =
  | "living"
  | "bedroom"
  | "kitchen"
  | "dining"
  | "pooja"
  | "study"
  | "bathroom"
  | "kids";

export type Vibe =
  | "warm_traditional"
  | "modern_minimal"
  | "earthy_crafted"
  | "light_airy"
  | "maximalist"
  | "coastal";

export type Direction = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export interface Dimensions {
  width_mm: number;
  depth_mm: number;
  height_mm: number;
}

export interface Position {
  x_mm: number;
  z_mm: number;
  rotation_deg: number;
}

export interface CatalogRef {
  sku: string;
  asset_url: string;
  tint_hex: string | null;
  roughness_hint: number | null;
  size_label: string | null;
  material_label: string | null;
  finish_label: string | null;
}

export interface PlacedItem {
  id: string;
  catalog: CatalogRef;
  name_en: string;
  name_hi: string | null;
  category: string;
  dimensions: Dimensions;
  position: Position;
  facing: Direction | null;
  is_buy: boolean;
  price_inr: number;
  build_price_inr: number | null;
}

export interface Intake {
  room_type: RoomType;
  room_dimensions: Dimensions;
  entrance_direction: Direction;
  who_lives_here: string;
  vibe: Vibe;
  budget_inr: number;
  keep_existing: string | null;
  vastu_matters: boolean;
}

export interface Opening {
  wall: Direction;
  center_frac: number;
  width_mm: number;
  height_mm: number;
  kind: "door" | "window";
  sill_mm: number;
}

export interface RoomState {
  id: string;
  intake: Intake;
  items: PlacedItem[];
  palette: Record<string, string>;
  flooring: string | null;
  wall_finish: string | null;
  lighting_kelvin: number;
  openings?: Opening[];
}

export interface FinishingPaintSwatch {
  id: string;
  brand: string;
  product: string;
  color_name: string;
  hex: string;
  finish: string;
}
export interface FinishingFlooringOption {
  id: string;
  brand: string;
  product: string;
  label: string;
  hex: string;
  type: string;
}
export interface FinishingWarmthPreset {
  id: string;
  label: string;
  kelvin: number;
}
export interface FinishingOptions {
  paint_swatches: FinishingPaintSwatch[];
  flooring: FinishingFlooringOption[];
  warmth_presets: FinishingWarmthPreset[];
}

export interface Reasoning {
  headline: string;
  bullets: string[];
  vastu_notes: string[];
  accessibility_notes: string[];
}

export interface CostLineItem {
  item_id: string;
  name: string;
  category: string;
  price_inr: number;
  build_alternative_inr: number | null;
  is_buy: boolean;
}

export interface BudgetStory {
  total_inr: number;
  budget_inr: number;
  remaining_inr: number;
  livspace_comparison_pct: number;
  headline: string;
}

export interface CostBreakdown {
  story: BudgetStory;
  line_items: CostLineItem[];
}

export type VisionPhilosophy = "gathering" | "breath" | "keeper";

export interface Vision {
  id: string;
  philosophy: VisionPhilosophy;
  name: string;
  tagline: string;
  room_state: RoomState;
  reasoning: Reasoning;
  cost: CostBreakdown;
}

export interface GenerateRequest {
  intake: Intake;
}
export interface GenerateResponse {
  visions: Vision[];
}

export type IntentKind =
  | "make_bigger"
  | "make_smaller"
  | "change_fabric"
  | "change_finish"
  | "change_style"
  | "remove"
  | "add"
  | "move"
  | "rotate"
  | "duplicate"
  | "replace"
  | "recolor_room"
  | "mix_from_vision"
  | "free_text";

export interface Intent {
  kind: IntentKind;
  target_item_id: string | null;
  parameters: Record<string, string | number | boolean>;
}

export interface ChatRequest {
  room_state: RoomState;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  message: string;
  available_visions?: Vision[];
}

export interface ChatResponse {
  reply: string;
  intents: Intent[];
  proposed_room_state: RoomState | null;
  cost_delta_inr: number;
}

export interface ApplyRequest {
  room_state: RoomState;
  intents: Intent[];
  available_visions?: Vision[];
}
export interface ApplyResponse {
  room_state: RoomState;
  cost: CostBreakdown;
}

export interface CostRequest {
  room_state: RoomState;
}

export interface ExportRequest {
  room_state: RoomState;
  format: "pdf" | "json";
  include_hindi_section: boolean;
}
export interface ExportResponse {
  download_url: string | null;
  bytes_b64: string | null;
  valid_for_days: number;
}
