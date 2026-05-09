// ─────────────────────────────────────────────────────────────────────────────
// Layout Mixer — blendLayouts() and proactive suggestion engine
// Allows users in the planner chat to say "mix the Gathering and The Breath"
// or "blend #1 and #3" and get a hybrid layout. Also powers proactive
// chat suggestions based on user's current design state.
// ─────────────────────────────────────────────────────────────────────────────

import type { Item } from '../../store/useStore';

// ── Types ──

export interface LayoutSlot {
  item: Item;
  x: number;
  y: number;
  rotation: number;
  /** Internal marker used during layout blending to track interpolation ratio (0–1) */
  _blendWeight?: number;
}

export interface Layout {
  id: string;
  philosophy: 'gathering' | 'breath' | 'keeper';
  title: string;
  slots: LayoutSlot[];
  philosophyScore: number;
}

export interface BlendedLayout {
  parents: [string, string];
  blendRatio: number;
  blendStrategy: string;
  layout: Layout;
}

export interface ProactiveSuggestion {
  id: string;
  suggestionText: string;
  actionType: 'blend' | 'adjust' | 'nextRoom' | 'boq' | 'swapItem' | 'costTip';
  actionPayload?: Record<string, unknown>;
  priority: number;
}

// ── Blending ──

export function blendLayouts(
  layoutA: Layout,
  layoutB: Layout,
  blendRatio: number = 0.5,
): BlendedLayout {
  const ratio = Math.max(0, Math.min(1, blendRatio));

  const mapA = new Map<string, LayoutSlot>();
  for (const slot of layoutA.slots) {
    mapA.set(slot.item.id, slot);
  }
  const mapB = new Map<string, LayoutSlot>();
  for (const slot of layoutB.slots) {
    mapB.set(slot.item.id, slot);
  }

  const allKeys = new Set([...mapA.keys(), ...mapB.keys()]);
  const blendedSlots: LayoutSlot[] = [];

  for (const key of allKeys) {
    const slotA = mapA.get(key);
    const slotB = mapB.get(key);

    if (slotA && slotB) {
      blendedSlots.push({
        item: { ...slotA.item, ...slotB.item },
        x: lerp(slotA.x, slotB.x, ratio),
        y: lerp(slotA.y, slotB.y, ratio),
        rotation: lerpAngle(slotA.rotation, slotB.rotation, ratio),
      });
    } else if (slotA) {
      blendedSlots.push({ ...slotA });
      blendedSlots[blendedSlots.length - 1]._blendWeight = 1 - ratio;
    } else if (slotB) {
      blendedSlots.push({ ...slotB });
      blendedSlots[blendedSlots.length - 1]._blendWeight = ratio;
    }
  }

  const blendedScore = lerp(layoutA.philosophyScore, layoutB.philosophyScore, ratio);

  let dominant: 'gathering' | 'breath' | 'keeper';
  if (ratio < 0.33) dominant = layoutA.philosophy;
  else if (ratio > 0.66) dominant = layoutB.philosophy;
  else dominant = layoutA.philosophyScore >= layoutB.philosophyScore
    ? layoutA.philosophy : layoutB.philosophy;

  return {
    parents: [layoutA.id, layoutB.id],
    blendRatio: ratio,
    blendStrategy: describeBlendStrategy(layoutA, layoutB, ratio),
    layout: {
      id: `blend-${layoutA.id}-${layoutB.id}-${Math.round(ratio * 100)}`,
      philosophy: dominant,
      title: `The Blend (${layoutA.title} × ${layoutB.title})`,
      slots: blendedSlots,
      philosophyScore: blendedScore,
    },
  };
}

