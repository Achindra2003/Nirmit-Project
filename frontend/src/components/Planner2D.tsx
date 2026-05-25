/**
 * The 2D planner — top-down architect's drawing in the paper-and-ink language.
 *
 * Coordinate convention matches the rest of the app: `item.position.{x_mm,
 * z_mm}` is the footprint CENTRE in room coords (0..width_mm, 0..depth_mm),
 * rotated `rotation_deg` about that centre.
 *
 * Render orientation (matches the 3D eye view, which is the user's primary
 * frame of reference):
 *   - South wall (door) at the BOTTOM of the canvas.
 *   - North wall at the TOP.
 *   - East (+x backend) on the LEFT.       ← x-flipped from architect convention
 *   - West (-x backend) on the RIGHT.
 *
 * Three.js's lookAt() computes camera right as `up × (eye-target)`, which gives
 * screen-right = world -x when the camera looks in +z direction (south-to-
 * north entry view). The plan mirrors that so a sofa on the user's right in
 * the 3D shows up on the right of the plan too. The compass labels make N and
 * E explicit so the user isn't guessing.
 *
 * Visual language pulls from styles.css design tokens:
 *   - --paper (background)
 *   - --paper-2 (floor fill, subtly darker)
 *   - --ink / --ink-2 / --ink-3 (lines, labels)
 *   - --walnut (wall fill, hatched in --ink-2)
 *   - --terra (selection accent)
 * No gradients — just flat parchment and ink, like a draftsman's drawing.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { Direction, Opening, PlacedItem, RoomState } from "@/api/types";
import { useAppStore } from "@/store/useAppStore";

const PAD = 72;
const TARGET = 760;
const GRID_MAJOR = 1000;
const GRID_MINOR = 100;
const SNAP_GRID = 50;
const SNAP_WALL = 120;

// Paper-and-ink tokens (kept here as constants so the SVG can render without
// resolving CSS vars at paint time).
const PAPER = "#F0E6D3";
const PAPER_2 = "#E6DACA";
const PAPER_3 = "#F5EDDF";
const INK = "#1C1812";
const INK_2 = "#52493E";
const INK_3 = "#7D7367";
const WALNUT = "#5B3B26";
const TERRA = "#B8432A";

interface Props {
  room: RoomState;
  selectedItemId?: string | null;
  onSelectItem?: (id: string | null) => void;
  onMoveItem?: (id: string, x_mm: number, z_mm: number) => void;
  onRotateItem?: (id: string) => void;
}

export function Planner2D({ room, selectedItemId, onSelectItem, onMoveItem, onRotateItem }: Props) {
  const layoutEditMode = useAppStore((s) => s.layoutEditMode);
  const wMm = room.intake.room_dimensions.width_mm;
  const dMm = room.intake.room_dimensions.depth_mm;
  const scale = useMemo(() => (TARGET - PAD * 2) / Math.max(wMm, dMm), [wMm, dMm]);
  const svgW = wMm * scale + PAD * 2;
  const svgH = dMm * scale + PAD * 2;
  const ox = PAD;
  const oy = PAD;
  const wPx = wMm * scale;
  const dPx = dMm * scale;
  const wallPx = Math.max(6, 120 * scale);

  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{ id: string; offMm: { x: number; z: number }; curMm: { x: number; z: number } } | null>(null);

  // Coord helpers — single source of truth for the x-flip. Backend +x (east)
  // maps to canvas LEFT (smaller x). Backend z=0 (south) maps to canvas
  // BOTTOM (larger y).
  function backendXToCanvas(xMm: number): number {
    return ox + (wMm - xMm) * scale;
  }
  function backendZToCanvas(zMm: number): number {
    return oy + (dMm - zMm) * scale;
  }
  function canvasToBackend(clientX: number, clientY: number): { x: number; z: number } {
    const svg = svgRef.current;
    if (!svg) return { x: 0, z: 0 };
    const r = svg.getBoundingClientRect();
    const canvasMmX = (clientX - r.left) / r.width * svgW - ox;
    const canvasMmY = (clientY - r.top) / r.height * svgH - oy;
    return {
      x: Math.round(wMm - canvasMmX / scale),
      z: Math.round(dMm - canvasMmY / scale),
    };
  }

  function startDrag(e: React.PointerEvent, item: PlacedItem) {
    e.stopPropagation();
    onSelectItem?.(item.id);
    if (!layoutEditMode) return;
    const cur = canvasToBackend(e.clientX, e.clientY);
    setDrag({ id: item.id, offMm: { x: cur.x - item.position.x_mm, z: cur.z - item.position.z_mm }, curMm: cur });
  }

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => setDrag((d) => (d ? { ...d, curMm: canvasToBackend(e.clientX, e.clientY) } : null));
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

  const entrance = room.intake.entrance_direction;
  const openings: Opening[] = room.openings ?? [];
  const doorOpenings = openings.filter((o) => o.kind === "door");
  const windowOpenings = openings.filter((o) => o.kind === "window");
  const effectiveDoors: Opening[] = doorOpenings.length > 0 ? doorOpenings : [{
    wall: entrance,
    center_frac: 0.5,
    width_mm: 900,
    height_mm: 2100,
    kind: "door",
    sill_mm: 0,
  }];
  const effectiveWindows: Opening[] = windowOpenings.length > 0 ? windowOpenings : (() => {
    const fallbackWall = oppositeWall(entrance);
    const isNS = fallbackWall === "N" || fallbackWall === "S";
    return [{
      wall: fallbackWall,
      center_frac: 0.5,
      width_mm: Math.round((isNS ? wMm : dMm) * 0.5),
      height_mm: 1400,
      sill_mm: 850,
      kind: "window",
    }];
  })();

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${svgW} ${svgH}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      style={{ background: PAPER, cursor: drag ? "grabbing" : "default", userSelect: "none" }}
      onPointerDown={() => onSelectItem?.(null)}
    >
      <defs>
        {/* Diagonal hatch for the wall thickness, in ink (the architectural
            "cross-hatched wall section" convention). */}
        <pattern id="wallHatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke={INK_2} strokeWidth="1" />
        </pattern>
        {/* Paper grain — very subtle dot noise on the floor area, no gradient. */}
        <pattern id="paperGrain" width="200" height="200" patternUnits="userSpaceOnUse">
          <rect width="200" height="200" fill={PAPER_2} />
          <circle cx="38" cy="62" r="0.6" fill={INK_3} opacity="0.18" />
          <circle cx="142" cy="14" r="0.4" fill={INK_3} opacity="0.14" />
          <circle cx="98" cy="138" r="0.5" fill={INK_3} opacity="0.16" />
          <circle cx="173" cy="92" r="0.3" fill={INK_3} opacity="0.12" />
          <circle cx="22" cy="174" r="0.4" fill={INK_3} opacity="0.15" />
        </pattern>
      </defs>

      {/* Parchment minor + major grid */}
      {gridLines(ox, oy, wMm, dMm, scale)}

      {/* Floor: flat paper tone with a hint of grain — no gradient. */}
      <rect x={ox} y={oy} width={wPx} height={dPx} fill="url(#paperGrain)" />

      {/* Architectural wall section: walnut underlayer + ink-hatch overlay +
          ink outlines on both edges. The wall band is the thickness of the
          actual wall (120mm) so the room reads as a real plan, not just an
          outline. */}
      <rect x={ox - wallPx / 2} y={oy - wallPx / 2} width={wPx + wallPx} height={dPx + wallPx} fill="none" stroke={WALNUT} strokeWidth={wallPx} />
      <rect x={ox - wallPx / 2} y={oy - wallPx / 2} width={wPx + wallPx} height={dPx + wallPx} fill="none" stroke="url(#wallHatch)" strokeWidth={wallPx} opacity={0.7} />
      <rect x={ox - wallPx / 2} y={oy - wallPx / 2} width={wPx + wallPx} height={dPx + wallPx} fill="none" stroke={INK} strokeWidth={1.6} />
      <rect x={ox} y={oy} width={wPx} height={dPx} fill="none" stroke={INK} strokeWidth={1} opacity={0.85} />

      {/* Door swing arcs + openings (one per door in room.openings[]) */}
      {effectiveDoors.map((opening, i) => (
        <DoorMark
          key={`door-${i}-${opening.wall}`}
          opening={opening}
          ox={ox} oy={oy} wPx={wPx} dPx={dPx}
          wMm={wMm} dMm={dMm} scale={scale}
          label={i === 0 ? "ENTRANCE" : undefined}
        />
      ))}
      {effectiveWindows.map((opening, i) => (
        <WindowMark
          key={`win-${i}-${opening.wall}`}
          opening={opening}
          ox={ox} oy={oy} wPx={wPx} dPx={dPx}
          wMm={wMm} dMm={dMm} scale={scale}
        />
      ))}

      {/* Furniture */}
      {room.items.map((item) => {
        const isDragging = drag?.id === item.id;
        const cMm = isDragging && livePos ? livePos : { x: item.position.x_mm, z: item.position.z_mm };
        return (
          <ItemRect
            key={item.id}
            item={item}
            cMm={cMm}
            backendXToCanvas={backendXToCanvas}
            backendZToCanvas={backendZToCanvas}
            scale={scale}
            selected={selectedItemId === item.id}
            dragging={isDragging}
            canDrag={layoutEditMode}
            onPointerDown={(e) => startDrag(e, item)}
            onDoubleClick={() => layoutEditMode && onRotateItem?.(item.id)}
          />
        );
      })}

      {/* Compass + dimensions */}
      <Compass entrance={entrance} svgW={svgW} oy={oy} />
      <Dimensions wMm={wMm} dMm={dMm} ox={ox} oy={oy} scale={scale} />
    </svg>
  );
}

