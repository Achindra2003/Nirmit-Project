# Asset Pipeline Brief — Nirmit Living Room GLBs
**For: Delegated AI execution**
**Owner: Nirmit project (nirmit-project/)**
**Goal: Replace 12 broken living-room GLBs with clean, consistent SweetHome3D models**

---

## Context

This project renders furniture inside a Three.js room scene. Every catalog entry has an `asset_url` pointing to a `.glb` file in `frontend/public/models/`. The current 12 living-room GLBs are a mix of Sketchfab + random repos — inconsistent scale, bad materials, wrong pivots. We are replacing all of them with models sourced from SweetHome3D (free, CC-BY / Free Art License, OBJ+MTL format) and converting to GLB.

**Node.js is installed (v24). Python 3.12 + trimesh is installed. Blender is NOT available.**

---

## Step 1 — Install the conversion tool

```bash
npm install -g obj2gltf
```

`obj2gltf` converts OBJ+MTL to binary GLB. No Blender needed.

---

## Step 2 — Source models from SweetHome3D

Go to: **https://www.sweethome3d.com/freeModels.jsp**

For each of the 12 target filenames below, find the best-matching SweetHome3D model. 
Download the ZIP, extract the OBJ+MTL files.

### Target filename → what to find on SweetHome3D

| Target GLB | What to look for | Notes |
|---|---|---|
| `sofa_3seat.glb` | 3-seat sofa / large couch | ~2000–2400mm wide |
| `sofa_l.glb` | L-shaped / corner sofa | |
| `tv_unit.glb` | TV stand / media unit / entertainment center | ~1200–1800mm wide |
| `coffee_table.glb` | Coffee table / center table | ~600–1200mm wide, ~400mm tall |
| `lounge_chair.glb` | Armchair / accent chair | |
| `ottoman.glb` | Ottoman / footstool / pouffe | ~500–700mm wide |
| `bookshelf.glb` | Bookcase / bookshelf | upright, ~1800–2100mm tall |
| `lamp_floor.glb` | Floor lamp / standing lamp | ~1600–1900mm tall |
| `rug.glb` | Area rug / carpet | flat, ~2000–3000mm wide |
| `chair.glb` | Dining chair / accent chair | ~450–500mm wide |
| `fan.glb` | Ceiling fan | ~1000–1300mm blade span |
| `plant.glb` | Potted plant / indoor plant | ~300–600mm wide, ~600–1200mm tall |

### SweetHome3D model library URLs to check:
- Main free models page: https://www.sweethome3d.com/freeModels.jsp
- Additional libraries: https://www.sweethome3d.com/importModels.jsp
- Direct SourceForge libraries (large packs): https://sourceforge.net/projects/sweethome3d/files/SweetHome3D-models/

**Each ZIP contains one or more `.obj` files + `.mtl` material files.**
Pick the model that is closest to a realistic Indian living room piece — avoid overly ornate Western baroque styles.

---

## Step 3 — Convert OBJ → GLB

For each downloaded OBJ file, run:

```bash
obj2gltf -i input_model.obj -o output_name.glb
```

**Important flags:**
- Always include `-i` (input OBJ) and `-o` (output GLB)
- If textures are missing or wrong, add `--unlit` flag
- Target output filenames MUST match exactly:
  ```
  sofa_3seat.glb
  sofa_l.glb
  tv_unit.glb
  coffee_table.glb
  lounge_chair.glb
  ottoman.glb
  bookshelf.glb
  lamp_floor.glb
  rug.glb
  chair.glb
  fan.glb
  plant.glb
  ```

Copy all 12 resulting `.glb` files to:
```
frontend/public/models/
```
(overwrite the existing broken files)

---

## Step 4 — Measure bounding boxes

Run the existing measurement script:

```bash
cd nirmit-project
python scripts/measure_glb.py
```

This outputs a table of filename → X/Y/Z dimensions in metres for all GLBs including the 12 new ones.

**Check the NEW FILES ONLY section at the bottom.**

### Sanity check — expected physical sizes:

