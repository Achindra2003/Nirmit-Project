/**
 * The architectural shell — floor, ceiling, four walls, baseboards, one window.
 *
 * Coordinate convention: the room is rendered with its CENTRE at the world
 * origin. Walls run from -w/2..w/2 on x and -d/2..d/2 on z. Floor at y=0,
 * ceiling at y=h. Furniture (rendered by RoomScene) sits at (cx - w/2, 0,
 * cz - d/2) — the legacy convention.
 *
 * Each wall is a real solid box; RoomScene fades the walls nearest the camera
 * each frame so the interior is always visible (the standard interior-viewer
 * trick the legacy Viewer3D applied statically).
 */
import { forwardRef, useMemo } from "react";
import * as THREE from "three";
import type { Direction, Opening, RoomState } from "@/api/types";
import { mmToM } from "./units";

const WALL_T = 0.12; // 120mm wall thickness
const BASE_H = 0.1;
const BASE_D = 0.018;
const DOOR_W = 0.9;  // 900mm door width
const DOOR_H = 2.1;  // 2100mm door height

export interface WallRefs {
  S: THREE.Mesh | null;
  N: THREE.Mesh | null;
  W: THREE.Mesh | null;
  E: THREE.Mesh | null;
}

interface Props {
  room: RoomState;
  wallRefs: React.MutableRefObject<WallRefs>;
}

export function RoomShell({ room, wallRefs }: Props) {
  const w = mmToM(room.intake.room_dimensions.width_mm);
  const d = mmToM(room.intake.room_dimensions.depth_mm);
  const h = mmToM(room.intake.room_dimensions.height_mm);
  const palette = room.palette;
  const wallColor = palette.wall ?? "#EDE6D8";
  const accent = palette.accent ?? "#7A5C3A";
  const flooring = room.flooring ?? "warm oak";
  const wallFinish = room.wall_finish ?? "off-white limewash";

  const floorMat = useMemo(() => makeFloorMaterial(flooring, palette.floor ?? "#B89B7A"), [flooring, palette.floor]);
  // Each wall gets its OWN material instance, even though the paint colour /
  // finish is identical. Two reasons:
  //   1. WallFader mutates `material.opacity` per-wall every frame to fade the
  //      camera-side walls. With a single shared material, only the last wall
  //      iterated wins — every other wall ended up at whatever opacity E
  //      happened to compute that frame, producing the "only one wall changes"
  //      bug the user reported when picking a new paint.
  //   2. A new paint pick rebuilds all four via useMemo, so colour swaps still
  //      propagate uniformly.
  const wallMats = useMemo(
    () => ({
      S: makeWallMaterial(wallColor, wallFinish),
      N: makeWallMaterial(wallColor, wallFinish),
      W: makeWallMaterial(wallColor, wallFinish),
      E: makeWallMaterial(wallColor, wallFinish),
    }),
    [wallColor, wallFinish],
  );
  const ceilMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      map: makeWallTexture("#F8F4ED", "matte"),
      color: "#ffffff",
      roughness: 0.92,
      metalness: 0,
    }),
    [],
  );
  const baseMat = useMemo(() => new THREE.MeshStandardMaterial({ color: lighten(accent, 0.12), roughness: 0.55 }), [accent]);

  const entrance = room.intake.entrance_direction;

  // Window rendering removed (2026-05-23): the window+curtains never read
  // convincingly as a window — read more as a glowing rectangle on a flat wall.
  // Only the entrance door punctures a wall; every other wall is solid.
  const openings: Opening[] = room.openings ?? [];
  const doorsByWall = new Map<Direction, Opening>();
  for (const o of openings) {
    if (o.kind === "door" && !doorsByWall.has(o.wall)) doorsByWall.set(o.wall, o);
  }
  if (doorsByWall.size === 0) {
    doorsByWall.set(entrance, {
      wall: entrance,
      center_frac: 0.5,
      width_mm: DOOR_W * 1000,
      height_mm: DOOR_H * 1000,
      kind: "door",
      sill_mm: 0,
    });
  }

  function wallOrDoor(dir: Direction, pos: [number, number, number], args: [number, number, number], mat: THREE.Material, refKey: keyof WallRefs) {
    const door = doorsByWall.get(dir);
    if (door) {
      return <DoorWall dir={dir} w={w} d={d} h={h} door={door} material={mat} wallRef={(m) => (wallRefs.current[refKey] = m)} />;
    }
    return <WallBox ref={(m) => (wallRefs.current[refKey] = m)} position={pos} args={args} material={mat} />;
  }

  return (
    <group>
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} material={floorMat} receiveShadow>
        <planeGeometry args={[w, d]} />
      </mesh>

      <mesh position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]} material={ceilMat}>
        <planeGeometry args={[w, d]} />
      </mesh>
      <mesh position={[0, h - 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.min(w, d) * 0.22, Math.min(w, d) * 0.25, 32]} />
        <meshStandardMaterial color="#fff3da" emissive="#ffe4b5" emissiveIntensity={0.6} side={THREE.DoubleSide} />
      </mesh>
      {/* Actual point light at the ceiling fixture so the room has a soft warm
          interior glow on top of the daylight from the window. Without this the
          ring was emissive-only and contributed no illumination. */}
      <pointLight
        position={[0, h - 0.18, 0]}
        intensity={0.55}
        color="#ffd9a0"
        distance={Math.max(w, d) * 1.6}
        decay={1.5}
      />

      {wallOrDoor("S", [0, h / 2, -d / 2 + WALL_T / 2], [w + WALL_T, h, WALL_T], wallMats.S, "S")}
      {wallOrDoor("N", [0, h / 2, d / 2 - WALL_T / 2], [w + WALL_T, h, WALL_T], wallMats.N, "N")}
      {wallOrDoor("W", [-w / 2 + WALL_T / 2, h / 2, 0], [WALL_T, h, d + WALL_T], wallMats.W, "W")}
      {wallOrDoor("E", [w / 2 - WALL_T / 2, h / 2, 0], [WALL_T, h, d + WALL_T], wallMats.E, "E")}

      <mesh position={[0, BASE_H / 2, -d / 2 + WALL_T + BASE_D / 2]} material={baseMat}><boxGeometry args={[w, BASE_H, BASE_D]} /></mesh>
      <mesh position={[0, BASE_H / 2, d / 2 - WALL_T - BASE_D / 2]} material={baseMat}><boxGeometry args={[w, BASE_H, BASE_D]} /></mesh>
      <mesh position={[-w / 2 + WALL_T + BASE_D / 2, BASE_H / 2, 0]} material={baseMat}><boxGeometry args={[BASE_D, BASE_H, d]} /></mesh>
      <mesh position={[w / 2 - WALL_T - BASE_D / 2, BASE_H / 2, 0]} material={baseMat}><boxGeometry args={[BASE_D, BASE_H, d]} /></mesh>

      {/* Crown molding — 40mm tall × 30mm deep ring at ceiling perimeter */}
      <CrownMolding w={w} d={d} h={h} mat={baseMat} />
    </group>
  );
}

