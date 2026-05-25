/** Shared stroke + label timings — pen-on-paper feel across SVG scenes. */

const PEN_EASE = "cubic-bezier(0.38, 0.02, 0.2, 1)";

/** Animate a stroked path as if drawn by hand. */
export function penPath(length: number, delaySec: number, durationSec = 1.15) {
  return {
    strokeDasharray: length,
    strokeDashoffset: length,
    strokeLinecap: "square" as const,
    strokeLinejoin: "miter" as const,
    animation: `penDraw ${durationSec}s ${PEN_EASE} ${delaySec}s forwards`,
  };
}

/** Leader lines / dimension ticks that follow a main stroke. */
export function penPathQuick(length: number, delaySec: number, durationSec = 0.35) {
  return penPath(length, delaySec, durationSec);
}

/** Annotation labels — appear after the line work, slight drift in. */
export function penLabel(delaySec: number, durationSec = 0.5) {
  return {
    opacity: 0,
    animation: `penLabel ${durationSec}s ease-out ${delaySec}s forwards`,
  };
}

/** Soft fills (hatching) settle after outlines are drawn. */
export function penFill(delaySec: number, durationSec = 0.45) {
  return {
    opacity: 0,
    animation: `penFill ${durationSec}s ease-out ${delaySec}s forwards`,
  };
}
