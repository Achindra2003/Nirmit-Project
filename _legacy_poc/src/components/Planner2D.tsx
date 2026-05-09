import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { useStore, type DoorWindowItem, type Item, type RoomConfig } from '../store/useStore';

interface Planner2DProps {
  compact?: boolean;
  captureId?: string;
  snapshot?: { room: RoomConfig; items: Item[]; doorWindows: DoorWindowItem[] };
}

interface DragState { id: string; offsetX: number; offsetY: number }

function normalizeRotation(rotation: number) {
  const normalized = rotation % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function getFootprint(width: number, length: number, rotation: number) {
  return Math.round(normalizeRotation(rotation) / 90) % 2 === 0 ? { width, length } : { width: length, length: width };
}

/** Arch-drafting palette — architectural browns, not candy colors */
function draftingColors(code: string) {
  const base = { fill: '#D4C4A8', stroke: '#8B7355', detail: 'rgba(80,60,35,0.3)' };
  if (code.includes('pooja') || code.includes('mandir') || code.includes('prayer'))
    return { fill: '#FDF5E6', stroke: '#C8A96E', detail: 'rgba(160,120,60,0.35)' };
  if (code.includes('wardrobe'))
    return { fill: '#D0C0A5', stroke: '#7A6248', detail: 'rgba(70,50,30,0.35)' };
  if (code.includes('bed'))
    return { fill: '#D8C8A8', stroke: '#8A7055', detail: 'rgba(80,55,35,0.3)' };
  return base;
}

/** Small architectural SVG icon for furniture types — no emoji */
function DraftingIcon({ code, w, h }: { code: string; w: number; h: number }) {
  const S = draftingColors(code);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {code.includes('bed') ? (<>
        <rect x={w * 0.04} y={h * 0.02} width={w * 0.92} height={h * 0.18} rx={2} fill={S.fill} stroke={S.stroke} strokeWidth={0.6} />
        <rect x={w * 0.06} y={h * 0.26} width={w * 0.88} height={h * 0.66} rx={3} fill={S.fill} stroke={S.stroke} strokeWidth={0.6} />
        <rect x={w * 0.14} y={h * 0.04} width={w * 0.28} height={h * 0.12} rx={2} fill={S.detail} />
        <rect x={w * 0.58} y={h * 0.04} width={w * 0.28} height={h * 0.12} rx={2} fill={S.detail} />
        <line x1={w * 0.1} y1={h * 0.5} x2={w * 0.9} y2={h * 0.5} stroke={S.detail} strokeWidth={0.3} strokeDasharray="2 3" />
      </>) : code.includes('wardrobe') ? (<>
        <rect x={w * 0.04} y={h * 0.04} width={w * 0.92} height={h * 0.92} rx={2} fill={S.fill} stroke={S.stroke} strokeWidth={0.6} />
        <line x1={w * 0.35} y1={h * 0.04} x2={w * 0.35} y2={h * 0.96} stroke={S.stroke} strokeWidth={0.4} />
        <line x1={w * 0.65} y1={h * 0.04} x2={w * 0.65} y2={h * 0.96} stroke={S.stroke} strokeWidth={0.4} />
        <circle cx={w * 0.5} cy={h * 0.6} r={1.2} fill={S.stroke} />
        <circle cx={w * 0.5} cy={h * 0.32} r={1.2} fill={S.stroke} />
      </>) : code.includes('table') || code.includes('desk') || code.includes('tv') ? (<>
        <rect x={w * 0.06} y={h * 0.06} width={w * 0.88} height={h * 0.88} rx={2} fill={S.fill} stroke={S.stroke} strokeWidth={0.6} />
        {[[w * 0.14, h * 0.14], [w * 0.86, h * 0.14], [w * 0.14, h * 0.86], [w * 0.86, h * 0.86]].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r={1.5} fill={S.detail} />)}
        {code.includes('tv') && <line x1={w * 0.5} y1={h * 0.2} x2={w * 0.5} y2={h * 0.8} stroke={S.detail} strokeWidth={0.4} />}
      </>) : code.includes('sofa') || code.includes('l-shaped') ? (<>
        <rect x={w * 0.04} y={h * 0.02} width={w * 0.92} height={h * 0.22} rx={2} fill={S.fill} stroke={S.stroke} strokeWidth={0.6} />
        <rect x={w * 0.06} y={h * 0.3} width={w * 0.4} height={h * 0.58} rx={2} fill={S.fill} stroke={S.stroke} strokeWidth={0.45} />
        <rect x={w * 0.54} y={h * 0.3} width={w * 0.4} height={h * 0.58} rx={2} fill={S.fill} stroke={S.stroke} strokeWidth={0.45} />
        <rect x={w * 0.02} y={h * 0.18} width={w * 0.05} height={h * 0.74} rx={1} fill={S.detail} stroke={S.stroke} strokeWidth={0.35} />
        <rect x={w * 0.93} y={h * 0.18} width={w * 0.05} height={h * 0.74} rx={1} fill={S.detail} stroke={S.stroke} strokeWidth={0.35} />
      </>) : code.includes('chair') || code.includes('settee') || code.includes('chaise') || code.includes('bench') ? (<>
        <rect x={w * 0.08} y={h * 0.04} width={w * 0.84} height={h * 0.22} rx={2} fill={S.fill} stroke={S.stroke} strokeWidth={0.6} />
        <rect x={w * 0.06} y={h * 0.3} width={w * 0.88} height={h * 0.6} rx={3} fill={S.fill} stroke={S.stroke} strokeWidth={0.6} />
        <line x1={w * 0.1} y1={h * 0.5} x2={w * 0.9} y2={h * 0.5} stroke={S.detail} strokeWidth={0.3} strokeDasharray="2 2" />
      </>) : code.includes('bookshelf') || code.includes('shelf') || code.includes('rack') ? (<>
        <rect x={w * 0.06} y={h * 0.04} width={w * 0.88} height={h * 0.92} rx={1} fill={S.fill} stroke={S.stroke} strokeWidth={0.6} />
        <line x1={w * 0.06} y1={h * 0.28} x2={w * 0.94} y2={h * 0.28} stroke={S.stroke} strokeWidth={0.4} />
        <line x1={w * 0.06} y1={h * 0.52} x2={w * 0.94} y2={h * 0.52} stroke={S.stroke} strokeWidth={0.4} />
        <line x1={w * 0.06} y1={h * 0.76} x2={w * 0.94} y2={h * 0.76} stroke={S.stroke} strokeWidth={0.4} />
      </>) : code.includes('nightstand') || code.includes('dresser') ? (<>
        <rect x={w * 0.08} y={h * 0.08} width={w * 0.84} height={h * 0.84} rx={2} fill={S.fill} stroke={S.stroke} strokeWidth={0.6} />
        <line x1={w * 0.08} y1={h * 0.45} x2={w * 0.92} y2={h * 0.45} stroke={S.stroke} strokeWidth={0.4} />
        <circle cx={w * 0.5} cy={h * 0.55} r={1.2} fill={S.stroke} />
      </>) : (
        <rect x={w * 0.1} y={h * 0.1} width={w * 0.8} height={h * 0.8} rx={3} fill={S.fill} stroke={S.stroke} strokeWidth={0.6} />
      )}
    </svg>
  );
}