const WallBox = forwardRef<THREE.Mesh, { position: [number, number, number]; args: [number, number, number]; material: THREE.Material }>(
  function WallBox({ position, args, material }, ref) {
    return (
      <mesh ref={ref} position={position} material={material} receiveShadow>
        <boxGeometry args={args} />
      </mesh>
    );
  },
);

const DOOR_LEAF_T = 0.038; // 38mm door leaf thickness
const TRIM_W = 0.012;      // 12mm frame trim width

/** Thin crown molding ring at the top of all four walls. */
function CrownMolding({ w, d, h, mat }: { w: number; d: number; h: number; mat: THREE.Material }) {
  const mH = 0.04;  // 40mm tall
  const mD = 0.03;  // 30mm deep
  const y = h - mH / 2 - 0.01;
  return (
    <group>
      <mesh position={[0, y, -d / 2 + mD / 2]} material={mat}><boxGeometry args={[w, mH, mD]} /></mesh>
      <mesh position={[0, y, d / 2 - mD / 2]} material={mat}><boxGeometry args={[w, mH, mD]} /></mesh>
      <mesh position={[-w / 2 + mD / 2, y, 0]} material={mat}><boxGeometry args={[mD, mH, d]} /></mesh>
      <mesh position={[w / 2 - mD / 2, y, 0]} material={mat}><boxGeometry args={[mD, mH, d]} /></mesh>
    </group>
  );
}

/** Door wall: split into left-panel + right-panel + lintel, leaving the opening's gap at its center_frac.
 *  Includes procedural door leaf (wood), frame trim, and handle. */
