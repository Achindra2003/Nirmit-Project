/** Shared stroke + label timings — pen-on-paper feel across SVG scenes.
 *
 * All durations / delays are multiplied by `TEMPO` before reaching the DOM,
 * so a single dial controls the overall pacing without touching individual
 * call sites. The original design ran ~5.25 s end-to-end which felt slow on
 * the landing hero — TEMPO=0.6 brings the same choreography in around 3.2 s,
 * close to the "by the time you've read the headline, the drawing is done"
 * sweet spot. Lower TEMPO → snappier; raise it for a more contemplative feel.
 */

const TEMPO = 0.6;

// `cubic-bezier(0.45, 0.05, 0.15, 0.95)` lands the stroke more crisply than
// the older (0.38, 0.02, 0.2, 1) curve. The end-point is at ~95% instead of
// 100%, so the line "settles" instead of locking — closer to how a real pen
// decelerates as the wrist eases up.
const PEN_EASE = "cubic-bezier(0.45, 0.05, 0.15, 0.95)";

const _s = (sec: number) => (sec * TEMPO).toFixed(3);

/** Animate a stroked path as if drawn by hand. */
export function penPath(length: number, delaySec: number, durationSec = 1.15) {
  return {
    strokeDasharray: length,
    strokeDashoffset: length,
    strokeLinecap: "square" as const,
    strokeLinejoin: "miter" as const,
    animation: `penDraw ${_s(durationSec)}s ${PEN_EASE} ${_s(delaySec)}s forwards`,
  };
}

/** Leader lines / dimension ticks that follow a main stroke. */
export function penPathQuick(length: number, delaySec: number, durationSec = 0.35) {
  return penPath(length, delaySec, durationSec);
}

/** Annotation labels — appear after the line work with a slight drift in. */
export function penLabel(delaySec: number, durationSec = 0.5) {
  return {
    opacity: 0,
    animation: `penLabel ${_s(durationSec)}s ease-out ${_s(delaySec)}s forwards`,
  };
}

/** Soft fills (hatching) settle after outlines are drawn. */
export function penFill(delaySec: number, durationSec = 0.45) {
  return {
    opacity: 0,
    animation: `penFill ${_s(durationSec)}s ease-out ${_s(delaySec)}s forwards`,
  };
}

/** Total time, in real seconds, between the call to penPath(_, delay, dur)
 * and the moment the stroke is fully drawn. Useful for downstream timing
 * (e.g. "show the Redraw button N ms after the animation finishes"). */
export function penEndTime(delaySec: number, durationSec: number): number {
  return (delaySec + durationSec) * TEMPO;
}

export const PEN_TEMPO = TEMPO;
