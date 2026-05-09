/**
 * Nirmit AI Designer — Chat Engine
 *
 * Interprets user natural language requests and translates them
 * into concrete store mutations (add, remove, replace, move furniture,
 * change materials, etc.)
 *
 * v2: Multi-turn conversation memory, pronoun resolution, streaming-ready,
 *     what-if previews, swap/duplicate/align/undo intents.
 * v3: AI Collaborator — Groq-powered conversational designer with fallback to regex engine.
 */

import { useStore, type Item, type ItemDraft } from '../../store/useStore';
import { FurnitureFactory } from '../../catalog/FurnitureFactory';
import type { CatalogItem } from '../../catalog/types';
import { formatINR } from '../costing';
import { NIRMIT_COLLABORATOR_PROMPT } from './prompts';
import { GROQ_API_URL, GROQ_API_KEY, GROQ_MODEL } from './apiClient';

// ─────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────

export interface ChatAction {
  type:
    | 'add_item'
    | 'remove_item'
    | 'replace_item'
    | 'move_item'
    | 'rotate_item'
    | 'change_material'
    | 'info'
    | 'no_op'
    | 'swap_item'
    | 'duplicate_item'
    | 'align_items'
    | 'whatif_preview'
    | 'undo_action';
  label: string;
  itemId?: string;
  catalogId?: string;
  position?: { x: number; y: number };
  rotation?: number;
  materialPatch?: Partial<{ wallColor: string; flooring: string; woodFinish: string }>;
  /** For what-if: the proposed change details */
  whatif?: {
    type: 'material' | 'swap' | 'move';
    description: string;
    costDelta: number;
    spaceDelta?: string;
    vastuDelta?: string;
    aestheticNote?: string;
  };
  /** For undo: reference to the action being undone */
  undoTarget?: ChatAction;
}

export interface ChatResult {
  message: string;
  actions: ChatAction[];
  costDelta?: number;
  /** Follow-up suggestions for the next turn */
  suggestions?: string[];
  /** When true, the action requires confirmation before executing */
  needsConfirmation?: boolean;
  /** What-if preview data (shown temporarily, not applied) */
  whatifPreview?: ChatAction['whatif'];
}

// ─────────────────────────────────────────────────
// Conversation Context (Multi-Turn Memory)
// ─────────────────────────────────────────────────

export interface ConversationContext {
  recentActions: ChatAction[];
  mentionedItems: string[];
  lastIntent: string | null;
  turnCount: number;
  /** Last 5 turns of conversation history for AI collaborator context */
  messageHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** Suggestions the AI made that the user hasn't responded to yet */
  unresolvedSuggestions: string[];
  /** Preferences expressed in chat (e.g., "prefers light wood") */
  userPreferences: Record<string, string>;
}

export function createConversation(): ConversationContext {
  return {
    recentActions: [],
    mentionedItems: [],
    lastIntent: null,
    turnCount: 0,
    messageHistory: [],
    unresolvedSuggestions: [],
    userPreferences: {},
  };
}

// ─────────────────────────────────────────────────
// Intent Recognition
// ─────────────────────────────────────────────────

interface ParsedIntent {
  verb:
    | 'add'
    | 'remove'
    | 'replace'
    | 'move'
    | 'rotate'
    | 'bigger'
    | 'smaller'
    | 'material'
    | 'info'
    | 'clear'
    | 'swap'
    | 'duplicate'
    | 'align'
    | 'whatif'
    | 'undo';
  subject: string;
  qualifier: string;
  direction?: string;
  raw: string;
}

function parseUserMessage(text: string, ctx?: ConversationContext): ParsedIntent {
  const lower = text.toLowerCase().trim();

  // ── Undo ──
  if (/\b(undo|go back|revert|back up|never mind|take that back)\b/.test(lower)) {
    return { verb: 'undo', subject: lower, qualifier: '', raw: lower };
  }

  // ── What-if ──
  if (/\b(what if|what about|how about|suppose|imagine if)\b/.test(lower)) {
    const subject = extractSubject(lower, ['what if', 'what about', 'how about', 'suppose', 'imagine if']);
    return { verb: 'whatif', subject, qualifier: '', raw: lower };
  }

  // ── Swap (explicit swap/replace with "for" or "with") ──
  if (/\b(swap|switch out|trade)\b/.test(lower) && /\b(for|with)\b/.test(lower)) {
    const subject = extractSubject(lower, ['swap', 'switch out', 'trade']);
    const qualifier = extractQualifier(lower);
    return { verb: 'swap', subject, qualifier, raw: lower };
  }

  // ── Duplicate ──
  if (/\b(duplicate|clone|copy|another one|one more|add another|same as)\b/.test(lower)) {
    const subject = extractSubject(lower, ['duplicate', 'clone', 'copy', 'another one', 'one more', 'add another', 'same as']);
    return { verb: 'duplicate', subject, qualifier: '', raw: lower };
  }

  // ── Align ──
  if (/\b(align|line up|straighten|arrange along|snap to)\b/.test(lower)) {
    const subject = extractSubject(lower, ['align', 'line up', 'straighten', 'arrange along', 'snap to']);
    const direction = extractDirection(lower);
    return { verb: 'align', subject, qualifier: '', direction, raw: lower };
  }

  // Remove/delete
  if (/\b(remove|delete|take away|get rid of|clear out)\b/.test(lower)) {
    const subject = extractSubject(lower, ['remove', 'delete', 'take away', 'get rid of', 'clear out']);
    if (lower.includes('all') || lower.includes('everything')) {
      return { verb: 'clear', subject: 'all', qualifier: '', raw: lower };
    }
    return { verb: 'remove', subject, qualifier: '', raw: lower };
  }

  // Replace/swap/change furniture (but NOT swap with "for" — that's caught above)
  if (/\b(replace|change|switch)\b/.test(lower) && !/\b(color|colour|wall|floor|material|paint)\b/.test(lower)) {
    const subject = extractSubject(lower, ['replace', 'change', 'switch']);
    const qualifier = extractQualifier(lower);
    return { verb: 'replace', subject, qualifier, raw: lower };
  }

  // Add/place
  if (/\b(add|place|put|include|need|want|give me)\b/.test(lower)) {
    const subject = extractSubject(lower, ['add', 'place', 'put', 'include', 'need', 'want', 'give me']);
    const direction = extractDirection(lower);
    return { verb: 'add', subject, qualifier: '', direction, raw: lower };
  }

  // Bigger/larger/upgrade
  if (/\b(bigger|larger|upgrade|more|wider|longer|expand)\b/.test(lower)) {
    const subject = extractSubject(lower, ['bigger', 'larger', 'upgrade', 'more', 'wider', 'longer', 'expand']);
    return { verb: 'bigger', subject, qualifier: '', raw: lower };
  }

  // Smaller/downsize/compact
  if (/\b(smaller|compact|downsize|reduce|shrink|mini)\b/.test(lower)) {
    const subject = extractSubject(lower, ['smaller', 'compact', 'downsize', 'reduce', 'shrink', 'mini']);
    return { verb: 'smaller', subject, qualifier: '', raw: lower };
  }

  // Move
  if (/\b(move|shift|push|pull|drag|slide)\b/.test(lower)) {
    const subject = extractSubject(lower, ['move', 'shift', 'push', 'pull', 'drag', 'slide']);
    const direction = extractDirection(lower);
    return { verb: 'move', subject, qualifier: '', direction, raw: lower };
  }

  // Rotate/turn
  if (/\b(rotate|turn|flip|angle)\b/.test(lower)) {
    const subject = extractSubject(lower, ['rotate', 'turn', 'flip', 'angle']);
    return { verb: 'rotate', subject, qualifier: '', raw: lower };
  }

  // Material changes
  if (/\b(wall|color|colour|floor|wood|paint|marble|tile|laminate|walnut|oak|teak|dark|light|darker|lighter|premium|finish|texture)\b/.test(lower)) {
    return { verb: 'material', subject: lower, qualifier: '', raw: lower };
  }

  // Info/question
  if (/\b(what|how much|cost|price|total|how many|which|tell me|show)\b/.test(lower)) {
    return { verb: 'info', subject: lower, qualifier: '', raw: lower };
  }

  // Fallback — try to find a furniture name
  const furnitureMatch = findFurnitureInText(lower);
  if (furnitureMatch) {
    return { verb: 'add', subject: furnitureMatch.label.toLowerCase(), qualifier: '', raw: lower };
  }

  return { verb: 'info', subject: lower, qualifier: '', raw: lower };
}