function DoorWall({ dir, w, d, h, door, material, wallRef }: {
  dir: Direction; w: number; d: number; h: number;
  door: Opening;
  material: THREE.Material;
  wallRef: (m: THREE.Mesh | null) => void;
}) {
  const doorLeafMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#5c3d1e", roughness: 0.68, metalness: 0 }), []);
  const trimMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3a2512", roughness: 0.6, metalness: 0 }), []);
  const handleMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#b8b8b8", roughness: 0.18, metalness: 0.85 }), []);

  const isNS = dir === "N" || dir === "S";
  const wallLen = isNS ? w + WALL_T : d + WALL_T;
  const interiorLen = isNS ? w : d;
  const doorW = mmToM(door.width_mm);
  const doorH = mmToM(door.height_mm);
  // center_frac=0.5 puts the gap dead-centre (matches legacy behaviour).
  const doorCenter = -interiorLen / 2 + interiorLen * door.center_frac;
  const halfGap = doorW / 2;
  const wallMin = -wallLen / 2;
  const wallMax = wallLen / 2;
  const leftLen = Math.max(0.01, (doorCenter - halfGap) - wallMin);
  const rightLen = Math.max(0.01, wallMax - (doorCenter + halfGap));
  const leftMid = (wallMin + (doorCenter - halfGap)) / 2;
  const rightMid = ((doorCenter + halfGap) + wallMax) / 2;
  const lintelH = Math.max(0, h - doorH);
  const handleH = 1.0; // handle at 1.0 m

  // All three wall-side meshes (left panel, right panel, lintel) MUST share
  // the exact same material instance so the WallFader's per-frame opacity
  // mutation on the left panel (the one wallRef points at) is visible across
  // all three. We also use a `key` derived from material.uuid on each so a
  // material swap (new paint colour) forces a full remount — previously the
  // `<primitive object={material}/>` reconciliation occasionally left the
  // right panel and lintel attached to the old material instance while the
  // left panel — the one with the React ref — picked up the new one, which
  // is the "block above the door changes colour but the rest doesn't" bug.
  const matKey = material.uuid;

  if (isNS) {
    const z = dir === "S" ? -d / 2 + WALL_T / 2 : d / 2 - WALL_T / 2;
    // Door leaf flush in the opening so it doesn't obstruct walk / entrance camera.
    // (The frame trim around the gap is enough to read "doorway" without the
    // swinging leaf blocking interior sightlines.)
    const hingeX = doorCenter - halfGap;
    const openAngle = 0;
    return (
      <group>
        {/* Wall panels — full-height left/right plus a strip above the door */}
        <mesh key={`L-${matKey}`} ref={wallRef} position={[leftMid, h / 2, z]} material={material} receiveShadow>
          <boxGeometry args={[leftLen, h, WALL_T]} />
        </mesh>
        <mesh key={`R-${matKey}`} position={[rightMid, h / 2, z]} material={material} receiveShadow>
          <boxGeometry args={[rightLen, h, WALL_T]} />
        </mesh>
        {lintelH > 0.005 && (
          <mesh key={`T-${matKey}`} position={[doorCenter, doorH + lintelH / 2, z]} material={material} receiveShadow>
            <boxGeometry args={[doorW, lintelH, WALL_T]} />
          </mesh>
        )}
        {/* Frame trim */}
        <mesh position={[doorCenter - halfGap - TRIM_W / 2, doorH / 2, z]} material={trimMat} castShadow>
          <boxGeometry args={[TRIM_W, doorH, WALL_T + 0.01]} />
        </mesh>
        <mesh position={[doorCenter + halfGap + TRIM_W / 2, doorH / 2, z]} material={trimMat} castShadow>
          <boxGeometry args={[TRIM_W, doorH, WALL_T + 0.01]} />
        </mesh>
        <mesh position={[doorCenter, doorH + TRIM_W / 2, z]} material={trimMat} castShadow>
          <boxGeometry args={[doorW + TRIM_W * 2, TRIM_W, WALL_T + 0.01]} />
        </mesh>
        {/* Door leaf + handle */}
        <group position={[hingeX, doorH / 2, z]} rotation={[0, openAngle, 0]}>
          <mesh position={[doorW / 2, 0, DOOR_LEAF_T / 2]} material={doorLeafMat} castShadow receiveShadow>
            <boxGeometry args={[doorW, doorH, DOOR_LEAF_T]} />
          </mesh>
          {/* Handle sphere near free edge */}
          <mesh position={[doorW - 0.06, handleH - doorH / 2, DOOR_LEAF_T + 0.018]} material={handleMat} castShadow>
            <sphereGeometry args={[0.018, 10, 8]} />
          </mesh>
        </group>
      </group>
    );
  }

  const x = dir === "W" ? -w / 2 + WALL_T / 2 : w / 2 - WALL_T / 2;
  const hingeZ = doorCenter - halfGap;
  const openAngleWE = 0;   // flush — don't block walk view
  return (
    <group>
      {/* Wall panels — see comment on the NS branch for why all three share
       *  the same material instance and remount on material.uuid change. */}
      <mesh key={`L-${matKey}`} ref={wallRef} position={[x, h / 2, leftMid]} material={material} receiveShadow>
        <boxGeometry args={[WALL_T, h, leftLen]} />
      </mesh>
      <mesh key={`R-${matKey}`} position={[x, h / 2, rightMid]} material={material} receiveShadow>
        <boxGeometry args={[WALL_T, h, rightLen]} />
      </mesh>
      {lintelH > 0.005 && (
        <mesh key={`T-${matKey}`} position={[x, doorH + lintelH / 2, doorCenter]} material={material} receiveShadow>
          <boxGeometry args={[WALL_T, lintelH, doorW]} />
        </mesh>
      )}
      {/* Frame trim */}
      <mesh position={[x, doorH / 2, doorCenter - halfGap - TRIM_W / 2]} material={trimMat} castShadow>
        <boxGeometry args={[WALL_T + 0.01, doorH, TRIM_W]} />
      </mesh>
      <mesh position={[x, doorH / 2, doorCenter + halfGap + TRIM_W / 2]} material={trimMat} castShadow>
        <boxGeometry args={[WALL_T + 0.01, doorH, TRIM_W]} />
      </mesh>
      <mesh position={[x, doorH + TRIM_W / 2, doorCenter]} material={trimMat} castShadow>
        <boxGeometry args={[WALL_T + 0.01, TRIM_W, doorW + TRIM_W * 2]} />
      </mesh>
      {/* Door leaf + handle */}
      <group position={[x, doorH / 2, hingeZ]} rotation={[0, openAngleWE, 0]}>
        <mesh position={[DOOR_LEAF_T / 2, 0, doorW / 2]} material={doorLeafMat} castShadow receiveShadow>
          <boxGeometry args={[DOOR_LEAF_T, doorH, doorW]} />
        </mesh>
        <mesh position={[DOOR_LEAF_T + 0.018, handleH - doorH / 2, doorW - 0.06]} material={handleMat} castShadow>
          <sphereGeometry args={[0.018, 10, 8]} />
        </mesh>
      </group>
    </group>
  );
}