| Model | Expected width (mm) | Expected height (mm) | Expected depth (mm) |
|---|---|---|---|
| sofa_3seat | 1800–2400 | 700–950 | 800–1000 |
| sofa_l | 2200–3000 | 700–950 | 2200–3000 |
| tv_unit | 1200–1800 | 400–600 | 300–500 |
| coffee_table | 600–1200 | 350–480 | 500–900 |
| lounge_chair | 700–900 | 700–900 | 700–900 |
| ottoman | 400–700 | 300–450 | 400–700 |
| bookshelf | 800–1200 | 1800–2200 | 250–400 |
| lamp_floor | 250–400 | 1600–2000 | 250–400 |
| rug | 2000–3500 | 5–25 | 1500–2500 |
| chair | 400–550 | 750–950 | 450–600 |
| fan | 900–1400 | 200–500 | 900–1400 |
| plant | 250–600 | 400–1200 | 250–600 |

**If any measured value is wildly outside these ranges (e.g., 50m wide sofa), the OBJ was likely exported in cm or mm instead of meters.**

To fix a scale issue, re-run `obj2gltf` with a scale flag... actually obj2gltf doesn't have a scale flag. Instead, write a small Node.js script:

```js
// fix_scale.mjs  — run with: node fix_scale.mjs
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { transformMesh } from '@gltf-transform/functions';

// npm install @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions
// then run: node fix_scale.mjs <input.glb> <output.glb> <scale_factor>

const [,, input, output, factor] = process.argv;
const scale = parseFloat(factor);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(input);
const root = doc.getRoot();
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION');
    const arr = pos.getArray();
    for (let i = 0; i < arr.length; i++) arr[i] *= scale;
    pos.setArray(arr);
  }
}
await io.write(output, doc);
console.log(`Scaled ${input} by ${scale} -> ${output}`);
```

Usage for a model that's 100x too big (exported in cm):
```bash
node fix_scale.mjs sofa_3seat.glb sofa_3seat_fixed.glb 0.01
```

---

## Step 5 — Update catalog.json

Once the GLBs are in `frontend/public/models/` and measurements look sane, run:

```bash
python scripts/update_catalog_glb.py
```

This script:
- Reads the measured GLB sizes
- Updates all catalog entries that were pointing to the old asset_urls
- Sets new `asset_url` and `dimensions` (width_mm, height_mm, depth_mm = measured × 1000)
- Writes the updated `backend/data/catalog.json`
- Prints a validation table

---

## Step 6 — Update assetTuning.ts

File: `frontend/src/three/assetTuning.ts`

Find the `OVERRIDES` block. The 12 new GLBs already have entries set to `yNudge: 0.003`.
After seeing the real GLB pivots, adjust if needed:
- If the GLB origin is already at base (y=0 at the bottom of the mesh): use `yNudge: 0.0`
- If the GLB origin is at the centre of the mesh: the auto-grounding logic handles it, `yNudge: 0.003` is fine
- For the fan: `yNudge` should be `3.0 - fan_height_m` (ceiling mount at 3m room height)

---

## Step 7 — Validate in browser

Start the frontend dev server:
```bash
cd frontend
npm run dev
```

Open the Planner or Design page and check:
1. Each of the 12 item types appears as a 3D model (not a box fallback)
2. Furniture fits within a typical room (4000mm × 5000mm × 3000mm)
3. No items are floating, sunk into the floor, or wildly oversized

---

## File locations reference

```
nirmit-project/
├── frontend/
│   ├── public/models/          ← PUT GLBs HERE
│   └── src/three/
│       ├── assetTuning.ts      ← yNudge / scaleMul per GLB
│       └── GlbItem.tsx         ← preload() calls (already updated)
├── backend/
│   └── data/catalog.json       ← updated by update_catalog_glb.py
└── scripts/
    ├── measure_glb.py          ← Step 4 measurement
    └── update_catalog_glb.py  ← Step 5 catalog update
```

---

## What NOT to change

- Do not modify `frontend/src/three/GlbItem.tsx` preload list — already updated
- Do not change SKUs, prices, vibes, rooms, or material fields in catalog.json
- Do not rename the 12 target GLB filenames — the catalog already points to them

---

## Done when

- [ ] 12 GLBs in `frontend/public/models/` with correct names
- [ ] All 12 pass the sanity check size ranges in Step 4
- [ ] `python scripts/update_catalog_glb.py` runs with 0 validation mismatches
- [ ] Furniture visible in browser (not box fallbacks)
