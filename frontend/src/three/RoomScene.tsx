/**
 * The R3F scene that renders a RoomState.
 *
 * Camera: OrbitControls with damping — the user rotates / zooms with the
 * cursor (pan only in the "Walk" preset). The preset buttons lerp the camera
 * + orbit target over ~0.8s, then hand control back to OrbitControls.
 *
 * Walls: solid boxes that fade to ~10% opacity each frame when they sit
 * between the camera and the room centre, so the interior is always visible.
 *
 * Coordinate boundary: backend talks mm with the room corner at (0,0); we
 * render the room centred on the world origin (matching the legacy viewer),
 * so items live in a group at [-w/2, 0, -d/2] and sit at [mmToM(cx), 0,
 * mmToM(cz)] within it (cx, cz = footprint centre in mm).
 */
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Grid, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { Direction, RoomState } from "@/api/types";
import { GlbItem } from "./GlbItem";
import { RoomShell, type WallRefs } from "./RoomShell";
import { Lighting } from "./Lighting";
import { Atmosphere } from "./Atmosphere";
import { PostProcess } from "./PostProcess";
import { mmToM } from "./units";

export type CameraView = "corner" | "eye" | "top" | "walk";

interface Props {
  room: RoomState;
  selectedItemId?: string | null;
  onSelectItem?: (id: string | null) => void;
  onMoveItem?: (id: string, x_mm: number, z_mm: number) => void;
  /** When true AND an item is selected, that item becomes draggable and
   *  OrbitControls is disabled (the cursor exclusively drives the item).
   *  Default false ⇒ items are LOCKED and the room is fully orbit-able. */
  moveMode?: boolean;
  view?: CameraView;
  warmthK?: number;
  showAtmosphere?: boolean;
}

export function RoomScene({
  room,
  selectedItemId,
  onSelectItem,
  onMoveItem,
  moveMode = false,
  view = "corner",
  warmthK = 3200,
  showAtmosphere = true,
}: Props) {
  const w = mmToM(room.intake.room_dimensions.width_mm);
  const d = mmToM(room.intake.room_dimensions.depth_mm);
  const h = mmToM(room.intake.room_dimensions.height_mm);
  const palette = room.palette;
  const wallRefs = useRef<WallRefs>({ S: null, N: null, W: null, E: null });

  // Initial camera = 3/4 corner.
  const initialCam = useMemo<[number, number, number]>(
    () => [w * 0.65, h * 1.0, d * 0.85],
    [w, h, d],
  );

  return (
    <Canvas
      shadows
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05, outputColorSpace: THREE.SRGBColorSpace }}
      camera={{ position: initialCam, fov: 42 }}
      style={{ width: "100%", height: "100%" }}
      onPointerMissed={() => onSelectItem?.(null)}
    >
      <color attach="background" args={["#1a1510"]} />

      <Lighting
        roomWmm={room.intake.room_dimensions.width_mm}
        roomDmm={room.intake.room_dimensions.depth_mm}
        roomHmm={room.intake.room_dimensions.height_mm}
        entrance={room.intake.entrance_direction}
        warmthK={warmthK}
      />
      <Environment preset="apartment" environmentIntensity={0.45} />

      <RoomShell room={room} wallRefs={wallRefs} />
      <WallFader wallRefs={wallRefs} roomW={w} roomD={d} />

      {/* Items + atmosphere in a frame whose origin is the room corner. */}
      <group position={[-w / 2, 0, -d / 2]}>
        {room.items.map((item) => (
          <GlbItem
            key={item.id}
            item={item}
            room={room}
            accent={palette.accent ?? "#7a5c3a"}
            selected={selectedItemId === item.id}
            // Draggable only when this item is selected AND we're in move mode.
            draggable={moveMode && selectedItemId === item.id}
            onSelect={(id) => onSelectItem?.(id)}
            onMoveCommit={onMoveItem}
          />
        ))}
        {showAtmosphere && <Atmosphere room={room} />}
      </group>

      <ContactShadows position={[0, 0.006, 0]} opacity={0.5} scale={Math.max(w, d) * 1.6} blur={2.6} far={h * 1.2} resolution={1024} color="#241810" />
      <Grid position={[0, 0.003, 0]} args={[Math.max(w, d) * 2, Math.max(w, d) * 2]} cellSize={0.5} cellThickness={0.4} sectionSize={1} sectionThickness={0.8} cellColor="#7a5c3a" sectionColor="#5c4632" fadeDistance={Math.max(w, d) * 2.2} fadeStrength={1.4} infiniteGrid={false} />

      <OrbitControls
        makeDefault
        target={[0, h * 0.32, 0]}
        enableDamping
        dampingFactor={0.08}
        minPolarAngle={Math.PI / 14}
        maxPolarAngle={Math.PI / 2.06}
        minDistance={Math.max(w, d) * 0.35}
        maxDistance={Math.max(w, d) * 2.4}
        enablePan={view === "walk"}
        // Move mode hands the cursor to the selected item — no orbit/zoom/pan.
        enabled={!moveMode}
      />
      <CameraController view={view} roomW={w} roomD={d} roomH={h} entrance={room.intake.entrance_direction} />
      <PostProcess />
    </Canvas>
  );
}

