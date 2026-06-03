/**
 * Warm, layered lighting that simulates daylight pouring through the room's
 * actual window — the quality of light VISION.md asks for.
 *
 * Three layers:
 *  - Sun: a strong directional light coming through the WINDOW wall (read from
 *    the room's openings; falls back to the wall opposite the entrance when a
 *    room carries no window data). Offset along the wall by the window's own
 *    position, so a window in the corner throws light from the corner.
 *  - Sky fill: a soft hemispheric light filling shadowed areas.
 *  - Bounce: a low-intensity warm point light from the floor reflecting up.
 *
 * Intensity / colour are tuned to the warmth (kelvin) so candlelight reads dim
 * and warm, daylight reads bright and cool.
 */
import { useMemo } from "react";
import type { Direction, Opening } from "@/api/types";
import { mmToM } from "./units";

interface Props {
  roomWmm: number;
  roomDmm: number;
  roomHmm: number;
  entrance: Direction;
  openings?: readonly Opening[];
  /** Compass wall the daylight enters from — set by the user in the Materials
   *  lighting tab. Overrides the window/entrance inference and drives the
   *  natural-light character (morning / evening / bright / soft). */
  lightDirection?: Direction | null;
  warmthK?: number; // 2700 (warm) - 4000 (cool)
}

type Cardinal = "N" | "S" | "E" | "W";

// The CHARACTER of daylight by the compass wall it enters from. This is the
// real-interior-design intuition: an east window gives warm low morning light,
// a west window orange raking evening light, a south window bright high sun,
// and a north window soft, cool, near-shadowless fill (no direct sun).
//   kelvinBias  — shift vs the user's warmth (negative = warmer/oranger)
//   sunMult     — direct-sun strength multiplier (north barely has any)
//   hemiMult    — sky-fill multiplier (north leans on diffuse fill)
//   elevation   — sun height factor (low = raking morning/evening, high = noon)
interface DaylightProfile { kelvinBias: number; sunMult: number; hemiMult: number; elevation: number; tod: string }
function daylightFor(dir: Cardinal): DaylightProfile {
  switch (dir) {
    case "E": return { kelvinBias: -200, sunMult: 1.12, hemiMult: 0.95, elevation: 1.15, tod: "warm morning light" };
    case "W": return { kelvinBias: -550, sunMult: 1.02, hemiMult: 0.9,  elevation: 1.05, tod: "golden evening light" };
    case "S": return { kelvinBias: 450,  sunMult: 1.30, hemiMult: 1.1,  elevation: 2.0,  tod: "bright midday light" };
    case "N": return { kelvinBias: 1100, sunMult: 0.5,  hemiMult: 1.65, elevation: 1.7,  tod: "soft, even north light" };
  }
}

// Collapse any Direction (incl. diagonals like NE) to the dominant cardinal so
// the sun has a single wall to come from.
function toCardinal(dir: Direction): Cardinal {
  if (dir === "N" || dir === "S" || dir === "E" || dir === "W") return dir;
  if (dir.startsWith("N")) return "N";
  if (dir.startsWith("S")) return "S";
  return dir.includes("E") ? "E" : "W";
}

function opposite(c: Cardinal): Cardinal {
  return c === "N" ? "S" : c === "S" ? "N" : c === "E" ? "W" : "E";
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

export function Lighting({ roomWmm, roomDmm, roomHmm, entrance, openings, lightDirection, warmthK = 3200 }: Props) {
  const w = mmToM(roomWmm);
  const d = mmToM(roomDmm);
  const h = mmToM(roomHmm);

  // Which wall the daylight comes through. Priority: the user's explicit
  // light_direction → the room's largest window → the wall opposite the
  // entrance. `frac` (0..1 along the wall) offsets the sun so an off-centre
  // window lights the room from that side.
  const light = useMemo(() => {
    const windows = (openings ?? []).filter((o) => o.kind === "window");
    if (lightDirection) {
      const card = toCardinal(lightDirection);
      const match = windows.find((o) => toCardinal(o.wall) === card);
      return { wall: card, frac: match?.center_frac ?? 0.5 };
    }
    if (windows.length > 0) {
      const primary = windows.reduce((a, b) =>
        b.width_mm * b.height_mm > a.width_mm * a.height_mm ? b : a,
      );
      return { wall: toCardinal(primary.wall), frac: primary.center_frac };
    }
    return { wall: opposite(toCardinal(entrance)), frac: 0.5 };
  }, [openings, entrance, lightDirection]);

  // Daylight character for the wall it enters from, layered on the user's
  // warmth: the slider still sets mood; direction shifts colour, strength, and
  // sun height toward the real quality of that light.
  const profile = useMemo(() => daylightFor(light.wall), [light.wall]);
  const effKelvin = Math.max(2200, Math.min(6500, warmthK + profile.kelvinBias));

  const sunColor = useMemo(() => kelvinToHex(effKelvin), [effKelvin]);
  // Sky is always cooler than the sun, but the gap shrinks at the warm end
  // (an evening scene shouldn't have a strong blue fill — that fights the mood).
  const skyColor = useMemo(() => {
    const offset = effKelvin < 3000 ? 800 : 1500;
    return kelvinToHex(Math.min(effKelvin + offset, 6500));
  }, [effKelvin]);
  // Ambient picks up a tint at the warm end so deep shadows feel like firelit
  // rooms rather than the cool default off-white.
  const ambientColor = useMemo(() => {
    if (warmthK < 2700) return "#f0c98a";      // candle ambient
    if (warmthK < 3200) return "#ede1c8";      // lamp / warm white
    if (warmthK < 3700) return "#ece8df";      // neutral
    return "#e6ecf2";                           // daylight
  }, [warmthK]);

  // Sun position: outside the window wall, pointing in. The along-wall offset
  // (ox) places the light at the window's actual position; the elevation factor
  // rakes it low for morning/evening and lifts it high for midday.
  const sunPos = useMemo(() => {
    const reach = Math.max(w, d) * 1.5;
    const ox = light.frac - 0.5;
    const y = h * profile.elevation;
    switch (light.wall) {
      case "N": return [ox * w, y, reach] as const;
      case "S": return [ox * w, y, -reach] as const;
      case "E": return [reach, y, ox * d] as const;
      case "W": return [-reach, y, ox * d] as const;
    }
  }, [light, w, d, h, profile]);

  const sunIntensity = sunStrength(warmthK) * profile.sunMult;
  const bounceIntensity = bounceStrength(warmthK);
  const hemiIntensity = hemiStrength(warmthK) * profile.hemiMult;
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
