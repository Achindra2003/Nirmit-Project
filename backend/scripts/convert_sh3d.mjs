/**
 * Convert Sweet Home 3D furniture packs (.sh3f files) into a curated GLB pool.
 *
 * Input:  backend/data/sweethome3d/Furnitures/*.sh3f
 * Output: frontend/public/models/sh3d/<pack>_<id>.glb
 *         backend/app/domain/catalog/sweethome3d_manifest.json
 *
 * The .sh3f format: a ZIP containing PluginFurnitureCatalog.properties (per-entry
 * metadata: name, category, dimensions in cm, license, model OBJ path) plus a
 * directory tree of OBJ + MTL + textures. We unzip each, parse the properties,
 * convert each OBJ to GLB via obj2gltf, and emit one manifest entry per model.
 *
 * Usage (from repo root):
 *   node backend/scripts/convert_sh3d.mjs
 *
 * Idempotent — skips models whose GLB already exists. Pass --force to re-convert.
 */
import { execSync } from 'node:child_process'
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, statSync } from 'node:fs'
import { resolve, dirname, basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import obj2gltf from 'obj2gltf'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..', '..')
const SH3F_DIR = join(REPO_ROOT, 'backend', 'data', 'sweethome3d', 'Furnitures')
const TEMP_DIR = join(REPO_ROOT, 'backend', 'data', 'sweethome3d', '_extracted')
const OUT_GLB_DIR = join(REPO_ROOT, 'frontend', 'public', 'models', 'sh3d')
const OUT_MANIFEST = join(REPO_ROOT, 'backend', 'app', 'domain', 'catalog', 'sweethome3d_manifest.json')

const FORCE = process.argv.includes('--force')
// Optional --limit=N caps total conversions for a fast sanity run.
const LIMIT_ARG = process.argv.find(a => a.startsWith('--limit='))
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.slice('--limit='.length), 10) : Infinity

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80)
}

function parseProperties(text) {
  // Java .properties — line-by-line `key=value`, # for comments, \ continuations.
  // Build a flat dict; entries use suffix #N so we re-group after.
  const dict = {}
  const lines = text.split(/\r?\n/)
  for (let raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('#') || line.startsWith('!')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    const value = line.slice(eq + 1).trim()
    dict[key] = value
  }
  return dict
}

