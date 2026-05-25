/**
 * Warm, layered lighting that simulates an Indian afternoon through an
 * east/west-facing window — the quality of light VISION.md asks for.
 *
 * Three layers:
 *  - Sun: a strong directional light coming through the window wall.
 *  - Sky fill: a soft hemispheric light filling shadowed areas.
 *  - Bounce: a low-intensity warm point light from the floor reflecting up.
 *
 * Intensity / colour are tuned per entrance direction so a north-entrance
 * room (south light) feels different from a south-entrance room (north light).
 */
import { useMemo } from "react";
import type { Direction } from "@/api/types";
import { mmToM } from "./units";

interface Props {
  roomWmm: number;
  roomDmm: number;
  roomHmm: number;
  entrance: Direction;
  warmthK?: number; // 2700 (warm) - 4000 (cool)
}

// Sun ("hero" key light) is the only strong directional. Everything else fills.
// Old setup stacked hemisphere + sun + bounce + fill + ambient at near-equal
// strength → walls and items had no shadow direction, every surface looked
// equally lit. That's the "CAD diagram" look. Cut every fill ~40%, let the
// sun cast real shadows, and put a warm sky panel outside the window so the
// scene reads as "lit by daylight pouring in", not "lit by light bulbs".

// Sun intensity scales with warmth (2400K candle → ~1.8, 4000K daylight → ~3.8).
// Previously SUN was fixed at 2.6 regardless of kelvin so warmth changes only
// shifted the colour tint — the room had the same overall brightness whether
// the user picked candlelit or daylight, which made the materials-page
// lighting picker feel inert.
function sunStrength(k: number): number {
  // Linear from (2400 → 1.6) to (4000 → 4.0). Daylight throws more light AND
  // is cooler in hue; candle is dim AND warm.
  const t = Math.max(0, Math.min(1, (k - 2400) / 1600));
  return 1.6 + t * 2.4;
}

// Warm bounce off the floor — bigger contribution at low kelvin (the room
// reads as lit by warm bulbs glowing off the floor) and almost nothing at
// daylight (no warm bounce when the sun is white).
function bounceStrength(k: number): number {
  const t = Math.max(0, Math.min(1, (k - 2400) / 1600));
  return 0.55 - t * 0.45;
}

// Hemisphere fill — cooler and stronger as the scene moves toward daylight.
function hemiStrength(k: number): number {
  const t = Math.max(0, Math.min(1, (k - 2400) / 1600));
  return 0.18 + t * 0.32;
}

export function Lighting({ roomWmm, roomDmm, roomHmm, entrance, warmthK = 3200 }: Props) {
  const w = mmToM(roomWmm);
  const d = mmToM(roomDmm);
  const h = mmToM(roomHmm);

  const sunColor = useMemo(() => kelvinToHex(warmthK), [warmthK]);
  // Sky is always cooler than the sun, but the gap shrinks at the warm end
  // (candle scene shouldn't have a strong blue fill — that fights the mood).
  const skyColor = useMemo(() => {
    const offset = warmthK < 3000 ? 800 : 1500;
    return kelvinToHex(Math.min(warmthK + offset, 6500));
  }, [warmthK]);
  // Ambient picks up a tint at the warm end so deep shadows feel like firelit
  // rooms rather than the cool default off-white.
  const ambientColor = useMemo(() => {
    if (warmthK < 2700) return "#f0c98a";      // candle ambient
    if (warmthK < 3200) return "#ede1c8";      // lamp / warm white
    if (warmthK < 3700) return "#ece8df";      // neutral
    return "#e6ecf2";                           // daylight
  }, [warmthK]);

  // Sun position: opposite the entrance wall (light comes through the window).
  const sunPos = useMemo(() => {
    const reach = Math.max(w, d) * 1.5;
    switch (entrance) {
      case "S": return [0, h * 1.8, reach] as const;
      case "N": return [0, h * 1.8, -reach] as const;
      case "W": return [reach, h * 1.8, 0] as const;
      case "E": return [-reach, h * 1.8, 0] as const;
      default:  return [0, h * 1.8, reach] as const;
    }
  }, [entrance, w, d, h]);

  const sunIntensity = sunStrength(warmthK);
  const bounceIntensity = bounceStrength(warmthK);
  const hemiIntensity = hemiStrength(warmthK);
  const ambientIntensity = warmthK < 2800 ? 0.12 : 0.08;

  return (
    <>
      {/* Cool sky + warm ground bias for hemisphere — keeps shadow side honest. */}
      <hemisphereLight args={[skyColor, "#3a2c1e", hemiIntensity]} />

      <directionalLight
        position={sunPos}
        intensity={sunIntensity}
        color={sunColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={Math.max(w, d) * 4}
        shadow-camera-left={-w}
        shadow-camera-right={w}
        shadow-camera-top={d}
        shadow-camera-bottom={-d}
        shadow-bias={-0.0008}
        shadow-normalBias={0.02}
      />

      {/* Warm bounce off the floor — gives the underside of furniture a glow. */}
      <pointLight
        position={[0, h * 0.08, 0]}
        intensity={bounceIntensity}
        color="#ffd9a8"
        distance={Math.max(w, d) * 2.0}
        decay={1.6}
      />

      {/* Tiny ambient so deepest shadows aren't pure black on PBR materials. */}
      <ambientLight intensity={ambientIntensity} color={ambientColor} />
    </>
  );
}

/** Approximate Planckian-locus colour temperature (K) -> hex sRGB. */
function kelvinToHex(k: number): string {
  const t = k / 100;
  let r: number, g: number, b: number;
  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    b = 255;
  }
  const cl = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${cl(r).toString(16).padStart(2, "0")}${cl(g).toString(16).padStart(2, "0")}${cl(b).toString(16).padStart(2, "0")}`;
}
