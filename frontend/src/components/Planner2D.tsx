/**
 * The 2D planner — top-down architect's drawing.
 *
 * Coordinate convention matches the rest of the app: `item.position.{x_mm,
 * z_mm}` is the footprint CENTRE in room coords (0..width_mm, 0..depth_mm),
 * rotated `rotation_deg` about that centre.
 *
 * Renders: parchment grid, thick architectural walls with cross-hatch, door
 * swing arc on the entrance wall, window on the opposite wall, dimension
 * callouts, compass rose, and furniture as drafting-style rectangles you can
 * drag (snap to 50mm + walls) and double-click to rotate 90°.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { Direction, PlacedItem, RoomState } from "@/api/types";

const PAD = 64;
const TARGET = 760;
const GRID_MAJOR = 1000;
const GRID_MINOR = 100;
const SNAP_GRID = 50;
const SNAP_WALL = 120;

interface Props {
  room: RoomState;
  selectedItemId?: string | null;
  onSelectItem?: (id: string | null) => void;
  onMoveItem?: (id: string, x_mm: number, z_mm: number) => void;
  onRotateItem?: (id: string) => void;
}

export function Planner2D({ room, selectedItemId, onSelectItem, onMoveItem, onRotateItem }: Props) {
  const wMm = room.intake.room_dimensions.width_mm;
  const dMm = room.intake.room_dimensions.depth_mm;
  const scale = useMemo(() => (TARGET - PAD * 2) / Math.max(wMm, dMm), [wMm, dMm]);
  const svgW = wMm * scale + PAD * 2;
  const svgH = dMm * scale + PAD * 2;
  const ox = PAD;
  const oy = PAD;
  const wPx = wMm * scale;
  const dPx = dMm * scale;
  const wallPx = Math.max(5, 115 * scale);

  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{ id: string; offMm: { x: number; z: number }; curMm: { x: number; z: number } } | null>(null);

  function pointerToMm(clientX: number, clientY: number): { x: number; z: number } {
    const svg = svgRef.current;
    if (!svg) return { x: 0, z: 0 };
    const r = svg.getBoundingClientRect();
    return {
      x: Math.round(((clientX - r.left) / r.width * svgW - ox) / scale),
      z: Math.round(((clientY - r.top) / r.height * svgH - oy) / scale),
    };
  }

  function startDrag(e: React.PointerEvent, item: PlacedItem) {
    e.stopPropagation();
    onSelectItem?.(item.id);
    const cur = pointerToMm(e.clientX, e.clientY);
    setDrag({ id: item.id, offMm: { x: cur.x - item.position.x_mm, z: cur.z - item.position.z_mm }, curMm: cur });
  }

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => setDrag((d) => (d ? { ...d, curMm: pointerToMm(e.clientX, e.clientY) } : null));
    const up = () => {
      setDrag((d) => {
        if (d) {
          const item = room.items.find((i) => i.id === d.id);
          if (item) {
            const snapped = snapCentre(d.curMm.x - d.offMm.x, d.curMm.z - d.offMm.z, item, wMm, dMm);
            if (snapped.x !== item.position.x_mm || snapped.z !== item.position.z_mm) onMoveItem?.(item.id, snapped.x, snapped.z);
          }
        }
        return null;
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [drag, room, wMm, dMm]); // eslint-disable-line react-hooks/exhaustive-deps

  const livePos = useMemo(() => {
    if (!drag) return null;
    const item = room.items.find((i) => i.id === drag.id);
    if (!item) return null;
    return snapCentre(drag.curMm.x - drag.offMm.x, drag.curMm.z - drag.offMm.z, item, wMm, dMm);
  }, [drag, room, wMm, dMm]);

  const winSide = oppositeWall(room.intake.entrance_direction);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${svgW} ${svgH}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      style={{ background: "#f4efe6", cursor: drag ? "grabbing" : "default", userSelect: "none" }}
      onPointerDown={() => onSelectItem?.(null)}
    >
      <defs>
        <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(90,70,45,0.35)" strokeWidth="1" />
        </pattern>
      </defs>

      {/* Parchment minor + major grid */}
      {gridLines(ox, oy, wMm, dMm, scale)}

      {/* Room walls (thick, hatched) */}
      <rect x={ox} y={oy} width={wPx} height={dPx} fill="#f8f4eb" />
      <rect x={ox - wallPx / 2} y={oy - wallPx / 2} width={wPx + wallPx} height={dPx + wallPx} fill="none" stroke="url(#hatch)" strokeWidth={wallPx} />
      <rect x={ox - wallPx / 2} y={oy - wallPx / 2} width={wPx + wallPx} height={dPx + wallPx} fill="none" stroke="#2a2218" strokeWidth={1.6} />
      <rect x={ox} y={oy} width={wPx} height={dPx} fill="none" stroke="#7a5c3a" strokeWidth={0.6} />

      {/* Door swing arc + opening */}
      <DoorMark entrance={room.intake.entrance_direction} ox={ox} oy={oy} wPx={wPx} dPx={dPx} />
      {/* Window */}
      <WindowMark side={winSide} ox={ox} oy={oy} wPx={wPx} dPx={dPx} />

      {/* Furniture */}
      {room.items.map((item) => {
        const isDragging = drag?.id === item.id;
        const cMm = isDragging && livePos ? livePos : { x: item.position.x_mm, z: item.position.z_mm };
        return (
          <ItemRect
            key={item.id}
            item={item}
            cMm={cMm}
            ox={ox}
            oy={oy}
            scale={scale}
            selected={selectedItemId === item.id}
            dragging={isDragging}
            onPointerDown={(e) => startDrag(e, item)}
            onDoubleClick={() => onRotateItem?.(item.id)}
          />
        );
      })}

      {/* Compass + dimensions */}
      <Compass entrance={room.intake.entrance_direction} svgW={svgW} oy={oy} />
      <Dimensions wMm={wMm} dMm={dMm} ox={ox} oy={oy} scale={scale} />
    </svg>
  );
}

