/**
 * Renders one PlacedItem inside the room-corner frame (parent group is at
 * [-w/2,0,-d/2]).
 *
 * Crash safety: an ErrorBoundary wraps every GLB load. A 404 or malformed
 * model shows the BoxFallback instead of crashing the whole Canvas.
 *
 * Tint: catalog tint_hex is blended 30% over the model's original colors,
 * not hard-replaced. This keeps multi-material models visually varied.
 */
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import type { PlacedItem, RoomState } from "@/api/types";
import { useAppStore } from "@/store/useAppStore";
import { mmToM } from "./units";
import { assetTuning } from "./assetTuning";

const SNAP_GRID_MM = 50;
const SNAP_WALL_MM = 120;

// ---------- Error boundary ----------

class GlbErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: ReactNode; children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    // Swallow the error — BoxFallback is shown instead.
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

// ---------- Public component ----------

interface Props {
  item: PlacedItem;
  room: RoomState;
  accent: string;
  selected: boolean;
  draggable: boolean;
  onSelect: (id: string) => void;
  onMoveCommit?: (id: string, x_mm: number, z_mm: number) => void;
}

export function GlbItem({ item, room, accent, selected, draggable, onSelect, onMoveCommit }: Props) {
  const layoutEditMode = useAppStore((s) => s.layoutEditMode);
  const w = mmToM(item.dimensions.width_mm);
  const d = mmToM(item.dimensions.depth_mm);
  const h = mmToM(item.dimensions.height_mm);
  const roomWmm = room.intake.room_dimensions.width_mm;
  const roomDmm = room.intake.room_dimensions.depth_mm;
  const roomHm = mmToM(room.intake.room_dimensions.height_mm);
  const { raycaster, camera, gl } = useThree();
  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  const [dragCentre, setDragCentre] = useState<{ x_mm: number; z_mm: number } | null>(null);
  const grabDeltaMm = useRef<{ x: number; z: number }>({ x: 0, z: 0 });

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
    if (!layoutEditMode || !draggable) return;
    const floor = pointerToRoomMm(ndcOf(e.clientX, e.clientY));
    if (!floor) return;
    grabDeltaMm.current = { x: floor.x_mm - item.position.x_mm, z: floor.z_mm - item.position.z_mm };
    setDragCentre({ x_mm: item.position.x_mm, z_mm: item.position.z_mm });
  }

  const isHot = selected || !!dragCentre;
  const fallback = <BoxFallback w={w} d={d} h={h} category={item.category} accent={accent} selected={isHot} draggable={draggable} />;
  const assetUrl = item.catalog?.asset_url;

  const placementType = item.catalog?.placement_type ?? "floor";
  const tuning = assetTuning(assetUrl ?? "");
  let groupY: number;
  let meshYNudge: number;
  if (placementType === "ceiling") {
    groupY = roomHm - h;
    meshYNudge = 0;
  } else if (placementType === "wall") {
    groupY = tuning.yNudge;
    meshYNudge = 0;
  } else {
    groupY = 0;
    meshYNudge = tuning.yNudge;
  }

  return (
    <group position={[x, groupY, z]} rotation={[0, rot, 0]} onPointerDown={onPointerDown}>
      {assetUrl ? (
        <GlbErrorBoundary fallback={fallback}>
          <Suspense fallback={fallback}>
            <GlbMesh
              assetUrl={assetUrl}
              tint={item.catalog.tint_hex}
              roughness={item.catalog.roughness_hint}
              yNudge={meshYNudge}
              w={w} d={d} h={h}
              selected={isHot}
              draggable={draggable}
            />
          </Suspense>
        </GlbErrorBoundary>
      ) : fallback}
      {isHot && <SelectionRing w={w} d={d} draggable={draggable} />}
    </group>
  );
}

// ---------- GLB mesh ----------