// ---------- pieces ----------

function gridLines(ox: number, oy: number, wMm: number, dMm: number, scale: number) {
  const out: React.ReactNode[] = [];
  for (let x = 0; x <= wMm; x += GRID_MINOR) {
    const major = x % GRID_MAJOR === 0;
    out.push(<line key={`vx${x}`} x1={ox + x * scale} y1={oy} x2={ox + x * scale} y2={oy + dMm * scale} stroke={major ? "rgba(82,73,62,0.32)" : "rgba(125,115,103,0.14)"} strokeWidth={major ? 0.8 : 0.35} />);
  }
  for (let z = 0; z <= dMm; z += GRID_MINOR) {
    const major = z % GRID_MAJOR === 0;
    out.push(<line key={`hz${z}`} x1={ox} y1={oy + z * scale} x2={ox + wMm * scale} y2={oy + z * scale} stroke={major ? "rgba(82,73,62,0.32)" : "rgba(125,115,103,0.14)"} strokeWidth={major ? 0.8 : 0.35} />);
  }
  return <g>{out}</g>;
}

function ItemRect({
  item,
  cMm,
  backendXToCanvas,
  backendZToCanvas,
  scale,
  selected,
  dragging,
  canDrag,
  onPointerDown,
  onDoubleClick,
}: {
  item: PlacedItem;
  cMm: { x: number; z: number };
  backendXToCanvas: (x: number) => number;
  backendZToCanvas: (z: number) => number;
  scale: number;
  selected: boolean;
  dragging: boolean;
  canDrag: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onDoubleClick: () => void;
}) {
  const w = item.dimensions.width_mm * scale;
  const d = item.dimensions.depth_mm * scale;
  const cx = backendXToCanvas(cMm.x);
  const cy = backendZToCanvas(cMm.z);

  // Rotation transform: 2D canvas has +x going LEFT (east-on-left) and +y
  // going DOWN (north-on-top → south-on-bottom). For backend rot=0 (front
  // faces backend +z = north), the rendered "front tick" line below the rect
  // (local +y) should point UP on canvas (north). After the y-flip, local
  // +y points DOWN on canvas (south). After x-flip, local +x points LEFT
  // on canvas (east).
  // Effect on rotation: the y-flip alone would map svgRot=(180+rot) (front
  // up). The additional x-flip changes the parity, so the angle becomes
  // svgRot = (180 - rot) mod 360.
  //   rot=0   → 180 (front up = north) ✓
  //   rot=90  → 90  (front east = canvas LEFT) ✓
  //   rot=180 → 0   (front down = south) ✓
  //   rot=270 → 270 (front west = canvas RIGHT) ✓
  const rot = item.position.rotation_deg;
  const svgRot = (180 - rot + 360) % 360;

  const fill = categoryFill(item.category);
  // In edit mode, items get a slightly heavier stroke + selection accent so
  // it's obvious that they're interactive. Outside edit mode the plan reads
  // as a quiet drawing.
  const stroke = selected ? TERRA : canDrag ? INK : INK_2;
  const strokeW = selected ? 2.4 : canDrag ? 1.5 : 1.1;
  const transform = `translate(${cx} ${cy}) rotate(${svgRot})`;
  const labelSize = Math.min(12, Math.max(9, w / 8));
  return (
    <g>
      {selected && (
        <rect
          transform={transform}
          x={-w / 2 - 14 * scale}
          y={-d / 2 - 14 * scale}
          width={w + 28 * scale}
          height={d + 28 * scale}
          fill="none"
          stroke={TERRA}
          strokeWidth={1.2}
          strokeDasharray="4 3"
          opacity={0.7}
          pointerEvents="none"
        />
      )}
      <g
        transform={transform}
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClick}
        style={{ cursor: dragging ? "grabbing" : canDrag ? "grab" : "pointer" }}
      >
        {/* Solid ink-stroked footprint on paper fill — the architectural
            convention for furniture in plan. No drop shadow, no gradient. */}
        <rect
          x={-w / 2}
          y={-d / 2}
          width={w}
          height={d}
          rx={Math.min(3, w / 24)}
          fill={fill}
          fillOpacity={dragging ? 0.5 : 0.92}
          stroke={stroke}
          strokeWidth={strokeW}
        />
        <DraftIcon category={item.category} w={w} d={d} />
        {/* Front-edge tick — heavier so the user can see which way each piece
            faces. */}
        <line x1={-w * 0.34} y1={d / 2 - 2.5} x2={w * 0.34} y2={d / 2 - 2.5} stroke={INK} strokeWidth={2} strokeLinecap="round" opacity={0.85} />
        {w > 30 && d > 26 && (
          // Counter-rotate so the label always reads left-to-right.
          <g transform={`rotate(${-svgRot})`}>
            <text
              x={0}
              y={4}
              fontSize={labelSize}
              fill={INK}
              fontFamily="'JetBrains Mono', ui-monospace, monospace"
              fontWeight={500}
              textAnchor="middle"
              pointerEvents="none"
              style={{ letterSpacing: "0.04em", textTransform: "uppercase" }}
            >
              {short(item.name_en, 14)}
            </text>
          </g>
        )}
      </g>
    </g>
  );
}

