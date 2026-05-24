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
const SUN_INTENSITY = 2.6;

export function Lighting({ roomWmm, roomDmm, roomHmm, entrance, warmthK = 3200 }: Props) {
  const w = mmToM(roomWmm);
  const d = mmToM(roomDmm);
  const h = mmToM(roomHmm);

  const sunColor = useMemo(() => kelvinToHex(warmthK), [warmthK]);
  const skyColor = useMemo(() => kelvinToHex(Math.min(warmthK + 1500, 6500)), [warmthK]);

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

  // Window-side sky panel removed (2026-05-23): the panel was visible from
  // outside the room as a giant rectangle behind the wall when the wall faded.
  // Now we rely on the directional sun + ambient + bounce alone.

  return (
    <>
      {/* Cool sky + warm ground bias for hemisphere — keeps shadow side honest. */}
      <hemisphereLight args={[skyColor, "#3a2c1e", 0.28]} />

      <directionalLight
        position={sunPos}
        intensity={SUN_INTENSITY}
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
        intensity={0.28}
        color="#ffd9a8"
        distance={Math.max(w, d) * 2.0}
        decay={1.6}
      />

      {/* Tiny ambient so deepest shadows aren't pure black on PBR materials. */}
      <ambientLight intensity={0.08} color="#ede1c8" />
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