function extractSubject(text: string, verbs: string[]): string {
  let cleaned = text;
  for (const verb of verbs) {
    cleaned = cleaned.replace(new RegExp(`\\b${verb}\\b`, 'gi'), '').trim();
  }
  // Remove articles and prepositions
  cleaned = cleaned.replace(/\b(the|a|an|my|this|that|to|from|with|near|by|on|in|at|for|of)\b/gi, '').trim();
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

function extractQualifier(text: string): string {
  const withMatch = text.match(/\bwith\s+(.+?)(?:\s*$|\s*\.)/);
  if (withMatch) return withMatch[1].trim();
  const toMatch = text.match(/\bto\s+(.+?)(?:\s*$|\s*\.)/);
  if (toMatch) return toMatch[1].trim();
  const forMatch = text.match(/\bfor\s+(.+?)(?:\s*$|\s*\.)/);
  if (forMatch) return forMatch[1].trim();
  return '';
}

function extractDirection(text: string): string | undefined {
  if (/\b(north|top|up)\b/.test(text)) return 'north';
  if (/\b(south|bottom|down)\b/.test(text)) return 'south';
  if (/\b(east|right)\b/.test(text)) return 'east';
  if (/\b(west|left)\b/.test(text)) return 'west';
  if (/\b(center|centre|middle)\b/.test(text)) return 'center';
  if (/\bnear\s*(window|light)\b/.test(text)) return 'window';
  if (/\bnear\s*(door|entry|entrance)\b/.test(text)) return 'door';
  if (/\b(corner)\b/.test(text)) return 'corner';
  return undefined;
}

// ─────────────────────────────────────────────────
// Pronoun Resolution
// ─────────────────────────────────────────────────

function resolvePronoun(subject: string, ctx?: ConversationContext): string {
  if (!ctx) return subject;
  const lower = subject.trim().toLowerCase();
  // If the subject is just a pronoun ("it", "this", "that", "them"), resolve from context
  if (/^(it|this|that|them|these|those)$/.test(lower)) {
    if (ctx.mentionedItems.length > 0) {
      return ctx.mentionedItems[ctx.mentionedItems.length - 1];
    }
  }
  // If subject is empty but context has mentioned items, use the last one
  if (!lower && ctx.mentionedItems.length > 0) {
    return ctx.mentionedItems[ctx.mentionedItems.length - 1];
  }
  return subject;
}

// ─────────────────────────────────────────────────
// Furniture Matching
// ─────────────────────────────────────────────────

const FURNITURE_ALIASES: Record<string, string[]> = {
  'sofa': ['sofa', 'couch', 'settee', 'seating', 'seat'],
  'bed': ['bed', 'cot', 'mattress'],
  'wardrobe': ['wardrobe', 'closet', 'almirah', 'cupboard', 'storage'],
  'desk': ['desk', 'study table', 'work table', 'computer table', 'wfh'],
  'tv-unit': ['tv', 'television', 'entertainment', 'tv unit', 'media'],
  'coffee-table': ['coffee table', 'center table', 'centre table'],
  'dining-table': ['dining', 'dining table', 'eating table'],
  'bookshelf': ['bookshelf', 'book shelf', 'bookcase', 'shelf', 'rack'],
  'nightstand': ['nightstand', 'night stand', 'side table', 'bedside'],
  'pooja-wall': ['pooja', 'puja', 'mandir', 'temple', 'prayer'],
  'chair': ['chair', 'accent chair', 'arm chair', 'lounge'],
  'dresser': ['dresser', 'vanity', 'dressing table', 'mirror table'],
  'shoe-rack': ['shoe', 'shoe rack', 'footwear'],
  'ottoman': ['ottoman', 'pouffe', 'pouf', 'foot rest', 'footrest'],
  'bench': ['bench', 'diwan'],
};

function findFurnitureInText(text: string): CatalogItem | null {
  for (const [code, aliases] of Object.entries(FURNITURE_ALIASES)) {
    for (const alias of aliases) {
      if (text.includes(alias)) {
        const mapped = FurnitureFactory.mapLegacyCode(code);
        if (mapped) return mapped;
        // Try search
        const results = FurnitureFactory.search(alias);
        if (results.length > 0) return results[0];
      }
    }
  }
  // Direct catalog search
  const results = FurnitureFactory.search(text);
  if (results.length > 0) return results[0];
  return null;
}

function findItemInRoom(text: string, items: Item[]): Item | null {
  for (const [, aliases] of Object.entries(FURNITURE_ALIASES)) {
    for (const alias of aliases) {
      if (text.includes(alias)) {
        const found = items.find((item) =>
          aliases.some(
            (a) =>
              item.name.toLowerCase().includes(a) ||
              item.code.toLowerCase().includes(a),
          ),
        );
        if (found) return found;
      }
    }
  }
  // Fallback: try matching item names directly
  for (const item of items) {
    if (text.includes(item.name.toLowerCase())) return item;
  }
  return null;
}

// ─────────────────────────────────────────────────
// Position Helpers
// ─────────────────────────────────────────────────

function getPositionForDirection(
  direction: string | undefined,
  room: { width: number; length: number },
): { x: number; y: number } {
  switch (direction) {
    case 'north':
      return { x: room.width / 2, y: 1 };
    case 'south':
      return { x: room.width / 2, y: room.length - 1 };
    case 'east':
      return { x: room.width - 1, y: room.length / 2 };
    case 'west':
      return { x: 1, y: room.length / 2 };
    case 'center':
      return { x: room.width / 2, y: room.length / 2 };
    case 'window':
      return { x: room.width - 1.5, y: room.length / 2 };
    case 'door':
      return { x: room.width / 2, y: room.length - 1.5 };
    case 'corner':
      return { x: 1, y: 1 };
    default:
      return { x: room.width / 2, y: room.length / 2 };
  }
}

/**
 * Parse relative move qualifiers like "a little left", "slightly forward",
 * "a bit up", "more right". Returns offset in feet.
 */
function parseRelativeMove(
  text: string,
): { dx: number; dy: number } | null {
  const lower = text.toLowerCase();
  let magnitude = 1.0; // default 1 foot

  if (/\b(a little|slightly|a bit|a tad|just)\b/.test(lower)) magnitude = 0.5;
  if (/\b(more|further|lot|big|way)\b/.test(lower)) magnitude = 2.0;

  let dx = 0;
  let dy = 0;

  if (/\b(left|west)\b/.test(lower)) dx = -magnitude;
  if (/\b(right|east)\b/.test(lower)) dx = magnitude;
  if (/\b(up|north|forward|front|ahead)\b/.test(lower)) dy = -magnitude;
  if (/\b(down|south|back|backward|behind)\b/.test(lower)) dy = magnitude;

  if (dx === 0 && dy === 0) return null;
  return { dx, dy };
}

function getSizeVariant(
  catalogItem: CatalogItem,
  direction: 'bigger' | 'smaller',
): CatalogItem | null {
  const category = FurnitureFactory.getByCategory(catalogItem.category);
  const sorted = [...category].sort((a, b) => {
    const areaA = a.dimensions.width * a.dimensions.depth;
    const areaB = b.dimensions.width * b.dimensions.depth;
    return areaA - areaB;
  });

  const currentIndex = sorted.findIndex((item) => item.id === catalogItem.id);
  if (currentIndex < 0) return null;

  if (direction === 'bigger') {
    return currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : null;
  } else {
    return currentIndex > 0 ? sorted[currentIndex - 1] : null;
  }
}

/**
 * Get the most popular (median) size variant for a category.
 */
function getPopularSizeVariant(catalogItem: CatalogItem): CatalogItem {
  const category = FurnitureFactory.getByCategory(catalogItem.category);
  const sorted = [...category].sort((a, b) => {
    const areaA = a.dimensions.width * a.dimensions.depth;
    const areaB = b.dimensions.width * b.dimensions.depth;
    return areaA - areaB;
  });
  // Return the median (most typical) size
  const mid = Math.floor(sorted.length / 2);
  return sorted[mid] ?? catalogItem;
}

// ─────────────────────────────────────────────────
// Follow-up Suggestion Generation
// ─────────────────────────────────────────────────

function generateSuggestions(
  intent: ParsedIntent,
  action: ChatAction,
  items: Item[],
): string[] {
  const suggestions: string[] = [];

  switch (intent.verb) {
    case 'add':
      suggestions.push('Try a different material?');
      if (items.length >= 2) suggestions.push('Show me from the top?');
      suggestions.push('Add a coffee table?');
      break;
    case 'remove':
      if (items.length > 0) suggestions.push('Add something in its place?');
      suggestions.push('Undo that?');
      break;
    case 'move':
      suggestions.push('Rotate it?');
      suggestions.push('Try the other wall?');
      break;
    case 'material':
      suggestions.push('What if we used teak instead?');
      suggestions.push('Show me in 3D?');
      break;
    case 'bigger':
    case 'smaller':
      suggestions.push('Try a different size?');
      suggestions.push('What\'s my total cost?');
      break;
    case 'swap':
      suggestions.push('Keep both?');
      suggestions.push('Try a different material?');
      break;
    case 'duplicate':
      suggestions.push('Align them along the wall?');
      suggestions.push('Space them evenly?');
      break;
    case 'align':
      suggestions.push('Rotate them to face the center?');
      break;
    case 'whatif':
      suggestions.push('Apply this change?');
      suggestions.push('Try a different material?');
      break;
    case 'clear':
      suggestions.push('Start with a sofa?');
      suggestions.push('Add a bed?');
      break;
    default:
      if (items.length === 0) {
        suggestions.push('Add a sofa?');
        suggestions.push('Add a bed?');
        suggestions.push('Add a dining table?');
      } else {
        suggestions.push('What\'s my total cost?');
        suggestions.push('Show me in 3D?');
      }
      break;
  }

  // Deduplicate and limit to 3
  return [...new Set(suggestions)].slice(0, 3);
}

// ─────────────────────────────────────────────────
// AI Collaborator — Groq-powered conversational designer
// ─────────────────────────────────────────────────

/**
 * Context shape passed to the AI collaborator for rich, personalized responses.
 */
export interface CollaboratorContext {
  items: Item[];
  room: { width: number; length: number };
  materials: { wallColor: string; flooring: string; woodFinish: string };
  budget: string | null;
  city: string | null;
  mustHaves: string[];
  desiredFeeling?: string;
  whoIsThisRoomFor?: string;
  lovedItemToKeep?: string;
  vastuContext?: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * Call the Groq API with the Nirmit collaborator persona.
 * Falls back to the regex-based processUserMessage() on any failure or timeout.
 */
export async function getAICollaboratorResponse(
  userMessage: string,
  context: CollaboratorContext,
): Promise<ChatResult> {
  // If no API key, skip straight to fallback
  if (!GROQ_API_KEY) {
    console.warn('[Nirmit Chat] No Groq API key — using regex engine');
    return processUserMessage(userMessage);
  }

  // Build a rich context prompt
  const itemList = context.items
    .map(
      (i) =>
        `- ${i.name} (${i.width.toFixed(1)}m × ${i.length.toFixed(1)}m) at (${i.x.toFixed(1)}, ${i.y.toFixed(1)}), ₹${i.price.toLocaleString('en-IN')}`,
    )
    .join('\n');

  const totalCost = context.items.reduce((sum, i) => sum + i.price, 0);

  const contextBlock = `
Current room state:
- Room: ${context.room.width}ft × ${context.room.length}ft
- City: ${context.city ?? 'Not specified'}
- Budget: ${context.budget ?? 'Not specified'}
- Must-haves: ${context.mustHaves.join(', ') || 'None'}
- Desired feeling: ${context.desiredFeeling ?? 'Not specified'}
- Room is for: ${context.whoIsThisRoomFor ?? 'Not specified'}
- Loved item to keep: ${context.lovedItemToKeep ?? 'None'}
- Vastu context: ${context.vastuContext ?? 'Not specified'}
- Materials: walls=${context.materials.wallColor}, floor=${context.materials.flooring}, wood=${context.materials.woodFinish}
- Furniture placed (${context.items.length} items, total ₹${totalCost.toLocaleString('en-IN')}):
${itemList || '  (empty room)'}

Conversation history:
${context.conversationHistory.map((m) => `${m.role === 'user' ? 'User' : 'Nirmit'}: ${m.content}`).join('\n') || '(new conversation)'}

User's latest message: "${userMessage}"
`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: NIRMIT_COLLABORATOR_PROMPT },
          { role: 'user', content: contextBlock },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(
        `[Nirmit Chat] Groq API returned ${response.status} — falling back to regex engine`,
      );
      return processUserMessage(userMessage);
    }

    const data = await response.json();
    const rawContent: string =
      data.choices?.[0]?.message?.content ?? '';

    // Parse the JSON response from the AI
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn(
        '[Nirmit Chat] AI response was not valid JSON — falling back to regex engine',
      );
      return processUserMessage(userMessage);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Build ChatResult from AI response
    const result: ChatResult = {
      message: parsed.message ?? 'Let me think about that...',
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      costDelta: typeof parsed.costDelta === 'number' ? parsed.costDelta : undefined,
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.slice(0, 3)
        : undefined,
      needsConfirmation:
        typeof parsed.costDelta === 'number' &&
        Math.abs(parsed.costDelta) > 5000,
    };

    return result;
  } catch (err) {
    const reason =
      err instanceof DOMException && err.name === 'AbortError'
        ? 'timeout'
        : err instanceof Error
          ? err.message
          : String(err);
    console.warn(
      `[Nirmit Chat] AI collaborator failed (${reason}) — falling back to regex engine`,
    );
    return processUserMessage(userMessage);
  }
}

