/**
 * Headless preset placement using blueprint3d-modern's Floorplan engine.
 *
 * Reads a request from stdin (or --request='{...}') and prints a scene JSON to stdout.
 * Backend (engine.py) shells out here to author each of the 24 presets without
 * needing a DOM. Furniture placement (Stage 4) extends this; Stage 2 only emits
 * room geometry + door + window.
 *
 * Coordinate convention (matches backend resolver.py + frontend RoomScene.tsx):
 *   x: west(0) → east(room_w)         (in mm; engine uses cm internally)
 *   z: south(0) → north(room_d)
 *   Corners ordered CCW from SW.
 */
import { Floorplan } from '../src/model/floorplan'
import type { Wall } from '../src/model/wall'
import { Utils } from '../src/core/utils'

type Direction = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'

interface AnchoredItemSpec {
  sub_category: string
  anchor_x: 'W' | 'E' | 'C'
  offset_x_mm: number
  anchor_z: 'S' | 'N' | 'C'
  offset_z_mm: number
  rotation_deg: number
  width_mm: number
  depth_mm: number
  // Echoed back unchanged so backend can re-attach pricing/catalog info.
  passthrough?: Record<string, unknown>
}

interface PlaceRequest {
  preset_id: string
  room_w_mm: number
  room_d_mm: number
  entrance: Direction
  items?: AnchoredItemSpec[]
}

interface ScenePlacedItem {
  sub_category: string
  x_mm: number
  z_mm: number
  rotation_deg: number
  width_mm: number
  depth_mm: number
  passthrough?: Record<string, unknown>
}

interface Opening {
  wall: Direction
  center_frac: number
  width_mm: number
  height_mm: number
  kind: 'door' | 'window'
  sill_mm: number
}

interface SceneResponse {
  preset_id: string
  room: {
    width_mm: number
    depth_mm: number
    corners: Array<[number, number]>
    walls: Array<{ side: Direction; start: [number, number]; end: [number, number]; length_mm: number }>
  }
  openings: Opening[]
  items: ScenePlacedItem[]
  warnings: string[]
}

// ── Door/window data (Stage 1 folded in) ────────────────────────────────────
const DOOR = { width_mm: 900, height_mm: 2050, sill_mm: 0 } as const
const WINDOW = { width_mm: 1500, height_mm: 1200, sill_mm: 900 } as const

// "Entrance" tells us which wall the door lives on. We always put a window on
// the wall opposite to maximize daylight/sightline — overridable per preset later.
const OPPOSITE: Record<Direction, Direction> = {
  N: 'S', S: 'N', E: 'W', W: 'E',
  NE: 'SW', SW: 'NE', NW: 'SE', SE: 'NW',
}

function cardinalize(d: Direction): 'N' | 'S' | 'E' | 'W' {
  // For openings v1, collapse diagonals to nearest cardinal.
  if (d === 'N' || d === 'S' || d === 'E' || d === 'W') return d
  if (d === 'NE' || d === 'NW') return 'N'
  if (d === 'SE' || d === 'SW') return 'S'
  return 'W'
}

// ── Engine setup ────────────────────────────────────────────────────────────
function buildRectangularRoom(roomWmm: number, roomDmm: number) {
  // Engine works in cm; backend speaks mm. Convert at the boundary only.
  const w = roomWmm / 10
  const d = roomDmm / 10
  const fp = new Floorplan()
  // CCW from SW so findRooms() picks up the cycle.
  const sw = fp.newCorner(0, 0)
  const se = fp.newCorner(w, 0)
  const ne = fp.newCorner(w, d)
  const nw = fp.newCorner(0, d)
  const wallS = fp.newWall(sw, se)
  const wallE = fp.newWall(se, ne)
  const wallN = fp.newWall(ne, nw)
  const wallW = fp.newWall(nw, sw)
  return { fp, walls: { S: wallS, E: wallE, N: wallN, W: wallW } }
}

function wallLengthMm(w: Wall): number {
  const dx = w.getEndX() - w.getStartX()
  const dy = w.getEndY() - w.getStartY()
  return Math.sqrt(dx * dx + dy * dy) * 10 // cm → mm
}

function wallEndpointsMm(w: Wall): { start: [number, number]; end: [number, number] } {
  return {
    start: [Math.round(w.getStartX() * 10), Math.round(w.getStartY() * 10)],
    end: [Math.round(w.getEndX() * 10), Math.round(w.getEndY() * 10)],
  }
}