function applyMat(mat: THREE.MeshStandardMaterial, tint: string | null, roughness: number | null, selected: boolean, draggable: boolean) {
  // Restore or save the original color so tint is always relative to it,
  // not cumulative across re-renders.
  if (!mat.userData._origColor) {
    mat.userData._origColor = mat.color.clone();
  }
  const orig = mat.userData._origColor as THREE.Color;
  mat.color.copy(orig);
  if (tint) {
    // Blend 28% toward the catalog tint — keeps multi-material variety.
    mat.color.lerp(new THREE.Color(tint), 0.28);
  }
  if (roughness != null) mat.roughness = Math.max(0, Math.min(1, roughness));
  if (selected) {
    mat.emissive.set(draggable ? "#3a2a10" : "#241a0a");
    mat.emissiveIntensity = draggable ? 0.35 : 0.18;
  } else {
    mat.emissiveIntensity = 0;
  }
  mat.needsUpdate = true;
}

function GlbMesh({
  assetUrl, tint, roughness, yNudge, w, d, h, selected, draggable,
}: {
  assetUrl: string;
  tint: string | null;
  roughness: number | null;
  yNudge: number;
  w: number; d: number; h: number;
  selected: boolean;
  draggable: boolean;
}) {
  const { scene } = useGLTF(`/models/${assetUrl}`);

  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((node) => {
      if (!(node as THREE.Mesh).isMesh) return;
      const mesh = node as THREE.Mesh;
      const mat = mesh.material;
      if (Array.isArray(mat)) {
        mesh.material = mat.map((m) => {
          const cl = m.clone();
          // Store original color immediately on clone so first applyMat has it.
          if ((cl as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
            cl.userData._origColor = (cl as THREE.MeshStandardMaterial).color.clone();
          }
          return cl;
        });
      } else if (mat) {
        const cl = (mat as THREE.Material).clone();
        if ((cl as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
          cl.userData._origColor = (cl as THREE.MeshStandardMaterial).color.clone();
        }
        mesh.material = cl;
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
    return c;
  }, [scene]);

  useEffect(() => {
    cloned.traverse((node) => {
      if (!(node as THREE.Mesh).isMesh) return;
      const mesh = node as THREE.Mesh;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
          applyMat(m as THREE.MeshStandardMaterial, tint, roughness, selected, draggable);
        }
      }
    });
  }, [cloned, tint, roughness, selected, draggable]);

  const fit = useMemo(() => {
    const tuning = assetTuning(assetUrl);
    const native = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    native.getSize(size);
    if (size.x < 1e-5 || size.y < 1e-5 || size.z < 1e-5) {
      return { scaleX: 1, scaleY: 1, scaleZ: 1, offset: new THREE.Vector3(0, yNudge, 0) };
    }
    const scaleX = (w / size.x) * tuning.scaleMul;
    const scaleY = (h / size.y) * tuning.scaleMul;
    const scaleZ = (d / size.z) * tuning.scaleMul;
    const floorOffset = -native.min.y * scaleY;
    const cX = (native.min.x + native.max.x) * 0.5 * scaleX;
    const cZ = (native.min.z + native.max.z) * 0.5 * scaleZ;
    return { scaleX, scaleY, scaleZ, offset: new THREE.Vector3(-cX, floorOffset + yNudge, -cZ) };
  }, [cloned, assetUrl, yNudge, w, d, h]);

  return (
    <group scale={[fit.scaleX, fit.scaleY, fit.scaleZ]} position={fit.offset}>
      <primitive object={cloned} />
    </group>
  );
}

// ---------- Fallback + helpers ----------

function BoxFallback({ w, d, h, category, accent, selected, draggable }: {
  w: number; d: number; h: number; category: string; accent: string; selected: boolean; draggable: boolean;
}) {
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

function SelectionRing({ w, d, scale = 1, yOffset = 0.012, draggable }: {
  w: number; d: number; scale?: number; yOffset?: number; draggable: boolean;
}) {
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

// Preload the 12 new living-room GLBs so the first render doesn't stall.
useGLTF.preload("/models/sofa_3seat.glb");
useGLTF.preload("/models/sofa_l.glb");
useGLTF.preload("/models/tv_unit.glb");
useGLTF.preload("/models/coffee_table.glb");
useGLTF.preload("/models/lounge_chair.glb");
useGLTF.preload("/models/ottoman.glb");
useGLTF.preload("/models/bookshelf.glb");
useGLTF.preload("/models/lamp_floor.glb");
useGLTF.preload("/models/rug.glb");
useGLTF.preload("/models/chair.glb");
useGLTF.preload("/models/fan.glb");
useGLTF.preload("/models/plant.glb");
useGLTF.preload("/models/pooja_wall.glb");
