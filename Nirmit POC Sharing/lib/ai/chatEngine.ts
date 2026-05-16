/**
 * Nirmit AI Designer — Chat Engine
 * 
 * Interprets user natural language requests and translates them
 * into concrete store mutations (add, remove, replace, move furniture,
 * change materials, etc.)
 */

import { useStore, type Item, type ItemDraft } from '../../store/useStore';
import { FurnitureFactory } from '../../catalog/FurnitureFactory';
import type { CatalogItem } from '../../catalog/types';
import { formatINR } from '../costing';

// ─────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────

export interface ChatAction {
  type: 'add_item' | 'remove_item' | 'replace_item' | 'move_item' | 'rotate_item' | 'change_material' | 'info' | 'no_op';
  label: string;
  itemId?: string;
  catalogId?: string;
  position?: { x: number; y: number };
  rotation?: number;
  materialPatch?: Partial<{ wallColor: string; flooring: string; woodFinish: string }>;
}

export interface ChatResult {
  message: string;
  actions: ChatAction[];
  costDelta?: number;
}

// ─────────────────────────────────────────────────
// Intent Recognition
// ─────────────────────────────────────────────────

interface ParsedIntent {
  verb: 'add' | 'remove' | 'replace' | 'move' | 'rotate' | 'bigger' | 'smaller' | 'material' | 'info' | 'clear' | 'swap';
  subject: string;
  qualifier: string;
  direction?: string;
  raw: string;
}

