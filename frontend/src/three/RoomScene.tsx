/**
 * The R3F scene that renders a RoomState. Phase 1 uses simple boxes for items
 * (so the layout is visible without depending on every .glb being correctly
 * scaled). Phase 2 swaps in the actual GLB models from /public/models/.
 *
 * Rendering boundary: backend dimensions are mm, Three.js wants meters. The
 * conversion happens here, in `mmToM`, and nowhere else.
 */
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Grid } from "@react-three/drei";
import type { PlacedItem, RoomState } from "@/api/types";
import { mmToM } from "./units";

interface Props {
  room: RoomState;
}

export function RoomScene({ room }: Props) {
  const w = mmToM(room.intake.room_dimensions.width_mm);
  const d = mmToM(room.intake.room_dimensions.depth_mm);
  const h = mmToM(room.intake.room_dimensions.height_mm);
  const palette = room.palette;

  return (
    <Canvas
      shadows
      camera={{ position: [w * 1.4, h * 1.1, d * 1.4], fov: 38 }}
      style={{ width: "100%", height: "100%" }}
    >
      {/* Warm directional light, simulating Mumbai-afternoon east window. */}
      <ambientLight intensity={0.35} color="#f4ead4" />
      <directionalLight
        position={[w, h * 1.6, -d * 0.4]}
        intensity={1.05}
        color="#fdeac0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <Environment preset="apartment" />

      {/* Floor */}
      <mesh
        position={[w / 2, 0, d / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={palette.floor ?? "#b89b7a"} roughness={0.85} />
      </mesh>

      {/* Walls — back and left, simple box geometry so we see depth. */}
      <mesh position={[w / 2, h / 2, 0]} receiveShadow>
        <boxGeometry args={[w, h, 0.05]} />
        <meshStandardMaterial color={palette.wall ?? "#ede6d8"} roughness={0.95} />
      </mesh>
      <mesh position={[0, h / 2, d / 2]} receiveShadow>
        <boxGeometry args={[0.05, h, d]} />
        <meshStandardMaterial color={palette.wall ?? "#ede6d8"} roughness={0.95} />
      </mesh>

      {/* Items */}
      {room.items.map((item) => (
        <ItemBox key={item.id} item={item} accent={palette.accent ?? "#7a5c3a"} />
      ))}

      {/* Reference grid — fades away gracefully. */}
      <Grid
        position={[w / 2, 0.001, d / 2]}
        args={[Math.max(w, d) * 1.5, Math.max(w, d) * 1.5]}
        cellSize={0.5}
        cellThickness={0.4}
        sectionSize={2}
        sectionThickness={0.8}
        cellColor="#cdbfa3"
        sectionColor="#a18a64"
        fadeDistance={Math.max(w, d) * 2}
        fadeStrength={1.5}
        infiniteGrid={false}
      />

      <OrbitControls
        target={[w / 2, h * 0.4, d / 2]}
        maxPolarAngle={Math.PI / 2.05}
        enableDamping
      />
    </Canvas>
  );
}

interface ItemBoxProps {
  item: PlacedItem;
  accent: string;
}

function ItemBox({ item, accent }: ItemBoxProps) {
  const w = mmToM(item.dimensions.width_mm);
  const d = mmToM(item.dimensions.depth_mm);
  const h = mmToM(item.dimensions.height_mm);
  const x = mmToM(item.position.x_mm) + w / 2;
  const z = mmToM(item.position.z_mm) + d / 2;
  const rot = (item.position.rotation_deg * Math.PI) / 180;

  return (
    <group position={[x, h / 2, z]} rotation={[0, rot, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={categoryColor(item.category, accent)} roughness={0.7} />
      </mesh>
    </group>
  );
}

function categoryColor(category: string, accent: string): string {
  switch (category) {
    case "sofa":
      return "#8a7558";
    case "coffee_table":
      return accent;
    case "tv_unit":
      return "#5b4631";
    case "mandir":
      return "#c9a04a";
    case "wardrobe":
      return "#6f5a3f";
    case "bed":
      return "#a98c66";
    default:
      return "#9c8a6e";
  }
}