function extractEntries(dict, packMeta) {
  // Group keys by trailing #N → entries.
  const entries = new Map()
  for (const k of Object.keys(dict)) {
    const m = k.match(/^([a-zA-Z][a-zA-Z0-9]*)#(\d+)$/)
    if (!m) continue
    const [, field, idx] = m
    if (!entries.has(idx)) entries.set(idx, {})
    entries.get(idx)[field] = dict[k]
  }
  // Convert to array, attach pack-level license fallback.
  const out = []
  for (const [idx, fields] of entries) {
    if (!fields.model || !fields.name) continue
    out.push({
      idx,
      id: fields.id || `entry_${idx}`,
      name: fields.name,
      tags: (fields.tags || '').split(/[\s,]+/).filter(Boolean),
      category: fields.category || 'Uncategorized',
      modelPath: fields.model.replace(/^\/+/, ''),  // strip leading slash
      // SH3D dims in cm; convert to mm to match our state contract.
      width_mm: Math.round(parseFloat(fields.width || '0') * 10),
      depth_mm: Math.round(parseFloat(fields.depth || '0') * 10),
      height_mm: Math.round(parseFloat(fields.height || '0') * 10),
      creator: fields.creator || packMeta.creator || '',
      license: fields.license || packMeta.license || 'unknown',
      doorOrWindow: fields.doorOrWindow === 'true',
      movable: fields.movable !== 'false',
    })
  }
  return out
}

function unzipSh3f(sh3fPath, destDir) {
  // Use system unzip (available on Windows via Git Bash); silent + overwrite.
  if (existsSync(destDir)) rmSync(destDir, { recursive: true, force: true })
  mkdirSync(destDir, { recursive: true })
  execSync(`unzip -q -o "${sh3fPath}" -d "${destDir}"`, { stdio: 'pipe' })
}

async function convertObjToGlb(objPath, outGlbPath) {
  // obj2gltf reads OBJ + sibling MTL + textures; writes binary GLB.
  const glb = await obj2gltf(objPath, {
    binary: true,
    separate: false,
    secure: true,
    metallicRoughness: true,
  })
  writeFileSync(outGlbPath, glb)
}

async function processPack(sh3fPath) {
  const packName = basename(sh3fPath, '.sh3f')
  const packExtract = join(TEMP_DIR, packName)
  console.log(`\n[${packName}] extracting...`)
  unzipSh3f(sh3fPath, packExtract)

  const propsPath = join(packExtract, 'PluginFurnitureCatalog.properties')
  if (!existsSync(propsPath)) {
    console.warn(`  no catalog properties — skipping pack`)
    return []
  }
  const text = readFileSync(propsPath, 'utf8')
  const dict = parseProperties(text)
  const packMeta = {
    name: dict.name || packName,
    license: dict.license || 'unknown',
    creator: dict.provider || '',
  }
  const entries = extractEntries(dict, packMeta)
  console.log(`  ${entries.length} entries`)

  const results = []
  let converted = 0, skipped = 0, failed = 0
  for (const e of entries) {
    if (converted >= LIMIT) break
    const sku = `${slugify(packName)}_${slugify(e.id.split('#').pop() || e.idx)}`
    const outGlb = join(OUT_GLB_DIR, `${sku}.glb`)

    if (!FORCE && existsSync(outGlb)) {
      skipped++
      results.push(_manifestEntry(e, sku, packName, packMeta, statSync(outGlb).size))
      continue
    }

    const objPath = join(packExtract, e.modelPath)
    if (!existsSync(objPath)) {
      failed++
      continue
    }

    try {
      await convertObjToGlb(objPath, outGlb)
      converted++
      results.push(_manifestEntry(e, sku, packName, packMeta, statSync(outGlb).size))
    } catch (err) {
      failed++
      // Log first 100 chars of error so we can spot patterns.
      const msg = (err && err.message ? err.message : String(err)).slice(0, 100)
      console.warn(`  [skip] ${e.name}: ${msg}`)
    }

    if ((converted + failed) % 50 === 0) {
      process.stdout.write(`    progress: ${converted} converted, ${failed} failed, ${skipped} skipped\n`)
    }
  }
  console.log(`  done: ${converted} converted, ${skipped} skipped (already-present), ${failed} failed`)
  return results
}

function _manifestEntry(e, sku, packName, packMeta, glbSize) {
  return {
    sku,
    source_pack: packName,
    source_id: e.id,
    name_en: e.name,
    category_sh3d: e.category,
    tags: e.tags,
    asset_url: `sh3d/${sku}.glb`,
    native_dims_mm: { width: e.width_mm, height: e.height_mm, depth: e.depth_mm },
    license: e.license,
    creator: e.creator,
    door_or_window: e.doorOrWindow,
    movable: e.movable,
    glb_bytes: glbSize,
    pack_license: packMeta.license,
  }
}

async function main() {
  if (!existsSync(SH3F_DIR)) {
    console.error(`[convert_sh3d] missing ${SH3F_DIR}`)
    process.exit(1)
  }
  mkdirSync(OUT_GLB_DIR, { recursive: true })
  mkdirSync(dirname(OUT_MANIFEST), { recursive: true })

  const packs = readdirSync(SH3F_DIR).filter(f => f.endsWith('.sh3f')).sort()
  console.log(`[convert_sh3d] ${packs.length} packs`)
  console.log(`  output GLBs   -> ${OUT_GLB_DIR}`)
  console.log(`  manifest      -> ${OUT_MANIFEST}`)

  const allEntries = []
  for (const pack of packs) {
    const r = await processPack(join(SH3F_DIR, pack))
    allEntries.push(...r)
  }

  const manifest = {
    generated_at: new Date().toISOString(),
    total: allEntries.length,
    items: allEntries,
  }
  writeFileSync(OUT_MANIFEST, JSON.stringify(manifest, null, 2))
  console.log(`\n[convert_sh3d] wrote manifest: ${allEntries.length} models`)
}

main().catch(err => {
  console.error(`[convert_sh3d] fatal:`, err)
  process.exit(1)
})