function DraftIcon({ category, w, d }: { category: string; w: number; d: number }) {
  const s = INK_2;
  const alpha = 0.6;
  if (category === "seating") {
    return (
      <g pointerEvents="none" opacity={alpha}>
        <rect x={-w * 0.46} y={-d * 0.48} width={w * 0.92} height={d * 0.22} rx={2} fill="none" stroke={s} strokeWidth={0.9} />
        <rect x={-w * 0.42} y={-d * 0.06} width={w * 0.36} height={d * 0.5} rx={2} fill="none" stroke={s} strokeWidth={0.8} />
        <rect x={w * 0.06} y={-d * 0.06} width={w * 0.36} height={d * 0.5} rx={2} fill="none" stroke={s} strokeWidth={0.8} />
      </g>
    );
  }
  if (category === "sleeping") {
    return (
      <g pointerEvents="none" opacity={alpha}>
        <rect x={-w * 0.46} y={-d * 0.46} width={w * 0.92} height={d * 0.18} rx={2} fill="none" stroke={s} strokeWidth={0.9} />
        <line x1={-w * 0.42} y1={0} x2={w * 0.42} y2={0} stroke={s} strokeWidth={0.6} strokeDasharray="3 3" />
      </g>
    );
  }
  if (category === "storage" || category === "tv_unit") {
    return (
      <g pointerEvents="none" opacity={alpha}>
        <line x1={-w * 0.46} y1={-d * 0.12} x2={w * 0.46} y2={-d * 0.12} stroke={s} strokeWidth={0.7} />
        <line x1={-w * 0.46} y1={d * 0.16} x2={w * 0.46} y2={d * 0.16} stroke={s} strokeWidth={0.7} />
      </g>
    );
  }
  if (category === "dining") {
    return (
      <g pointerEvents="none" opacity={alpha}>
        {[[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]].map(([px, py], i) => (
          <circle key={i} cx={px * w} cy={py * d} r={1.8} fill={s} />
        ))}
      </g>
    );
  }
  if (category === "mandir") {
    return <path d={`M ${-w * 0.28} ${d * 0.42} A ${w * 0.28} ${w * 0.28} 0 0 1 ${w * 0.28} ${d * 0.42}`} fill="none" stroke={s} strokeWidth={1.2} pointerEvents="none" opacity={alpha} />;
  }
  return null;
}

