import { Suspense, useEffect, useMemo, useRef, useState, memo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, OrbitControls, SoftShadows, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useStore, type Item } from '../store/useStore';

interface Viewer3DProps {
  compact?: boolean;
  captureId?: string;
  /** When true, the 3D canvas uses frameloop="demand" to save GPU resources */
  inactive?: boolean;
  /** Optional set of item IDs to highlight with a glow effect */
  whatifGlowIds?: Set<string>;
}

type CameraPreset = 'top' | 'eye' | 'corner' | 'walk';

// ── PBR Material Helper ──────────────────────────────────────────────

/** Derive a category from the item code for PBR material selection */
function deriveCategory(code: string): string {
  const c = code.toLowerCase();
  if (c.includes('bed') || c.includes('mattress')) return 'sleeping';
  if (c.includes('sofa') || c.includes('diwan') || c.includes('pouffe') || c.includes('settee') || c.includes('chaise') || c.includes('bench') || c.includes('chair') || c.includes('stool') || c.includes('ottoman')) return 'seating';
  if (c.includes('wardrobe') || c.includes('bookshelf') || c.includes('shelf') || c.includes('rack') || c.includes('tv') || c.includes('chest') || c.includes('shoe') || c.includes('cabinet') || c.includes('drawer')) return 'storage';
  if (c.includes('dining') || c.includes('coffee') || c.includes('table')) return 'dining';
  if (c.includes('desk') || c.includes('office')) return 'work';
  if (c.includes('counter') || c.includes('sink') || c.includes('chimney') || c.includes('trolley') || c.includes('overhead')) return 'kitchen';
  if (c.includes('pooja') || c.includes('mandir') || c.includes('prayer') || c.includes('chowki')) return 'pooja';
  if (c.includes('fan') || c.includes('mirror') || c.includes('curtain') || c.includes('ac') || c.includes('geyser') || c.includes('clock') || c.includes('light') || c.includes('lamp')) return 'fixtures';
  return 'storage';
}

/** Return PBR roughness/metalness based on the item's category */
function getPBRValues(category: string): { roughness: number; metalness: number } {
  switch (category) {
    case 'seating':
      return { roughness: 0.85, metalness: 0 };
    case 'sleeping':
      return { roughness: 0.6, metalness: 0 };
    case 'storage':
      return { roughness: 0.5, metalness: 0.03 };
    case 'dining':
      return { roughness: 0.55, metalness: 0 };
    case 'work':
      return { roughness: 0.5, metalness: 0 };
    case 'kitchen':
      return { roughness: 0.35, metalness: 0.1 };
    case 'pooja':
      return { roughness: 0.45, metalness: 0.2 };
    case 'fixtures':
      return { roughness: 0.28, metalness: 0.7 };
    default:
      return { roughness: 0.6, metalness: 0.05 };
  }
}

/** Get PBR material props for a given item, blending category defaults with item color */
function getPBRMaterial(item: Item): { roughness: number; metalness: number } {
  const category = deriveCategory(item.code);
  return getPBRValues(category);
}

// ── Utilities ────────────────────────────────────────────────────────

function floorColor(flooring: 'vitrified-tiles' | 'wood-laminate' | 'marble') {
  if (flooring === 'wood-laminate') return '#C4A882';
  if (flooring === 'marble') return '#E8E5DF';
  return '#D6D0C8';
}

