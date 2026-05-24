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

// ── Door data ───────────────────────────────────────────────────────────────
const DOOR = { width_mm: 900, height_mm: 2050, sill_mm: 0 } as const
// Window opening removed (2026-05-23): the renderer no longer draws a window;
// keeping it in the engine just reserved a phantom clearance zone that pushed
// items around for no visible benefit.

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

// Clearance depth (mm) extending INTO the room from each opening. An item
// whose footprint intersects this rectangle is treated as blocking the door
// (or sitting in front of a window). 900mm = door arc radius. We previously
// used 1100mm (arc + 200mm buffer) but in a 3000mm-deep bedroom that's
// uneconomical: bed_depth 1970 + door_clearance 1100 + 2×125 wall_inset = 3320
// which doesn't fit. 900mm matches the actual door swing; the entry walking
// space is anything beyond the foot of the bed.
const OPENING_CLEARANCE_MM = 900

function openingClearanceRect(
  o: Opening,
  roomWmm: number,
  roomDmm: number,
): { x1: number; x2: number; z1: number; z2: number } {
  const half = o.width_mm / 2
  if (o.wall === 'S') {
    const cx = roomWmm * o.center_frac
    return { x1: cx - half, x2: cx + half, z1: 0, z2: OPENING_CLEARANCE_MM }
  }
  if (o.wall === 'N') {
    const cx = roomWmm * o.center_frac
    return { x1: cx - half, x2: cx + half, z1: roomDmm - OPENING_CLEARANCE_MM, z2: roomDmm }
  }
  if (o.wall === 'W') {
    const cz = roomDmm * o.center_frac
    return { x1: 0, x2: OPENING_CLEARANCE_MM, z1: cz - half, z2: cz + half }
  }
  // E
  const cz = roomDmm * o.center_frac
  return { x1: roomWmm - OPENING_CLEARANCE_MM, x2: roomWmm, z1: cz - half, z2: cz + half }
}

function rectsIntersect(
  a: { x1: number; x2: number; z1: number; z2: number },
  b: { x1: number; x2: number; z1: number; z2: number },
): boolean {
  return a.x1 < b.x2 && a.x2 > b.x1 && a.z1 < b.z2 && a.z2 > b.z1
}

/** True if the item AABB blocks the door's swing arc.
 *  The door can be hung from either side of the opening. We only flag the
 *  item if BOTH hinge orientations are blocked — if one side is clear, the
 *  carpenter just hangs the door that way. */
function aabbBlocksDoorArc(
  aabb: { x1: number; x2: number; z1: number; z2: number },
  o: Opening,
  roomWmm: number,
  roomDmm: number,
): boolean {
  const r = OPENING_CLEARANCE_MM
  const r2 = r * r

  // For a hinge at (hx, hz) sweeping into the room, the swept quarter-disc
  // is bounded by axis-aligned half-planes ("quadrant") plus the radius.
  // Returns true if any AABB point is inside the swept quadrant AND within r.
  function blocked(hx: number, hz: number, qx: 1 | -1, qz: 1 | -1): boolean {
    // Restrict the AABB to the quadrant (qx is +1 → x >= hx; -1 → x <= hx; etc).
    const x1q = qx > 0 ? Math.max(aabb.x1, hx) : aabb.x1
    const x2q = qx > 0 ? aabb.x2 : Math.min(aabb.x2, hx)
    const z1q = qz > 0 ? Math.max(aabb.z1, hz) : aabb.z1
    const z2q = qz > 0 ? aabb.z2 : Math.min(aabb.z2, hz)
    if (x2q <= x1q || z2q <= z1q) return false  // no part of AABB in this quadrant
    const px = Math.max(x1q, Math.min(hx, x2q))
    const pz = Math.max(z1q, Math.min(hz, z2q))
    const dx = px - hx
    const dz = pz - hz
    return dx * dx + dz * dz < r2
  }

  if (o.wall === 'S') {
    const xLow  = roomWmm * o.center_frac - o.width_mm / 2
    const xHigh = roomWmm * o.center_frac + o.width_mm / 2
    return blocked(xLow,  0, +1, +1) && blocked(xHigh, 0, -1, +1)
  }
  if (o.wall === 'N') {
    const xLow  = roomWmm * o.center_frac - o.width_mm / 2
    const xHigh = roomWmm * o.center_frac + o.width_mm / 2
    return blocked(xLow,  roomDmm, +1, -1) && blocked(xHigh, roomDmm, -1, -1)
  }
  if (o.wall === 'W') {
    const zLow  = roomDmm * o.center_frac - o.width_mm / 2
    const zHigh = roomDmm * o.center_frac + o.width_mm / 2
    return blocked(0, zLow,  +1, +1) && blocked(0, zHigh, +1, -1)
  }
  const zLow  = roomDmm * o.center_frac - o.width_mm / 2
  const zHigh = roomDmm * o.center_frac + o.width_mm / 2
  return blocked(roomWmm, zLow,  -1, +1) && blocked(roomWmm, zHigh, -1, -1)
}

