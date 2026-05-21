/**
 * Raw 3D-FRONT room renderer.
 *
 * Each 3D-FRONT room ships as a folder of GLBs (wall.glb, floor.glb, ceil.glb,
 * Sofa_*.glb, Cabinet_*.glb, ...). Positions are baked into the vertex
 * coordinates (no node transforms), so loading every GLB at origin reproduces
 * the original layout.
 *
 * Coordinates are world-space relative to the room's geometric centre. Rooms
 * are typically ~2 m on a side in dataset units, so we orbit around origin.
 *
 * LICENSE: 3D-FRONT is cc-by-nc-4.0 — prototyping only, not shippable.
 */
import { Suspense, useEffect, useMemo, useState } from "react";
import { useGLTF, OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";

interface Manifest {
  source: string;
  room_id: string;
  files: string[];
}

interface Props {
  /** URL prefix for the room folder, e.g. "/3d-front/sample". Trailing slash optional. */
  roomUrl: string;
}

export function ThreeDFrontRoom({ roomUrl }: Props) {
  const baseUrl = roomUrl.replace(/\/$/, "");
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${baseUrl}/manifest.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then((m: Manifest) => {
        if (!cancelled) setManifest(m);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [baseUrl]);

  if (error) {
    return <div style={{ color: "#c84a3a", padding: 20 }}>Manifest load failed: {error}</div>;
  }
  if (!manifest) {
    return <div style={{ color: "#a99a82", padding: 20 }}>Loading manifest...</div>;
  }

  return (
    <Canvas
      shadows
      camera={{ position: [3, 2.2, 3], fov: 50, near: 0.05, far: 100 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      style={{ width: "100%", height: "100%", background: "#1a1814" }}
    >
      <color attach="background" args={["#1a1814"]} />
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[4, 6, 4]}
        intensity={1.4}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />
      <Environment preset="apartment" />

      <Suspense fallback={null}>
        <RoomGroup baseUrl={baseUrl} files={manifest.files} />
      </Suspense>

      <ContactShadows position={[0, -0.65, 0]} opacity={0.35} scale={6} blur={2.4} far={2} />
      <OrbitControls
        target={[0, 0, 0]}
        enableDamping
        dampingFactor={0.08}
        minDistance={1.5}
        maxDistance={12}
      />
    </Canvas>
  );
}

function RoomGroup({ baseUrl, files }: { baseUrl: string; files: string[] }) {
  // Filter to .glb so a stray manifest.json or future files don't break loading.
  const glbFiles = useMemo(() => files.filter((f) => f.toLowerCase().endsWith(".glb")), [files]);
  return (
    <group>
      {glbFiles.map((file) => (
        <GlbPart key={file} url={`${baseUrl}/${file}`} />
      ))}
    </group>
  );
}

function GlbPart({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  // Clone so React's strict-mode double-mount or future re-mounts don't share a mutated tree,
  // and so shadows can be enabled per-instance.
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);
  return <primitive object={cloned} />;
}
