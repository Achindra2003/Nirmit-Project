/**
 * Planner intelligence — a small rule layer that intercepts room mutations
 * (add / remove / replace / proposal apply) and asks the user to confirm
 * when a change crosses a line that almost certainly wasn't intended.
 *
 * Why this exists: in the planner the user can add and remove pieces from
 * the catalogue, and the AI collaborator can propose layouts. Neither
 * channel currently stops them from doing silly things — adding three
 * sofas to a 9 m² room, or removing the only bed from a bedroom. The
 * design says the AI should be "an opinionated collaborator, not a
 * genie" (see VISION.md / CLAUDE.md "The Opinionated AI"), so the right
 * move is to surface a confirm step rather than silently apply.
 *
 * Decision (2026-05-27): enforce as a CONFIRM GATE, not a hard block.
 * The user can always say "yes, do it anyway" — we just want to make
 * sure they meant it. Three rule families:
 *
 *   1. Essential coverage: each room_type has at least one piece you'd
 *      expect to see (a bedroom needs a bed; a dining room needs a
 *      dining table). If a change removes the last instance, confirm.
 *
 *   2. Max count: silly piles. Two sofas in a small living room? One
 *      mandir is the most a room needs. Three desks in a study? Confirm.
 *      The caps are loose — there are legitimate cases (an L-sofa plus
 *      a sectional, a primary + secondary bed for kids' rooms) — so
 *      hitting the cap is a question, not a forbidden state.
 *
 *   3. Floor utilization: rough item-footprint sum over room floor area.
 *      Above 65% the room reads as cramped. We still let it through,
 *      but we ask.
 *
 * Returns null when the change is fine. Returns a single concern (the
 * most user-visible one) when something looks off, so the UI shows one
 * focused confirm dialog rather than stacking warnings.
 */
import type { PlacedItem, RoomState, RoomType } from "@/api/types";

export interface GuardConcern {
  /** Stable rule id — useful for logging / future a/b tweaks. */
  rule: "missing_essential" | "too_many" | "room_cramped";
  /** Short headline shown as the modal title (italic Playfair). */
  title: string;
  /** Single-paragraph explanation in plain language. */
  body: string;
  /** What the "go ahead" button says — phrased to match the action. */
  confirmLabel: string;
  /** What the "back out" button says — tuned per rule. */
  cancelLabel: string;
}

/**
 * Pull the sub-category prefix off a placed-item id.
 *
 * The backend produces three shapes for `PlacedItem.id`:
 *   - `{sub_category}-{uuid_hex_6}` from `resolver.py` and
 *     `intent/executor.py` (the common case — preset rooms,
 *     duplicate intent, add-via-AI)
 *   - `{sub_category}-{idx}`        from `selector.py` (catalog
 *     selector, single-count requests)
 *   - `{sub_category}-{idx}-{i}`    from `selector.py` (catalog
 *     selector, count>1 requests)
 *
 * In all three the sub-category is everything BEFORE the first dash.
 * Sub-categories themselves never contain a dash (they're underscored
 * compound nouns like `tv_unit`, `bed_king`, `dining_table`). So we
 * just take `split('-')[0]`.
 *
 * Previous bug (2026-05-27, fixed in this version): the parser checked
 * for a numeric suffix and bailed when it saw a hex uuid, so the
 * essential-coverage rule never matched anything in real rooms.
 */
function subCategoryOf(item: PlacedItem): string {
  return item.id.split("-")[0];
}

/** What each room type cannot reasonably exist without. Each entry is a
 * list of acceptable sub-category prefixes — any one of them satisfies
 * the rule. So a bedroom is "OK" if it has bed_king OR bed_queen OR
 * bed; we don't require all three.
 *
 * Pooja, bathroom, and kitchen are deliberately left out:
 *   - pooja rooms can be as small as a niche, and the catalogue may not
 *     include a `mandir` SKU in compact mode
 *   - bathroom and kitchen catalogues aren't wired into the v1 flow,
 *     so gating them would just be false positives. */
const ESSENTIAL_BY_ROOM: Partial<Record<RoomType, string[][]>> = {
  living:  [["sofa", "sofa_l", "diwan"]],            // somewhere to sit
  bedroom: [["bed_king", "bed_queen", "bed"]],       // the bed
  dining:  [["dining_table"]],                       // the table
  study:   [["desk"]],                               // the desk
  kids:    [["bed_king", "bed_queen", "bed"]],       // kid's bed
};

/** Soft caps on how many of each sub-category should reasonably appear
 * in one room. These are upper bounds, not targets — most rooms sit
 * well below. The numbers are tuned to flag "this is probably an
 * accident" cases, not "this is unusual but might be on purpose". */
const MAX_COUNT: Record<string, number> = {
  sofa:          2,   // L-sofa + a single sofa is the rare legitimate case
  sofa_l:        1,
  diwan:         2,
  tv_unit:       1,
  bed_king:      1,
  bed_queen:     1,
  bed:           2,   // shared kids' room can legit have two single beds
  dining_table:  1,
  desk:          2,   // partner desk = two desks
  mandir:        1,
  wardrobe:      3,
  bookshelf:     4,
  cabinet:       4,
  chest:         3,
  sideboard:     2,
  coffee_table:  2,
  side_table:    4,
  rug:           2,
  lamp:          4,
  accent_chair:  6,
  lounge_chair:  4,
  dining_chair:  10,  // around a generous dining table
};

const UTILIZATION_CONFIRM_THRESHOLD = 0.65;

