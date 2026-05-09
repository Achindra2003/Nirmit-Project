import { getItemById } from '../catalog/catalog';
import type { CatalogItem } from '../catalog/types';

// ─── Types ───

export interface Point {
  x: number;
  y: number;
}

export interface DoorWindow {
  wallIndex: number;
  position: number; // 0-1 along the wall
}

export interface LayoutConstraints {
  walkwayMinWidth: number; // meters, default 0.6
  vastuRules: boolean;
  bedOrientation: 'head_south' | 'head_east' | 'any';
  poojaDirection: 'northeast' | 'any';
  kitchenDirection: 'southeast' | 'any';
}

export interface RequiredFurniture {
  catalogId: string;
  priority: 'mandatory' | 'recommended';
}

export interface FurniturePlacement {
  catalogId: string;
  x: number;
  y: number;
  rotation: number; // degrees
}

export interface LayoutResult {
  placements: FurniturePlacement[];
  score: number;
}

export interface SolverInput {
  roomVertices: Point[];
  doorPositions: DoorWindow[];
  windowPositions: DoorWindow[];
  requiredFurniture: RequiredFurniture[];
  constraints: LayoutConstraints;
}

// ─── Geometry Helpers ───

function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if ((yi > point.y) !== (yj > point.y) &&
        point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function getBoundingBox(polygon: Point[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of polygon) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

function rectsOverlap(
  x1: number, y1: number, w1: number, d1: number, r1: number,
  x2: number, y2: number, w2: number, d2: number, r2: number,
): boolean {
  const r1Rad = (r1 * Math.PI) / 180;
  const r2Rad = (r2 * Math.PI) / 180;
  const effW1 = Math.abs(w1 * Math.cos(r1Rad)) + Math.abs(d1 * Math.sin(r1Rad));
  const effD1 = Math.abs(w1 * Math.sin(r1Rad)) + Math.abs(d1 * Math.cos(r1Rad));
  const effW2 = Math.abs(w2 * Math.cos(r2Rad)) + Math.abs(d2 * Math.sin(r2Rad));
  const effD2 = Math.abs(w2 * Math.sin(r2Rad)) + Math.abs(d2 * Math.cos(r2Rad));
  return (
    x1 - effW1 / 2 < x2 + effW2 / 2 &&
    x1 + effW1 / 2 > x2 - effW2 / 2 &&
    y1 - effD1 / 2 < y2 + effD2 / 2 &&
    y1 + effD1 / 2 > y2 - effD2 / 2
  );
}

function pointToSegmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function getWallSegments(vertices: Point[]): Array<{ a: Point; b: Point }> {
  const segments: Array<{ a: Point; b: Point }> = [];
  for (let i = 0; i < vertices.length; i++) {
    segments.push({ a: vertices[i], b: vertices[(i + 1) % vertices.length] });
  }
  return segments;
}

// ─── Validity Checks ───

function isValidPlacement(
  x: number, y: number, w: number, d: number, rotation: number,
  polygon: Point[], walls: Array<{ a: Point; b: Point }>,
  placedItems: FurniturePlacement[], catalogMap: Map<string, CatalogItem>,
  doors: DoorWindow[], walkwayMin: number,
): boolean {
  // Center point must be inside room
  if (!isPointInPolygon({ x, y }, polygon)) return false;

  // Must not overlap walls (furniture edges inside wall thickness)
  const halfW = w / 2, halfD = d / 2;
  const corners: Point[] = [
    { x: x - halfW, y: y - halfD },
    { x: x + halfW, y: y - halfD },
    { x: x + halfW, y: y + halfD },
    { x: x - halfW, y: y + halfD },
  ];
  for (const corner of corners) {
    if (!isPointInPolygon(corner, polygon)) return false;
  }

  // Must not overlap placed furniture (with walkway clearance)
  for (const placed of placedItems) {
    const placedItem = catalogMap.get(placed.catalogId);
    if (!placedItem) continue;
    const pw = placedItem.dimensions.width;
    const pd = placedItem.dimensions.depth;
    const clearance = walkwayMin / 2;
    if (rectsOverlap(x, y, w + clearance, d + clearance, rotation, placed.x, placed.y, pw, pd, placed.rotation)) {
      return false;
    }
  }

  // Must leave walkway near doors
  for (const door of doors) {
    const wall = walls[door.wallIndex];
    if (!wall) continue;
    const doorX = wall.a.x + (wall.b.x - wall.a.x) * door.position;
    const doorY = wall.a.y + (wall.b.y - wall.a.y) * door.position;
    const dist = Math.hypot(x - doorX, y - doorY) - Math.max(w, d) / 2;
    if (dist < walkwayMin) return false;
  }

  return true;
}

// ─── Scoring ───

function scorePlacement(
  x: number, y: number, rotation: number,
  catalogId: string, walls: Array<{ a: Point; b: Point }>,
  doors: DoorWindow[], windows: DoorWindow[],
  constraints: LayoutConstraints,
  bb: { minX: number; minY: number; maxX: number; maxY: number },
): number {
  let score = 50;

  const item = getItemById(catalogId);
  if (!item) return score;

  // Wall proximity bonus (beds and sofas prefer walls)
  const wallDist = Math.min(...walls.map(w => pointToSegmentDistance(x, y, w.a.x, w.a.y, w.b.x, w.b.y)));
  const prefWall = item.tags.some(t => ['bed', 'sofa', 'wardrobe'].some(k => t.includes(k)));
  if (prefWall && wallDist < 0.3) score += 20;
  if (prefWall && wallDist < 0.1) score += 10;

  // Door clearance bonus
  const nearDoor = doors.some(d => {
    const wall = walls[d.wallIndex];
    if (!wall) return false;
    const dx = wall.a.x + (wall.b.x - wall.a.x) * d.position;
    const dy = wall.a.y + (wall.b.y - wall.a.y) * d.position;
    return Math.hypot(x - dx, y - dy) < 1.5;
  });
  if (!nearDoor) score += 10;

  // Window proximity (desks and dining tables like windows)
  const nearWindow = windows.some(w => {
    const wall = walls[w.wallIndex];
    if (!wall) return false;
    const wx = wall.a.x + (wall.b.x - wall.a.x) * w.position;
    const wy = wall.a.y + (wall.b.y - wall.a.y) * w.position;
    return Math.hypot(x - wx, y - wy) < 2;
  });
  if (item.tags.some(t => ['desk', 'dining', 'study'].includes(t)) && nearWindow) score += 15;

  // Vastu scoring
  if (constraints.vastuRules) {
    const centerX = (bb.minX + bb.maxX) / 2;
    const centerY = (bb.minY + bb.maxY) / 2;
    const isNorth = y < centerY;
    const isSouth = y > centerY;
    const isEast = x > centerX;
    const isNorthEast = isNorth && isEast;
    const isSouthEast = isSouth && isEast;

    if (item.category === 'pooja' && isNorthEast) score += 25;
    if (item.category === 'sleeping' && isSouth) {
      score += 15;
      if (Math.abs(rotation - 180) < 20 || Math.abs(rotation - 0) < 20) score += 10; // head south or north
    }
    if (item.category === 'kitchen' && isSouthEast) score += 20;
  }

  // Central zone penalty
  const centerDist = Math.hypot(x - (bb.minX + bb.maxX) / 2, y - (bb.minY + bb.maxY) / 2);
  const roomDiag = Math.hypot(bb.maxX - bb.minX, bb.maxY - bb.minY);
  if (centerDist < roomDiag * 0.1) score -= 15;

  return score;
}

// ─── Main Solver ───

export function generateLayouts(input: SolverInput, count = 10): LayoutResult[] {
  const { roomVertices, doorPositions, windowPositions, requiredFurniture, constraints } = input;

  if (roomVertices.length < 3 || requiredFurniture.length === 0) return [];

  const polygon = roomVertices;
  const walls = getWallSegments(polygon);
  const bb = getBoundingBox(polygon);
  const gridStep = 0.3;

  const catalogMap = new Map<string, CatalogItem>();
  for (const rf of requiredFurniture) {
    const item = getItemById(rf.catalogId);
    if (item) catalogMap.set(rf.catalogId, item);
  }

  // Sort: mandatory first, then by area descending
  const sorted = [...requiredFurniture].sort((a, b) => {
    if (a.priority === 'mandatory' && b.priority !== 'mandatory') return -1;
    if (a.priority !== 'mandatory' && b.priority === 'mandatory') return 1;
    const itemA = catalogMap.get(a.catalogId);
    const itemB = catalogMap.get(b.catalogId);
    const areaA = itemA ? itemA.dimensions.width * itemA.dimensions.depth : 0;
    const areaB = itemB ? itemB.dimensions.width * itemB.dimensions.depth : 0;
    return areaB - areaA;
  });

  const layouts: LayoutResult[] = [];

  for (let attempt = 0; attempt < count; attempt++) {
    const placed: FurniturePlacement[] = [];
    // Shuffle order for variation (except first mandatory items stay first)
    const order = [...sorted];
    if (attempt > 0) {
      const mandatory = order.filter(f => f.priority === 'mandatory');
      const recommended = order.filter(f => f.priority !== 'mandatory');
      for (let i = recommended.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [recommended[i], recommended[j]] = [recommended[j], recommended[i]];
      }
      order.splice(mandatory.length, order.length - mandatory.length, ...recommended);
    }

    for (const rf of order) {
      const item = catalogMap.get(rf.catalogId);
      if (!item) continue;

      const w = item.dimensions.width;
      const d = item.dimensions.depth;

      let bestPos: { x: number; y: number; rotation: number; score: number } | null = null;

      const rotations = [0, 90, 180, 270];
      if (item.tags.includes('bed') || item.tags.includes('sofa')) {
        rotations.length = 2;
      }

      for (let gx = bb.minX + gridStep / 2; gx <= bb.maxX; gx += gridStep) {
        for (let gy = bb.minY + gridStep / 2; gy <= bb.maxY; gy += gridStep) {
          for (const rot of rotations) {
            if (!isValidPlacement(gx, gy, w, d, rot, polygon, walls, placed, catalogMap, doorPositions, constraints.walkwayMinWidth)) {
              continue;
            }
            const posScore = scorePlacement(gx, gy, rot, rf.catalogId, walls, doorPositions, windowPositions, constraints, bb);
            if (!bestPos || posScore > bestPos.score) {
              bestPos = { x: gx, y: gy, rotation: rot, score: posScore };
            }
          }
        }
      }

      if (bestPos) {
        placed.push({
          catalogId: rf.catalogId,
          x: Math.round(bestPos.x * 100) / 100,
          y: Math.round(bestPos.y * 100) / 100,
          rotation: bestPos.rotation,
        });
      }
    }

    if (placed.length > 0) {
      const avgScore = placed.length > 0
        ? placed.reduce((sum, p) => {
            const posScore = scorePlacement(p.x, p.y, 
              p.rotation, p.catalogId, walls, doorPositions, windowPositions, constraints, bb);
            return sum + posScore;
          }, 0) / placed.length
        : 0;

      layouts.push({
        placements: placed,
        score: Math.round(avgScore * 100) / 100,
      });
    }
  }

  // Sort by score descending, return top 5
  return layouts.sort((a, b) => b.score - a.score).slice(0, 5);
}
