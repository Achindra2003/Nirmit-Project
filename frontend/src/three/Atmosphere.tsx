/**
 * Procedural atmosphere — small objects that make the room feel inhabited.
 * VISION.md "Human Scale": "a plant in the corner, a cup of chai on the
 * coffee table, a TV remote on the sofa, a children's book on the floor."
 *
 * We deterministically place 5-10 atmosphere props per room based on the
 * placed items: a plant near the window, a chai mug on the coffee table,
 * books on the bookshelf, a throw on the sofa, picture frames on the wall.
 */
import { useMemo } from "react";
import type { PlacedItem, RoomState } from "@/api/types";
import { mmToM } from "./units";

interface Props {
  room: RoomState;
}

export function Atmosphere({ room }: Props) {
  const props = useMemo(() => deriveProps(room), [room]);
  return (
    <group>
      {props.map((p, i) => (
        <AtmosphereProp key={i} {...p} />
      ))}
    </group>
  );
}

interface PropPlacement {
  x: number; // metres
  y: number;
  z: number;
  rotation?: number;
  scale?: number;
}

interface PropSpec extends PropPlacement {
  kind: "chai" | "book" | "throw" | "plant_potted" | "frame" | "vase" | "diya";
}

function deriveProps(room: RoomState): PropSpec[] {
  const out: PropSpec[] = [];
  const sofa = room.items.find((i) => i.category === "seating");
  const coffee = room.items.find((i) => i.category === "dining");
  const bookshelf = room.items.find((i) => i.category === "storage" && /shelf|book/i.test(i.name_en));
  const mandir = room.items.find((i) => i.category === "mandir");
  const tv = room.items.find((i) => i.category === "tv_unit" || /tv unit/i.test(i.name_en));
  const w = mmToM(room.intake.room_dimensions.width_mm);
  const d = mmToM(room.intake.room_dimensions.depth_mm);

  // Chai mug + book on the coffee table
  if (coffee) {
    const c = visualCentreOf(coffee);
    out.push({ kind: "chai", x: c.x - 0.18, y: c.h, z: c.z + 0.02, rotation: 0.4 });
    out.push({ kind: "book", x: c.x + 0.18, y: c.h, z: c.z - 0.05, rotation: 0.18 });
  }

  // Throw blanket on the sofa
  if (sofa) {
    const c = visualCentreOf(sofa);
    out.push({
      kind: "throw",
      x: c.x + (sofa.dimensions.width_mm * 0.0015),
      y: c.h,
      z: c.z + 0.02,
      rotation: -0.05,
    });
  }

  // Books on the bookshelf
  if (bookshelf) {
    const c = visualCentreOf(bookshelf);
    out.push({ kind: "book", x: c.x - 0.18, y: c.h - 0.4, z: c.z, rotation: 0.0, scale: 0.9 });
    out.push({ kind: "book", x: c.x + 0.05, y: c.h - 0.4, z: c.z, rotation: 0.0, scale: 0.85 });
  }

  // Diya on the mandir
  if (mandir) {
    const c = visualCentreOf(mandir);
    out.push({ kind: "diya", x: c.x, y: c.h, z: c.z + 0.06 });
  }

  // Vase on the TV unit
  if (tv) {
    const c = visualCentreOf(tv);
    out.push({ kind: "vase", x: c.x - 0.5, y: c.h, z: c.z, scale: 0.85 });
  }

  // Potted plant near the window-facing corner of the room.
  out.push({ kind: "plant_potted", x: w - 0.45, y: 0, z: d - 0.45 });

  // Picture frame on a long wall (just a hint of art on the entrance wall).
  out.push({ kind: "frame", x: w / 2 - 1.2, y: 1.5, z: 0.06, rotation: 0 });

  return out;
}

function visualCentreOf(item: PlacedItem) {
  // position.{x_mm,z_mm} is already the footprint centre (room-corner frame).
  return {
    x: mmToM(item.position.x_mm),
    z: mmToM(item.position.z_mm),
    h: mmToM(item.dimensions.height_mm), // top surface y
  };
}

function AtmosphereProp({ kind, x, y, z, rotation = 0, scale = 1 }: PropSpec) {
  switch (kind) {
    case "chai":
      return <ChaiMug x={x} y={y} z={z} rotation={rotation} scale={scale} />;
    case "book":
      return <Book x={x} y={y} z={z} rotation={rotation} scale={scale} />;
    case "throw":
      return <Throw x={x} y={y} z={z} rotation={rotation} scale={scale} />;
    case "plant_potted":
      return <PottedPlant x={x} y={y} z={z} rotation={rotation} scale={scale} />;
    case "frame":
      return <PictureFrame x={x} y={y} z={z} rotation={rotation} scale={scale} />;
    case "vase":
      return <Vase x={x} y={y} z={z} scale={scale} />;
    case "diya":
      return <Diya x={x} y={y} z={z} />;
  }
}