/** Best human-readable name for a sub-category — falls back to the slug
 * (underscores → spaces) if we don't have a friendly word. Used in the
 * confirm copy ("Remove the only sofa?"). */
const FRIENDLY_NAME: Record<string, string> = {
  sofa: "sofa",
  sofa_l: "L-sofa",
  diwan: "diwan",
  tv_unit: "TV unit",
  bed_king: "bed",
  bed_queen: "bed",
  bed: "bed",
  dining_table: "dining table",
  desk: "desk",
  mandir: "mandir",
  wardrobe: "wardrobe",
  bookshelf: "bookshelf",
  cabinet: "cabinet",
  coffee_table: "coffee table",
  rug: "rug",
  lamp: "lamp",
  accent_chair: "accent chair",
  lounge_chair: "lounge chair",
  dining_chair: "dining chair",
  side_table: "side table",
};

function friendly(prefix: string): string {
  return FRIENDLY_NAME[prefix] ?? prefix.replace(/_/g, " ");
}

function countBy(items: PlacedItem[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = subCategoryOf(it);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

/** Footprint area in m² for one item — uses the item's own dimensions
 * (width × depth, in mm). Floor placement only; wall/ceiling items
 * (TVs, pendant lights) don't consume floor area. */
function footprintArea(item: PlacedItem): number {
  if (item.catalog.placement_type !== "floor") return 0;
  return (item.dimensions.width_mm * item.dimensions.depth_mm) / 1_000_000;
}

function roomFloorArea(room: RoomState): number {
  const { width_mm, depth_mm } = room.intake.room_dimensions;
  return (width_mm * depth_mm) / 1_000_000;
}

/** Format a count word: 1 → "one", 2 → "two", 3 → "three"; numbers
 * higher than that fall back to the digit. Keeps the confirm copy
 * conversational ("three sofas") without a `pluralize` dep. */
function asWord(n: number): string {
  return n === 1 ? "one" : n === 2 ? "two" : n === 3 ? "three" : n === 4 ? "four" : n === 5 ? "five" : String(n);
}

/**
 * Main entry. Returns a single concern, or null if the change is fine.
 *
 * Priority when multiple rules would fire: missing-essential first
 * (could break the room's purpose), then absurd counts (visually
 * obvious), then cramping (a judgment call). The modal can only show
 * one concern, so we hand back the most important one.
 */
export function checkRoomChange(
  before: RoomState,
  after: RoomState,
): GuardConcern | null {
  const beforeCounts = countBy(before.items);
  const afterCounts  = countBy(after.items);

  // ── 1. Essential coverage ────────────────────────────────────────
  const essentialGroups = ESSENTIAL_BY_ROOM[after.intake.room_type] ?? [];
  for (const group of essentialGroups) {
    const beforeTotal = group.reduce((s, prefix) => s + (beforeCounts.get(prefix) ?? 0), 0);
    const afterTotal  = group.reduce((s, prefix) => s + (afterCounts.get(prefix) ?? 0), 0);
    // Concern only fires when THIS change is what drops us to zero.
    // If the room was already missing an essential (e.g. an unusual
    // backend layout), don't pester the user about an unrelated edit.
    if (beforeTotal > 0 && afterTotal === 0) {
      const noun = friendly(group[0]);
      const roomLabel = after.intake.room_type;
      return {
        rule: "missing_essential",
        title: `Remove the only ${noun}?`,
        body: `A ${roomLabel} without a ${noun} is unusual — it would leave the room without its core piece. Are you sure?`,
        confirmLabel: `Yes, remove the ${noun}`,
        cancelLabel: "Keep it",
      };
    }
  }

  // ── 2. Max count ─────────────────────────────────────────────────
  for (const [prefix, after_n] of afterCounts) {
    const before_n = beforeCounts.get(prefix) ?? 0;
    const max = MAX_COUNT[prefix];
    if (max === undefined) continue;
    // Fire only when this edit *crossed* the threshold. If the room
    // already had too many and the user is editing something else,
    // we shouldn't yell.
    if (after_n > max && before_n <= max) {
      const noun = friendly(prefix);
      return {
        rule: "too_many",
        title: `${asWord(after_n)} ${noun}s in one room?`,
        body: `Most rooms work with at most ${asWord(max)} ${noun}${max === 1 ? "" : "s"}. Adding another will get crowded, but if that's what you want — go ahead.`,
        confirmLabel: "Add it anyway",
        cancelLabel: "Cancel",
      };
    }
  }

  // ── 3. Floor utilization (the room is getting cramped) ──────────
  const floorArea = roomFloorArea(after);
  if (floorArea > 0) {
    const beforeFootprint = before.items.reduce((s, it) => s + footprintArea(it), 0);
    const afterFootprint  = after.items.reduce((s, it) => s + footprintArea(it), 0);
    const beforeRatio = beforeFootprint / floorArea;
    const afterRatio  = afterFootprint / floorArea;
    if (afterRatio > UTILIZATION_CONFIRM_THRESHOLD && beforeRatio <= UTILIZATION_CONFIRM_THRESHOLD) {
      const pct = Math.round(afterRatio * 100);
      return {
        rule: "room_cramped",
        title: "The room's getting cramped.",
        body: `Furniture would cover about ${pct}% of the floor — leaving very little walking space. A typical room reads as comfortable below 60%. Add it anyway?`,
        confirmLabel: "Add it anyway",
        cancelLabel: "Cancel",
      };
    }
  }

  return null;
}