// ── Furniture placement (engine-driven) ─────────────────────────────────────
//
// Pipeline per item:
//   1. Compute initial centre from AnchoredItem (the *intent* — sofa goes on
//      the west wall, etc.).
//   2. Rotation-implied wall snap. rotation_deg tells us which wall the item's
//      BACK faces (0°→S, 90°→W, 180°→N, 270°→E — matches model.py convention).
//      If the item is within NEAR_WALL_ROT_MM of that wall, snap flush via
//      engine wall geometry (Utils.pointDistanceFromLine). This is what the
//      original resolver did with hand-rolled math; we now do it against the
//      engine's real Wall objects.
//   3. Perpendicular tight-corner snap. After the back wall is settled, snap
//      the *other* axis if the item is within NEAR_WALL_PERP_MM — for items
//      authored to wedge into corners.
//   4. Validate centre lies inside the engine's room polygon. Out-of-room →
//      warn and clamp to the room AABB.
//   5. AABB overlap check across already-placed items; on conflict, warn but
//      keep the position (Stage 5 visual QA tunes presets).
//
// All math runs in mm; engine internal cm conversion is hidden behind
// wallEndpointsMm() so this file speaks one unit.
const NEAR_WALL_ROT_MM = 450    // rotation-implied snap threshold (matches old resolver)
const NEAR_WALL_PERP_MM = 200   // perpendicular tight snap for corner placements
const WALL_INSET_MM = 125       // matches frontend wall thickness (120mm) + ~5mm anti z-fight

// rotation_deg → which wall the item's BACK faces (i.e. snap target).
const BACK_WALL_BY_ROT: Record<number, 'S' | 'W' | 'N' | 'E'> = {
  0: 'S', 90: 'W', 180: 'N', 270: 'E',
}

function placeItems(
  items: AnchoredItemSpec[],
  walls: { S: Wall; E: Wall; N: Wall; W: Wall },
  roomWmm: number,
  roomDmm: number,
): { placed: ScenePlacedItem[]; warnings: string[] } {
  const warnings: string[] = []
  const placed: ScenePlacedItem[] = []

  // Pre-compute engine wall endpoints in mm so distance/projection math runs
  // in the same unit as everything else.
  const wallSegs = (Object.entries(walls) as Array<[keyof typeof walls, Wall]>).map(
    ([side, w]) => {
      const { start, end } = wallEndpointsMm(w)
      return { side, start, end }
    },
  )

  // Room polygon (CCW from SW) for containment. Matches buildRectangularRoom().
  const roomPoly: Array<[number, number]> = [
    [0, 0],
    [roomWmm, 0],
    [roomWmm, roomDmm],
    [0, roomDmm],
  ]

  for (const it of items) {
    let cx = anchorMm(it.anchor_x, it.offset_x_mm, roomWmm)
    let cz = anchorMm(it.anchor_z, it.offset_z_mm, roomDmm)

    const [effW, effD] = effExtent(it.width_mm, it.depth_mm, it.rotation_deg)

    // (2) Rotation-implied wall snap. Look up the back wall from rotation, then
    // measure distance to it via the engine's Wall object (point-line distance).
    // If within NEAR_WALL_ROT_MM, snap flush.
    const backSide = BACK_WALL_BY_ROT[((it.rotation_deg % 360) + 360) % 360]
    if (backSide) {
      const seg = wallSegs.find((s) => s.side === backSide)
      if (seg) {
        const distToBack = Utils.pointDistanceFromLine(
          cx, cz, seg.start[0], seg.start[1], seg.end[0], seg.end[1],
        )
        if (distToBack < NEAR_WALL_ROT_MM) {
          // Pin perpendicular axis flush to that wall, keep parallel axis where the anchor put it.
          if (backSide === 'S') cz = effD / 2 + WALL_INSET_MM
          else if (backSide === 'N') cz = roomDmm - effD / 2 - WALL_INSET_MM
          else if (backSide === 'W') cx = effW / 2 + WALL_INSET_MM
          else if (backSide === 'E') cx = roomWmm - effW / 2 - WALL_INSET_MM
        }
      }
    }

    // (3) Perpendicular tight-corner snap. After the back wall is set, the OTHER
    // axis is "free". If the item is also close to a wall on that axis (within
    // NEAR_WALL_PERP_MM), snap into the corner — matches the old resolver's
    // behavior for bookshelves/plants wedged into NW/NE/SW/SE.
    const xFree = backSide === 'S' || backSide === 'N' || !backSide
    const zFree = backSide === 'W' || backSide === 'E' || !backSide
    if (xFree) {
      const gapW = cx - effW / 2
      const gapE = roomWmm - (cx + effW / 2)
      if (gapW < NEAR_WALL_PERP_MM && gapW <= gapE) cx = effW / 2 + WALL_INSET_MM
      else if (gapE < NEAR_WALL_PERP_MM && gapE < gapW) cx = roomWmm - effW / 2 - WALL_INSET_MM
    }
    if (zFree) {
      const gapS = cz - effD / 2
      const gapN = roomDmm - (cz + effD / 2)
      if (gapS < NEAR_WALL_PERP_MM && gapS <= gapN) cz = effD / 2 + WALL_INSET_MM
      else if (gapN < NEAR_WALL_PERP_MM && gapN < gapS) cz = roomDmm - effD / 2 - WALL_INSET_MM
    }

    // (4) Containment — clamp to room AABB if outside.
    if (!pointInPolygon(cx, cz, roomPoly)) {
      const cxBefore = cx
      const czBefore = cz
      cx = clamp(cx, effW / 2 + WALL_INSET_MM, roomWmm - effW / 2 - WALL_INSET_MM)
      cz = clamp(cz, effD / 2 + WALL_INSET_MM, roomDmm - effD / 2 - WALL_INSET_MM)
      warnings.push(
        `${it.sub_category}: anchored point (${Math.round(cxBefore)},${Math.round(
          czBefore,
        )}) was outside room polygon — clamped to (${Math.round(cx)},${Math.round(cz)})`,
      )
    }

    // (5) Overlap check (AABB, post-rotation). Soft — log only, don't move.
    for (const prev of placed) {
      if (aabbOverlap(cx, cz, effW, effD, prev)) {
        warnings.push(
          `${it.sub_category} overlaps ${prev.sub_category} at (${Math.round(cx)},${Math.round(cz)}); review needed`,
        )
        break
      }
    }

    placed.push({
      sub_category: it.sub_category,
      x_mm: Math.round(cx),
      z_mm: Math.round(cz),
      rotation_deg: it.rotation_deg,
      width_mm: it.width_mm,
      depth_mm: it.depth_mm,
      passthrough: it.passthrough,
    })
  }

  return { placed, warnings }
}