function DoorMark({ opening, ox, oy, wPx, dPx, wMm, dMm, scale, label }: {
  opening: Opening;
  ox: number; oy: number; wPx: number; dPx: number;
  wMm: number; dMm: number; scale: number;
  label?: string;
}) {
  const wall = opening.wall;
  const isNS = wall === "N" || wall === "S";
  const doorWPx = opening.width_mm * scale;
  const half = doorWPx / 2;
  const arc = Math.min(70, Math.max(36, doorWPx * 0.85));
  // X-flip: centre_frac=0.5 maps to room middle; for non-half fractions, the
  // canvas position must invert too. Same as backendXToCanvas: canvas x = ox
  // + (wMm - centerMm) * scale for N/S walls.
  const centerMm = (isNS ? wMm : dMm) * opening.center_frac;
  let line: { x1: number; y1: number; x2: number; y2: number };
  let path: string;
  let lbl: { x: number; y: number };
  if (wall === "S") {
    const cx = ox + (wMm - centerMm) * scale;
    line = { x1: cx - half, y1: oy + dPx, x2: cx + half, y2: oy + dPx };
    path = `M ${cx - half} ${oy + dPx} A ${arc} ${arc} 0 0 1 ${cx - half + arc} ${oy + dPx - arc}`;
    lbl = { x: cx, y: oy + dPx + 22 };
  } else if (wall === "N") {
    const cx = ox + (wMm - centerMm) * scale;
    line = { x1: cx - half, y1: oy, x2: cx + half, y2: oy };
    path = `M ${cx + half} ${oy} A ${arc} ${arc} 0 0 1 ${cx + half - arc} ${oy + arc}`;
    lbl = { x: cx, y: oy - 10 };
  } else if (wall === "W") {
    // West wall is on the RIGHT side of the canvas after x-flip.
    const cy = oy + (dMm - centerMm) * scale;
    line = { x1: ox + wPx, y1: cy - half, x2: ox + wPx, y2: cy + half };
    path = `M ${ox + wPx} ${cy + half} A ${arc} ${arc} 0 0 1 ${ox + wPx - arc} ${cy + half - arc}`;
    lbl = { x: ox + wPx - 8, y: cy + 14 };
  } else {
    // East wall is on the LEFT side of the canvas after x-flip.
    const cy = oy + (dMm - centerMm) * scale;
    line = { x1: ox, y1: cy - half, x2: ox, y2: cy + half };
    path = `M ${ox} ${cy - half} A ${arc} ${arc} 0 0 1 ${ox + arc} ${cy - half + arc}`;
    lbl = { x: ox + 8, y: cy + 14 };
  }
  return (
    <g pointerEvents="none">
      {/* Cut the wall: a paper-coloured strip across the wall thickness to
          "open" it where the door is. */}
      <line {...line} stroke={PAPER} strokeWidth={10} />
      {/* Threshold line — the bottom of the doorway. */}
      <line {...line} stroke={INK} strokeWidth={1.8} />
      {/* Swing arc — dashed, light hand. */}
      <path d={path} fill="none" stroke={INK} strokeWidth={1} strokeDasharray="3 3" opacity={0.7} />
      {label && (
        <text
          x={lbl.x}
          y={lbl.y}
          fontSize={10}
          fontWeight={600}
          fill={INK}
          fontFamily="'JetBrains Mono', ui-monospace, monospace"
          textAnchor="middle"
          style={{ letterSpacing: "0.08em" }}
        >
          {label}
        </text>
      )}
    </g>
  );
}

