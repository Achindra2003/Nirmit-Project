import type { Vibe } from "@/api/types";

/**
 * Feeling phrases for each vibe — kept in sync with IntakeRoute's VIBES list.
 *
 * We deliberately do NOT expose the proper-noun vibe name ("The Gathering")
 * here because it collides with the backend vision names (philosophy slugs
 * like `gathering` / `breath` / `keeper` produce the same titles). Surfacing
 * the vibe name in copy alongside the vision name reads as duplicated signal.
 * Use the lower-case `feeling` phrase inline instead ("…built for something
 * warm and lived-in.").
 */
const VIBE_FEELING: Record<Vibe, string> = {
  warm_traditional: "warm and lived-in",
  light_airy:       "open and restrained",
  earthy_crafted:   "storage-first, with heritage tones",
  modern_minimal:   "quiet and considered",
  maximalist:       "loud, layered, alive",
  coastal:          "breezy and sea-lit",
};

export function vibeFeeling(v: Vibe | undefined | null): string {
  return v ? VIBE_FEELING[v] : "the way you want it";
}