// ---------- pieces ----------

function gridLines(ox: number, oy: number, wMm: number, dMm: number, scale: number) {
  const out: React.ReactNode[] = [];
  for (let x = 0; x <= wMm; x += GRID_MINOR) {
    const major = x % GRID_MAJOR === 0;
    out.push(<line key={`vx${x}`} x1={ox + x * scale} y1={oy} x2={ox + x * scale} y2={oy + dMm * scale} stroke={major ? "rgba(150,130,100,0.28)" : "rgba(150,130,100,0.12)"} strokeWidth={major ? 0.7 : 0.35} />);
  }
  for (let z = 0; z <= dMm; z += GRID_MINOR) {
    const major = z % GRID_MAJOR === 0;
    out.push(<line key={`hz${z}`} x1={ox} y1={oy + z * scale} x2={ox + wMm * scale} y2={oy + z * scale} stroke={major ? "rgba(150,130,100,0.28)" : "rgba(150,130,100,0.12)"} strokeWidth={major ? 0.7 : 0.35} />);
  }
  return <g>{out}</g>;
}

function ItemRect({
  item,
  cMm,
  ox,
  oy,
  scale,
  selected,
  dragging,
  onPointerDown,
  onDoubleClick,
}: {
  item: PlacedItem;
  cMm: { x: number; z: number };
  ox: number;
  oy: number;
  scale: number;
  selected: boolean;
  dragging: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onDoubleClick: () => void;
}) {
  const w = item.dimensions.width_mm * scale;
  const d = item.dimensions.depth_mm * scale;
  const cx = ox + cMm.x * scale;
  const cy = oy + cMm.z * scale;
  const rot = item.position.rotation_deg;
  const fill = item.catalog.tint_hex ?? categoryFill(item.category);
  const transform = `translate(${cx} ${cy}) rotate(${rot})`;
  return (
    <g>
      {selected && (
        <rect
          transform={transform}
          x={-w / 2 - 24 * scale}
          y={-d / 2 - 24 * scale}
          width={w + 48 * scale}
          height={d + 48 * scale}
          fill="none"
          stroke="#D4A574"
          strokeWidth={1.2}
          strokeDasharray="5 4"
          opacity={0.7}
          pointerEvents="none"
        />
      )}
      <g transform={transform} onPointerDown={onPointerDown} onDoubleClick={onDoubleClick} style={{ cursor: dragging ? "grabbing" : "grab" }}>
        <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={3} fill={fill} fillOpacity={dragging ? 0.5 : 0.88} stroke={selected ? "#D4A574" : "#5C4632"} strokeWidth={selected ? 2 : 1.1} />
        <DraftIcon category={item.category} w={w} d={d} />
        {/* Front-edge tick (facing direction = local +z = bottom of the rect before rotation) */}
        <line x1={-w * 0.32} y1={d / 2 - 3} x2={w * 0.32} y2={d / 2 - 3} stroke="rgba(255,255,255,0.9)" strokeWidth={1.6} />
        {w > 26 && d > 24 && (
          <text x={0} y={4} fontSize={Math.min(11, Math.max(8, w / 9))} fill="rgba(255,255,255,0.95)" fontFamily="ui-monospace, monospace" textAnchor="middle" pointerEvents="none">
            {short(item.name_en, 16)}
          </text>
        )}
      </g>
    </g>
  );
}

