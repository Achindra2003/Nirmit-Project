/**
 * Unit conversion lives at the rendering boundary, NOT in business code.
 * Backend always speaks millimeters. Three.js convention is meters.
 *
 * Use `mmToM(...)` only when feeding values into a Three.js mesh / position.
 * Do not store meter values in any state — that creates two sources of truth.
 */
export const mmToM = (mm: number): number => mm / 1000;
