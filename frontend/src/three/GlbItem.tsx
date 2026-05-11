/**
 * Renders one PlacedItem inside the room-corner frame (parent group is at
 * [-w/2,0,-d/2]). `item.position.{x_mm,z_mm}` is the footprint CENTRE in room
 * coords, so the item's group sits at [mmToM(cx), 0, mmToM(cz)] and rotates
 * about that centre.
 *
 * GROUNDING: floor furniture is strictly grounded — the GLB is scaled to fit
 * the declared footprint, then a SECOND bounding-box pass measures the scaled
 * mesh and offsets it so its lowest vertex sits exactly on y=0 (no clipping,
 * no floating), independent of where the GLB's own origin is.
 *
 * DRAG: gated by `draggable` (= move-mode AND this item selected — see
 * useAppStore.editMode / RoomScene.moveMode). When not draggable, a pointer
 * down just selects; OrbitControls owns the cursor. When draggable, the item
 * follows the cursor on the floor plane (snapped to 50mm grid + walls) and
 * fires `onMoveCommit(id, cx_mm, cz_mm)` on release. OrbitControls is disabled
 * by the parent while move-mode is on, so there's no camera/drag fight.
 */
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import type { PlacedItem, RoomState } from "@/api/types";
import { mmToM } from "./units";
import { assetTuning } from "./assetTuning";

const SNAP_GRID_MM = 50;
const SNAP_WALL_MM = 120;

interface Props {
  item: PlacedItem;
  room: RoomState;
  accent: string;
  selected: boolean;
  /** Draggable iff move-mode AND this item is the selected one. */
  draggable: boolean;
  onSelect: (id: string) => void;
  onMoveCommit?: (id: string, x_mm: number, z_mm: number) => void;
}

export function GlbItem({ item, room, accent, selected, draggable, onSelect, onMoveCommit }: Props) {
  const w = mmToM(item.dimensions.width_mm);
  const d = mmToM(item.dimensions.depth_mm);
  const h = mmToM(item.dimensions.height_mm);
  const roomWmm = room.intake.room_dimensions.width_mm;
  const roomDmm = room.intake.room_dimensions.depth_mm;
  const { raycaster, camera, gl } = useThree();
  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  const [dragCentre, setDragCentre] = useState<{ x_mm: number; z_mm: number } | null>(null);
  const grabDeltaMm = useRef<{ x: number; z: number }>({ x: 0, z: 0 });

  // If move-mode turns off mid-drag, drop the drag.
  useEffect(() => {
    if (!draggable && dragCentre) setDragCentre(null);
  }, [draggable]); // eslint-disable-line react-hooks/exhaustive-deps

  const cxMm = dragCentre ? dragCentre.x_mm : item.position.x_mm;
  const czMm = dragCentre ? dragCentre.z_mm : item.position.z_mm;
  const x = mmToM(cxMm);
  const z = mmToM(czMm);
  const rot = (item.position.rotation_deg * Math.PI) / 180;

  function pointerToRoomMm(ndc: { x: number; y: number }): { x_mm: number; z_mm: number } | null {
    raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), camera);
    if (!raycaster.ray.intersectPlane(groundPlane, tmp)) return null;
    return { x_mm: Math.round(tmp.x * 1000 + roomWmm / 2), z_mm: Math.round(tmp.z * 1000 + roomDmm / 2) };
  }
  function ndcOf(clientX: number, clientY: number): { x: number; y: number } {
    const r = gl.domElement.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * 2 - 1, y: -((clientY - r.top) / r.height) * 2 + 1 };
  }
  function snap(cx: number, cz: number): { x_mm: number; z_mm: number } {
    let x_mm = Math.round(cx / SNAP_GRID_MM) * SNAP_GRID_MM;
    let z_mm = Math.round(cz / SNAP_GRID_MM) * SNAP_GRID_MM;
    const halfW = item.dimensions.width_mm / 2;
    const halfD = item.dimensions.depth_mm / 2;
    if (x_mm - halfW < SNAP_WALL_MM) x_mm = Math.round(halfW);
    if (z_mm - halfD < SNAP_WALL_MM) z_mm = Math.round(halfD);
    if (roomWmm - (x_mm + halfW) < SNAP_WALL_MM) x_mm = Math.round(roomWmm - halfW);
    if (roomDmm - (z_mm + halfD) < SNAP_WALL_MM) z_mm = Math.round(roomDmm - halfD);
    x_mm = Math.max(halfW, Math.min(x_mm, roomWmm - halfW));
    z_mm = Math.max(halfD, Math.min(z_mm, roomDmm - halfD));
    return { x_mm: Math.round(x_mm), z_mm: Math.round(z_mm) };
  }

  useEffect(() => {
    if (!dragCentre) return;
    function onMove(ev: PointerEvent) {
      const floor = pointerToRoomMm(ndcOf(ev.clientX, ev.clientY));
      if (!floor) return;
      setDragCentre(snap(floor.x_mm - grabDeltaMm.current.x, floor.z_mm - grabDeltaMm.current.z));
    }
    function onUp() {
      const final = dragCentre;
      setDragCentre(null);
      if (final && onMoveCommit && (final.x_mm !== item.position.x_mm || final.z_mm !== item.position.z_mm)) {
        onMoveCommit(item.id, final.x_mm, final.z_mm);
      }
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragCentre, item, onMoveCommit]); // eslint-disable-line react-hooks/exhaustive-deps

  function onPointerDown(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    onSelect(item.id);
    if (!draggable) return; // locked — selection only, OrbitControls owns the cursor
    const floor = pointerToRoomMm(ndcOf(e.clientX, e.clientY));
    if (!floor) return;
    grabDeltaMm.current = { x: floor.x_mm - item.position.x_mm, z: floor.z_mm - item.position.z_mm };
    setDragCentre({ x_mm: item.position.x_mm, z_mm: item.position.z_mm });
  }

  const isHot = selected || !!dragCentre;
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]} onPointerDown={onPointerDown}>
      <Suspense fallback={<BoxFallback w={w} d={d} h={h} category={item.category} accent={accent} selected={isHot} draggable={draggable} />}>
        <GlbMesh assetUrl={item.catalog.asset_url} tint={item.catalog.tint_hex} roughness={item.catalog.roughness_hint} w={w} d={d} h={h} selected={isHot} draggable={draggable} />
      </Suspense>
    </group>
  );
}