// WindowWall removed (2026-05-23). The frame+glass+mullion never sold
// "window" — read as a flat lit rectangle. Keep walls solid; light comes from
// the directional sun + ambient regardless of wall geometry.

// ---------- Materials ----------

function makeWallMaterial(color: string, finish: string): THREE.MeshStandardMaterial {
  // Slightly lower roughness so the env map contributes subtle warmth — fully
  // matte walls (0.95) read flat under HDRI lighting. Plaster-tone canvas
  // texture gives the surface depth without committing to a specific finish.
  const f = finish.toLowerCase();
  const roughness = f.includes("limewash") ? 0.88 : f.includes("matte") ? 0.84 : 0.78;
  const map = makeWallTexture(color, f);
  return new THREE.MeshStandardMaterial({
    map,
    color: "#ffffff",
    roughness,
    metalness: 0,
    transparent: true,
    opacity: 1,
  });
}

function makeWallTexture(color: string, finish: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, c.width, c.height);
  // Subtle plaster mottling: thousands of low-opacity dots in tones either side
  // of the base. Sells "painted wall, not flat colour" without needing an image.
  const dot = finish.includes("texture") ? 1.6 : 1.0;
  for (let i = 0; i < 12000; i++) {
    const a = Math.random() * 0.05;
    const dark = Math.random() > 0.5;
    ctx.fillStyle = dark ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`;
    ctx.fillRect(Math.random() * c.width, Math.random() * c.height, dot, dot);
  }
  // Long faint vertical streaks — limewash / brush-pattern memory.
  if (finish.includes("limewash") || finish.includes("texture")) {
    for (let i = 0; i < 60; i++) {
      ctx.strokeStyle = `rgba(0,0,0,${0.015 + Math.random() * 0.02})`;
      ctx.lineWidth = 0.4 + Math.random();
      const x = Math.random() * c.width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + (Math.random() - 0.5) * 8, c.height * 0.4, x + (Math.random() - 0.5) * 8, c.height * 0.7, x, c.height);
      ctx.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1.6, 1.0);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeFloorMaterial(flooring: string, baseColor: string): THREE.Material {
  const f = flooring.toLowerCase();
  const map = makeFloorTexture(flooring, baseColor);
  // Slight specular pop on wood / stone, but never enough to look like glass.
  // Wood: roughness 0.62 (catches a bit of HDRI), stone/marble 0.55, tile 0.5.
  const isStoneish = f.includes("kota") || f.includes("stone") || f.includes("marble");
  const isTile = f.includes("tile") || f.includes("vitrified") || f.includes("athangudi") || f.includes("terrazzo");
  const roughness = isTile ? 0.5 : isStoneish ? 0.55 : 0.62;
  const metalness = isTile ? 0.06 : 0.03;
  return new THREE.MeshStandardMaterial({ map, roughness, metalness, envMapIntensity: 0.6 });
}

function makeFloorTexture(flooring: string, baseColor: string): THREE.CanvasTexture {
  const f = flooring.toLowerCase();
  const isWood = (f.includes("oak") || f.includes("wood") || f.includes("laminate")) && !f.includes("vitrified");
  const isStone = f.includes("kota") || f.includes("stone");
  const isMarble = f.includes("marble") || f.includes("bianco") || f.includes("statuario");
  const isTile = f.includes("tile") || f.includes("vitrified") || f.includes("athangudi");
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, c.width, c.height);
  if (isWood) {
    const plankH = 128;
    for (let y = 0; y < c.height; y += plankH) {
      ctx.fillStyle = shade(baseColor, -(0.03 + Math.random() * 0.06));
      ctx.fillRect(0, y, c.width, plankH);
      for (let s = 0; s < 14; s++) {
        ctx.strokeStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.05})`;
        ctx.lineWidth = 0.8 + Math.random() * 1.5;
        const yy = y + Math.random() * plankH;
        ctx.beginPath();
        ctx.moveTo(0, yy);
        ctx.bezierCurveTo(c.width * 0.33, yy + (Math.random() - 0.5) * 7, c.width * 0.66, yy + (Math.random() - 0.5) * 7, c.width, yy);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.fillRect(0, y, c.width, 1.5);
    }
  } else if (isTile || isStone || isMarble) {
    const tile = isStone ? 256 : 200;
    for (let y = 0; y < c.height; y += tile)
      for (let x = 0; x < c.width; x += tile) {
        ctx.fillStyle = shade(baseColor, (Math.random() - 0.5) * 0.08);
        ctx.fillRect(x + 1.5, y + 1.5, tile - 3, tile - 3);
        if (isMarble) {
          ctx.strokeStyle = `rgba(255,255,255,${0.06 + Math.random() * 0.05})`;
          ctx.lineWidth = 0.6 + Math.random();
          ctx.beginPath();
          ctx.moveTo(x + Math.random() * tile, y);
          ctx.bezierCurveTo(x + Math.random() * tile, y + Math.random() * tile, x + Math.random() * tile, y + Math.random() * tile, x + Math.random() * tile, y + tile);
          ctx.stroke();
        }
      }
  }
  for (let i = 0; i < 6000; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.035})`;
    ctx.fillRect(Math.random() * c.width, Math.random() * c.height, 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function shade(hex: string, amt: number): string {
  const { r, g, b } = hexToRgb(hex);
  if (amt < 0) {
    const fct = 1 + amt;
    return rgbToHex(Math.max(0, r * fct), Math.max(0, g * fct), Math.max(0, b * fct));
  }
  return rgbToHex(Math.min(255, r + (255 - r) * amt), Math.min(255, g + (255 - g) * amt), Math.min(255, b + (255 - b) * amt));
}
function lighten(hex: string, amt: number): string {
  return shade(hex, Math.abs(amt));
}
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(v, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex(r: number, g: number, b: number): string {
  const t = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${t(r)}${t(g)}${t(b)}`;
}