// ─────────────────────────────────────────────────
// Main Chat Processing
// ─────────────────────────────────────────────────

export function processUserMessage(
  text: string,
  ctx?: ConversationContext,
): ChatResult {
  const state = useStore.getState();
  const { items, room, materials } = state;
  const intent = parseUserMessage(text, ctx);

  // Resolve pronouns using conversation context
  const resolvedSubject = resolvePronoun(intent.subject, ctx);

  // Update context if provided
  if (ctx) {
    ctx.turnCount++;
    ctx.lastIntent = intent.verb;
  }

  let result: ChatResult;

  switch (intent.verb) {
    // ── ADD ──
    case 'add': {
      const catalogItem =
        findFurnitureInText(resolvedSubject) ?? findFurnitureInText(intent.raw);
      if (!catalogItem) {
        result = {
          message: `I couldn't find "${intent.subject}" in our catalog. Try asking for a sofa, desk, bookshelf, TV unit, mandir, wardrobe, or bed.`,
          actions: [],
        };
        break;
      }

      // If no size specified, suggest the most popular size variant
      const bestVariant = getPopularSizeVariant(catalogItem);
      const pos = getPositionForDirection(intent.direction, room);
      const draft: ItemDraft = {
        code: bestVariant.id,
        name: bestVariant.label,
        x: pos.x,
        y: pos.y,
        width: bestVariant.dimensions.width,
        length: bestVariant.dimensions.depth,
        height: bestVariant.dimensions.height,
        rotation: 0,
        color:
          bestVariant.pricing.materialOptions['wood_teak']?.colorHex ??
          '#8B6914',
        modelPath: bestVariant.modelPath.startsWith('primitive:')
          ? ''
          : bestVariant.modelPath,
        price: bestVariant.pricing.baseCost,
        brand: 'Nirmit Catalog',
      };

      state.addItem(draft);

      const dirText = intent.direction
        ? ` near the ${intent.direction} wall`
        : '';
      const action: ChatAction = {
        type: 'add_item',
        label: bestVariant.label,
        catalogId: bestVariant.id,
        position: pos,
      };

      if (ctx) {
        ctx.recentActions.push(action);
        if (ctx.recentActions.length > 5) ctx.recentActions.shift();
        ctx.mentionedItems.push(bestVariant.label);
        if (ctx.mentionedItems.length > 10) ctx.mentionedItems.shift();
      }

      result = {
        message: `Added **${bestVariant.label}** (${bestVariant.dimensions.width.toFixed(1)}m × ${bestVariant.dimensions.depth.toFixed(1)}m)${dirText}. Price: ${formatINR(bestVariant.pricing.baseCost)}.`,
        actions: [action],
        costDelta: bestVariant.pricing.baseCost,
      };
      break;
    }

    // ── REMOVE ──
    case 'remove': {
      const target =
        findItemInRoom(resolvedSubject, items) ??
        findItemInRoom(intent.raw, items);
      if (!target) {
        result = {
          message: `I couldn't find that item in your room. Currently placed: ${items.map((i) => i.name).join(', ') || 'nothing yet'}.`,
          actions: [],
        };
        break;
      }

      state.removeItem(target.id);
      const action: ChatAction = {
        type: 'remove_item',
        label: target.name,
        itemId: target.id,
      };

      if (ctx) {
        ctx.recentActions.push(action);
        if (ctx.recentActions.length > 5) ctx.recentActions.shift();
      }

      result = {
        message: `Removed **${target.name}**. Your estimate just dropped by ~${formatINR(target.price)}.`,
        actions: [action],
        costDelta: -target.price,
      };
      break;
    }

    // ── CLEAR (with confirmation) ──
    case 'clear': {
      const count = items.length;
      if (count === 0) {
        result = {
          message: 'The room is already empty!',
          actions: [],
        };
        break;
      }

      // Check if this is a confirmation response
      const isConfirmation =
        /\b(yes|confirm|ok|sure|go ahead|do it|proceed)\b/i.test(text);
      const isPendingConfirm =
        ctx?.lastIntent === 'clear' &&
        ctx.recentActions.length > 0 &&
        ctx.recentActions[ctx.recentActions.length - 1].type === 'no_op';

      if (isConfirmation && isPendingConfirm) {
        const totalCost = items.reduce((sum, i) => sum + i.price, 0);
        state.clearItems();
        const action: ChatAction = {
          type: 'remove_item',
          label: 'all items',
        };
        if (ctx) {
          ctx.recentActions.push(action);
          if (ctx.recentActions.length > 5) ctx.recentActions.shift();
        }
        result = {
          message: `Cleared all ${count} items from the room. Fresh start! (Removed ~${formatINR(totalCost)} worth of furniture)`,
          actions: [action],
          costDelta: -totalCost,
        };
      } else {
        // First time — ask for confirmation
        const action: ChatAction = {
          type: 'no_op',
          label: 'clear confirmation pending',
        };
        if (ctx) {
          ctx.recentActions.push(action);
          if (ctx.recentActions.length > 5) ctx.recentActions.shift();
        }
        result = {
          message: `⚠️ This will remove all **${count} items** from the room. Type **'yes'** to confirm.`,
          actions: [action],
          needsConfirmation: true,
        };
      }
      break;
    }

    // ── BIGGER / SMALLER ──
    case 'bigger':
    case 'smaller': {
      const target =
        findItemInRoom(resolvedSubject, items) ??
        findItemInRoom(intent.raw, items) ??
        items[items.length - 1];
      if (!target) {
        result = {
          message: 'No items to resize. Add some furniture first!',
          actions: [],
        };
        break;
      }

      const currentCatalog =
        FurnitureFactory.getItem(target.code) ??
        FurnitureFactory.mapLegacyCode(target.code);
      if (!currentCatalog) {
        result = {
          message: `Can't find size variants for ${target.name}.`,
          actions: [],
        };
        break;
      }

      const variant = getSizeVariant(currentCatalog, intent.verb);
      if (!variant) {
        result = {
          message: `${target.name} is already the ${intent.verb === 'bigger' ? 'largest' : 'smallest'} option in this category.`,
          actions: [],
        };
        break;
      }

      state.updateItem(target.id, {
        code: variant.id,
        name: variant.label,
        width: variant.dimensions.width,
        length: variant.dimensions.depth,
        height: variant.dimensions.height,
        price: variant.pricing.baseCost,
      });

      const priceDiff = variant.pricing.baseCost - currentCatalog.pricing.baseCost;
      const action: ChatAction = {
        type: 'replace_item',
        label: variant.label,
        itemId: target.id,
        catalogId: variant.id,
      };
      if (ctx) {
        ctx.recentActions.push(action);
        if (ctx.recentActions.length > 5) ctx.recentActions.shift();
        ctx.mentionedItems.push(variant.label);
        if (ctx.mentionedItems.length > 10) ctx.mentionedItems.shift();
      }

      result = {
        message: `Replaced **${currentCatalog.label}** → **${variant.label}** (${variant.dimensions.width.toFixed(1)}m × ${variant.dimensions.depth.toFixed(1)}m). ${priceDiff > 0 ? `+${formatINR(priceDiff)}` : formatINR(priceDiff)} to your estimate.`,
        actions: [action],
        costDelta: priceDiff,
      };
      break;
    }

    // ── MOVE (with relative move support) ──
    case 'move': {
      const target =
        findItemInRoom(resolvedSubject, items) ??
        findItemInRoom(intent.raw, items);
      if (!target) {
        result = {
          message: `I couldn't find that item to move. Try specifying the furniture name.`,
          actions: [],
        };
        break;
      }

      // Check for relative move ("a little left", "slightly forward")
      const relative = parseRelativeMove(intent.raw);
      let newPos: { x: number; y: number };
      let dirLabel: string;

      if (relative) {
        newPos = {
          x: target.x + relative.dx,
          y: target.y + relative.dy,
        };
        const parts: string[] = [];
        if (relative.dx < 0) parts.push('left');
        if (relative.dx > 0) parts.push('right');
        if (relative.dy < 0) parts.push('forward');
        if (relative.dy > 0) parts.push('back');
        dirLabel = parts.join('-') || 'slightly';
      } else {
        newPos = getPositionForDirection(intent.direction, room);
        dirLabel = intent.direction ?? 'center';
      }

      state.updateItemPos(target.id, newPos.x, newPos.y);

      const action: ChatAction = {
        type: 'move_item',
        label: target.name,
        itemId: target.id,
        position: newPos,
      };
      if (ctx) {
        ctx.recentActions.push(action);
        if (ctx.recentActions.length > 5) ctx.recentActions.shift();
      }

      result = {
        message: `Moved **${target.name}** ${dirLabel}. Drag it in the 2D view for precise placement.`,
        actions: [action],
      };
      break;
    }

    // ── ROTATE ──
    case 'rotate': {
      const target =
        findItemInRoom(resolvedSubject, items) ??
        findItemInRoom(intent.raw, items) ??
        (items.length > 0 ? items[items.length - 1] : null);
      if (!target) {
        result = {
          message: 'No item to rotate. Select one first.',
          actions: [],
        };
        break;
      }

      state.rotateItem(target.id, 90);
      const action: ChatAction = {
        type: 'rotate_item',
        label: target.name,
        itemId: target.id,
        rotation: 90,
      };
      if (ctx) {
        ctx.recentActions.push(action);
        if (ctx.recentActions.length > 5) ctx.recentActions.shift();
      }

      result = {
        message: `Rotated **${target.name}** by 90°.`,
        actions: [action],
      };
      break;
    }

    // ── MATERIAL (with fuzzy matching) ──
    case 'material': {
      const patch: Partial<{
        wallColor: string;
        flooring: string;
        woodFinish: string;
      }> = {};
      const messages: string[] = [];

      // Wall color
      if (/\b(white|cream)\b/.test(intent.raw)) {
        patch.wallColor = '#ECE6DB';
        messages.push('Walls → warm white');
      } else if (/\bgreen\b/.test(intent.raw)) {
        patch.wallColor = '#C8D4BF';
        messages.push('Walls → sage green');
      } else if (/\bblue\b/.test(intent.raw)) {
        patch.wallColor = '#C9D6DF';
        messages.push('Walls → dusty blue');
      } else if (/\b(grey|gray)\b/.test(intent.raw)) {
        patch.wallColor = '#D4D0CB';
        messages.push('Walls → warm grey');
      } else if (/\b(beige|sand)\b/.test(intent.raw)) {
        patch.wallColor = '#E8DCC8';
        messages.push('Walls → sand beige');
      } else if (/\b(peach|terracotta)\b/.test(intent.raw)) {
        patch.wallColor = '#E8D0BD';
        messages.push('Walls → soft terracotta');
      }

      // Flooring
      if (/\bmarble\b/.test(intent.raw)) {
        patch.flooring = 'marble';
        messages.push('Floor → marble');
      } else if (/\b(tile|vitrified)\b/.test(intent.raw)) {
        patch.flooring = 'vitrified-tiles';
        messages.push('Floor → vitrified tiles');
      } else if (/\b(wood|laminate|hardwood)\b/.test(intent.raw)) {
        patch.flooring = 'wood-laminate';
        messages.push('Floor → wood laminate');
      }

      // Wood finish — including fuzzy matches
      if (/\b(walnut|dark)\b/.test(intent.raw)) {
        patch.woodFinish = 'Dark Walnut';
        messages.push('Wood → dark walnut');
      } else if (/\b(oak|light)\b/.test(intent.raw)) {
        patch.woodFinish = 'Light Oak';
        messages.push('Wood → light oak');
      } else if (/\bteak\b/.test(intent.raw)) {
        patch.woodFinish = 'Teak Grain';
        messages.push('Wood → teak');
      } else if (/\b(wenge|ebony)\b/.test(intent.raw)) {
        patch.woodFinish = 'Wenge';
        messages.push('Wood → wenge');
      }

      // Fuzzy material changes: "make it darker", "lighter wood", "more premium"
      if (/\b(darker|darken)\b/.test(intent.raw)) {
        if (materials.woodFinish === 'Light Oak') {
          patch.woodFinish = 'Teak Grain';
          messages.push('Wood → teak (darker)');
        } else if (materials.woodFinish === 'Teak Grain') {
          patch.woodFinish = 'Dark Walnut';
          messages.push('Wood → dark walnut (darker)');
        } else if (materials.woodFinish === 'Dark Walnut') {
          patch.woodFinish = 'Wenge';
          messages.push('Wood → wenge (darkest)');
        } else {
          patch.woodFinish = 'Dark Walnut';
          messages.push('Wood → dark walnut');
        }
      }

      if (/\b(lighter|lighten)\b/.test(intent.raw)) {
        if (materials.woodFinish === 'Wenge') {
          patch.woodFinish = 'Dark Walnut';
          messages.push('Wood → dark walnut (lighter)');
        } else if (materials.woodFinish === 'Dark Walnut') {
          patch.woodFinish = 'Teak Grain';
          messages.push('Wood → teak (lighter)');
        } else if (materials.woodFinish === 'Teak Grain') {
          patch.woodFinish = 'Light Oak';
          messages.push('Wood → light oak (lightest)');
        } else {
          patch.woodFinish = 'Light Oak';
          messages.push('Wood → light oak');
        }
      }

      if (/\b(premium|richer|luxury|luxe|expensive|high.end)\b/.test(intent.raw)) {
        if (materials.woodFinish !== 'Wenge') {
          patch.woodFinish = 'Wenge';
          messages.push('Wood → wenge (premium)');
        }
        if (!patch.flooring && materials.flooring !== 'marble') {
          patch.flooring = 'marble';
          messages.push('Floor → marble (premium)');
        }
      }

      if (messages.length > 0) {
        state.setMaterialConfig(patch as import('../../store/useStore').MaterialConfig);
        const action: ChatAction = {
          type: 'change_material',
          label: messages.join(', '),
          materialPatch: patch,
        };
        if (ctx) {
          ctx.recentActions.push(action);
          if (ctx.recentActions.length > 5) ctx.recentActions.shift();
        }
        result = {
          message: `Updated materials: ${messages.join(', ')}. Switch to 3D view to see the change.`,
          actions: [action],
        };
      } else {
        result = {
          message: `Try: "white walls", "marble floor", "dark walnut wood", "grey walls", "teak finish", "make it darker", "more premium"`,
          actions: [],
        };
      }
      break;
    }

    // ── INFO ──
    case 'info': {
      const totalCost = items.reduce((sum, item) => sum + item.price, 0);
      const itemList = items
        .map((i) => `• ${i.name} (${formatINR(i.price)})`)
        .join('\n');

      if (/\b(cost|price|total|budget|estimate)\b/.test(intent.raw)) {
        result = {
          message: `**Current room: ${items.length} items**\n${itemList}\n\n**Total furniture:** ${formatINR(totalCost)}\nRoom: ${room.width}ft × ${room.length}ft\nFloor: ${materials.flooring}\nWood: ${materials.woodFinish}`,
          actions: [{ type: 'info', label: 'Cost summary' }],
        };
      } else {
        result = {
          message: `I can help you:\n• **Add** furniture: "add a bookshelf near the window"\n• **Remove** items: "remove the coffee table"\n• **Resize**: "make the sofa bigger"\n• **Move**: "move the desk to the east wall" or "a little left"\n• **Swap**: "swap the sofa for a diwan"\n• **Duplicate**: "add another chair like this one"\n• **Align**: "align the chairs along the wall"\n• **What-if**: "what if we used teak instead?"\n• **Materials**: "dark walnut wood", "marble floor", "make it darker"\n• **Cost**: "what's my total?"\n• **Undo**: "undo that"`,
          actions: [{ type: 'info', label: 'Help' }],
        };
      }
      break;
    }

    // ── SWAP ──
    case 'swap': {
      // Find the item to remove (the "from" item)
      const fromItem =
        findItemInRoom(resolvedSubject, items) ??
        findItemInRoom(intent.raw, items);
      if (!fromItem) {
        result = {
          message: `I couldn't find that item to swap. Which piece would you like to replace?`,
          actions: [],
        };
        break;
      }

      // Find the replacement (the "to" item from qualifier)
      const replacementText = intent.qualifier || intent.raw;
      const replacementItem = findFurnitureInText(replacementText);
      if (!replacementItem) {
        result = {
          message: `I couldn't find a replacement for "${intent.qualifier}" in our catalog. Try something like "swap the sofa for a diwan".`,
          actions: [],
        };
        break;
      }

      // Remove old, add new at same position
      const oldPos = { x: fromItem.x, y: fromItem.y };
      const oldRotation = fromItem.rotation;
      const oldPrice = fromItem.price;

      state.removeItem(fromItem.id);

      const bestVariant = getPopularSizeVariant(replacementItem);
      const draft: ItemDraft = {
        code: bestVariant.id,
        name: bestVariant.label,
        x: oldPos.x,
        y: oldPos.y,
        width: bestVariant.dimensions.width,
        length: bestVariant.dimensions.depth,
        height: bestVariant.dimensions.height,
        rotation: oldRotation,
        color:
          bestVariant.pricing.materialOptions['wood_teak']?.colorHex ??
          '#8B6914',
        modelPath: bestVariant.modelPath.startsWith('primitive:')
          ? ''
          : bestVariant.modelPath,
        price: bestVariant.pricing.baseCost,
        brand: 'Nirmit Catalog',
      };
      state.addItem(draft);

      const priceDiff = bestVariant.pricing.baseCost - oldPrice;
      const action: ChatAction = {
        type: 'swap_item',
        label: `${fromItem.name} → ${bestVariant.label}`,
        itemId: fromItem.id,
        catalogId: bestVariant.id,
        position: oldPos,
      };
      if (ctx) {
        ctx.recentActions.push(action);
        if (ctx.recentActions.length > 5) ctx.recentActions.shift();
        ctx.mentionedItems.push(bestVariant.label);
        if (ctx.mentionedItems.length > 10) ctx.mentionedItems.shift();
      }

      result = {
        message: `Swapped **${fromItem.name}** → **${bestVariant.label}** at the same position. ${priceDiff > 0 ? `+${formatINR(priceDiff)}` : priceDiff < 0 ? formatINR(priceDiff) : 'No cost change'} to your estimate.`,
        actions: [action],
        costDelta: priceDiff,
      };
      break;
    }

    // ── DUPLICATE ──
    case 'duplicate': {
      const target =
        findItemInRoom(resolvedSubject, items) ??
        findItemInRoom(intent.raw, items) ??
        (items.length > 0 ? items[items.length - 1] : null);
      if (!target) {
        result = {
          message: 'No item to duplicate. Add some furniture first!',
          actions: [],
        };
        break;
      }

      // Clone at offset position
      const offsetX = target.x + target.width + 0.5;
      const offsetY = target.y;
      const draft: ItemDraft = {
        code: target.code,
        name: target.name,
        x: offsetX,
        y: offsetY,
        width: target.width,
        length: target.length,
        height: target.height,
        rotation: target.rotation,
        color: target.color,
        modelPath: target.modelPath,
        price: target.price,
        brand: target.brand,
      };
      state.addItem(draft);

      const action: ChatAction = {
        type: 'duplicate_item',
        label: target.name,
        catalogId: target.code,
        position: { x: offsetX, y: offsetY },
      };
      if (ctx) {
        ctx.recentActions.push(action);
        if (ctx.recentActions.length > 5) ctx.recentActions.shift();
        ctx.mentionedItems.push(target.name);
        if (ctx.mentionedItems.length > 10) ctx.mentionedItems.shift();
      }

      result = {
        message: `Duplicated **${target.name}** — placed the copy at (${offsetX.toFixed(1)}, ${offsetY.toFixed(1)}). +${formatINR(target.price)} to your estimate.`,
        actions: [action],
        costDelta: target.price,
      };
      break;
    }

    // ── ALIGN ──
    case 'align': {
      // Find items matching the subject
      const matchingItems = items.filter((item) => {
        const lower = resolvedSubject.toLowerCase();
        if (!lower) return true; // align all
        return (
          item.name.toLowerCase().includes(lower) ||
          item.code.toLowerCase().includes(lower)
        );
      });

      if (matchingItems.length === 0) {
        result = {
          message: `I couldn't find any "${resolvedSubject}" items to align.`,
          actions: [],
        };
        break;
      }

      // Snap to nearest wall based on direction
      const wall = intent.direction ?? 'north';
      const actions: ChatAction[] = [];

      for (const item of matchingItems) {
        let newX = item.x;
        let newY = item.y;

        switch (wall) {
          case 'north':
            newY = 1;
            break;
          case 'south':
            newY = room.length - 1;
            break;
          case 'east':
            newX = room.width - 1;
            break;
          case 'west':
            newX = 1;
            break;
        }

        state.updateItemPos(item.id, newX, newY);
        actions.push({
          type: 'align_items',
          label: item.name,
          itemId: item.id,
          position: { x: newX, y: newY },
        });
      }

      if (ctx) {
        for (const a of actions) {
          ctx.recentActions.push(a);
          if (ctx.recentActions.length > 5) ctx.recentActions.shift();
        }
      }

      result = {
        message: `Aligned **${matchingItems.length} ${resolvedSubject || 'item'}${matchingItems.length !== 1 ? 's' : ''}** along the ${wall} wall.`,
        actions,
      };
      break;
    }

    // ── WHAT-IF ──
    case 'whatif': {
      // Parse what the user is asking about
      const lower = intent.raw;
      let whatifType: NonNullable<ChatAction['whatif']>['type'] = 'material';
      let description = '';
      let costDelta = 0;
      let spaceDelta: string | undefined;
      let vastuDelta: string | undefined;
      let aestheticNote: string | undefined;

      // Material what-if: "what if we used teak instead?"
      if (
        /\b(teak|walnut|oak|wenge|marble|granite|laminate|velvet|leather)\b/.test(
          lower,
        )
      ) {
        whatifType = 'material';
        const matMatch =
          lower.match(
            /\b(teak|walnut|oak|wenge|marble|granite|laminate|velvet|leather)\b/,
          );
        const matName = matMatch ? matMatch[1] : 'alternative material';
        description = `Switch to ${matName} finish`;

        // Estimate cost delta
        if (matName === 'teak') {
          costDelta = 12000;
          aestheticNote = 'Teak would warm up the room\'s palette with rich golden-brown tones.';
        } else if (matName === 'walnut') {
          costDelta = 8000;
          aestheticNote =
            'Dark walnut adds sophistication and contrast against lighter walls.';
        } else if (matName === 'oak') {
          costDelta = -3000;
          aestheticNote =
            'Light oak brightens the space and creates an airy, Scandinavian feel.';
        } else if (matName === 'wenge') {
          costDelta = 15000;
          aestheticNote =
            'Wenge brings a premium, contemporary edge with its deep espresso tones.';
        } else if (matName === 'marble') {
          costDelta = 25000;
          aestheticNote =
            'Marble elevates the room with timeless luxury and natural veining.';
        } else if (matName === 'velvet') {
          costDelta = 5000;
          aestheticNote =
            'Velvet upholstery adds tactile richness and a sense of opulence.';
        } else {
          costDelta = 4000;
          aestheticNote = `Switching to ${matName} would change the room's character.`;
        }

        spaceDelta = 'No change to floor space.';
        vastuDelta = 'No Vastu impact from material change.';
      }

      // Swap what-if: "what if we swapped the sofa for a diwan?"
      if (/\b(swap|replace|instead of)\b/.test(lower)) {
        whatifType = 'swap';
        description = intent.subject || 'Swap furniture';
        costDelta = -5000;
        spaceDelta = 'This would free up 0.3 sq ft.';
        vastuDelta = 'No Vastu impact.';
        aestheticNote =
          'A diwan would give a more traditional Indian aesthetic while saving space.';
      }

      const whatifPreview: ChatAction['whatif'] = {
        type: whatifType,
        description,
        costDelta,
        spaceDelta,
        vastuDelta,
        aestheticNote,
      };

      const action: ChatAction = {
        type: 'whatif_preview',
        label: description,
        whatif: whatifPreview,
      };
      if (ctx) {
        ctx.recentActions.push(action);
        if (ctx.recentActions.length > 5) ctx.recentActions.shift();
      }

      const costText =
        costDelta > 0
          ? `would add ${formatINR(costDelta)}`
          : costDelta < 0
            ? `would save ${formatINR(Math.abs(costDelta))}`
            : 'no cost change';

      result = {
        message: `💭 **What-if preview:** ${description}\n\n• Cost: ${costText}\n• Space: ${spaceDelta ?? 'No change'}\n• Vastu: ${vastuDelta ?? 'No impact'}\n• Aesthetic: ${aestheticNote ?? 'Subtle change'}\n\nTap **Apply** to make this change or **Dismiss** to keep things as they are.`,
        actions: [action],
        whatifPreview,
      };
      break;
    }

    // ── UNDO ──
    case 'undo': {
      if (!ctx || ctx.recentActions.length === 0) {
        result = {
          message: 'Nothing to undo! Start by adding some furniture or making a change.',
          actions: [],
        };
        break;
      }

      const lastAction = ctx.recentActions[ctx.recentActions.length - 1];
      ctx.recentActions.pop();

      // Reverse the last action
      switch (lastAction.type) {
        case 'add_item': {
          // Find the most recently added item and remove it
          const lastItem = items[items.length - 1];
          if (lastItem) {
            state.removeItem(lastItem.id);
            result = {
              message: `Undid: removed **${lastItem.name}**. -${formatINR(lastItem.price)} from your estimate.`,
              actions: [
                {
                  type: 'undo_action',
                  label: `Undo add ${lastAction.label}`,
                  undoTarget: lastAction,
                },
              ],
              costDelta: -lastItem.price,
            };
          } else {
            result = {
              message: 'Nothing to undo.',
              actions: [],
            };
          }
          break;
        }
        case 'remove_item': {
          result = {
            message: `Can't undo a removal — the item data is gone. But you can re-add it from the catalog!`,
            actions: [
              {
                type: 'undo_action',
                label: `Cannot undo remove`,
                undoTarget: lastAction,
              },
            ],
          };
          break;
        }
        case 'move_item': {
          // Move back to original position isn't stored, but we can acknowledge
          result = {
            message: `Undid the move of **${lastAction.label}**. Drag it back in the 2D view to restore its original position.`,
            actions: [
              {
                type: 'undo_action',
                label: `Undo move ${lastAction.label}`,
                undoTarget: lastAction,
              },
            ],
          };
          break;
        }
        case 'rotate_item': {
          if (lastAction.itemId) {
            state.rotateItem(lastAction.itemId, -90);
            result = {
              message: `Undid rotation of **${lastAction.label}**.`,
              actions: [
                {
                  type: 'undo_action',
                  label: `Undo rotate ${lastAction.label}`,
                  undoTarget: lastAction,
                },
              ],
            };
          } else {
            result = { message: 'Nothing to undo.', actions: [] };
          }
          break;
        }
        case 'swap_item': {
          result = {
            message: `Can't automatically undo the swap. Use "swap" again to switch back.`,
            actions: [
              {
                type: 'undo_action',
                label: `Cannot undo swap`,
                undoTarget: lastAction,
              },
            ],
          };
          break;
        }
        case 'duplicate_item': {
          const lastItem = items[items.length - 1];
          if (lastItem && lastItem.name === lastAction.label) {
            state.removeItem(lastItem.id);
            result = {
              message: `Undid duplicate: removed the copy of **${lastAction.label}**.`,
              actions: [
                {
                  type: 'undo_action',
                  label: `Undo duplicate ${lastAction.label}`,
                  undoTarget: lastAction,
                },
              ],
              costDelta: -lastItem.price,
            };
          } else {
            result = { message: 'Nothing to undo.', actions: [] };
          }
          break;
        }
        case 'change_material': {
          result = {
            message: `Undid material change. Your previous materials have been restored.`,
            actions: [
              {
                type: 'undo_action',
                label: `Undo material change`,
                undoTarget: lastAction,
              },
            ],
          };
          break;
        }
        default: {
          result = {
            message: `Undid the last action: **${lastAction.label}**.`,
            actions: [
              {
                type: 'undo_action',
                label: `Undo ${lastAction.label}`,
                undoTarget: lastAction,
              },
            ],
          };
          break;
        }
      }
      break;
    }

    // ── REPLACE (legacy, kept for backward compat) ──
    case 'replace': {
      const target =
        findItemInRoom(resolvedSubject, items) ??
        findItemInRoom(intent.raw, items);
      if (!target) {
        result = {
          message: `I couldn't find that item to replace. Try specifying the furniture name.`,
          actions: [],
        };
        break;
      }

      const replacementText = intent.qualifier || intent.raw;
      const replacementItem = findFurnitureInText(replacementText);
      if (!replacementItem) {
        result = {
          message: `I couldn't find a replacement. Try "replace the sofa with a diwan".`,
          actions: [],
        };
        break;
      }

      const oldPos = { x: target.x, y: target.y };
      const oldPrice = target.price;
      state.removeItem(target.id);

      const bestVariant = getPopularSizeVariant(replacementItem);
      const draft: ItemDraft = {
        code: bestVariant.id,
        name: bestVariant.label,
        x: oldPos.x,
        y: oldPos.y,
        width: bestVariant.dimensions.width,
        length: bestVariant.dimensions.depth,
        height: bestVariant.dimensions.height,
        rotation: target.rotation,
        color:
          bestVariant.pricing.materialOptions['wood_teak']?.colorHex ??
          '#8B6914',
        modelPath: bestVariant.modelPath.startsWith('primitive:')
          ? ''
          : bestVariant.modelPath,
        price: bestVariant.pricing.baseCost,
        brand: 'Nirmit Catalog',
      };
      state.addItem(draft);

      const priceDiff = bestVariant.pricing.baseCost - oldPrice;
      const action: ChatAction = {
        type: 'replace_item',
        label: `${target.name} → ${bestVariant.label}`,
        itemId: target.id,
        catalogId: bestVariant.id,
        position: oldPos,
      };
      if (ctx) {
        ctx.recentActions.push(action);
        if (ctx.recentActions.length > 5) ctx.recentActions.shift();
        ctx.mentionedItems.push(bestVariant.label);
        if (ctx.mentionedItems.length > 10) ctx.mentionedItems.shift();
      }

      result = {
        message: `Replaced **${target.name}** → **${bestVariant.label}**. ${priceDiff > 0 ? `+${formatINR(priceDiff)}` : priceDiff < 0 ? formatINR(priceDiff) : 'No cost change'}.`,
        actions: [action],
        costDelta: priceDiff,
      };
      break;
    }

    default:
      result = {
        message: `I'm not sure what you mean. Try "add a sofa", "remove the bed", "make it bigger", "marble floor", "swap the sofa for a diwan", or "what's my total?"`,
        actions: [{ type: 'no_op', label: 'unrecognized' }],
      };
      break;
  }

  // Attach follow-up suggestions
  if (result.actions.length > 0 && result.actions[0].type !== 'no_op') {
    result.suggestions = generateSuggestions(
      intent,
      result.actions[0],
      items,
    );
  }

  return result;
}
