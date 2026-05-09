import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { Item } from '../../store/useStore';

interface Props {
  item: Item;
  roomWidth: number;
  roomLength: number;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

export function FurnitureItem({ item, roomWidth, roomLength, selected = false, onSelect }: Props) {
  const path = item.modelPath ?? '/assets/3d-models/stool/stool.gltf';
  const { scene } = useGLTF(path);

  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) {
        return;
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (mesh.material) {
        mesh.material = (mesh.material as THREE.Material).clone();
      }
    });
    return clone;
  }, [scene]);

  model.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) {
      return;
    }
    const material = mesh.material as THREE.MeshStandardMaterial;
    if (material.color) {
      material.color = new THREE.Color(item.color);
    }
    material.emissive = selected ? new THREE.Color('#252019') : new THREE.Color('#000000');
    material.emissiveIntensity = selected ? 0.3 : 0;
  });

  return (
    <primitive
      object={model}
      position={[item.x - roomWidth / 2, item.height / 2, item.y - roomLength / 2]}
      rotation={[0, (item.rotation * Math.PI) / 180, 0]}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        if (onSelect) {
          onSelect(item.id);
        }
      }}
    />
  );
}

useGLTF.preload('/assets/3d-models/arm-chair/arm-chair.gltf');
useGLTF.preload('/assets/3d-models/single-bed/single-bed.gltf');
useGLTF.preload('/assets/3d-models/dining/dining.gltf');
useGLTF.preload('/assets/3d-models/single-chair/single-chair.gltf');
useGLTF.preload('/assets/3d-models/stool/stool.gltf');