function anchorMm(anchor: 'W' | 'E' | 'C' | 'S' | 'N', offset: number, length: number): number {
  if (anchor === 'W' || anchor === 'S') return offset
  if (anchor === 'E' || anchor === 'N') return length + offset
  return length / 2 + offset
}

function effExtent(w: number, d: number, rotDeg: number): [number, number] {
  const rad = (rotDeg * Math.PI) / 180
  return [
    Math.abs(w * Math.cos(rad)) + Math.abs(d * Math.sin(rad)),
    Math.abs(w * Math.sin(rad)) + Math.abs(d * Math.cos(rad)),
  ]
}

function clamp(v: number, lo: number, hi: number): number {
  if (hi < lo) return (lo + hi) / 2
  return Math.max(lo, Math.min(v, hi))
}

interface WallSeg {
  side: 'S' | 'E' | 'N' | 'W'
  start: [number, number]
  end: [number, number]
}

function pointInPolygon(x: number, y: number, poly: Array<[number, number]>): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-9) + xi
    if (intersect) inside = !inside
  }
  return inside
}

function aabbOverlap(
  cx: number,
  cz: number,
  effW: number,
  effD: number,
  other: ScenePlacedItem,
): boolean {
  const [oW, oD] = effExtent(other.width_mm, other.depth_mm, other.rotation_deg)
  const ax1 = cx - effW / 2, ax2 = cx + effW / 2, az1 = cz - effD / 2, az2 = cz + effD / 2
  const bx1 = other.x_mm - oW / 2, bx2 = other.x_mm + oW / 2
  const bz1 = other.z_mm - oD / 2, bz2 = other.z_mm + oD / 2
  return ax1 < bx2 && ax2 > bx1 && az1 < bz2 && az2 > bz1
}

// ── Main ────────────────────────────────────────────────────────────────────
async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const c of process.stdin) chunks.push(c as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}

async function main() {
  // Accept request via --request='<json>' (easier for cross-platform subprocess) OR stdin.
  let raw = ''
  const argReq = process.argv.find((a) => a.startsWith('--request='))
  if (argReq) raw = argReq.slice('--request='.length)
  else raw = (await readStdin()).trim()
  if (!raw) {
    console.error('place.ts: no request provided (pass --request=\'{...}\' or pipe JSON to stdin)')
    process.exit(2)
  }
  const req = JSON.parse(raw) as PlaceRequest

  const { walls } = buildRectangularRoom(req.room_w_mm, req.room_d_mm)
  const wallsForPlacement = walls

  const corners: Array<[number, number]> = [
    [0, 0],
    [req.room_w_mm, 0],
    [req.room_w_mm, req.room_d_mm],
    [0, req.room_d_mm],
  ]

  const wallsOut: SceneResponse['room']['walls'] = (['S', 'E', 'N', 'W'] as const).map((side) => ({
    side,
    ...wallEndpointsMm(walls[side]),
    length_mm: Math.round(wallLengthMm(walls[side])),
  }))

  // Doors + windows
  const doorWall = cardinalize(req.entrance)
  const windowWall = OPPOSITE[doorWall] as 'N' | 'S' | 'E' | 'W'
  const openings: Opening[] = [
    { wall: doorWall, center_frac: 0.5, ...DOOR, kind: 'door' },
    { wall: windowWall, center_frac: 0.5, ...WINDOW, kind: 'window' },
  ]

  const { placed, warnings } = placeItems(
    req.items ?? [],
    wallsForPlacement,
    req.room_w_mm,
    req.room_d_mm,
  )

  const response: SceneResponse = {
    preset_id: req.preset_id,
    room: { width_mm: req.room_w_mm, depth_mm: req.room_d_mm, corners, walls: wallsOut },
    openings,
    items: placed,
    warnings,
  }

  process.stdout.write(JSON.stringify(response))
}

main().catch((err) => {
  console.error('place.ts: fatal', err instanceof Error ? err.stack : err)
  process.exit(1)
})
