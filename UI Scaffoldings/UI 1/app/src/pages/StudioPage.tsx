import { useState, useRef, Suspense, lazy } from 'react';
import { useStore, VISIONS } from '../store/useStore';
import Logo from '../components/Logo';
import ChatPanel from '../components/ChatPanel';
import CostChip from '../components/CostChip';
import ChamferButton from '../components/ChamferButton';
import { Move, Maximize2, Palette, Hand } from 'lucide-react';

const FloorPlanSVG = lazy(() => import('../components/FloorPlanSVG'));

/* Simple 3D room using R3F */
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';

function Room3D({ selectedItem, onSelectItem }: { selectedItem: string | null; onSelectItem: (name: string | null) => void }) {
  const sofaRef = useRef<THREE.Mesh>(null);
  const tvRef = useRef<THREE.Mesh>(null);
  const mandirRef = useRef<THREE.Mesh>(null);
  const coffeeRef = useRef<THREE.Mesh>(null);
  const shelfRef = useRef<THREE.Mesh>(null);
  const deskRef = useRef<THREE.Mesh>(null);

  const furnitureItems = [
    { ref: sofaRef, name: 'sofa', pos: [0, 0.45, 1.2] as [number, number, number], size: [2.2, 0.5, 0.9] as [number, number, number], color: '#8A7560', roughness: 0.9 },
    { ref: tvRef, name: 'tvunit', pos: [0, 0.35, -1.8] as [number, number, number], size: [1.6, 0.4, 0.45] as [number, number, number], color: '#A67B5B', roughness: 0.5 },
    { ref: mandirRef, name: 'mandir', pos: [1.2, 0.4, -1.5] as [number, number, number], size: [0.5, 0.5, 0.4] as [number, number, number], color: '#B85A3A', roughness: 0.7 },
    { ref: coffeeRef, name: 'coffee', pos: [0, 0.22, 0.2] as [number, number, number], size: [1.0, 0.22, 0.6] as [number, number, number], color: '#E4D5C4', roughness: 0.6 },
    { ref: shelfRef, name: 'shelf', pos: [-1.5, 0.5, 0] as [number, number, number], size: [0.3, 1.8, 0.8] as [number, number, number], color: '#F5EDE0', roughness: 0.8 },
    { ref: deskRef, name: 'desk', pos: [1.4, 0.35, 0] as [number, number, number], size: [0.5, 0.35, 0.9] as [number, number, number], color: '#C8A882', roughness: 0.6 },
  ];

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[3.66, 4.27]} />
        <meshStandardMaterial color="#C8A882" roughness={0.7} />
      </mesh>

      {/* Walls */}
      <mesh position={[0, 1.5, -2.135]} receiveShadow>
        <planeGeometry args={[3.66, 3]} />
        <meshStandardMaterial color="#F5EDE0" roughness={0.95} />
      </mesh>
      <mesh position={[-1.83, 1.5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[4.27, 3]} />
        <meshStandardMaterial color="#F5EDE0" roughness={0.95} />
      </mesh>
      <mesh position={[1.83, 1.5, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[4.27, 3]} />
        <meshStandardMaterial color="#F5EDE0" roughness={0.95} />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, 3.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.66, 4.27]} />
        <meshStandardMaterial color="#FDF8F2" roughness={0.95} />
      </mesh>

      {/* Window (north wall) */}
      <mesh position={[0, 1.5, -2.12]}>
        <planeGeometry args={[1.2, 0.8]} />
        <meshStandardMaterial color="#7A9BB8" roughness={0.3} transparent opacity={0.4} />
      </mesh>

      {/* Furniture */}
      {furnitureItems.map((item) => (
        <mesh
          key={item.name}
          ref={item.ref}
          position={item.pos}
          castShadow
          receiveShadow
          onClick={(e) => {
            e.stopPropagation();
            onSelectItem(selectedItem === item.name ? null : item.name);
          }}
        >
          <boxGeometry args={item.size} />
          <meshStandardMaterial
            color={item.color}
            roughness={item.roughness}
            emissive={selectedItem === item.name ? '#D4A03C' : '#000000'}
            emissiveIntensity={selectedItem === item.name ? 0.15 : 0}
          />
        </mesh>
      ))}

      {/* Plant */}
      <mesh position={[-1.4, 0.2, 1.6]} castShadow>
        <cylinderGeometry args={[0.15, 0.12, 0.4, 16]} />
        <meshStandardMaterial color="#B85A3A" roughness={0.85} />
      </mesh>
      <mesh position={[-1.4, 0.5, 1.6]} castShadow>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color="#5B7A4A" roughness={0.8} />
      </mesh>
    </group>
  );
}