// ---------- Wall fading ----------

interface WallSpec {
  key: keyof WallRefs;
  axis: "x" | "z";
  plane: number; // world coord of the wall plane
  outwardSign: 1 | -1; // +1 if outward normal points along +axis
}

function WallFader({ wallRefs, roomW, roomD }: { wallRefs: React.MutableRefObject<WallRefs>; roomW: number; roomD: number }) {
  const { camera } = useThree();
  const walls = useMemo<WallSpec[]>(
    () => [
      { key: "S", axis: "z", plane: -roomD / 2, outwardSign: -1 },
      { key: "N", axis: "z", plane: roomD / 2, outwardSign: 1 },
      { key: "W", axis: "x", plane: -roomW / 2, outwardSign: -1 },
      { key: "E", axis: "x", plane: roomW / 2, outwardSign: 1 },
    ],
    [roomW, roomD],
  );
  useFrame(() => {
    for (const wall of walls) {
      const mesh = wallRefs.current[wall.key];
      if (!mesh) continue;
      const camCoord = wall.axis === "x" ? camera.position.x : camera.position.z;
      // Signed distance of the camera from the wall plane along the OUTWARD
      // normal. > 0 ⇒ camera is outside the wall ⇒ it blocks the view in.
      const camToPlaneOutside = (camCoord - wall.plane) * wall.outwardSign;
      const target = camToPlaneOutside > 0.3 ? 0.06 : camToPlaneOutside < -0.3 ? 1.0 : 0.06 + ((-camToPlaneOutside + 0.3) / 0.6) * 0.94;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.opacity += (target - mat.opacity) * 0.18;
      mat.depthWrite = mat.opacity > 0.5;
    }
  });
  return null;
}

// ---------- Camera preset controller ----------

function CameraController({
  view,
  roomW,
  roomD,
  roomH,
  entrance,
}: {
  view: CameraView;
  roomW: number;
  roomD: number;
  roomH: number;
  entrance: Direction;
}) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: { target: THREE.Vector3 } | null };
  const t = useRef(1);
  const fromPos = useRef(new THREE.Vector3());
  const toPos = useRef(new THREE.Vector3());
  const fromTgt = useRef(new THREE.Vector3());
  const toTgt = useRef(new THREE.Vector3());
  const first = useRef(true);

  const presetFor = (v: CameraView): { pos: THREE.Vector3; tgt: THREE.Vector3 } => {
    const cx = 0, cz = 0;
    if (v === "top") {
      return { pos: new THREE.Vector3(cx, Math.max(roomW, roomD) * 1.5, cz + 0.01), tgt: new THREE.Vector3(cx, 0, cz) };
    }
    if (v === "eye" || v === "walk") {
      // Stand just inside the entrance wall, looking into the room.
      switch (entrance) {
        case "S": return { pos: new THREE.Vector3(0, 1.55, -roomD / 2 + 0.7), tgt: new THREE.Vector3(0, 1.25, roomD / 4) };
        case "N": return { pos: new THREE.Vector3(0, 1.55, roomD / 2 - 0.7), tgt: new THREE.Vector3(0, 1.25, -roomD / 4) };
        case "W": return { pos: new THREE.Vector3(-roomW / 2 + 0.7, 1.55, 0), tgt: new THREE.Vector3(roomW / 4, 1.25, 0) };
        case "E": return { pos: new THREE.Vector3(roomW / 2 - 0.7, 1.55, 0), tgt: new THREE.Vector3(-roomW / 4, 1.25, 0) };
        default: return { pos: new THREE.Vector3(0, 1.55, -roomD / 2 + 0.7), tgt: new THREE.Vector3(0, 1.25, roomD / 4) };
      }
    }
    // corner (default 3/4)
    return { pos: new THREE.Vector3(roomW * 0.65, roomH * 1.0, roomD * 0.85), tgt: new THREE.Vector3(0, roomH * 0.32, 0) };
  };

  useEffect(() => {
    const { pos, tgt } = presetFor(view);
    if (first.current) {
      camera.position.copy(pos);
      camera.lookAt(tgt);
      if (controls) controls.target.copy(tgt);
      first.current = false;
      t.current = 1;
      return;
    }
    fromPos.current.copy(camera.position);
    fromTgt.current.copy(controls?.target ?? new THREE.Vector3(0, roomH * 0.32, 0));
    toPos.current.copy(pos);
    toTgt.current.copy(tgt);
    t.current = 0;
  }, [view, roomW, roomD, roomH, entrance]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, dt) => {
    if (t.current >= 1) return;
    t.current = Math.min(1, t.current + dt * 1.25); // ~0.8s
    const e = t.current < 0.5 ? 4 * t.current ** 3 : 1 - Math.pow(-2 * t.current + 2, 3) / 2;
    camera.position.lerpVectors(fromPos.current, toPos.current, e);
    if (controls) {
      controls.target.lerpVectors(fromTgt.current, toTgt.current, e);
    } else {
      const tg = new THREE.Vector3().lerpVectors(fromTgt.current, toTgt.current, e);
      camera.lookAt(tg);
    }
  });

  return null;
}
