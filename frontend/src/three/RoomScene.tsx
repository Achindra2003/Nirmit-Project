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
import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { Direction, Opening, RoomState } from "@/api/types";
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
  /** Optional child rendered inside the Canvas's React tree — used by
   *  SceneSnapshot to mount a `useThree`-aware probe that captures the WebGL
   *  back buffer once assets finish loading. */
  snapshotProbe?: React.ReactNode;
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
  snapshotProbe,
}: Props) {
  const w = mmToM(room.intake.room_dimensions.width_mm);
  const d = mmToM(room.intake.room_dimensions.depth_mm);
  const h = mmToM(room.intake.room_dimensions.height_mm);
  const palette = room.palette;
  const wallRefs = useRef<WallRefs>({ S: null, N: null, W: null, E: null });

  // Initial camera — standing at the entrance corner at roughly eye level.
  const initialCam = useMemo<[number, number, number]>(
    () => [w * 0.72, h * 0.60, d * 0.92],
    [w, h, d],
  );

  // Tone-mapping exposure tracks warmth so a daylit room reads visibly
  // brighter than a candlelit one. Without this, kelvin only shifted hue —
  // the materials-page lighting picker felt subtle.
  const exposure = useMemo(() => {
    const t = Math.max(0, Math.min(1, (warmthK - 2400) / 1600));
    return 0.88 + t * 0.48; // 0.88 (candle) → 1.36 (daylight)
  }, [warmthK]);

  return (
    <Canvas
      shadows
      // `preserveDrawingBuffer` lets ExportRoute call gl.domElement.toDataURL()
      // to capture a still of the rendered scene for the quotation PDF and
      // WhatsApp share image. The cost is a small memory overhead (the back
      // buffer isn't cleared between frames) — negligible for our use case.
      gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: exposure, outputColorSpace: THREE.SRGBColorSpace }}
      camera={{ position: initialCam, fov: 52 }}
      style={{ width: "100%", height: "100%" }}
      onPointerMissed={() => onSelectItem?.(null)}
    >
      <ExposureController exposure={exposure} />
      {/* Warm off-white background — visible through window + faded walls instead of a black void */}
      <color attach="background" args={["#e8e0d5"]} />

      <Lighting
        roomWmm={room.intake.room_dimensions.width_mm}
        roomDmm={room.intake.room_dimensions.depth_mm}
        roomHmm={room.intake.room_dimensions.height_mm}
        entrance={room.intake.entrance_direction}
        warmthK={warmthK}
      />

      {/* HDRI env map — PBR materials in 3D-FRONT meshes need this for proper
          diffuse / specular response. `background={false}` keeps our painted
          walls visible; the env only feeds material reflections. */}
      <Environment preset="apartment" background={false} environmentIntensity={0.85} />

      <RoomShell room={room} wallRefs={wallRefs} />
      <WallFader wallRefs={wallRefs} roomW={w} roomD={d} openings={room.openings ?? []} />

      {/* Items + atmosphere in a frame whose origin is the room corner. */}
      <group position={[-w / 2, 0, -d / 2]}>
        {room.items.map((item) => (
          <GlbItem
            key={item.id}
            item={item}
            room={room}
            accent={palette.accent ?? "#7a5c3a"}
            selected={selectedItemId === item.id}
            draggable={moveMode && selectedItemId === item.id}
            onSelect={(id) => onSelectItem?.(id)}
            onMoveCommit={onMoveItem}
          />
        ))}
        {showAtmosphere && <Atmosphere room={room} />}
      </group>

      <ContactShadows position={[0, 0.004, 0]} opacity={0.45} scale={Math.max(w, d) * 1.5} blur={1.8} far={h} resolution={1024} color="#2a1e12" />

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
      {snapshotProbe}
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

function WallFader({ wallRefs, roomW, roomD, openings }: {
  wallRefs: React.MutableRefObject<WallRefs>;
  roomW: number; roomD: number;
  openings: readonly Opening[];
}) {
  void openings;
  const { camera } = useThree();
  // Track current opacity per wall in a ref so the lerp persists across renders
  // without mutating stale material instances.
  const opacityRef = useRef<Record<string, number>>({ S: 1, N: 1, W: 1, E: 1 });
  const walls = useMemo<WallSpec[]>(
    () => [
      { key: "S", axis: "z", plane: -roomD / 2, outwardSign: -1 },
      { key: "N", axis: "z", plane: roomD / 2, outwardSign: 1 },
      { key: "W", axis: "x", plane: -roomW / 2, outwardSign: -1 },
      { key: "E", axis: "x", plane: roomW / 2, outwardSign: 1 },
    ],
    [roomW, roomD],
  );
  // depthWrite needs to be STABLE per frame — toggling it at the opacity 0.5
  // boundary used to make doors + items near a fading wall visibly twitch each
  // frame. Track the last-applied state in a ref and only flip with hysteresis
  // (off below 0.45, on above 0.95). Within the dead band, keep prior state.
  const depthWriteRef = useRef<Record<string, boolean>>({ S: true, N: true, W: true, E: true });
  useFrame(() => {
    for (const wall of walls) {
      const mesh = wallRefs.current[wall.key];
      if (!mesh) continue;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (!mat?.isMeshStandardMaterial) continue;
      const camCoord = wall.axis === "x" ? camera.position.x : camera.position.z;
      const camToPlaneOutside = (camCoord - wall.plane) * wall.outwardSign;
      const floor = 0.06;
      const span = 1.0 - floor;
      const target = camToPlaneOutside > 0.3
        ? floor
        : camToPlaneOutside < -0.3
          ? 1.0
          : floor + ((-camToPlaneOutside + 0.3) / 0.6) * span;
      const cur = opacityRef.current[wall.key] ?? 1;
      const next = cur + (target - cur) * 0.18;
      opacityRef.current[wall.key] = next;
      mat.opacity = next;
      const prevDW = depthWriteRef.current[wall.key];
      const nextDW = next >= 0.95 ? true : next <= 0.45 ? false : prevDW;
      if (nextDW !== prevDW) {
        mat.depthWrite = nextDW;
        depthWriteRef.current[wall.key] = nextDW;
      }
    }
  });
  return null;
}

// ---------- Tone-mapping exposure live updater ----------
// Mutates the renderer's `toneMappingExposure` whenever the prop changes so
// warmth picks in the materials page take effect immediately without
// recreating the WebGL context (which would destroy GLBs, env maps, and the
// orbit camera state).
function ExposureController({ exposure }: { exposure: number }) {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMappingExposure = exposure;
  }, [gl, exposure]);
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
      // Camera nudged SOUTH of target so screen-up = +z (north) — matches the
      // Planner2D convention (north at top of canvas). The 0.01 epsilon avoids
      // the gimbal singularity from a perfectly vertical look-down.
      return { pos: new THREE.Vector3(cx, Math.max(roomW, roomD) * 1.5, cz - 0.01), tgt: new THREE.Vector3(cx, 0, cz) };
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
    // corner — eye-level 3/4 view, not overhead
    return { pos: new THREE.Vector3(roomW * 0.72, roomH * 0.60, roomD * 0.92), tgt: new THREE.Vector3(0, roomH * 0.28, 0) };
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