function WindowMark({ opening, ox, oy, wPx, dPx, wMm, dMm, scale }: {
  opening: Opening;
  ox: number; oy: number; wPx: number; dPx: number;
  wMm: number; dMm: number; scale: number;
}) {
  const wall = opening.wall;
  const isNS = wall === "N" || wall === "S";
  const winWPx = opening.width_mm * scale;
  const half = winWPx / 2;
  const centerMm = (isNS ? wMm : dMm) * opening.center_frac;
  let rect: { x: number; y: number; w: number; h: number };
  let label: { x: number; y: number };
  if (wall === "S") {
    const cx = ox + (wMm - centerMm) * scale;
    rect = { x: cx - half, y: oy + dPx - 4, w: winWPx, h: 8 };
    label = { x: cx, y: oy + dPx + 22 };
  } else if (wall === "N") {
    const cx = ox + (wMm - centerMm) * scale;
    rect = { x: cx - half, y: oy - 4, w: winWPx, h: 8 };
    label = { x: cx, y: oy - 10 };
  } else if (wall === "W") {
    const cy = oy + (dMm - centerMm) * scale;
    rect = { x: ox + wPx - 4, y: cy - half, w: 8, h: winWPx };
    label = { x: ox + wPx + 22, y: cy + 4 };
  } else {
    const cy = oy + (dMm - centerMm) * scale;
    rect = { x: ox - 4, y: cy - half, w: 8, h: winWPx };
    label = { x: ox - 22, y: cy + 4 };
  }
  return (
    <g pointerEvents="none">
      {/* Window in plan: parallel lines (a "stretched" double-line is the
          standard architectural mark) on the paper. */}
      <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} fill={PAPER} stroke={INK} strokeWidth={1.2} />
      {isNS ? (
        <line x1={rect.x} y1={rect.y + rect.h / 2} x2={rect.x + rect.w} y2={rect.y + rect.h / 2} stroke={INK} strokeWidth={0.6} />
      ) : (
        <line x1={rect.x + rect.w / 2} y1={rect.y} x2={rect.x + rect.w / 2} y2={rect.y + rect.h} stroke={INK} strokeWidth={0.6} />
      )}
      <text
        x={label.x}
        y={label.y}
        fontSize={9}
        fill={INK_2}
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        textAnchor={isNS ? "middle" : (wall === "W" ? "start" : "end")}
        style={{ letterSpacing: "0.06em" }}
      >
        WIN
      </text>
    </g>
  );
}

