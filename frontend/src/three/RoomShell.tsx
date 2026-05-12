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
import type { Direction, RoomState } from "@/api/types";
import { mmToM } from "./units";

const WALL_T = 0.12; // 120mm wall thickness
const BASE_H = 0.1;
const BASE_D = 0.018;
const WIN_H = 1.4;
const WIN_SILL = 0.85;
const WIN_FRAC = 0.55;
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
  const wallMatBack = useMemo(() => makeWallMaterial(wallColor, wallFinish), [wallColor, wallFinish]);
  const wallMatSide = useMemo(() => makeWallMaterial(lighten(wallColor, 0.06), wallFinish), [wallColor, wallFinish]);
  const ceilMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#F8F4ED", roughness: 1, metalness: 0 }), []);
  const baseMat = useMemo(() => new THREE.MeshStandardMaterial({ color: lighten(accent, 0.12), roughness: 0.55 }), [accent]);
  const glassMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#dcecf6", roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.28 }),
    [],
  );
  const frameMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#4a4035", roughness: 0.6 }), []);

  const entrance = room.intake.entrance_direction;
  const windowWall = oppositeWall(entrance);

  function wallOrDoor(dir: Direction, pos: [number, number, number], args: [number, number, number], mat: THREE.Material, refKey: keyof WallRefs) {
    if (dir === entrance) {
      return <DoorWall dir={dir} w={w} d={d} h={h} material={mat} wallRef={(m) => (wallRefs.current[refKey] = m)} />;
    }
    return <WallBox ref={(m) => (wallRefs.current[refKey] = m)} position={pos} args={args} material={mat} />;
  }

  return (
    <group>
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <primitive object={floorMat} attach="material" />
      </mesh>

      <mesh position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <primitive object={ceilMat} attach="material" />
      </mesh>
      <mesh position={[0, h - 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.min(w, d) * 0.22, Math.min(w, d) * 0.25, 32]} />
        <meshStandardMaterial color="#fff3da" emissive="#ffe4b5" emissiveIntensity={0.35} side={THREE.DoubleSide} />
      </mesh>

      {wallOrDoor("S", [0, h / 2, -d / 2 + WALL_T / 2], [w + WALL_T, h, WALL_T], wallMatBack, "S")}
      {wallOrDoor("N", [0, h / 2, d / 2 - WALL_T / 2], [w + WALL_T, h, WALL_T], wallMatBack, "N")}
      {wallOrDoor("W", [-w / 2 + WALL_T / 2, h / 2, 0], [WALL_T, h, d + WALL_T], wallMatSide, "W")}
      {wallOrDoor("E", [w / 2 - WALL_T / 2, h / 2, 0], [WALL_T, h, d + WALL_T], wallMatSide, "E")}

      <mesh position={[0, BASE_H / 2, -d / 2 + WALL_T + BASE_D / 2]}><boxGeometry args={[w, BASE_H, BASE_D]} /><primitive object={baseMat} attach="material" /></mesh>
      <mesh position={[0, BASE_H / 2, d / 2 - WALL_T - BASE_D / 2]}><boxGeometry args={[w, BASE_H, BASE_D]} /><primitive object={baseMat} attach="material" /></mesh>
      <mesh position={[-w / 2 + WALL_T + BASE_D / 2, BASE_H / 2, 0]}><boxGeometry args={[BASE_D, BASE_H, d]} /><primitive object={baseMat} attach="material" /></mesh>
      <mesh position={[w / 2 - WALL_T - BASE_D / 2, BASE_H / 2, 0]}><boxGeometry args={[BASE_D, BASE_H, d]} /><primitive object={baseMat} attach="material" /></mesh>

      <WindowOnWall wall={windowWall} w={w} d={d} glass={glassMat} frame={frameMat} />
    </group>
  );
}

const WallBox = forwardRef<THREE.Mesh, { position: [number, number, number]; args: [number, number, number]; material: THREE.Material }>(
  function WallBox({ position, args, material }, ref) {
    return (
      <mesh ref={ref} position={position} receiveShadow>
        <boxGeometry args={args} />
        <primitive object={material} attach="material" />
      </mesh>
    );
  },
);

