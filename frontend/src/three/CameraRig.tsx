/**
 * @deprecated The camera logic now lives inside RoomScene (OrbitControls +
 * a preset-lerp controller). This file remains only as a type re-export so
 * older imports keep working; new code should import from "@/three/RoomScene".
 */
export type { CameraView } from "./RoomScene";