function DraftIcon({ category, w, d }: { category: string; w: number; d: number }) {
  const s = "rgba(255,255,255,0.5)";
  if (category === "seating") {
    return (
      <g pointerEvents="none">
        <rect x={-w * 0.46} y={-d * 0.48} width={w * 0.92} height={d * 0.22} rx={2} fill="none" stroke={s} strokeWidth={0.8} />
        <rect x={-w * 0.42} y={-d * 0.06} width={w * 0.36} height={d * 0.5} rx={2} fill="none" stroke={s} strokeWidth={0.7} />
        <rect x={w * 0.06} y={-d * 0.06} width={w * 0.36} height={d * 0.5} rx={2} fill="none" stroke={s} strokeWidth={0.7} />
      </g>
    );
  }
  if (category === "sleeping") {
    return (
      <g pointerEvents="none">
        <rect x={-w * 0.46} y={-d * 0.46} width={w * 0.92} height={d * 0.18} rx={2} fill="none" stroke={s} strokeWidth={0.8} />
        <line x1={-w * 0.42} y1={0} x2={w * 0.42} y2={0} stroke={s} strokeWidth={0.5} strokeDasharray="3 3" />
      </g>
    );
  }
  if (category === "storage" || category === "tv_unit") {
    return (
      <g pointerEvents="none">
        <line x1={-w * 0.46} y1={-d * 0.12} x2={w * 0.46} y2={-d * 0.12} stroke={s} strokeWidth={0.6} />
        <line x1={-w * 0.46} y1={d * 0.16} x2={w * 0.46} y2={d * 0.16} stroke={s} strokeWidth={0.6} />
      </g>
    );
  }
  if (category === "dining") {
    return (
      <g pointerEvents="none">
        {[[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]].map(([px, py], i) => (
          <circle key={i} cx={px * w} cy={py * d} r={1.6} fill={s} />
        ))}
      </g>
    );
  }
  if (category === "mandir") {
    return <path d={`M ${-w * 0.28} ${d * 0.42} A ${w * 0.28} ${w * 0.28} 0 0 1 ${w * 0.28} ${d * 0.42}`} fill="none" stroke={s} strokeWidth={1} pointerEvents="none" />;
  }
  return null;
}

