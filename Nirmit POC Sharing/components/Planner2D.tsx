import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { useStore, type DoorWindowItem, type Item, type RoomConfig } from '../store/useStore';

interface Planner2DProps {
  compact?: boolean;
  captureId?: string;
  snapshot?: {
    room: RoomConfig;
    items: Item[];
    doorWindows: DoorWindowItem[];
  };
}

interface DragState {
  id: string;
  offsetX: number;
  offsetY: number;
}

interface CornerDragState {
  index: number;
}

interface PolygonDrawState {
  points: { x: number; y: number }[];
  isDrawing: boolean;
}

function normalizeRotation(rotation: number) {
  const normalized = rotation % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function getFootprint(width: number, length: number, rotation: number) {
  const quarterTurns = Math.round(normalizeRotation(rotation) / 90) % 2;
  if (quarterTurns === 0) return { width, length };
  return { width: length, length: width };
}

function getCategoryBg(code: string): string {
  if (code.includes('bed')) return '#8B6F52';
  if (code.includes('wardrobe') || code.includes('trunk') || code.includes('dresser')) return '#5C4A32';
  if (code.includes('desk') || code.includes('table') || code.includes('tv')) return '#7A6248';
  if (code.includes('chair') || code.includes('settee') || code.includes('chaise') || code.includes('bench')) return '#9B7B5A';
  if (code.includes('nightstand')) return '#A08060';
  return '#8A7260';
}

function getCategoryBorder(code: string): string {
  if (code.includes('bed')) return '#6B5040';
  if (code.includes('wardrobe') || code.includes('trunk') || code.includes('dresser')) return '#3C2E1A';
  if (code.includes('desk') || code.includes('table')) return '#5A4230';
  return '#6A5240';
}

function FurnitureSVGIcon({ code, widthPx, heightPx }: { code: string; widthPx: number; heightPx: number }) {
  const w = widthPx, h = heightPx, opacity = 0.25;
  if (code.includes('bed')) {
    return (<svg width={w} height={h} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} viewBox={`0 0 ${w} ${h}`}><rect x={w * 0.05} y={h * 0.04} width={w * 0.9} height={h * 0.22} rx={2} fill="white" opacity={opacity} /><rect x={w * 0.08} y={h * 0.3} width={w * 0.84} height={h * 0.62} rx={3} fill="white" opacity={opacity * 0.7} /><rect x={w * 0.18} y={h * 0.35} width={w * 0.28} height={h * 0.2} rx={2} fill="white" opacity={opacity} /><rect x={w * 0.54} y={h * 0.35} width={w * 0.28} height={h * 0.2} rx={2} fill="white" opacity={opacity} /></svg>);
  }
  if (code.includes('wardrobe')) {
    return (<svg width={w} height={h} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} viewBox={`0 0 ${w} ${h}`}><rect x={w * 0.06} y={h * 0.06} width={w * 0.88} height={h * 0.88} rx={2} fill="none" stroke="white" strokeWidth={1} opacity={opacity * 1.5} />{[0.39, 0.61].map((pos, i) => (<line key={i} x1={w * pos} y1={h * 0.1} x2={w * pos} y2={h * 0.9} stroke="white" strokeWidth={0.8} opacity={opacity * 1.5} />))}{[0.28, 0.5, 0.72].map((pos, i) => (<circle key={i} cx={w * pos} cy={h * 0.65} r={2} fill="white" opacity={opacity * 2} />))}</svg>);
  }
  if (code.includes('desk') || code.includes('table') || code.includes('tv')) {
    return (<svg width={w} height={h} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} viewBox={`0 0 ${w} ${h}`}><rect x={w * 0.08} y={h * 0.08} width={w * 0.84} height={h * 0.84} rx={2} fill="none" stroke="white" strokeWidth={0.8} opacity={opacity * 1.5} />{[[0.12, 0.12], [0.88, 0.12], [0.12, 0.88], [0.88, 0.88]].map(([lx, ly], i) => (<rect key={i} x={w * lx - 2} y={h * ly - 2} width={4} height={4} rx={1} fill="white" opacity={opacity * 1.5} />))}</svg>);
  }
  if (code.includes('chair') || code.includes('settee') || code.includes('chaise') || code.includes('bench')) {
    return (<svg width={w} height={h} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} viewBox={`0 0 ${w} ${h}`}><rect x={w * 0.1} y={h * 0.1} width={w * 0.8} height={h * 0.25} rx={2} fill="white" opacity={opacity} /><rect x={w * 0.1} y={h * 0.38} width={w * 0.8} height={h * 0.5} rx={3} fill="white" opacity={opacity * 0.7} /></svg>);
  }
  if (code.includes('nightstand') || code.includes('dresser')) {
    return (<svg width={w} height={h} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} viewBox={`0 0 ${w} ${h}`}><rect x={w * 0.1} y={h * 0.1} width={w * 0.8} height={h * 0.8} rx={2} fill="none" stroke="white" strokeWidth={0.8} opacity={opacity * 1.5} /><line x1={w * 0.1} y1={h * 0.5} x2={w * 0.9} y2={h * 0.5} stroke="white" strokeWidth={0.6} opacity={opacity} /></svg>);
  }
  return (<svg width={w} height={h} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} viewBox={`0 0 ${w} ${h}`}><rect x={w * 0.12} y={h * 0.12} width={w * 0.76} height={h * 0.76} rx={3} fill="none" stroke="white" strokeWidth={0.8} opacity={opacity} /></svg>);
}