function lightenHex(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function getSunPosition(city: string, timeOfDay: number): [number, number, number] {
  const latitudes: Record<string, number> = {
    Mumbai: 19, Delhi: 28, Bangalore: 12, Chennai: 13,
    Hyderabad: 17, Pune: 18, Kolkata: 22, Ahmedabad: 23,
  };
  const lat = latitudes[city] ?? 20;
  const hour = 6 + timeOfDay * 12;
  const angle = ((hour - 6) / 12) * Math.PI;
  const elevation = Math.sin(angle) * 8;
  const horizontal = Math.cos(angle) * 10;
  const seasonTilt = (lat - 20) * 0.3;
  return [horizontal, Math.max(0.5, elevation), seasonTilt];
}

// ── Micro-Animation: Settle Effect ───────────────────────────────────

/** Track which item IDs are "new" and animate them settling into place */
const newItemIds = new Set<string>();

function AnimatedFurniture({ item, roomWidth, roomLength, active, children }: {
  item: Item;
  roomWidth: number;
  roomLength: number;
  active: boolean;
  children: React.ReactNode;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const targetY = useRef(0);
  const settled = useRef(false);

  // Mark as new on first render
  useEffect(() => {
    if (!newItemIds.has(item.id)) {
      newItemIds.add(item.id);
      targetY.current = 0.3; // start elevated
      settled.current = false;
    }
  }, [item.id]);

  useFrame(() => {
    if (!groupRef.current || settled.current) return;
    const currentY = groupRef.current.position.y;
    const delta = targetY.current - currentY;
    if (Math.abs(delta) < 0.001) {
      groupRef.current.position.y = targetY.current;
      settled.current = true;
      return;
    }
    groupRef.current.position.y += delta * 0.12;
  });

  const x = item.x - roomWidth / 2;
  const z = item.y - roomLength / 2;

  return (
    <group ref={groupRef} position={[x, 0, z]}>
      {children}
    </group>
  );
}

// ── GLTF Furniture ───────────────────────────────────────────────────

/** Inner component that actually calls useGLTF — wrapped in Suspense + error boundary */
function GLTFFurnitureInner({ item, roomWidth, roomLength, active }: { item: Item; roomWidth: number; roomLength: number; active: boolean }) {
  const { scene } = useGLTF(item.modelPath as string);
  const rotY = (item.rotation * Math.PI) / 180;

  const model = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((mat) => mat.clone());
      } else if (mesh.material) {
        mesh.material = mesh.material.clone();
      }
    });
    return cloned;
  }, [scene]);

  const { scale, yOffset } = useMemo(() => {
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const fit = Math.min(item.width / (size.x || 1), item.height / (size.y || 1), item.length / (size.z || 1));
    return { scale: fit, yOffset: -(bounds.min.y * fit) };
  }, [item.height, item.length, item.width, model]);

  useEffect(() => {
    model.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((mat) => {
        const standard = mat as THREE.MeshStandardMaterial;
        if ('emissive' in standard) {
          standard.emissive.set(active ? '#1a1208' : '#000000');
          standard.emissiveIntensity = active ? 0.2 : 0;
        }
      });
    });
  }, [active, model]);

  return (
    <AnimatedFurniture item={item} roomWidth={roomWidth} roomLength={roomLength} active={active}>
      <group position={[0, yOffset, 0]} rotation={[0, rotY, 0]} scale={[scale, scale, scale]}>
        <primitive object={model} />
      </group>
    </AnimatedFurniture>
  );
}

/** Error boundary wrapper for GLTF loading failures — renders procedural fallback */
function GLTFErrorFallback({ item, roomWidth, roomLength, active }: { item: Item; roomWidth: number; roomLength: number; active: boolean }) {
  return <FallbackFurnitureInner item={item} roomWidth={roomWidth} roomLength={roomLength} active={active} />;
}

/** GLTFFurniture with React.memo and error handling — falls back to procedural geometry on load failure */
const GLTFFurniture = memo(function GLTFFurniture({ item, roomWidth, roomLength, active }: { item: Item; roomWidth: number; roomLength: number; active: boolean }) {
  // Validate modelPath before attempting useGLTF
  if (!item.modelPath || typeof item.modelPath !== 'string' || item.modelPath.trim() === '') {
    return <GLTFErrorFallback item={item} roomWidth={roomWidth} roomLength={roomLength} active={active} />;
  }

  // Wrap in error boundary via try/catch at the component level
  // The Suspense boundary in SceneContent will catch async loading errors
  return (
    <Suspense fallback={<GLTFErrorFallback item={item} roomWidth={roomWidth} roomLength={roomLength} active={active} />}>
      <GLTFFurnitureInner item={item} roomWidth={roomWidth} roomLength={roomLength} active={active} />
    </Suspense>
  );
}, (prev, next) => {
  return prev.item.id === next.item.id &&
    prev.item.modelPath === next.item.modelPath &&
    prev.item.width === next.item.width &&
    prev.item.length === next.item.length &&
    prev.item.height === next.item.height &&
    prev.item.rotation === next.item.rotation &&
    prev.item.color === next.item.color &&
    prev.active === next.active &&
    prev.roomWidth === next.roomWidth &&
    prev.roomLength === next.roomLength;
});