function ChaiMug({ x, y, z, rotation, scale = 1 }: PropPlacement) {
  return (
    <group position={[x, y, z]} rotation={[0, rotation ?? 0, 0]} scale={scale}>
      <mesh castShadow>
        <cylinderGeometry args={[0.04, 0.035, 0.075, 24]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.05} />
      </mesh>
      <mesh position={[0.045, 0.005, 0]}>
        <torusGeometry args={[0.022, 0.005, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.05} />
      </mesh>
      {/* The chai itself */}
      <mesh position={[0, 0.035, 0]}>
        <cylinderGeometry args={[0.034, 0.034, 0.005, 24]} />
        <meshStandardMaterial color="#9c6633" roughness={0.4} metalness={0.0} />
      </mesh>
    </group>
  );
}

function Book({ x, y, z, rotation, scale = 1 }: PropPlacement) {
  return (
    <group position={[x, y + 0.012, z]} rotation={[0, rotation ?? 0, 0]} scale={scale}>
      <mesh castShadow>
        <boxGeometry args={[0.18, 0.022, 0.13]} />
        <meshStandardMaterial color="#723e2a" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.012, 0]}>
        <boxGeometry args={[0.176, 0.001, 0.126]} />
        <meshStandardMaterial color="#f4ead4" roughness={0.85} />
      </mesh>
    </group>
  );
}

function Throw({ x, y, z, rotation, scale = 1 }: PropPlacement) {
  return (
    <group position={[x, y + 0.005, z]} rotation={[0, rotation ?? 0, 0]} scale={scale}>
      <mesh castShadow>
        <boxGeometry args={[0.6, 0.04, 0.4]} />
        <meshStandardMaterial color="#a64f33" roughness={0.95} />
      </mesh>
    </group>
  );
}

function PottedPlant({ x, y, z, rotation = 0, scale = 1 }: PropPlacement) {
  return (
    <group position={[x, y, z]} rotation={[0, rotation, 0]} scale={scale}>
      <mesh position={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.1, 0.2, 24]} />
        <meshStandardMaterial color="#7a5c3a" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <sphereGeometry args={[0.32, 16, 12]} />
        <meshStandardMaterial color="#3f6b3a" roughness={0.95} />
      </mesh>
      {/* Some asymmetric leaves */}
      <mesh position={[0.18, 0.7, 0.05]} rotation={[0.2, 0.3, 0.2]}>
        <sphereGeometry args={[0.18, 12, 10]} />
        <meshStandardMaterial color="#4d7e44" roughness={0.95} />
      </mesh>
      <mesh position={[-0.15, 0.75, -0.08]} rotation={[-0.15, 0.6, -0.15]}>
        <sphereGeometry args={[0.16, 12, 10]} />
        <meshStandardMaterial color="#365e34" roughness={0.95} />
      </mesh>
    </group>
  );
}

function PictureFrame({ x, y, z, rotation = 0, scale = 1 }: PropPlacement) {
  return (
    <group position={[x, y, z]} rotation={[0, rotation, 0]} scale={scale}>
      <mesh castShadow>
        <boxGeometry args={[0.5, 0.7, 0.025]} />
        <meshStandardMaterial color="#3f3525" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.013]}>
        <planeGeometry args={[0.42, 0.62]} />
        <meshStandardMaterial color="#c9a96e" roughness={0.5} />
      </mesh>
    </group>
  );
}

function Vase({ x, y, z, scale = 1 }: PropPlacement) {
  return (
    <group position={[x, y, z]} scale={scale}>
      <mesh castShadow>
        <cylinderGeometry args={[0.06, 0.04, 0.22, 24]} />
        <meshStandardMaterial color="#4a4035" roughness={0.45} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.04, 16]} />
        <meshStandardMaterial color="#6b8d3a" roughness={0.95} />
      </mesh>
    </group>
  );
}

function Diya({ x, y, z }: PropPlacement) {
  return (
    <group position={[x, y, z]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.03, 0.025, 0.02, 16]} />
        <meshStandardMaterial color="#b08a4a" roughness={0.45} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.024, 0]}>
        <coneGeometry args={[0.008, 0.022, 12]} />
        <meshStandardMaterial color="#ffb347" emissive="#ffb347" emissiveIntensity={1.5} />
      </mesh>
      <pointLight position={[0, 0.04, 0]} intensity={0.4} color="#ffb347" distance={1.2} decay={2} />
    </group>
  );
}