export default function Planner2D({ compact = false, captureId, snapshot }: Planner2DProps) {
  const storeRoom = useStore((s) => s.room);
  const storeItems = useStore((s) => s.items);
  const activeItemId = useStore((s) => s.activeItemId);
  const storeDoorWindows = useStore((s) => s.doorWindows);
  const setActiveItem = useStore((s) => s.setActiveItem);
  const updateItemPos = useStore((s) => s.updateItemPos);
  const room = snapshot?.room ?? storeRoom;
  const items = snapshot?.items ?? storeItems;
  const doorWindows = snapshot?.doorWindows ?? storeDoorWindows;
  const readOnly = Boolean(snapshot);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 600, height: 600 });
  const [showDimensions, setShowDimensions] = useState(true);

  useEffect(() => {
    if (compact) return;
    const updateSize = () => {
      const maxH = window.innerHeight - 200;
      const maxW = window.innerWidth - 600;
      const sz = Math.max(280, Math.min(600, maxH, maxW));
      setContainerSize({ width: sz, height: sz });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [compact]);

  const maxEdge = compact ? 260 : Math.min(containerSize.width, containerSize.height);
  const scale = useMemo(() => maxEdge / Math.max(room.width, room.length), [maxEdge, room.length, room.width]);
  const roomW = room.width * scale, roomL = room.length * scale;

  const toRoom = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const b = containerRef.current.getBoundingClientRect();
    return { x: Math.round(((e.clientX - b.left) / scale) * 10) / 10, y: Math.round(((e.clientY - b.top) / scale) * 10) / 10 };
  }, [scale]);

  const handlePointerDown = useCallback((e: React.PointerEvent, id: string) => {
    if (readOnly) return;
    e.stopPropagation();
    const item = items.find(i => i.id === id);
    if (!item) return;
    const p = toRoom(e);
    setDragState({ id, offsetX: p.x - item.x, offsetY: p.y - item.y });
    setActiveItem(id);
  }, [readOnly, items, toRoom, setActiveItem]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (readOnly || !dragState) return;
    const p = toRoom(e);
    updateItemPos(dragState.id, p.x - dragState.offsetX, p.y - dragState.offsetY);
  }, [readOnly, dragState, toRoom, updateItemPos]);

  const handlePointerUp = useCallback(() => setDragState(null), []);

  const wallThickness = 6; // thick architectural walls

  return (
    <div id={captureId} style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4EFE6', overflow: 'hidden' }}>
      {/* Blueprint toolbar */}
      {!compact && !readOnly && (
        <div style={{ position: 'absolute', top: 8, left: 12, zIndex: 20, display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={() => setShowDimensions(d => !d)} style={{ padding: '4px 10px', background: showDimensions ? 'var(--n-800)' : '#FDFBF7', color: showDimensions ? '#F4EFE6' : 'var(--n-600)', border: '1px solid var(--n-400)', borderRadius: 5, fontSize: 9, fontFamily: 'var(--f-mono)', letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer' }}>
            {showDimensions ? 'DIM ON' : 'DIM OFF'}
          </button>
          <span style={{ fontSize: 9, color: 'var(--n-400)', fontFamily: 'var(--f-mono)', marginLeft: 4 }}>SCALE 1:{Math.round(12 / scale)}"</span>
        </div>
      )}

      <div ref={containerRef}
        style={{
          position: 'relative', width: roomW + 12, height: roomL + 12,
          /* Parchment grid */
          background: '#F8F4EB',
          backgroundImage: `linear-gradient(rgba(150,130,100,0.18) 0.5px, transparent 0.5px), linear-gradient(90deg, rgba(150,130,100,0.18) 0.5px, transparent 0.5px)`,
          backgroundSize: `${scale}px ${scale}px`,
          boxShadow: 'inset 0 0 80px rgba(170,140,90,0.05), 0 1px 3px rgba(0,0,0,0.06)',
          border: '1px solid rgba(140,120,90,0.15)',
          borderRadius: 2,
          cursor: readOnly ? 'default' : 'default',
          margin: '0 auto',
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Walls — thick architectural style with hatching */}
        <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}>
          <line x1={3} y1={3} x2={roomW + 3} y2={3} stroke="var(--n-700)" strokeWidth={wallThickness} strokeLinecap="square" />
          <line x1={roomW + 3} y1={0} x2={roomW + 3} y2={roomL + 6} stroke="var(--n-700)" strokeWidth={wallThickness} strokeLinecap="square" />
          <line x1={roomW + 3} y1={roomL + 3} x2={3} y2={roomL + 3} stroke="var(--n-700)" strokeWidth={wallThickness} strokeLinecap="square" />
          <line x1={0} y1={roomL + 3} x2={0} y2={3} stroke="var(--n-700)" strokeWidth={wallThickness} strokeLinecap="square" />

          {/* Cross-hatch fill inside walls */}
          {[[3, 3, roomW + 3, 3], [roomW, 3, roomW, roomL + 3], [3, roomL, roomW + 3, roomL], [3, 3, 3, roomL]].map(([x1, y1, x2, y2], i) => {
            const isH = Math.abs(x2 - x1) > Math.abs(y2 - y1);
            const len = isH ? (x2 as number) - (x1 as number) : (y2 as number) - (y1 as number);
            const hatchItems: React.ReactNode[] = [];
            for (let n = 0; n < Math.abs(len) / 3; n++) {
              const t = n * 3 / Math.abs(len);
              hatchItems.push(
                <line key={n}
                  x1={(x1 as number) + (isH ? t * (x2 as number - x1 as number) : (x2 as number - x1 as number) / 2 - 2)}
                  y1={(y1 as number) + (!isH ? t * (y2 as number - y1 as number) : (y2 as number - y1 as number) / 2 - 2)}
                  x2={(x1 as number) + (isH ? t * (x2 as number - x1 as number) : (x2 as number - x1 as number) / 2 + 2)}
                  y2={(y1 as number) + (!isH ? t * (y2 as number - y1 as number) : (y2 as number - y1 as number) / 2 + 2)}
                  stroke="rgba(100,80,50,0.25)" strokeWidth={0.5}
                />
              );
            }
            return <g key={i}>{hatchItems}</g>;
          })}
        </svg>

        {/* Dimension callouts */}
        {showDimensions && (
          <svg style={{ position: 'absolute', inset: -20, pointerEvents: 'none', zIndex: 3, width: roomW + 50, height: roomL + 50 }}>
            {/* Width dimension */}
            <line x1={3} y1={-8} x2={roomW + 9} y2={-8} stroke="var(--n-600)" strokeWidth={0.6} />
            <line x1={3} y1={-5} x2={3} y2={-11} stroke="var(--n-600)" strokeWidth={0.6} />
            <line x1={roomW + 9} y1={-5} x2={roomW + 9} y2={-11} stroke="var(--n-600)" strokeWidth={0.6} />
            <text x={roomW / 2 + 3} y={-3} textAnchor="middle" fontSize={9} fill="var(--n-600)" fontFamily="var(--f-mono)" letterSpacing="0.04em">{room.width.toFixed(1)}ft</text>

            {/* Length dimension */}
            <line x1={-8} y1={3} x2={-8} y2={roomL + 9} stroke="var(--n-600)" strokeWidth={0.6} />
            <line x1={-5} y1={3} x2={-11} y2={3} stroke="var(--n-600)" strokeWidth={0.6} />
            <line x1={-5} y1={roomL + 9} x2={-11} y2={roomL + 9} stroke="var(--n-600)" strokeWidth={0.6} />
            <text x={-3} y={roomL / 2 + 3} textAnchor="middle" fontSize={9} fill="var(--n-600)" fontFamily="var(--f-mono)" letterSpacing="0.04em" transform={`rotate(-90, -3, ${roomL / 2 + 3})`}>{room.length.toFixed(1)}ft</text>
          </svg>
        )}

        {/* Door / Window openings — clean architectural symbols */}
        {doorWindows.map(dw => {
          // Only support 4-segment rectangle
          const seg = [
            { x1: 0, y1: 0, x2: room.width, y2: 0 },
            { x1: room.width, y1: 0, x2: room.width, y2: room.length },
            { x1: room.width, y1: room.length, x2: 0, y2: room.length },
            { x1: 0, y1: room.length, x2: 0, y2: 0 },
          ][dw.wallIndex];
          if (!seg) return null;
          const x = seg.x1 + (seg.x2 - seg.x1) * dw.position;
          const y = seg.y1 + (seg.y2 - seg.y1) * dw.position;
          const isH = Math.abs(seg.x2 - seg.x1) > Math.abs(seg.y2 - seg.y1);
          const px = x * scale + 3, py = y * scale + 3;

          if (dw.type === 'door') {
            // Door: open arc + opening in wall
            return (
              <svg key={dw.id} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4 }}>
                {/* Wall gap */}
                <rect
                  x={isH ? px - (1.5 * scale * 0.5) : px - 3}
                  y={isH ? py - 3 : py - (1.5 * scale * 0.5)}
                  width={isH ? 1.5 * scale : 6}
                  height={isH ? 6 : 1.5 * scale}
                  fill="#F4EFE6"
                />
                {/* Door swing arc */}
                <path d={isH
                  ? `M ${px - 0.75 * scale},${py + 2} Q ${px - 0.75 * scale},${py - 1.25 * scale} ${px + 0.75 * scale},${py - 1.25 * scale}`
                  : `M ${px + 2},${py - 0.75 * scale} Q ${px + 1.25 * scale},${py - 0.75 * scale} ${px + 1.25 * scale},${py + 0.75 * scale}`
                } stroke="var(--n-600)" strokeWidth={0.6} fill="none" strokeDasharray="3 2" />
              </svg>
            );
          }
          // Window: gap + two thin fill lines
          return (
            <svg key={dw.id} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4 }}>
              <rect
                x={isH ? px - (2 * scale * 0.5) : px - 3}
                y={isH ? py - 3 : py - (2 * scale * 0.5)}
                width={isH ? 2 * scale : 6}
                height={isH ? 6 : 2 * scale}
                fill="#E8E0D2"
                stroke="var(--n-500)" strokeWidth={0.5}
              />
              {isH ? (
                <line x1={px} y1={py - 2} x2={px} y2={py + 2} stroke="var(--n-500)" strokeWidth={0.4} />
              ) : (
                <line x1={px - 2} y1={py} x2={px + 2} y2={py} stroke="var(--n-500)" strokeWidth={0.4} />
              )}
            </svg>
          );
        })}

        {/* Furniture — positioned at item.x/item.y with rotation */}
        {items.map(item => {
          const rotated = normalizeRotation(item.rotation) % 180 > 45; // simplified: 90° rot swaps w/l
          const fpW = (rotated ? item.length : item.width) * scale;
          const fpL = (rotated ? item.width : item.length) * scale;
          const px = item.x * scale + (wallThickness / 2);
          const py = item.y * scale + (wallThickness / 2);
          const isActive = activeItemId === item.id;

          return (
            <div
              key={item.id}
              onPointerDown={(e) => handlePointerDown(e, item.id)}
              style={{
                position: 'absolute',
                left: px - fpW / 2,
                top: py - fpL / 2,
                width: fpW,
                height: fpL,
                cursor: readOnly ? 'default' : 'grab',
                zIndex: isActive ? 10 : 5,
                transition: isActive ? 'none' : 'box-shadow 150ms ease',
                boxShadow: isActive ? '0 0 0 1.5px rgba(60,40,20,0.5), 0 0 12px rgba(180,140,90,0.25)' : 'none',
                borderRadius: 3,
              }}
            >
              <DraftingIcon code={item.code} w={fpW} h={fpL} />
              {/* Label */}
              {fpW > 20 && fpL > 20 && (
                <span style={{
                  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  fontSize: Math.max(7, Math.min(10, fpW * 0.15)), color: 'rgba(60,40,20,0.55)',
                  fontFamily: 'var(--f-mono)', letterSpacing: '0.03em', textTransform: 'uppercase',
                  pointerEvents: 'none', whiteSpace: 'nowrap', fontWeight: 500,
                }}>
                  {item.code.replace(/-standard|-compact|-deluxe/g, '').replace(/-/g, ' ').substring(0, 10)}
                </span>
              )}
            </div>
          );
        })}

        {/* Compass Rose */}
        <svg width={36} height={36} viewBox="0 0 36 36"
          style={{ position: 'absolute', bottom: 4, left: 4, pointerEvents: 'none', zIndex: 15, opacity: 0.8 }}
        >
          <circle cx={18} cy={18} r={16} fill="rgba(248,244,235,0.93)" stroke="var(--n-500)" strokeWidth={0.6} />
          <polygon points="18,5 15.5,15 5,18 15.5,21 18,31" fill="var(--n-700)" opacity={0.85} />
          <polygon points="18,31 20.5,21 31,18 20.5,15 18,5" fill="var(--n-500)" opacity={0.3} />
          <text x={18} y={10} textAnchor="middle" fontSize={6} fill="var(--n-800)" fontWeight={700} fontFamily="var(--f-mono)">N</text>
        </svg>
      </div>
    </div>
  );
}