export function parseBlendIntent(
  message: string,
  availableLayouts: Layout[],
): { layoutA: Layout; layoutB: Layout; ratio: number } | null {
  const lower = message.toLowerCase();
  if (!/(blend|mix|combine)/.test(lower)) return null;

  let ratio = 0.5;
  const ratioMatch = lower.match(/(\d+)\s*[:/-]\s*(\d+)/);
  if (ratioMatch) {
    ratio = parseInt(ratioMatch[2], 10) / (parseInt(ratioMatch[1], 10) + parseInt(ratioMatch[2], 10));
  } else {
    const pct = lower.match(/(\d+)%/);
    if (pct) ratio = parseInt(pct[1], 10) / 100;
  }

  const findLayout = (q: string) => availableLayouts.find(
    l => l.philosophy === q || l.title.toLowerCase().includes(q) || l.id === q
  );

  const words = lower.replace(/(blend|mix|combine|with|and|the|layout|#)/g, ' ')
    .replace(/\d+[:/-]\d+|\d+%/g, '').split(/\s+/).filter(w => w.length > 1);

  const a = findLayout(words[0] ?? '');
  const b = findLayout(words[1] ?? '') ?? findLayout(words[2] ?? '') ?? findLayout(words[3] ?? '');

  if (a && b && a.id !== b.id) return { layoutA: a, layoutB: b, ratio };
  if (availableLayouts.length >= 2 && !b) {
    return { layoutA: availableLayouts[0], layoutB: availableLayouts[1], ratio: 0.5 };
  }
  return null;
}

// ── Proactive Suggestions ──

export function generateProactiveSuggestions(
  currentLayout: Layout | null,
  availableLayouts: Layout[],
  hasViewedBOQ: boolean,
  hasMultipleRooms: boolean,
): ProactiveSuggestion[] {
  const suggestions: ProactiveSuggestion[] = [];

  if (availableLayouts.length >= 2 && !hasViewedBOQ) {
    suggestions.push({
      id: 'suggest-blend',
      suggestionText: `I notice you have "${availableLayouts[0].title}" and "${availableLayouts[1].title}" — would you like me to blend them into a hybrid? For example, take the openness of ${availableLayouts[1].title} but keep the seating from ${availableLayouts[0].title}.`,
      actionType: 'blend',
      actionPayload: { layoutAId: availableLayouts[0].id, layoutBId: availableLayouts[1].id, ratio: 0.5 },
      priority: 0.9,
    });
  }

  if (currentLayout && !hasViewedBOQ) {
    suggestions.push({
      id: 'suggest-boq',
      suggestionText: "Would you like me to generate a Bill of Quantities for this layout? I'll break down the cost room by room and show you where you can save.",
      actionType: 'boq',
      priority: 0.8,
    });
  }

  if (hasViewedBOQ && currentLayout) {
    suggestions.push({
      id: 'suggest-cost-tip',
      suggestionText: 'Quick tip: Replacing the solid wood TV unit with engineered wood + laminate could save you ~30% without changing the look. Want me to swap it?',
      actionType: 'costTip',
      priority: 0.6,
    });
  }

  if (!hasMultipleRooms && currentLayout) {
    suggestions.push({
      id: 'suggest-next-room',
      suggestionText: "Once you're happy with this room, would you like to design your kitchen or bedroom next? I can carry over the style palette.",
      actionType: 'nextRoom',
      priority: 0.5,
    });
  }

  if (currentLayout && currentLayout.slots.length > 8) {
    suggestions.push({
      id: 'suggest-swap',
      suggestionText: 'Your room is quite full — would you like me to suggest 2–3 pieces we could swap for smaller versions to give you more walking space?',
      actionType: 'swapItem',
      priority: 0.4,
    });
  }

  return suggestions.sort((a, b) => b.priority - a.priority);
}

// ── Helpers ──

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return a + diff * t;
}

function describeBlendStrategy(la: Layout, lb: Layout, ratio: number): string {
  if (ratio <= 0.2) return `Almost entirely "${la.title}" — subtle hints of "${lb.title}" in positioning.`;
  if (ratio >= 0.8) return `Almost entirely "${lb.title}" — lightly influenced by "${la.title}" arrangement.`;
  if (ratio >= 0.45 && ratio <= 0.55) return `A balanced 50/50 mix: furniture from both "${la.title}" and "${lb.title}" combined with interpolated positions.`;
  if (ratio < 0.5) return `Primarily "${la.title}" with ${Math.round((1 - ratio) * 100)}% weight, borrowing from "${lb.title}".`;
  return `Primarily "${lb.title}" with ${Math.round(ratio * 100)}% weight, borrowing from "${la.title}".`;
}