// ── Fallback Procedural Furniture ────────────────────────────────────

/** Inner procedural geometry renderer (used both by FallbackFurniture and GLTFErrorFallback) */
function FallbackFurnitureInner({ item, roomWidth, roomLength, active }: { item: Item; roomWidth: number; roomLength: number; active: boolean }) {
  const rotY = (item.rotation * Math.PI) / 180;
  const em = active ? '#1a1208' : '#000000';
  const emI = active ? 0.25 : 0;
  const pbr = getPBRMaterial(item);

  const inner = (() => {
    if (item.code.includes('bed')) {
      return (
        <group rotation={[0, rotY, 0]}>
          <mesh castShadow receiveShadow position={[0, 0.12, 0]}>
            <boxGeometry args={[item.width, 0.24, item.length]} />
            <meshStandardMaterial color={lightenHex(item.color, -20)} roughness={pbr.roughness} metalness={pbr.metalness} emissive={em} emissiveIntensity={emI} />
          </mesh>
          <mesh castShadow position={[0, 0.3, 0.04]}>
            <boxGeometry args={[item.width - 0.04, 0.18, item.length - 0.1]} />
            <meshStandardMaterial color={lightenHex(item.color, 30)} roughness={pbr.roughness + 0.1} metalness={pbr.metalness} emissive={em} emissiveIntensity={emI} />
          </mesh>
          <mesh castShadow position={[0, 0.56, -(item.length / 2) + 0.06]}>
            <boxGeometry args={[item.width, 0.72, 0.1]} />
            <meshStandardMaterial color={item.color} roughness={pbr.roughness - 0.1} metalness={pbr.metalness} emissive={em} emissiveIntensity={emI} />
          </mesh>
          <mesh castShadow position={[-item.width * 0.2, 0.42, -(item.length / 2) + 0.35]}>
            <boxGeometry args={[item.width * 0.32, 0.08, 0.42]} />
            <meshStandardMaterial color="#F5F0E8" roughness={0.98} metalness={0} />
          </mesh>
          <mesh castShadow position={[item.width * 0.2, 0.42, -(item.length / 2) + 0.35]}>
            <boxGeometry args={[item.width * 0.32, 0.08, 0.42]} />
            <meshStandardMaterial color="#F0EBE3" roughness={0.98} metalness={0} />
          </mesh>
        </group>
      );
    }

    if (item.code.includes('wardrobe')) {
      const doorW = item.width / 3;
      return (
        <group rotation={[0, rotY, 0]}>
          <mesh castShadow receiveShadow position={[0, item.height / 2, 0]}>
            <boxGeometry args={[item.width, item.height, item.length]} />
            <meshStandardMaterial color={item.color} roughness={pbr.roughness} metalness={pbr.metalness} emissive={em} emissiveIntensity={emI} />
          </mesh>
          {[-doorW, 0, doorW].map((dx, i) => (
            <mesh key={i} castShadow position={[dx, item.height * 0.5, item.length / 2 + 0.005]}>
              <boxGeometry args={[doorW - 0.02, item.height * 0.9, 0.01]} />
              <meshStandardMaterial color={lightenHex(item.color, 15)} roughness={pbr.roughness - 0.1} metalness={pbr.metalness} />
            </mesh>
          ))}
          {[-doorW + 0.14, 0.14, doorW + 0.14].map((dx, i) => (
            <mesh key={i} castShadow position={[dx, item.height * 0.52, item.length / 2 + 0.02]}>
              <cylinderGeometry args={[0.01, 0.01, 0.08, 8]} />
              <meshStandardMaterial color="#C8A96E" metalness={0.7} roughness={0.2} />
            </mesh>
          ))}
        </group>
      );
    }

    if (item.code.includes('desk') || item.code.includes('table') || item.code.includes('tv')) {
      const legH = 0.72;
      return (
        <group rotation={[0, rotY, 0]}>
          <mesh castShadow receiveShadow position={[0, legH + 0.025, 0]}>
            <boxGeometry args={[item.width, 0.05, item.length]} />
            <meshStandardMaterial color={item.color} roughness={pbr.roughness} metalness={pbr.metalness} emissive={em} emissiveIntensity={emI} />
          </mesh>
          {[[-(item.width / 2 - 0.05), -(item.length / 2 - 0.05)], [(item.width / 2 - 0.05), -(item.length / 2 - 0.05)], [-(item.width / 2 - 0.05), (item.length / 2 - 0.05)], [(item.width / 2 - 0.05), (item.length / 2 - 0.05)]].map(([lx, lz], i) => (
            <mesh key={i} castShadow position={[lx as number, legH / 2, lz as number]}>
              <boxGeometry args={[0.04, legH, 0.04]} />
              <meshStandardMaterial color={lightenHex(item.color, -20)} roughness={pbr.roughness + 0.1} metalness={pbr.metalness} />
            </mesh>
          ))}
        </group>
      );
    }

    // Sofa / seating with cushion
    if (item.name.toLowerCase().includes('sofa') || item.name.toLowerCase().includes('l-shaped')) {
      const seatH = 0.42;
      const cushionH = 0.14;
      const backH = 0.38;
      const armW = 0.12;
      const cushionColor = lightenHex(item.color, 10);
      return (
        <group rotation={[0, rotY, 0]}>
          {/* Base/frame */}
          <mesh castShadow receiveShadow position={[0, seatH / 2, 0]}>
            <boxGeometry args={[item.width, seatH, item.length]} />
            <meshStandardMaterial color={item.color} roughness={pbr.roughness} metalness={pbr.metalness} emissive={em} emissiveIntensity={emI} />
          </mesh>
          {/* Seat cushion */}
          <mesh castShadow position={[0, seatH + cushionH / 2, item.length * 0.06]}>
            <boxGeometry args={[item.width - armW * 2 - 0.04, cushionH, item.length * 0.7]} />
            <meshStandardMaterial color={cushionColor} roughness={pbr.roughness + 0.07} metalness={pbr.metalness} emissive={em} emissiveIntensity={emI} />
          </mesh>
          {/* Back */}
          <mesh castShadow position={[0, seatH + backH / 2 + cushionH, -(item.length / 2) + 0.08]}>
            <boxGeometry args={[item.width, backH, 0.15]} />
            <meshStandardMaterial color={lightenHex(item.color, -8)} roughness={pbr.roughness} metalness={pbr.metalness} emissive={em} emissiveIntensity={emI} />
          </mesh>
          {/* Left armrest */}
          <mesh castShadow position={[-(item.width / 2) + armW / 2, seatH + 0.12, 0]}>
            <boxGeometry args={[armW, 0.24, item.length * 0.85]} />
            <meshStandardMaterial color={lightenHex(item.color, -15)} roughness={pbr.roughness - 0.04} metalness={pbr.metalness} />
          </mesh>
          {/* Right armrest */}
          <mesh castShadow position={[(item.width / 2) - armW / 2, seatH + 0.12, 0]}>
            <boxGeometry args={[armW, 0.24, item.length * 0.85]} />
            <meshStandardMaterial color={lightenHex(item.color, -15)} roughness={pbr.roughness - 0.04} metalness={pbr.metalness} />
          </mesh>
        </group>
      );
    }

    // Bookshelf
    if (item.name.toLowerCase().includes('bookshelf') || item.name.toLowerCase().includes('shelf') || item.name.toLowerCase().includes('rack')) {
      const shelves = 4;
      const shelfGap = item.height / (shelves + 1);
      return (
        <group rotation={[0, rotY, 0]}>
          {/* Frame */}
          <mesh castShadow receiveShadow position={[0, item.height / 2, 0]}>
            <boxGeometry args={[item.width, item.height, item.length]} />
            <meshStandardMaterial color={item.color} roughness={pbr.roughness} metalness={pbr.metalness} emissive={em} emissiveIntensity={emI} transparent opacity={0.85} />
          </mesh>
          {/* Shelves */}
          {Array.from({ length: shelves }).map((_, i) => (
            <mesh key={i} castShadow position={[0, shelfGap * (i + 1), 0]}>
              <boxGeometry args={[item.width - 0.04, 0.025, item.length - 0.02]} />
              <meshStandardMaterial color={lightenHex(item.color, 15)} roughness={pbr.roughness - 0.1} metalness={pbr.metalness} />
            </mesh>
          ))}
        </group>
      );
    }

    // Pooja / Mandir
    if (item.name.toLowerCase().includes('pooja') || item.name.toLowerCase().includes('mandir') || item.name.toLowerCase().includes('prayer')) {
      return (
        <group rotation={[0, rotY, 0]}>
          <mesh castShadow receiveShadow position={[0, item.height / 2, 0]}>
            <boxGeometry args={[item.width, item.height, item.length]} />
            <meshStandardMaterial color="#D4A853" roughness={pbr.roughness} metalness={pbr.metalness} emissive="#C8A96E" emissiveIntensity={0.15} />
          </mesh>
          {/* Arch detail */}
          <mesh castShadow position={[0, item.height * 0.78, item.length / 2 + 0.01]}>
            <torusGeometry args={[item.width * 0.3, 0.02, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#C8A96E" metalness={0.6} roughness={0.3} />
          </mesh>
          {/* Interior glow */}
          <pointLight position={[0, item.height * 0.6, 0]} intensity={0.3} color="#FFD89B" distance={1.5} />
        </group>
      );
    }

    if (item.code.includes('chair') || item.code.includes('settee') || item.code.includes('chaise') || item.code.includes('bench')) {
      return (
        <group rotation={[0, rotY, 0]}>
          <mesh castShadow receiveShadow position={[0, 0.42, 0.04]}>
            <boxGeometry args={[item.width, 0.1, item.length * 0.6]} />
            <meshStandardMaterial color={item.color} roughness={pbr.roughness} metalness={pbr.metalness} emissive={em} emissiveIntensity={emI} />
          </mesh>
          <mesh castShadow position={[0, 0.68, -(item.length * 0.25)]}>
            <boxGeometry args={[item.width, 0.5, 0.1]} />
            <meshStandardMaterial color={lightenHex(item.color, -10)} roughness={pbr.roughness} metalness={pbr.metalness} emissive={em} emissiveIntensity={emI} />
          </mesh>
          {[[-item.width / 2 + 0.06, 0.06], [item.width / 2 - 0.06, 0.06], [-item.width / 2 + 0.06, item.length * 0.3], [item.width / 2 - 0.06, item.length * 0.3]].map(([lx, lz], i) => (
            <mesh key={i} position={[lx as number, 0.2, lz as number]}>
              <boxGeometry args={[0.04, 0.4, 0.04]} />
              <meshStandardMaterial color={lightenHex(item.color, -25)} roughness={pbr.roughness + 0.05} metalness={pbr.metalness} />
            </mesh>
          ))}
        </group>
      );
    }

    return (
      <mesh castShadow receiveShadow position={[0, item.height / 2, 0]} rotation={[0, rotY, 0]}>
        <boxGeometry args={[item.width, item.height, item.length]} />
        <meshStandardMaterial color={item.color} roughness={pbr.roughness} metalness={pbr.metalness} emissive={em} emissiveIntensity={emI} />
      </mesh>
    );
  })();

  return (
    <AnimatedFurniture item={item} roomWidth={roomWidth} roomLength={roomLength} active={active}>
      {inner}
    </AnimatedFurniture>
  );
}

/** FallbackFurniture with React.memo — delegates to GLTF if modelPath exists, else procedural */
const FallbackFurniture = memo(function FallbackFurniture({ item, roomWidth, roomLength, active }: { item: Item; roomWidth: number; roomLength: number; active: boolean }) {
  if (item.modelPath) {
    return <GLTFFurniture item={item} roomWidth={roomWidth} roomLength={roomLength} active={active} />;
  }
  return <FallbackFurnitureInner item={item} roomWidth={roomWidth} roomLength={roomLength} active={active} />;
}, (prev, next) => {
  return prev.item.id === next.item.id &&
    prev.item.modelPath === next.item.modelPath &&
    prev.item.width === next.item.width &&
    prev.item.length === next.item.length &&
    prev.item.height === next.item.height &&
    prev.item.rotation === next.item.rotation &&
    prev.item.color === next.item.color &&
    prev.active === next.active &&
    prev.roomWidth === next.roomWidth &&
    prev.roomLength === next.roomLength;
});

// ── Camera Presets UI — cinematic dark bar ───────────────────────────

function CameraPresets({ preset, onPresetChange }: { preset: CameraPreset; onPresetChange: (p: CameraPreset) => void }) {
  const presets: Array<{ key: CameraPreset; label: string; hint: string }> = [
    { key: 'top', label: 'Plan', hint: 'Bird\'s-eye floor plan view' },
    { key: 'eye', label: 'Eye', hint: 'Human height perspective' },
    { key: 'corner', label: '3/4', hint: 'Three-quarter cinematic angle' },
    { key: 'walk', label: 'Walk', hint: 'Free-roam exploration' },
  ];

  return (
    <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 1, background: 'rgba(28,24,18,0.78)', borderRadius: 10, padding: 3, zIndex: 10, backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}>
      {presets.map(p => (
        <button
          key={p.key}
          type="button"
          onClick={() => onPresetChange(p.key)}
          title={p.hint}
          style={{
            padding: '5px 14px',
            borderRadius: 8,
            border: 'none',
            background: preset === p.key ? 'rgba(200,169,110,0.2)' : 'transparent',
            color: preset === p.key ? '#D4B896' : 'rgba(255,255,255,0.6)',
            fontSize: 11,
            fontFamily: 'var(--f-mono)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontWeight: preset === p.key ? 600 : 400,
            transition: 'all 200ms ease',
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ── Scene Content ────────────────────────────────────────────────────

function SceneContent({ preset, city, timeOfDay, whatifGlowIds }: { preset: CameraPreset; city: string; timeOfDay: number; whatifGlowIds?: Set<string> }) {
  const room = useStore((s) => s.room);
  const materials = useStore((s) => s.materials);
  const items = useStore((s) => s.items);
  const activeItemId = useStore((s) => s.activeItemId);
  const doorWindows = useStore((s) => s.doorWindows);
  const setActiveItem = useStore((s) => s.setActiveItem);

  const CEILING_H = 2.8;
  const wallColor = materials.wallColor || '#F0E8D8';
  const flrColor = floorColor(materials.flooring);
  const [sunX, sunY, sunZ] = getSunPosition(city, timeOfDay);

  const wallMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.92, metalness: 0.02 }), [wallColor]);
  const wallMaterialLight = useMemo(() => new THREE.MeshStandardMaterial({ color: lightenHex(wallColor, 15), roughness: 0.92, metalness: 0.02 }), [wallColor]);
  const ceilingMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#FDFBF7', roughness: 0.95, metalness: 0 }), []);

  const wallSegments3D = [
    { x1: -room.width / 2, y1: -room.length / 2, x2: room.width / 2, y2: -room.length / 2 },
    { x1: room.width / 2, y1: -room.length / 2, x2: room.width / 2, y2: room.length / 2 },
    { x1: room.width / 2, y1: room.length / 2, x2: -room.width / 2, y2: room.length / 2 },
    { x1: -room.width / 2, y1: room.length / 2, x2: -room.width / 2, y2: -room.length / 2 },
  ];

  return (
    <>
      {/* ── Enhanced Lighting ── */}
      <ambientLight intensity={0.55} color="#FFF8F2" />

      {/* Hemisphere light for sky/ground bounce (ambient occlusion) */}
      <hemisphereLight args={['#FFF8F2', '#8B6914', 0.4]} />

      {/* Main directional light with soft shadows */}
      <directionalLight
        castShadow
        position={[sunX, sunY, sunZ]}
        intensity={1.4}
        color={timeOfDay < 0.3 ? '#FFE4C4' : timeOfDay > 0.7 ? '#FFCBA4' : '#FFF5E8'}
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-far={40}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-5}
        shadow-bias={-0.0001}
        shadow-normalBias={0.02}
        shadow-radius={1.5}
      />

      {/* Fill point light near ceiling center */}
      <pointLight position={[0, CEILING_H - 0.3, 0]} intensity={0.3} color="#FFE8D0" />

      {/* Side accent light */}
      <pointLight position={[room.width * 0.4, 2.2, 0]} intensity={0.4} color="#E8F0FF" />

      {/* ── Floor ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={() => setActiveItem(null)}>
        <planeGeometry args={[room.width + 0.2, room.length + 0.2]} />
        <meshStandardMaterial color={flrColor} roughness={0.75} metalness={0.02} />
      </mesh>

      {/* ── Walls ── */}
      <mesh receiveShadow position={[0, CEILING_H / 2, -room.length / 2]}>
        <boxGeometry args={[room.width + 0.1, CEILING_H, 0.08]} />
        <primitive object={wallMaterial} attach="material" />
      </mesh>
      <mesh receiveShadow position={[-room.width / 2, CEILING_H / 2, 0]}>
        <boxGeometry args={[0.08, CEILING_H, room.length + 0.1]} />
        <primitive object={wallMaterial} attach="material" />
      </mesh>
      <mesh receiveShadow position={[room.width / 2, CEILING_H / 2, 0]}>
        <boxGeometry args={[0.08, CEILING_H, room.length + 0.1]} />
        <primitive object={wallMaterialLight} attach="material" />
      </mesh>
      <mesh receiveShadow position={[0, CEILING_H / 2, room.length / 2]} visible={preset !== 'walk'}>
        <boxGeometry args={[room.width + 0.1, CEILING_H, 0.08]} />
        <meshStandardMaterial color={wallColor} roughness={0.92} metalness={0.02} transparent opacity={0.5} />
      </mesh>

      {/* ── Ceiling ── */}
      <mesh position={[0, CEILING_H, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[room.width + 0.1, room.length + 0.1]} />
        <primitive object={ceilingMat} attach="material" />
      </mesh>

      {/* ── Ceiling light fixture ── */}
      <mesh position={[0, CEILING_H - 0.02, 0]}>
        <torusGeometry args={[Math.max(room.width, room.length) * 0.6, 0.015, 8, 4]} />
        <meshStandardMaterial color="#FFE8C0" emissive="#FFD89B" emissiveIntensity={0.6} roughness={0.3} />
      </mesh>

      {/* ── Baseboards ── */}
      <mesh position={[0, 0.06, -room.length / 2 + 0.04]}>
        <boxGeometry args={[room.width, 0.12, 0.02]} />
        <meshStandardMaterial color={lightenHex(wallColor, -20)} roughness={0.9} />
      </mesh>
      <mesh position={[-room.width / 2 + 0.04, 0.06, 0]}>
        <boxGeometry args={[0.02, 0.12, room.length]} />
        <meshStandardMaterial color={lightenHex(wallColor, -20)} roughness={0.9} />
      </mesh>

      {/* ── Door/Window markers from store ── */}
      {doorWindows.map((dw) => {
        const seg = wallSegments3D[dw.wallIndex];
        if (!seg) return null;
        const x = seg.x1 + (seg.x2 - seg.x1) * dw.position;
        const z = seg.y1 + (seg.y2 - seg.y1) * dw.position;
        const isHorizontal = Math.abs(seg.x2 - seg.x1) > Math.abs(seg.y2 - seg.y1);
        return (
          <mesh key={dw.id} position={[x, dw.type === 'door' ? 1.05 : 1.5, z]}>
            <boxGeometry args={[isHorizontal ? (dw.type === 'door' ? 0.9 : 1.2) : 0.08, dw.type === 'door' ? 2.1 : 1.2, isHorizontal ? 0.08 : (dw.type === 'door' ? 0.9 : 1.2)]} />
            <meshStandardMaterial color={dw.type === 'door' ? '#1C1917' : '#A8D8EA'} roughness={0.5} metalness={dw.type === 'door' ? 0.3 : 0.1} />
          </mesh>
        );
      })}

      {/* ── Furniture ── */}
      <Suspense fallback={null}>
        {items.map((item) => {
          const isWhatifHighlighted = whatifGlowIds?.has(item.id);
          return (
            <group key={item.id} onClick={(event) => { event.stopPropagation(); setActiveItem(item.id); }}>
              {isWhatifHighlighted && (
                <pointLight position={[item.x - room.width / 2, 1.5, item.y - room.length / 2]} intensity={0.6} color="#C8A96E" distance={3} />
              )}
              <FallbackFurniture item={item} roomWidth={room.width} roomLength={room.length} active={activeItemId === item.id} />
            </group>
          );
        })}
      </Suspense>

      {/* ── Enhanced Contact Shadows ── */}
      <ContactShadows position={[0, 0.001, 0]} opacity={0.45} scale={Math.max(room.width, room.length) * 2} blur={3} far={6} color="#2C1810" />

      {/* ── Grid ── */}
      <gridHelper args={[Math.max(room.width, room.length) * 2, Math.max(room.width, room.length) * 2, '#D6C4A3', '#E8E5DF']} position={[0, 0.002, 0]} />

      {/* ── Controls ── */}
      <OrbitControls target={[0, CEILING_H * 0.3, 0]} minPolarAngle={Math.PI / 12} maxPolarAngle={Math.PI / 2.1} minDistance={3} maxDistance={25} enablePan={preset === 'walk'} dampingFactor={0.08} enableDamping />

      {/* ── Environment ── */}
      <Environment preset="apartment" environmentIntensity={0.6} />
    </>
  );
}

// ── Main Viewer3D Export ─────────────────────────────────────────────

export default function Viewer3D({ compact = false, captureId, inactive = false, whatifGlowIds }: Viewer3DProps) {
  const room = useStore((s) => s.room);
  const [preset, setPreset] = useState<CameraPreset>('corner');
  const [timeOfDay, setTimeOfDay] = useState(0.4);
  const [city] = useState('Mumbai');

  const cameraPosition: [number, number, number] = compact
    ? [room.width * 0.6, room.width * 0.5, room.length * 0.6]
    : [room.width * 0.9, room.width * 0.7, room.length * 0.9];

  return (
    <section id={captureId} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <Canvas
        shadows
        camera={{ position: cameraPosition, fov: 38 }}
        style={{ background: '#F4F3EE' }}
        frameloop={inactive ? 'demand' : 'always'}
        gl={{
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
      >
        <color attach="background" args={['#F4F3EE']} />

        {/* Soft Shadows wrapper for penumbra */}
        <SoftShadows size={25} focus={0.5} samples={16} />

        <SceneContent preset={preset} city={city} timeOfDay={timeOfDay} whatifGlowIds={whatifGlowIds} />
      </Canvas>

      <CameraPresets preset={preset} onPresetChange={setPreset} />

      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, background: 'rgba(255,255,255,0.9)', borderRadius: 12, padding: '8px 14px', border: '1px solid var(--n-200)', display: 'flex', alignItems: 'center', gap: 8, backdropFilter: 'blur(8px)' }}>
        <span style={{ fontSize: 11, color: 'var(--n-500)', fontFamily: 'var(--f-body)' }}>☀️</span>
        <input type="range" min={0} max={100} value={Math.round(timeOfDay * 100)} onChange={(e) => setTimeOfDay(Number(e.target.value) / 100)} style={{ width: 80, accentColor: 'var(--brand)' }} />
        <span style={{ fontSize: 10, color: 'var(--n-500)', fontFamily: 'var(--f-body)', minWidth: 50 }}>{`${Math.floor(6 + timeOfDay * 12)}:${String(Math.round((timeOfDay * 12) % 1 * 60)).padStart(2, '0')} ${6 + timeOfDay * 12 >= 12 ? 'PM' : 'AM'}`}</span>
      </div>
    </section>
  );
}