/** Entrance wall split into left-panel + right-panel + lintel, leaving a DOOR_W × DOOR_H gap at center. */
function DoorWall({ dir, w, d, h, material, wallRef }: {
  dir: Direction; w: number; d: number; h: number;
  material: THREE.Material;
  wallRef: (m: THREE.Mesh | null) => void;
}) {
  const isNS = dir === "N" || dir === "S";
  const wallLen = isNS ? w + WALL_T : d + WALL_T;
  const panelLen = Math.max(0.01, (wallLen - DOOR_W) / 2);
  const lintelH = Math.max(0, h - DOOR_H);
  const halfGap = DOOR_W / 2;

  if (isNS) {
    const z = dir === "S" ? -d / 2 + WALL_T / 2 : d / 2 - WALL_T / 2;
    return (
      <group>
        <mesh ref={wallRef} position={[-(halfGap + panelLen / 2), h / 2, z]} receiveShadow>
          <boxGeometry args={[panelLen, h, WALL_T]} />
          <primitive object={material} attach="material" />
        </mesh>
        <mesh position={[halfGap + panelLen / 2, h / 2, z]} receiveShadow>
          <boxGeometry args={[panelLen, h, WALL_T]} />
          <primitive object={material} attach="material" />
        </mesh>
        {lintelH > 0.005 && (
          <mesh position={[0, DOOR_H + lintelH / 2, z]} receiveShadow>
            <boxGeometry args={[DOOR_W, lintelH, WALL_T]} />
            <primitive object={material} attach="material" />
          </mesh>
        )}
      </group>
    );
  }

  const x = dir === "W" ? -w / 2 + WALL_T / 2 : w / 2 - WALL_T / 2;
  return (
    <group>
      <mesh ref={wallRef} position={[x, h / 2, -(halfGap + panelLen / 2)]} receiveShadow>
        <boxGeometry args={[WALL_T, h, panelLen]} />
        <primitive object={material} attach="material" />
      </mesh>
      <mesh position={[x, h / 2, halfGap + panelLen / 2]} receiveShadow>
        <boxGeometry args={[WALL_T, h, panelLen]} />
        <primitive object={material} attach="material" />
      </mesh>
      {lintelH > 0.005 && (
        <mesh position={[x, DOOR_H + lintelH / 2, 0]} receiveShadow>
          <boxGeometry args={[WALL_T, lintelH, DOOR_W]} />
          <primitive object={material} attach="material" />
        </mesh>
      )}
    </group>
  );
}

function WindowOnWall({ wall, w, d, glass, frame }: { wall: Direction; w: number; d: number; glass: THREE.Material; frame: THREE.Material }) {
  const winY = WIN_SILL + WIN_H / 2;
  const isNS = wall === "N" || wall === "S";
  const span = isNS ? w * WIN_FRAC : d * WIN_FRAC;
  const offX = wall === "W" ? -w / 2 + WALL_T * 0.4 : wall === "E" ? w / 2 - WALL_T * 0.4 : 0;
  const offZ = wall === "S" ? -d / 2 + WALL_T * 0.4 : wall === "N" ? d / 2 - WALL_T * 0.4 : 0;
  const glassArgs: [number, number, number] = isNS ? [span, WIN_H, 0.03] : [0.03, WIN_H, span];
  const frameArgs: [number, number, number] = isNS ? [span + 0.08, WIN_H + 0.08, 0.05] : [0.05, WIN_H + 0.08, span + 0.08];
  return (
    <group>
      <mesh position={[offX, winY, offZ]}><boxGeometry args={frameArgs} /><primitive object={frame} attach="material" /></mesh>
      <mesh position={[offX, winY, offZ]}><boxGeometry args={glassArgs} /><primitive object={glass} attach="material" /></mesh>
      <mesh position={[offX, winY, offZ]}><boxGeometry args={isNS ? [0.03, WIN_H, 0.04] : [0.04, WIN_H, 0.03]} /><primitive object={frame} attach="material" /></mesh>
    </group>
  );
}

// ---------- Materials ----------

function makeWallMaterial(color: string, finish: string): THREE.MeshStandardMaterial {
  const roughness = finish.toLowerCase().includes("limewash") ? 0.95 : finish.toLowerCase().includes("matte") ? 0.92 : 0.88;
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, transparent: true, opacity: 1 });
}

function makeFloorMaterial(flooring: string, baseColor: string): THREE.Material {
  return new THREE.MeshStandardMaterial({ map: makeFloorTexture(flooring, baseColor), roughness: 0.72, metalness: 0.04 });
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
function oppositeWall(entrance: Direction): Direction {
  switch (entrance) {
    case "N": return "S";
    case "S": return "N";
    case "E": return "W";
    case "W": return "E";
    default: return "N";
  }
}