function itemAabb(cx: number, cz: number, effW: number, effD: number) {
  return { x1: cx - effW / 2, x2: cx + effW / 2, z1: cz - effD / 2, z2: cz + effD / 2 }
}

function placeItems(
  items: AnchoredItemSpec[],
  walls: { S: Wall; E: Wall; N: Wall; W: Wall },
  roomWmm: number,
  roomDmm: number,
  openings: Opening[],
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

    // (2) Rotation-implied wall snap. Use EDGE distance, not centre distance —
    // a 1970mm-deep bed's centre is always ~985mm from the wall it's against,
    // so a centre-distance threshold of 450mm would never fire for beds/sofas.
    // The old resolver got this right; mirror it.
    const backSide = BACK_WALL_BY_ROT[((it.rotation_deg % 360) + 360) % 360]
    if (backSide === 'S' && cz - effD / 2 < NEAR_WALL_ROT_MM) cz = effD / 2 + WALL_INSET_MM
    else if (backSide === 'N' && roomDmm - (cz + effD / 2) < NEAR_WALL_ROT_MM) cz = roomDmm - effD / 2 - WALL_INSET_MM
    else if (backSide === 'W' && cx - effW / 2 < NEAR_WALL_ROT_MM) cx = effW / 2 + WALL_INSET_MM
    else if (backSide === 'E' && roomWmm - (cx + effW / 2) < NEAR_WALL_ROT_MM) cx = roomWmm - effW / 2 - WALL_INSET_MM

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

    // (3.5) Opening-clearance check. Door swing is a quarter-disc, so we use
    // aabbBlocksDoorArc rather than a bounding rectangle — items at the
    // corners of the clearance box are usually outside the actual swing arc
    // and shouldn't be flagged.
    for (const o of openings) {
      const zone = openingClearanceRect(o, roomWmm, roomDmm)
      if (!aabbBlocksDoorArc(itemAabb(cx, cz, effW, effD), o, roomWmm, roomDmm)) continue

      // Determine the parallel axis (perpendicular to the opening's wall).
      // For S/N walls the parallel axis is x; for E/W it's z.
      const parallelIsX = o.wall === 'S' || o.wall === 'N'
      const minShift = parallelIsX ? (effW / 2 + (zone.x2 - zone.x1) / 2 + WALL_INSET_MM)
                                   : (effD / 2 + (zone.z2 - zone.z1) / 2 + WALL_INSET_MM)
      const zoneCentre = parallelIsX ? (zone.x1 + zone.x2) / 2 : (zone.z1 + zone.z2) / 2

      // Try both directions; pick the one that clears the room AABB and the opening.
      const trial = (sign: 1 | -1) => {
        const nx = parallelIsX ? zoneCentre + sign * minShift : cx
        const nz = parallelIsX ? cz : zoneCentre + sign * minShift
        const aabb = itemAabb(nx, nz, effW, effD)
        if (aabb.x1 < 0 || aabb.x2 > roomWmm || aabb.z1 < 0 || aabb.z2 > roomDmm) return null
        if (rectsIntersect(aabb, zone)) return null
        return { x: nx, z: nz }
      }
      const shifted = trial(1) ?? trial(-1)
      if (shifted) {
        warnings.push(
          `${it.sub_category}: shifted to clear ${o.kind} on ${o.wall} (${Math.round(cx)},${Math.round(cz)}) -> (${Math.round(shifted.x)},${Math.round(shifted.z)})`,
        )
        cx = shifted.x
        cz = shifted.z
      } else {
        warnings.push(
          `${it.sub_category}: blocks ${o.kind} on ${o.wall} at (${Math.round(cx)},${Math.round(cz)}) and won't fit on either side; manual tune needed`,
        )
      }
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

  // (6) Post-placement overlap resolution: shift later-placed overlapping items
  // along their parallel-to-wall axis to clear conflicts.
  const resolved = resolveOverlaps(placed, roomWmm, roomDmm)
  warnings.push(...resolved.warnings)
  return { placed: resolved.items, warnings }
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

/** Post-placement pass: for each item that overlaps an earlier-placed item,
 *  try shifting it ±100mm..±600mm along its parallel-to-wall axis until clear.
 *  Other items are never moved. If no shift works within budget, warn and accept. */
function resolveOverlaps(
  items: ScenePlacedItem[],
  roomWmm: number,
  roomDmm: number,
): { items: ScenePlacedItem[]; warnings: string[] } {
  const MAX_SHIFT_MM = 600
  const STEP_MM = 100
  const warnings: string[] = []
  const result = items.map((it) => ({ ...it }))

  for (let i = 1; i < result.length; i++) {
    const cur = result[i]
    const [curW, curD] = effExtent(cur.width_mm, cur.depth_mm, cur.rotation_deg)

    const hasOverlap = result.slice(0, i).some((prev) => aabbOverlap(cur.x_mm, cur.z_mm, curW, curD, prev))
    if (!hasOverlap) continue

    // Parallel axis = axis that runs ALONG the wall this item is snapped to.
    // Back wall S/N → item runs along x. Back wall W/E → item runs along z.
    const backSide = BACK_WALL_BY_ROT[((cur.rotation_deg % 360) + 360) % 360]
    const shiftX = backSide === 'S' || backSide === 'N'

    let resolved = false
    outer: for (let shift = STEP_MM; shift <= MAX_SHIFT_MM; shift += STEP_MM) {
      for (const sign of [1, -1] as const) {
        const nx = shiftX ? cur.x_mm + sign * shift : cur.x_mm
        const nz = shiftX ? cur.z_mm : cur.z_mm + sign * shift
        if (nx - curW / 2 < WALL_INSET_MM || nx + curW / 2 > roomWmm - WALL_INSET_MM) continue
        if (nz - curD / 2 < WALL_INSET_MM || nz + curD / 2 > roomDmm - WALL_INSET_MM) continue
        const clear = !result.slice(0, i).some((prev) => aabbOverlap(nx, nz, curW, curD, prev))
        if (clear) {
          warnings.push(
            `overlap-resolve: ${cur.sub_category} shifted ${shiftX ? 'x' : 'z'} by ${sign * shift}mm from (${cur.x_mm},${cur.z_mm}) → (${nx},${nz})`,
          )
          result[i] = { ...cur, x_mm: Math.round(nx), z_mm: Math.round(nz) }
          resolved = true
          break outer
        }
      }
    }
    if (!resolved) {
      warnings.push(
        `overlap-resolve: ${cur.sub_category} at (${cur.x_mm},${cur.z_mm}) could not clear within ${MAX_SHIFT_MM}mm — preset tuning needed`,
      )
    }
  }
  return { items: result, warnings }
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

  // Door only — no window opening (see note above).
  const doorWall = cardinalize(req.entrance)
  const openings: Opening[] = [
    { wall: doorWall, center_frac: 0.5, ...DOOR, kind: 'door' },
  ]

  const { placed, warnings } = placeItems(
    req.items ?? [],
    wallsForPlacement,
    req.room_w_mm,
    req.room_d_mm,
    openings,
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