function Compass({ entrance, svgW, oy }: { entrance: Direction; svgW: number; oy: number }) {
  // Compass shows true north up. After the x-flip, east is on the LEFT of
  // the plan, so the "E" tick on the compass also points left. The compass
  // glyph itself doesn't rotate; what rotates is the indicator showing
  // which wall is the entrance (a tiny tick along the rim).
  const entranceAngle: Record<Direction, number> = {
    // 0° = up (north), 90° = right (west on flipped canvas), 180° = down
    // (south), 270° = left (east on flipped canvas).
    N: 0, NE: 315, E: 270, SE: 225, S: 180, SW: 135, W: 90, NW: 45,
  };
  const angle = entranceAngle[entrance] ?? 180;
  return (
    <g transform={`translate(${svgW - 56} ${oy + 26})`} pointerEvents="none">
      <circle r={22} fill={PAPER_3} stroke={INK_2} strokeWidth={0.9} />
      {/* North arrow (always up). */}
      <polygon points="0,-17 5,8 0,3 -5,8" fill={INK} />
      <text x={0} y={-22} fontSize={10} fontWeight={700} fill={INK} textAnchor="middle" fontFamily="'JetBrains Mono', ui-monospace, monospace">N</text>
      {/* Cardinal tick marks. After x-flip: E on LEFT, W on RIGHT. */}
      <text x={-17} y={4} fontSize={8} fill={INK_2} textAnchor="middle" fontFamily="'JetBrains Mono', ui-monospace, monospace">E</text>
      <text x={17} y={4} fontSize={8} fill={INK_2} textAnchor="middle" fontFamily="'JetBrains Mono', ui-monospace, monospace">W</text>
      <text x={0} y={20} fontSize={8} fill={INK_2} textAnchor="middle" fontFamily="'JetBrains Mono', ui-monospace, monospace">S</text>
      {/* Entrance pip — small terra dot at the entrance bearing on the rim. */}
      <g transform={`rotate(${angle})`}>
        <circle cx={0} cy={22} r={2.5} fill={TERRA} />
      </g>
    </g>
  );
}