function DoorMark({ entrance, ox, oy, wPx, dPx }: { entrance: Direction; ox: number; oy: number; wPx: number; dPx: number }) {
  const arc = Math.min(60, Math.max(30, Math.min(wPx, dPx) * 0.16));
  // Entrance wall: opposite of the window. We place the door at the mid of the entrance wall.
  const wall: Direction = entrance; // entrance faces this direction, so the wall on the near side
  let line: { x1: number; y1: number; x2: number; y2: number };
  let path: string;
  let label: { x: number; y: number };
  if (wall === "S") {
    line = { x1: ox + wPx * 0.42, y1: oy + dPx, x2: ox + wPx * 0.58, y2: oy + dPx };
    path = `M ${ox + wPx * 0.42} ${oy + dPx} A ${arc} ${arc} 0 0 1 ${ox + wPx * 0.42 + arc} ${oy + dPx - arc}`;
    label = { x: ox + wPx * 0.5 - 24, y: oy + dPx + 18 };
  } else if (wall === "N") {
    line = { x1: ox + wPx * 0.42, y1: oy, x2: ox + wPx * 0.58, y2: oy };
    path = `M ${ox + wPx * 0.58} ${oy} A ${arc} ${arc} 0 0 1 ${ox + wPx * 0.58 - arc} ${oy + arc}`;
    label = { x: ox + wPx * 0.5 - 24, y: oy - 8 };
  } else if (wall === "W") {
    line = { x1: ox, y1: oy + dPx * 0.42, x2: ox, y2: oy + dPx * 0.58 };
    path = `M ${ox} ${oy + dPx * 0.42} A ${arc} ${arc} 0 0 1 ${ox + arc} ${oy + dPx * 0.42 + arc}`;
    label = { x: ox + 6, y: oy + dPx * 0.5 + 16 };
  } else {
    line = { x1: ox + wPx, y1: oy + dPx * 0.42, x2: ox + wPx, y2: oy + dPx * 0.58 };
    path = `M ${ox + wPx} ${oy + dPx * 0.58} A ${arc} ${arc} 0 0 1 ${ox + wPx - arc} ${oy + dPx * 0.58 - arc}`;
    label = { x: ox + wPx - 56, y: oy + dPx * 0.5 + 16 };
  }
  return (
    <g pointerEvents="none">
      <line {...line} stroke="#f4efe6" strokeWidth={8} />
      <line {...line} stroke="#2a2218" strokeWidth={2} />
      <path d={path} fill="none" stroke="#2a2218" strokeWidth={1} strokeDasharray="4 3" />
      <text x={label.x} y={label.y} fontSize={11} fill="#2a2218" fontFamily="ui-monospace, monospace">Entrance</text>
    </g>
  );
}

function WindowMark({ side, ox, oy, wPx, dPx }: { side: Direction; ox: number; oy: number; wPx: number; dPx: number }) {
  const isNS = side === "N" || side === "S";
  const span = (isNS ? wPx : dPx) * 0.5;
  let rect: { x: number; y: number; w: number; h: number };
  let label: { x: number; y: number };
  if (side === "S") {
    rect = { x: ox + wPx / 2 - span / 2, y: oy + dPx - 4, w: span, h: 8 };
    label = { x: ox + wPx / 2 - 18, y: oy + dPx + 18 };
  } else if (side === "N") {
    rect = { x: ox + wPx / 2 - span / 2, y: oy - 4, w: span, h: 8 };
    label = { x: ox + wPx / 2 - 18, y: oy - 8 };
  } else if (side === "W") {
    rect = { x: ox - 4, y: oy + dPx / 2 - span / 2, w: 8, h: span };
    label = { x: ox - 52, y: oy + dPx / 2 };
  } else {
    rect = { x: ox + wPx - 4, y: oy + dPx / 2 - span / 2, w: 8, h: span };
    label = { x: ox + wPx + 6, y: oy + dPx / 2 };
  }
  return (
    <g pointerEvents="none">
      <rect {...{ x: rect.x, y: rect.y, width: rect.w, height: rect.h }} fill="#cfe6f4" stroke="#3a5a7a" strokeWidth={1.2} />
      <text x={label.x} y={label.y} fontSize={11} fill="#3a5a7a" fontFamily="ui-monospace, monospace">Window</text>
    </g>
  );
}

