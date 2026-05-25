/** Client-side safety net — reasoning must read like a designer, not a CAD export. */

const MM = /\b\d[\d,]*\s*mm\b/gi;
const CM = /\b\d[\d,]*\s*cm\b/gi;
const COORD = /\b[xyz]\s*[=:]\s*[\d.,]+\s*(?:mm)?\b/gi;
const HEX = /#[0-9A-Fa-f]{3,8}\b/g;
const SLUG = /\b(?:light_airy|warm_traditional|earthy_crafted|modern_minimal|maximalist|coastal)\b/gi;

const REPLACEMENTS: Array<[RegExp, string]> = [
  [/\b\d{3,5}mm\s+wide\b/gi, "wide enough for everyone"],
  [/\banchored to\b/gi, "set along"],
  [/\bposition(?:ed)? at\b/gi, "placed"],
];

export function humanizeReasoningLine(text: string): string {
  if (!text?.trim()) return text;
  let out = text.trim();
  for (const [pat, repl] of REPLACEMENTS) out = out.replace(pat, repl);
  out = out
    .replace(MM, "")
    .replace(CM, "")
    .replace(COORD, "")
    .replace(HEX, "")
    .replace(SLUG, (m) => m.replace(/_/g, " "))
    .replace(/\b[xyz]\s*=\s*(?:[xyz]\s*=\s*)?/gi, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.])/g, "$1")
    .replace(/^\s*[,.\-–—]\s*/, "")
    .trim();
  return out || text.trim();
}

export function humanizeReasoningCopy(copy: {
  headline: string;
  bullets: string[];
  vastu_notes: string[];
}): { headline: string; bullets: string[]; vastu_notes: string[] } {
  return {
    headline: humanizeReasoningLine(copy.headline),
    bullets: copy.bullets.map(humanizeReasoningLine).filter(Boolean),
    vastu_notes: copy.vastu_notes.map(humanizeReasoningLine).filter(Boolean),
  };
}