function Dimensions({ wMm, dMm, ox, oy, scale }: { wMm: number; dMm: number; ox: number; oy: number; scale: number }) {
  const wPx = wMm * scale, dPx = dMm * scale;
  // Bigger, more legible — the user complained the room dimensions weren't
  // readable.
  return (
    <g pointerEvents="none">
      {/* Bottom-edge dimension (width). */}
      <line x1={ox} y1={oy + dPx + 38} x2={ox + wPx} y2={oy + dPx + 38} stroke={INK_2} strokeWidth={0.8} />
      <line x1={ox} y1={oy + dPx + 34} x2={ox} y2={oy + dPx + 42} stroke={INK_2} strokeWidth={0.8} />
      <line x1={ox + wPx} y1={oy + dPx + 34} x2={ox + wPx} y2={oy + dPx + 42} stroke={INK_2} strokeWidth={0.8} />
      <rect x={ox + wPx / 2 - 60} y={oy + dPx + 30} width={120} height={18} fill={PAPER} />
      <text x={ox + wPx / 2} y={oy + dPx + 43} fontSize={13} fontWeight={600} fill={INK} fontFamily="'JetBrains Mono', ui-monospace, monospace" textAnchor="middle" style={{ letterSpacing: "0.04em" }}>
        {wMm} mm · {(wMm / 304.8).toFixed(1)} ft
      </text>

      {/* Left-edge dimension (depth). */}
      <line x1={ox - 38} y1={oy} x2={ox - 38} y2={oy + dPx} stroke={INK_2} strokeWidth={0.8} />
      <line x1={ox - 42} y1={oy} x2={ox - 34} y2={oy} stroke={INK_2} strokeWidth={0.8} />
      <line x1={ox - 42} y1={oy + dPx} x2={ox - 34} y2={oy + dPx} stroke={INK_2} strokeWidth={0.8} />
      <g transform={`rotate(-90 ${ox - 38} ${oy + dPx / 2})`}>
        <rect x={ox - 38 - 60} y={oy + dPx / 2 - 9} width={120} height={18} fill={PAPER} />
        <text x={ox - 38} y={oy + dPx / 2 + 4} fontSize={13} fontWeight={600} fill={INK} fontFamily="'JetBrains Mono', ui-monospace, monospace" textAnchor="middle" style={{ letterSpacing: "0.04em" }}>
          {dMm} mm · {(dMm / 304.8).toFixed(1)} ft
        </text>
      </g>

      {/* Scale bar — bottom-left. */}
      <line x1={ox} y1={oy + dPx + 62} x2={ox + 1000 * scale} y2={oy + dPx + 62} stroke={INK} strokeWidth={2.2} />
      <line x1={ox} y1={oy + dPx + 58} x2={ox} y2={oy + dPx + 66} stroke={INK} strokeWidth={1.6} />
      <line x1={ox + 1000 * scale} y1={oy + dPx + 58} x2={ox + 1000 * scale} y2={oy + dPx + 66} stroke={INK} strokeWidth={1.6} />
      <text x={ox + (1000 * scale) / 2} y={oy + dPx + 76} fontSize={10} fill={INK_2} textAnchor="middle" fontFamily="'JetBrains Mono', ui-monospace, monospace" style={{ letterSpacing: "0.08em" }}>
        1 METRE
      </text>
    </g>
  );
}

// ---------- helpers ----------

function categoryFill(category: string): string {
  // Muted, ink-friendly palette for category recognition without overpowering
  // the paper feel.
  switch (category) {
    case "seating": return "#C8B496";   // warm sand
    case "dining":  return "#B89B7A";   // light walnut
    case "tv_unit":
    case "storage": return "#9B7E5F";   // walnut
    case "mandir":  return "#D4A574";   // brass
    case "sleeping":return "#D9C3A6";   // bone
    case "decor":   return "#C9B89D";   // dust
    default:        return "#BFA98C";
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