function Compass({ entrance, svgW, oy }: { entrance: Direction; svgW: number; oy: number }) {
  const angle: Record<Direction, number> = { N: 180, NE: 225, E: 270, SE: 315, S: 0, SW: 45, W: 90, NW: 135 };
  return (
    <g transform={`translate(${svgW - 34} ${oy + 20}) rotate(${angle[entrance] ?? 0})`} pointerEvents="none">
      <circle r={16} fill="rgba(248,244,235,0.92)" stroke="#5c4632" strokeWidth={0.7} />
      <polygon points="0,-13 4,8 0,4 -4,8" fill="#5c4632" />
      <text x={0} y={-17} fontSize={9} fontWeight="bold" fill="#2a2218" textAnchor="middle">N</text>
    </g>
  );
}

function Dimensions({ wMm, dMm, ox, oy, scale }: { wMm: number; dMm: number; ox: number; oy: number; scale: number }) {
  const wPx = wMm * scale, dPx = dMm * scale;
  return (
    <g pointerEvents="none">
      <text x={ox + wPx / 2} y={oy + dPx + 36} fontSize={11} fill="#4a4035" fontFamily="ui-monospace, monospace" textAnchor="middle">
        {wMm} mm · {(wMm / 304.8).toFixed(1)} ft
      </text>
      <text x={ox - 30} y={oy + dPx / 2} fontSize={11} fill="#4a4035" fontFamily="ui-monospace, monospace" textAnchor="middle" transform={`rotate(-90 ${ox - 30} ${oy + dPx / 2})`}>
        {dMm} mm · {(dMm / 304.8).toFixed(1)} ft
      </text>
      {/* scale bar */}
      <line x1={ox} y1={oy + dPx + 50} x2={ox + 1000 * scale} y2={oy + dPx + 50} stroke="#2a2218" strokeWidth={2} />
      <text x={ox + (1000 * scale) / 2} y={oy + dPx + 62} fontSize={9} fill="#4a4035" textAnchor="middle">1 m</text>
    </g>
  );
}

// ---------- helpers ----------

function categoryFill(category: string): string {
  switch (category) {
    case "seating": return "#8a7558";
    case "dining": return "#7a5c3a";
    case "tv_unit":
    case "storage": return "#5b4631";
    case "mandir": return "#c9a04a";
    case "sleeping": return "#a98c66";
    case "decor": return "#9c8a6e";
    default: return "#8b6f52";
  }
}
function short(name: string, max: number): string {
  return name.length <= max ? name : `${name.slice(0, max - 2)}..`;
}
function snapCentre(cx: number, cz: number, item: PlacedItem, roomW: number, roomD: number): { x: number; z: number } {
  const halfW = item.dimensions.width_mm / 2;
  const halfD = item.dimensions.depth_mm / 2;
  let x = Math.round(cx / SNAP_GRID) * SNAP_GRID;
  let z = Math.round(cz / SNAP_GRID) * SNAP_GRID;
  if (x - halfW < SNAP_WALL) x = Math.round(halfW);
  if (z - halfD < SNAP_WALL) z = Math.round(halfD);
  if (roomW - (x + halfW) < SNAP_WALL) x = Math.round(roomW - halfW);
  if (roomD - (z + halfD) < SNAP_WALL) z = Math.round(roomD - halfD);
  x = Math.max(halfW, Math.min(x, roomW - halfW));
  z = Math.max(halfD, Math.min(z, roomD - halfD));
  return { x: Math.round(x), z: Math.round(z) };
}
function oppositeWall(d: Direction): Direction {
  switch (d) {
    case "N": return "S";
    case "S": return "N";
    case "E": return "W";
    case "W": return "E";
    default: return "S";
  }
}