function parseUserMessage(text: string): ParsedIntent {
  const lower = text.toLowerCase().trim();

  // Remove/delete
  if (/\b(remove|delete|take away|get rid of|clear out)\b/.test(lower)) {
    const subject = extractSubject(lower, ['remove', 'delete', 'take away', 'get rid of', 'clear out']);
    if (lower.includes('all') || lower.includes('everything')) {
      return { verb: 'clear', subject: 'all', qualifier: '', raw: lower };
    }
    return { verb: 'remove', subject, qualifier: '', raw: lower };
  }

  // Replace/swap/change furniture
  if (/\b(replace|swap|change|switch)\b/.test(lower) && !/\b(color|colour|wall|floor|material|paint)\b/.test(lower)) {
    const subject = extractSubject(lower, ['replace', 'swap', 'change', 'switch']);
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
  if (/\b(wall|color|colour|floor|wood|paint|marble|tile|laminate|walnut|oak|teak|dark|light)\b/.test(lower)) {
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
        const found = items.find(item => 
          aliases.some(a => item.name.toLowerCase().includes(a) || item.code.toLowerCase().includes(a))
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

function getPositionForDirection(direction: string | undefined, room: { width: number; length: number }): { x: number; y: number } {
  switch (direction) {
    case 'north': return { x: room.width / 2, y: 1 };
    case 'south': return { x: room.width / 2, y: room.length - 1 };
    case 'east': return { x: room.width - 1, y: room.length / 2 };
    case 'west': return { x: 1, y: room.length / 2 };
    case 'center': return { x: room.width / 2, y: room.length / 2 };
    case 'window': return { x: room.width - 1.5, y: room.length / 2 };
    case 'door': return { x: room.width / 2, y: room.length - 1.5 };
    case 'corner': return { x: 1, y: 1 };
    default: return { x: room.width / 2, y: room.length / 2 };
  }
}

function getSizeVariant(catalogItem: CatalogItem, direction: 'bigger' | 'smaller'): CatalogItem | null {
  const category = FurnitureFactory.getByCategory(catalogItem.category);
  const sorted = [...category].sort((a, b) => {
    const areaA = a.dimensions.width * a.dimensions.depth;
    const areaB = b.dimensions.width * b.dimensions.depth;
    return areaA - areaB;
  });

  const currentIndex = sorted.findIndex(item => item.id === catalogItem.id);
  if (currentIndex < 0) return null;

  if (direction === 'bigger') {
    return currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : null;
  } else {
    return currentIndex > 0 ? sorted[currentIndex - 1] : null;
  }
}

// ─────────────────────────────────────────────────
// Main Chat Processing
// ─────────────────────────────────────────────────

export function processUserMessage(text: string): ChatResult {
  const state = useStore.getState();
  const { items, room, materials } = state;
  const intent = parseUserMessage(text);

  switch (intent.verb) {
    case 'add': {
      const catalogItem = findFurnitureInText(intent.subject) ?? findFurnitureInText(intent.raw);
      if (!catalogItem) {
        return {
          message: `I couldn't find "${intent.subject}" in our catalog. Try asking for a sofa, desk, bookshelf, TV unit, mandir, wardrobe, or bed.`,
          actions: [],
        };
      }

      const pos = getPositionForDirection(intent.direction, room);
      const draft: ItemDraft = {
        code: catalogItem.id,
        name: catalogItem.label,
        x: pos.x,
        y: pos.y,
        width: catalogItem.dimensions.width,
        length: catalogItem.dimensions.depth,
        height: catalogItem.dimensions.height,
        rotation: 0,
        color: catalogItem.pricing.materialOptions['wood_teak']?.colorHex ?? '#8B6914',
        modelPath: catalogItem.modelPath.startsWith('primitive:') ? '' : catalogItem.modelPath,
        price: catalogItem.pricing.baseCost,
        brand: 'Nirmit Catalog',
      };

      state.addItem(draft);

      const dirText = intent.direction ? ` near the ${intent.direction} wall` : '';
      return {
        message: `Added **${catalogItem.label}** (${catalogItem.dimensions.width.toFixed(1)}m × ${catalogItem.dimensions.depth.toFixed(1)}m)${dirText}. Price: ${formatINR(catalogItem.pricing.baseCost)}.`,
        actions: [{ type: 'add_item', label: catalogItem.label, catalogId: catalogItem.id, position: pos }],
        costDelta: catalogItem.pricing.baseCost,
      };
    }

    case 'remove': {
      const target = findItemInRoom(intent.subject, items) ?? findItemInRoom(intent.raw, items);
      if (!target) {
        return {
          message: `I couldn't find that item in your room. Currently placed: ${items.map(i => i.name).join(', ') || 'nothing yet'}.`,
          actions: [],
        };
      }

      state.removeItem(target.id);
      return {
        message: `Removed **${target.name}**. Your estimate just dropped by ~${formatINR(target.price)}.`,
        actions: [{ type: 'remove_item', label: target.name, itemId: target.id }],
        costDelta: -target.price,
      };
    }

    case 'clear': {
      const count = items.length;
      state.clearItems();
      return {
        message: `Cleared all ${count} items from the room. Fresh start!`,
        actions: [{ type: 'remove_item', label: 'all items' }],
      };
    }

    case 'bigger':
    case 'smaller': {
      const target = findItemInRoom(intent.subject, items) ?? findItemInRoom(intent.raw, items) ?? items[items.length - 1];
      if (!target) {
        return { message: 'No items to resize. Add some furniture first!', actions: [] };
      }

      const currentCatalog = FurnitureFactory.getItem(target.code) ?? FurnitureFactory.mapLegacyCode(target.code);
      if (!currentCatalog) {
        return { message: `Can't find size variants for ${target.name}.`, actions: [] };
      }

      const variant = getSizeVariant(currentCatalog, intent.verb);
      if (!variant) {
        return {
          message: `${target.name} is already the ${intent.verb === 'bigger' ? 'largest' : 'smallest'} option in this category.`,
          actions: [],
        };
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
      return {
        message: `Replaced **${currentCatalog.label}** → **${variant.label}** (${variant.dimensions.width.toFixed(1)}m × ${variant.dimensions.depth.toFixed(1)}m). ${priceDiff > 0 ? `+${formatINR(priceDiff)}` : formatINR(priceDiff)} to your estimate.`,
        actions: [{ type: 'replace_item', label: variant.label, itemId: target.id, catalogId: variant.id }],
        costDelta: priceDiff,
      };
    }

    case 'move': {
      const target = findItemInRoom(intent.subject, items) ?? findItemInRoom(intent.raw, items);
      if (!target) {
        return { message: `I couldn't find that item to move. Try specifying the furniture name.`, actions: [] };
      }

      const newPos = getPositionForDirection(intent.direction, room);
      state.updateItemPos(target.id, newPos.x, newPos.y);

      const dirLabel = intent.direction ?? 'center';
      return {
        message: `Moved **${target.name}** toward the ${dirLabel}. Drag it in the 2D view for precise placement.`,
        actions: [{ type: 'move_item', label: target.name, itemId: target.id, position: newPos }],
      };
    }

    case 'rotate': {
      const target = findItemInRoom(intent.subject, items) ?? findItemInRoom(intent.raw, items) ?? (items.length > 0 ? items[items.length - 1] : null);
      if (!target) {
        return { message: 'No item to rotate. Select one first.', actions: [] };
      }

      state.rotateItem(target.id, 90);
      return {
        message: `Rotated **${target.name}** by 90°.`,
        actions: [{ type: 'rotate_item', label: target.name, itemId: target.id, rotation: 90 }],
      };
    }

    case 'material': {
      const patch: Partial<{ wallColor: string; flooring: string; woodFinish: string }> = {};
      const messages: string[] = [];

      // Wall color
      if (/\b(white|cream)\b/.test(intent.raw)) { patch.wallColor = '#ECE6DB'; messages.push('Walls → warm white'); }
      else if (/\bgreen\b/.test(intent.raw)) { patch.wallColor = '#C8D4BF'; messages.push('Walls → sage green'); }
      else if (/\bblue\b/.test(intent.raw)) { patch.wallColor = '#C9D6DF'; messages.push('Walls → dusty blue'); }
      else if (/\b(grey|gray)\b/.test(intent.raw)) { patch.wallColor = '#D4D0CB'; messages.push('Walls → warm grey'); }
      else if (/\b(beige|sand)\b/.test(intent.raw)) { patch.wallColor = '#E8DCC8'; messages.push('Walls → sand beige'); }
      else if (/\b(peach|terracotta)\b/.test(intent.raw)) { patch.wallColor = '#E8D0BD'; messages.push('Walls → soft terracotta'); }

      // Flooring
      if (/\bmarble\b/.test(intent.raw)) { patch.flooring = 'marble'; messages.push('Floor → marble'); }
      else if (/\b(tile|vitrified)\b/.test(intent.raw)) { patch.flooring = 'vitrified-tiles'; messages.push('Floor → vitrified tiles'); }
      else if (/\b(wood|laminate|hardwood)\b/.test(intent.raw)) { patch.flooring = 'wood-laminate'; messages.push('Floor → wood laminate'); }

      // Wood finish
      if (/\b(walnut|dark)\b/.test(intent.raw)) { patch.woodFinish = 'Dark Walnut'; messages.push('Wood → dark walnut'); }
      else if (/\b(oak|light)\b/.test(intent.raw)) { patch.woodFinish = 'Light Oak'; messages.push('Wood → light oak'); }
      else if (/\bteak\b/.test(intent.raw)) { patch.woodFinish = 'Teak Grain'; messages.push('Wood → teak'); }
      else if (/\b(wenge|ebony)\b/.test(intent.raw)) { patch.woodFinish = 'Wenge'; messages.push('Wood → wenge'); }

      if (messages.length > 0) {
        state.setMaterialConfig(patch as any);
        return {
          message: `Updated materials: ${messages.join(', ')}. Switch to 3D view to see the change.`,
          actions: [{ type: 'change_material', label: messages.join(', '), materialPatch: patch }],
        };
      }

      return {
        message: `Try: "white walls", "marble floor", "dark walnut wood", "grey walls", "teak finish"`,
        actions: [],
      };
    }

    case 'info': {
      const totalCost = items.reduce((sum, item) => sum + item.price, 0);
      const itemList = items.map(i => `• ${i.name} (${formatINR(i.price)})`).join('\n');

      if (/\b(cost|price|total|budget|estimate)\b/.test(intent.raw)) {
        return {
          message: `**Current room: ${items.length} items**\n${itemList}\n\n**Total furniture:** ${formatINR(totalCost)}\nRoom: ${room.width}ft × ${room.length}ft\nFloor: ${materials.flooring}\nWood: ${materials.woodFinish}`,
          actions: [{ type: 'info', label: 'Cost summary' }],
        };
      }

      return {
        message: `I can help you:\n• **Add** furniture: "add a bookshelf near the window"\n• **Remove** items: "remove the coffee table"\n• **Resize**: "make the sofa bigger"\n• **Move**: "move the desk to the east wall"\n• **Materials**: "dark walnut wood", "marble floor"\n• **Cost**: "what's my total?"`,
        actions: [{ type: 'info', label: 'Help' }],
      };
    }

    default:
      return {
        message: `I'm not sure what you mean. Try "add a sofa", "remove the bed", "make it bigger", "marble floor", or "what's my total?"`,
        actions: [{ type: 'no_op', label: 'unrecognized' }],
      };
  }
}
