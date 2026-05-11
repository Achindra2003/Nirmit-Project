import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';

function StillLifeGroup() {
  const groupRef = useRef<THREE.Group>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = Math.sin(t * 0.15) * 0.15;
    groupRef.current.rotation.x = Math.sin(t * 0.1) * 0.03;
    // Subtle mouse influence
    const targetX = mouseRef.current.y * 0.05;
    const targetY = mouseRef.current.x * 0.05;
    groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * 0.02;
    groupRef.current.rotation.y += (targetY - groupRef.current.rotation.y) * 0.02;
  });

  const handlePointerMove = (e: THREE.Event) => {
    const native = (e as unknown as { nativeEvent: PointerEvent }).nativeEvent;
    if (native) {
      mouseRef.current.x = (native.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.y = (native.clientY / window.innerHeight - 0.5) * 2;
    }
  };

  return (
    <group ref={groupRef} onPointerMove={handlePointerMove}>
      {/* Base board */}
      <mesh position={[-0.5, -0.5, 0]} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[4, 0.05, 3]} />
        <meshStandardMaterial color="#F5EDE0" roughness={0.9} />
      </mesh>

      {/* Teak wood slab */}
      <mesh position={[0.8, -0.42, 0.3]} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[1.2, 0.08, 0.8]} />
        <meshStandardMaterial color="#A67B5B" roughness={0.6} metalness={0.05} />
      </mesh>

      {/* Terracotta sphere */}
      <mesh position={[-1.2, -0.15, 0.5]} rotation={[0, 0.3, 0]}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial color="#B85A3A" roughness={0.85} />
      </mesh>

      {/* Brass cylinder */}
      <mesh position={[0.2, -0.15, -0.6]} rotation={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.6, 32]} />
        <meshStandardMaterial color="#D4A03C" roughness={0.3} metalness={0.7} />
      </mesh>

      {/* Indigo fabric */}
      <mesh position={[-0.5, 0.15, -0.2]} rotation={[-0.3, 0.5, 0.2]}>
        <planeGeometry args={[0.8, 0.8]} />
        <meshStandardMaterial color="#3D4F6B" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>

      {/* Small label cards */}
      <mesh position={[1.4, -0.38, -0.8]} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[0.3, 0.02, 0.2]} />
        <meshStandardMaterial color="#FDF8F2" roughness={0.8} />
      </mesh>
      <mesh position={[-0.2, -0.38, 0.9]} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[0.25, 0.02, 0.18]} />
        <meshStandardMaterial color="#E4D5C4" roughness={0.8} />
      </mesh>
    </group>
  );
}

export default function MaterialStillLife() {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 2, 6], fov: 40 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[3, 5, 3]} intensity={0.8} color="#FFF5E6" />
        <directionalLight position={[-2, 3, -1]} intensity={0.2} color="#E8DDD4" />
        <Environment preset="apartment" />
        <StillLifeGroup />
      </Canvas>
    </div>
  );
}