function CompassRose({ size = 40, rotation = 0 }: { size?: number; rotation?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ transform: `rotate(${rotation}deg)`, position: 'absolute', bottom: 8, left: 8, pointerEvents: 'none' }}>
      <circle cx={20} cy={20} r={18} fill="rgba(255,255,255,0.85)" stroke="var(--n-400)" strokeWidth={1} />
      <polygon points="20,4 17,17 4,20 17,23 20,36 23,23 36,20 23,17" fill="var(--brand)" opacity={0.7} />
      <polygon points="20,4 17,17 4,20 17,23 20,36" fill="var(--brand)" opacity={0.9} />
      <text x={20} y={7.5} textAnchor="middle" fontSize={5} fill="var(--brand)" fontWeight={700}>N</text>
    </svg>
  );
}

export default function Planner2D({ compact = false, captureId, snapshot }: Planner2DProps) {
  const storeRoom = useStore((s) => s.room);
  const storeItems = useStore((s) => s.items);
  const activeItemId = useStore((s) => s.activeItemId);
  const storeDoorWindows = useStore((s) => s.doorWindows);
  const setDoorWindows = useStore((s) => s.setDoorWindows);
  const setActiveItem = useStore((s) => s.setActiveItem);
  const updateItemPos = useStore((s) => s.updateItemPos);
  const checkCollision = useStore((s) => s.checkCollision);
  const room = snapshot?.room ?? storeRoom;
  const items = snapshot?.items ?? storeItems;
  const doorWindows = snapshot?.doorWindows ?? storeDoorWindows;
  const readOnly = Boolean(snapshot);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [cornerDrag, setCornerDrag] = useState<CornerDragState | null>(null);
  const [addingDoorWindow, setAddingDoorWindow] = useState<'door' | 'window' | null>(null);
  const [polygonDraw, setPolygonDraw] = useState<PolygonDrawState>({ points: [], isDrawing: false });
  const [gridSnap, setGridSnap] = useState(true);
  const [northRotation, setNorthRotation] = useState(0);
  const [collisionItems, setCollisionItems] = useState<Set<string>>(new Set());

  const [containerSize, setContainerSize] = useState({ width: 640, height: 640 });

  useEffect(() => {
    if (compact) return;
    const updateSize = () => {
      // 56px header + 52px planner top bar + 52px planner bottom bar + 48px padding
      const maxH = window.innerHeight - 210;
      // 268px left sidebar + 292px right sidebar + 48px padding
      const maxW = window.innerWidth - 610;
      const size = Math.max(300, Math.min(640, maxH, maxW));
      setContainerSize({ width: size, height: size });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [compact]);

  const maxEdge = compact ? 270 : Math.min(containerSize.width, containerSize.height);
  const scale = useMemo(() => maxEdge / Math.max(room.width, room.length), [maxEdge, room.length, room.width]);
  const roomWidthPx = room.width * scale;
  const roomLengthPx = room.length * scale;

  const wallSegments = useMemo(() => {
    if (room.shape === 'rectangle') {
      return [
        { x1: 0, y1: 0, x2: room.width, y2: 0 },
        { x1: room.width, y1: 0, x2: room.width, y2: room.length },
        { x1: room.width, y1: room.length, x2: 0, y2: room.length },
        { x1: 0, y1: room.length, x2: 0, y2: 0 },
      ];
    }
    return [
      { x1: 0, y1: 0, x2: room.width * 0.62, y2: 0 },
      { x1: room.width * 0.62, y1: 0, x2: room.width * 0.62, y2: room.length * 0.38 },
      { x1: room.width * 0.62, y1: room.length * 0.38, x2: room.width, y2: room.length * 0.38 },
      { x1: room.width, y1: room.length * 0.38, x2: room.width, y2: room.length },
      { x1: room.width, y1: room.length, x2: 0, y2: room.length },
      { x1: 0, y1: room.length, x2: 0, y2: 0 },
    ];
  }, [room.shape, room.width, room.length]);

  const notchStyle = room.shape === 'l-shape'
    ? { width: roomWidthPx * 0.38, height: roomLengthPx * 0.38, left: roomWidthPx * 0.62, top: 0 }
    : null;

  const snapToGrid = useCallback((val: number) => gridSnap ? Math.round(val * 10) / 10 : val, [gridSnap]);

  const toRoomCoords = useCallback((event: React.PointerEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const bounds = containerRef.current.getBoundingClientRect();
    return {
      x: snapToGrid((event.clientX - bounds.left) / scale),
      y: snapToGrid((event.clientY - bounds.top) / scale),
    };
  }, [scale, snapToGrid]);

  const handleCanvasClick = useCallback((event: React.PointerEvent) => {
    if (readOnly) return;
    if (!polygonDraw.isDrawing) { setActiveItem(null); return; }
    setPolygonDraw(prev => ({ ...prev, points: [...prev.points, toRoomCoords(event)] }));
  }, [readOnly, polygonDraw.isDrawing, toRoomCoords, setActiveItem]);

  const handleDoubleClick = useCallback(() => {
    if (readOnly) return;
    if (polygonDraw.isDrawing && polygonDraw.points.length >= 3) {
      const xs = polygonDraw.points.map(p => p.x), ys = polygonDraw.points.map(p => p.y);
      useStore.getState().setRoomConfig({ width: Math.ceil(Math.max(...xs) - Math.min(...xs)), length: Math.ceil(Math.max(...ys) - Math.min(...ys)), shape: 'rectangle' });
      setPolygonDraw({ points: [], isDrawing: false });
    }
  }, [readOnly, polygonDraw]);

  const handleCornerDown = useCallback((event: React.PointerEvent) => { event.stopPropagation(); setCornerDrag({ index: 0 }); }, []);
  const handleCornerMove = useCallback((event: React.PointerEvent) => {
    if (readOnly) return;
    if (!cornerDrag) return;
    const coords = toRoomCoords(event);
    useStore.getState().setRoomConfig({ width: Math.max(6, Math.round(coords.x)), length: Math.max(6, Math.round(coords.y)) });
  }, [readOnly, cornerDrag, toRoomCoords]);

  const handleWallClick = useCallback((wallIndex: number, event: React.PointerEvent) => {
    if (readOnly) return;
    if (!addingDoorWindow) return;
    event.stopPropagation();
    const seg = wallSegments[wallIndex];
    const coords = toRoomCoords(event);
    const dx = seg.x2 - seg.x1, dy = seg.y2 - seg.y1, len = Math.hypot(dx, dy);
    if (len === 0) return;
    const t = Math.max(0.1, Math.min(0.9, ((coords.x - seg.x1) * dx + (coords.y - seg.y1) * dy) / (len * len)));
    const newDw: DoorWindowItem = { id: Math.random().toString(36).substring(2, 10), type: addingDoorWindow, wallIndex, position: t };
    setDoorWindows([...doorWindows, newDw]);
    setAddingDoorWindow(null);
  }, [readOnly, addingDoorWindow, wallSegments, toRoomCoords, doorWindows, setDoorWindows]);

  const handlePointerDown = useCallback((event: React.PointerEvent, id: string) => {
    if (readOnly) return;
    event.stopPropagation();
    const target = items.find(i => i.id === id);
    if (!target) return;
    const p = toRoomCoords(event);
    setDragState({ id, offsetX: p.x - target.x, offsetY: p.y - target.y });
    setActiveItem(id);
  }, [readOnly, items, toRoomCoords, setActiveItem]);

  const handlePointerMove = useCallback((event: React.PointerEvent) => {
    if (readOnly) return;
    if (cornerDrag) { handleCornerMove(event); return; }
    if (!dragState) return;
    const p = toRoomCoords(event);
    const nx = snapToGrid(p.x - dragState.offsetX), ny = snapToGrid(p.y - dragState.offsetY);
    if (checkCollision(dragState.id, nx, ny)) {
      setCollisionItems(prev => new Set([...prev, dragState.id]));
    } else {
      setCollisionItems(prev => { const n = new Set(prev); n.delete(dragState.id); return n; });
      updateItemPos(dragState.id, nx, ny);
    }
  }, [readOnly, dragState, cornerDrag, toRoomCoords, snapToGrid, checkCollision, updateItemPos, handleCornerMove]);

  const handlePointerUp = useCallback(() => { setDragState(null); setCornerDrag(null); }, []);

  const getItemCollisionStatus = useCallback((id: string) => collisionItems.has(id), [collisionItems]);

  const toolbarBtn = (label: string, active: boolean, onClick: () => void) => (
    <button type="button" onClick={onClick} style={{ padding: '4px 12px', borderRadius: 9999, border: active ? '2px solid var(--brand)' : '1px solid var(--n-300)', background: active ? 'var(--brand)' : 'white', color: active ? 'white' : 'var(--n-600)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--f-body)' }}>{label}</button>
  );

  return (
    <div id={captureId} style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {!compact && !readOnly && (
        <div style={{ position: 'absolute', top: 8, left: 8, right: 8, zIndex: 30, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {toolbarBtn(`✏️ ${polygonDraw.isDrawing ? 'Drawing...' : 'Draw Room'}`, polygonDraw.isDrawing, () => { setPolygonDraw({ points: [], isDrawing: !polygonDraw.isDrawing }); setAddingDoorWindow(null); })}
          {toolbarBtn('🚪 Door', addingDoorWindow === 'door', () => { setAddingDoorWindow('door'); setPolygonDraw({ points: [], isDrawing: false }); })}
          {toolbarBtn('🪟 Window', addingDoorWindow === 'window', () => { setAddingDoorWindow('window'); setPolygonDraw({ points: [], isDrawing: false }); })}
          {toolbarBtn(`📐 Snap: ${gridSnap ? 'ON' : 'OFF'}`, gridSnap, () => setGridSnap(p => !p))}
          <input type="range" min={-180} max={180} value={northRotation} onChange={e => setNorthRotation(Number(e.target.value))} style={{ width: 60, accentColor: 'var(--brand)' }} title="Rotate North" />
          <span style={{ fontSize: 10, color: 'var(--n-500)' }}>🧭 {northRotation}°</span>
          {addingDoorWindow && <span style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 500 }}>Click a wall to place {addingDoorWindow}</span>}
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <div ref={containerRef} style={{ position: 'relative', width: roomWidthPx, height: roomLengthPx, border: '2px solid var(--n-700)', borderRadius: 4, background: 'white', overflow: 'hidden', backgroundImage: 'linear-gradient(to right, var(--n-200) 1px, transparent 1px), linear-gradient(to bottom, var(--n-200) 1px, transparent 1px)', backgroundSize: `${scale}px ${scale}px`, cursor: readOnly ? 'default' : polygonDraw.isDrawing ? 'crosshair' : addingDoorWindow ? 'pointer' : 'default' }} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} onClick={(e) => handleCanvasClick(e as unknown as React.PointerEvent)} onDoubleClick={() => handleDoubleClick()}>
          {notchStyle && <div style={{ position: 'absolute', width: notchStyle.width, height: notchStyle.height, left: notchStyle.left, top: notchStyle.top, background: 'var(--n-100)', borderLeft: '2px solid var(--n-700)', borderBottom: '2px solid var(--n-700)', backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, var(--n-200) 4px, var(--n-200) 5px)', pointerEvents: 'none' }} />}
          {polygonDraw.isDrawing && polygonDraw.points.length > 0 && (
            <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }}>
              <polyline points={polygonDraw.points.map(p => `${p.x * scale},${p.y * scale}`).join(' ')} stroke="var(--brand)" strokeWidth={2} fill="none" strokeDasharray="6 3" />
              {polygonDraw.points.map((p, i) => <circle key={i} cx={p.x * scale} cy={p.y * scale} r={4} fill="var(--brand)" />)}
            </svg>
          )}
          {addingDoorWindow && (
            <svg style={{ position: 'absolute', inset: 0, zIndex: 5 }}>
              {wallSegments.map((seg, i) => (
                <line key={i} x1={seg.x1 * scale} y1={seg.y1 * scale} x2={seg.x2 * scale} y2={seg.y2 * scale} stroke="var(--brand)" strokeWidth={4} opacity={0.4} style={{ cursor: readOnly ? 'default' : 'pointer', pointerEvents: 'auto' }} onClick={(e) => handleWallClick(i, e as unknown as React.PointerEvent)} />
              ))}
            </svg>
          )}
          {doorWindows.map(dw => {
            const seg = wallSegments[dw.wallIndex];
            if (!seg) return null;
            const x = (seg.x1 + (seg.x2 - seg.x1) * dw.position) * scale;
            const y = (seg.y1 + (seg.y2 - seg.y1) * dw.position) * scale;
            const width = dw.type === 'door' ? 12 : 16;
            const height = dw.type === 'door' ? 16 : 6;
            return <div key={dw.id} style={{ position: 'absolute', left: x - width / 2, top: y - height / 2, width, height, background: dw.type === 'door' ? 'var(--brand)' : '#A8D8EA', border: `1px solid ${dw.type === 'door' ? 'var(--n-700)' : '#6BB3D9'}`, borderRadius: 2, zIndex: 6, cursor: readOnly ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: 'white', fontWeight: 700 }} title={readOnly ? undefined : `${dw.type} - Click to remove`} onClick={(e) => { if (readOnly) return; e.stopPropagation(); setDoorWindows(doorWindows.filter(d => d.id !== dw.id)); }}>{dw.type === 'door' ? '🚪' : '🪟'}</div>;
          })}
          {!compact && !readOnly && !polygonDraw.isDrawing && (<><div style={{ position: 'absolute', right: -6, bottom: -6, width: 14, height: 14, background: 'var(--brand)', borderRadius: '50%', cursor: 'nwse-resize', zIndex: 8, border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} onPointerDown={(e) => handleCornerDown(e)} /><div style={{ position: 'absolute', right: -6, top: -6, width: 14, height: 14, background: 'var(--brand)', borderRadius: '50%', cursor: 'nesw-resize', zIndex: 8, border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} onPointerDown={(e) => handleCornerDown(e)} /></>)}
          {!compact && doorWindows.length === 0 && <svg style={{ position: 'absolute', bottom: 0, left: roomWidthPx / 2 - 24, pointerEvents: 'none' }} width={48} height={24} viewBox="0 0 48 24"><path d="M 0 24 A 24 24 0 0 1 24 0" fill="rgba(28,25,23,0.08)" stroke="var(--n-400)" strokeWidth="1" strokeDasharray="3 2" /></svg>}
          {items.map(item => {
            const fp = getFootprint(item.width, item.length, item.rotation);
            const wPx = fp.width * scale, hPx = fp.length * scale;
            const isActive = activeItemId === item.id;
            const isDragging = dragState?.id === item.id;
            const hasCollision = getItemCollisionStatus(item.id);
            return (
              <div key={item.id} onPointerDown={(e) => handlePointerDown(e, item.id)} className={hasCollision ? 'shake' : ''} style={{ position: 'absolute', left: (item.x * scale) - wPx / 2, top: (item.y * scale) - hPx / 2, width: wPx, height: hPx, transform: `rotate(${item.rotation}deg) scale(${isDragging ? 1.04 : 1})`, transformOrigin: 'center center', background: getCategoryBg(item.code), border: hasCollision ? '2px solid var(--clash-border)' : isActive ? '2px solid var(--brand)' : `1.5px solid ${getCategoryBorder(item.code)}`, borderRadius: 4, cursor: readOnly ? 'default' : isDragging ? 'grabbing' : 'grab', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', userSelect: 'none', boxShadow: hasCollision ? '0 0 0 3px rgba(220,38,38,0.3), 0 4px 12px rgba(220,38,38,0.2)' : isActive ? '0 0 0 3px rgba(28,25,23,0.15), 0 4px 12px rgba(0,255,0,0.3)' : isDragging ? '0 8px 24px rgba(0,0,0,0.2)' : '0 1px 4px rgba(0,0,0,0.08)', transition: isDragging ? 'none' : 'box-shadow 150ms, border-color 150ms, transform 150ms', zIndex: isActive ? 10 : isDragging ? 20 : 1, overflow: 'hidden', touchAction: readOnly ? 'auto' : 'none' }}>
                <FurnitureSVGIcon code={item.code} widthPx={wPx} heightPx={hPx} />
                {wPx > 50 && hPx > 32 && <span style={{ fontSize: Math.max(8, Math.min(11, wPx / 9)), fontWeight: 600, color: 'rgba(255,255,255,0.95)', fontFamily: 'var(--f-body)', lineHeight: 1.2, textAlign: 'center', padding: '0 3px', pointerEvents: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90%', textShadow: '0 1px 2px rgba(0,0,0,0.3)', position: 'relative', zIndex: 2 }}>{item.name}</span>}
                {isActive && !compact && !readOnly && <div style={{ position: 'absolute', top: -18, right: -4, width: 16, height: 16, borderRadius: '50%', background: 'var(--brand)', border: '2px solid white', cursor: 'grab', zIndex: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'white' }} onPointerDown={(e) => e.stopPropagation()} title="Rotate">↻</div>}
              </div>
            );
          })}
        </div>
        {!compact && <CompassRose rotation={northRotation} />}
        {!compact && (<><div style={{ position: 'absolute', bottom: -22, left: 0, width: '100%', textAlign: 'center', fontSize: 11, fontFamily: 'var(--f-body)', color: 'var(--n-400)', letterSpacing: '0.04em' }}>{room.width} ft</div><div style={{ position: 'absolute', right: -28, top: 0, height: '100%', display: 'flex', alignItems: 'center', fontSize: 11, fontFamily: 'var(--f-body)', color: 'var(--n-400)', letterSpacing: '0.04em', transform: 'rotate(90deg)' }}>{room.length} ft</div></>)}
      </div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}.shake{animation:shake 0.3s ease-in-out}`}</style>
    </div>
  );
}