function GlbMesh({
  assetUrl,
  tint,
  roughness,
  w,
  d,
  h,
  selected,
  draggable,
}: {
  assetUrl: string;
  tint: string | null;
  roughness: number | null;
  w: number;
  d: number;
  h: number;
  selected: boolean;
  draggable: boolean;
}) {
  const { scene } = useGLTF(`/models/${assetUrl}`);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;
        const mat = mesh.material;
        if (Array.isArray(mat)) mesh.material = mat.map((m) => m.clone());
        else if (mat) mesh.material = (mat as THREE.Material).clone();
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);

  useEffect(() => {
    cloned.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mat = (node as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat && mat.isMeshStandardMaterial) {
          if (tint) mat.color = new THREE.Color(tint);
          if (roughness != null) mat.roughness = Math.max(0, Math.min(1, roughness));
          if (selected) {
            mat.emissive = new THREE.Color(draggable ? "#3a2a10" : "#241a0a");
            mat.emissiveIntensity = draggable ? 0.35 : 0.18;
          } else {
            mat.emissiveIntensity = 0;
          }
          mat.needsUpdate = true;
        }
      }
    });
  }, [cloned, tint, roughness, selected, draggable]);

  /**
   * Two-pass fit + ground (+ per-asset tuning from ./assetTuning):
   *   1. Measure the GLB's native bbox; pick a uniform scale so the larger
   *      horizontal extent fits max(w, d) and the height fits h, times the
   *      asset's `scaleMul` override.
   *   2. Re-measure the *scaled* bbox and translate so its centre is at
   *      (0, _, 0) and its MINIMUM y is exactly 0 (lowest vertex on the
   *      floor, regardless of the GLB's authored origin), then add the
   *      asset's `yNudge` (for wall-mounted items that should float).
   */
  const fit = useMemo(() => {
    const tuning = assetTuning(assetUrl);
    const native = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    native.getSize(size);
    if (size.x < 1e-5 || size.y < 1e-5 || size.z < 1e-5) {
      return { scale: 1, offset: new THREE.Vector3(0, tuning.yNudge, 0) };
    }
    const scale =
      Math.min(Math.max(w, d) / Math.max(size.x, size.z), h / size.y) * tuning.scaleMul;
    const minY = native.min.y * scale;
    const cX = (native.min.x + native.max.x) * 0.5 * scale;
    const cZ = (native.min.z + native.max.z) * 0.5 * scale;
    return { scale, offset: new THREE.Vector3(-cX, -minY + tuning.yNudge, -cZ) };
  }, [cloned, assetUrl, w, d, h]);

  return (
    <group scale={fit.scale} position={fit.offset}>
      <primitive object={cloned} />
      {/* selection ring drawn at floor level in the GlbMesh's UNSCALED frame */}
      {selected && <SelectionRing w={w} d={d} scale={1 / fit.scale} draggable={draggable} />}
    </group>
  );
}

function BoxFallback({ w, d, h, category, accent, selected, draggable }: { w: number; d: number; h: number; category: string; accent: string; selected: boolean; draggable: boolean }) {
  return (
    <group position={[0, h / 2, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={categoryColor(category, accent)}
          roughness={0.7}
          emissive={selected ? new THREE.Color(draggable ? "#3a2a10" : "#241a0a") : new THREE.Color("#000000")}
          emissiveIntensity={selected ? (draggable ? 0.35 : 0.18) : 0}
        />
      </mesh>
      {selected && <SelectionRing w={w} d={d} yOffset={-h / 2 + 0.01} draggable={draggable} />}
    </group>
  );
}

function SelectionRing({ w, d, scale = 1, yOffset = 0.012, draggable }: { w: number; d: number; scale?: number; yOffset?: number; draggable: boolean }) {
  const r = Math.max(w, d) * 0.62 * scale;
  return (
    <mesh position={[0, yOffset, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[r * 0.86, r, 48]} />
      <meshBasicMaterial color={draggable ? "#7DB46C" : "#D4A574"} side={THREE.DoubleSide} transparent opacity={0.92} depthWrite={false} />
    </mesh>
  );
}

function categoryColor(category: string, accent: string): string {
  switch (category) {
    case "seating": return "#8a7558";
    case "dining": return accent;
    case "tv_unit":
    case "storage": return "#5b4631";
    case "mandir": return "#c9a04a";
    case "sleeping": return "#a98c66";
    default: return "#9c8a6e";
  }
}

useGLTF.preload("/models/sofa_3seat.glb");
useGLTF.preload("/models/tv_unit.glb");
useGLTF.preload("/models/pooja_wall.glb");