export default function StudioPage() {
  const { setScreen, selectedVision } = useStore();
  const [view, setView] = useState<'2d' | '3d'>('3d');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  const vision = VISIONS[selectedVision];

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-base)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          height: 56,
          padding: '0 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-color)',
          flexShrink: 0,
          gap: 16,
        }}
      >
        <Logo size="sm" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* View toggle */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-base)',
              padding: 3,
              gap: 2,
            }}
            className="chamfer-sm"
          >
            {[
              ['2D Plan', '2d'],
              ['3D View', '3d'],
            ].map(([label, id]) => (
              <div
                key={id}
                onClick={() => setView(id as '2d' | '3d')}
                className="chamfer-sm"
                style={{
                  padding: '6px 16px',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  fontFamily: 'var(--font-sans)',
                  background: view === id ? 'var(--bg-dark)' : 'transparent',
                  color: view === id ? 'var(--text-inverse)' : 'var(--text-muted)',
                }}
              >
                {label}
              </div>
            ))}
          </div>

          <CostChip cost={vision.cost} percent={84} />
          <ChamferButton variant="outline" onClick={() => setScreen('export')} style={{ padding: '8px 20px', fontSize: 12 }}>
            Export
          </ChamferButton>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Left: canvas */}
        <div
          style={{
            flex: '0 0 60%',
            borderRight: '1px solid var(--border-color)',
            background: view === '2d' ? 'var(--bg-base)' : '#2C2420',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {view === '2d' ? (
            <Suspense
              fallback={
                <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>
                  Loading plan...
                </div>
              }
            >
              <div style={{ width: '100%', height: '100%' }}>
                <FloorPlanSVG />
              </div>
            </Suspense>
          ) : (
            <Canvas
              camera={{ position: [3, 2.5, 3], fov: 45 }}
              dpr={[1, 2]}
              shadows
              style={{ width: '100%', height: '100%' }}
              onClick={() => setSelectedItem(null)}
            >
              <ambientLight intensity={0.3} />
              <directionalLight
                position={[2, 4, 1]}
                intensity={0.7}
                color="#FFF5E6"
                castShadow
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
              />
              <directionalLight position={[-1, 2, -1]} intensity={0.2} color="#E8DDD4" />
              <Environment preset="apartment" />
              <Room3D selectedItem={selectedItem} onSelectItem={setSelectedItem} />
              <OrbitControls
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                minDistance={2}
                maxDistance={8}
                target={[0, 1, 0]}
              />
            </Canvas>
          )}

          {/* Intent Menu overlay */}
          {selectedItem && (
            <div
              className="chamfer"
              style={{
                position: 'absolute',
                bottom: 80,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: 8,
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-color)',
                padding: '8px 12px',
                boxShadow: '0 4px 24px rgba(44,24,16,0.15)',
              }}
            >
              {[
                { icon: Move, label: 'Move' },
                { icon: Maximize2, label: 'Scale' },
                { icon: Palette, label: 'Style' },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="chamfer-sm"
                  style={{
                    padding: '8px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    border: '1px solid var(--border-color)',
                    background: '#fff',
                    transition: 'all 0.15s ease',
                    fontFamily: 'var(--font-sans)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-marigold)';
                    e.currentTarget.style.color = 'var(--accent-marigold)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  <Icon size={14} />
                  {label}
                </div>
              ))}
            </div>
          )}

          {/* Edit manually link */}
          <div
            onClick={() => setEditMode(!editMode)}
            style={{
              position: 'absolute',
              bottom: 16,
              left: 24,
              fontSize: 12,
              color: view === '3d' ? 'rgba(253,248,242,0.5)' : 'var(--text-muted)',
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
              fontFamily: 'var(--font-sans)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Hand size={13} />
            {editMode ? 'Exit edit mode' : 'Edit manually'}
          </div>

          {/* Vision name badge */}
          <div
            className="chamfer-sm"
            style={{
              position: 'absolute',
              top: 16,
              left: 24,
              background: view === '3d' ? 'rgba(44,36,32,0.7)' : 'var(--bg-panel)',
              backdropFilter: 'blur(8px)',
              padding: '6px 14px',
              fontSize: 12,
              color: view === '3d' ? 'var(--text-inverse)' : 'var(--text-secondary)',
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
            }}
          >
            {vision.name} &middot; {vision.cost}
          </div>
        </div>

        {/* Right: AI panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <ChatPanel />
        </div>
      </div>
    </div>
  );
}
