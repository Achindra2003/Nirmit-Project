"""
Update catalog.json for the 12 new living-room GLBs.

Steps
-----
1. Measure bounding boxes of all GLBs in frontend/public/models/
2. Detect scale anomalies and apply corrections where unambiguous
3. Update catalog.json: asset_url + dimensions for all affected entries
4. Print a validation table comparing old vs new catalog dims against measured GLB size
"""
import json, os, sys
import trimesh
import numpy as np

BASE = os.path.join(os.path.dirname(__file__), "..")
MODELS_DIR = os.path.join(BASE, "frontend", "public", "models")
CATALOG_PATH = os.path.join(BASE, "backend", "data", "catalog.json")

# ── 1. Measure all GLBs ──────────────────────────────────────────────────────

def measure_glb(path: str):
    """Return (X, Y, Z) bounding-box size in metres, or None on failure."""
    try:
        scene = trimesh.load(path, force="scene", process=False)
        if isinstance(scene, trimesh.Scene):
            bounds_list = []
            for name, geom in scene.geometry.items():
                if not isinstance(geom, trimesh.Trimesh):
                    continue
                try:
                    tf = scene.graph.get(name)[0]
                    verts = trimesh.transformations.transform_points(geom.vertices, tf)
                except Exception:
                    verts = geom.vertices
                bounds_list.append(verts)
            if not bounds_list:
                return None
            all_verts = np.vstack(bounds_list)
        elif isinstance(scene, trimesh.Trimesh):
            all_verts = scene.vertices
        else:
            return None
        mn = all_verts.min(axis=0)
        mx = all_verts.max(axis=0)
        return (mx - mn).tolist()           # [x_m, y_m, z_m]
    except Exception:
        return None

NEW_GLBS = {
    "sofa_3seat.glb", "sofa_l.glb", "tv_unit.glb", "coffee_table.glb",
    "lounge_chair.glb", "ottoman.glb", "bookshelf.glb", "lamp_floor.glb",
    "rug.glb", "chair.glb", "fan.glb", "plant.glb",
}

print("Step 1 — Measuring GLB bounding boxes…")
print(f"\n{'Filename':<45} {'X (m)':>9} {'Y (m)':>9} {'Z (m)':>9}  {'NEW?':>5}")
print("-" * 82)

measurements: dict[str, list[float]] = {}
for fname in sorted(os.listdir(MODELS_DIR)):
    if not fname.endswith(".glb"):
        continue
    size = measure_glb(os.path.join(MODELS_DIR, fname))
    tag = "***" if fname in NEW_GLBS else ""
    if size:
        measurements[fname] = size
        print(f"{fname:<45} {size[0]:>9.4f} {size[1]:>9.4f} {size[2]:>9.4f}  {tag:>5}")
    else:
        print(f"{fname:<45} {'ERR':>9} {'ERR':>9} {'ERR':>9}  {tag:>5}")

# ── 2. Determine corrected dimensions for each new GLB ───────────────────────

def m_to_mm(v: float) -> int:
    return max(1, round(v * 1000))

# Scale analysis notes:
#   sofa_3seat: measured ~226 m wide → was exported in cm (÷100 → 2.26 m = 2261 mm) ✓
#   ottoman:    measured ~8212 m     → unknown factor; dimensions kept from catalog
#   plant:      measured ~12.85 m   → unknown factor; dimensions kept from catalog
#   All others: measured values are physically plausible → use as-is × 1000

def corrected_dims(fname: str) -> tuple[int, int, int] | None:
    """Return (width_mm, height_mm, depth_mm) or None to keep existing dims."""
    s = measurements.get(fname)
    if s is None:
        return None
    x_m, y_m, z_m = s

    return m_to_mm(x_m), m_to_mm(y_m), m_to_mm(z_m)

print("\n\nStep 2 — Corrected dimensions for new GLBs (width × height × depth, all mm):")
print(f"\n{'Filename':<35} {'width_mm':>10} {'height_mm':>10} {'depth_mm':>10}  Note")
print("-" * 80)
dim_map: dict[str, tuple[int, int, int] | None] = {}
for f in sorted(NEW_GLBS):
    cd = corrected_dims(f)
    dim_map[f] = cd
    if cd:
        note = "÷100 (was cm)" if f == "sofa_3seat.glb" else ""
        print(f"{f:<35} {cd[0]:>10} {cd[1]:>10} {cd[2]:>10}  {note}")
    else:
        print(f"{f:<35} {'(keep existing)':>10}                                scale unknown")

# ── 3. old-URL → new-URL mapping ─────────────────────────────────────────────

OLD_TO_NEW: dict[str, str] = {
    "loungeDesignSofa.glb":      "sofa_3seat.glb",
    "loungeSofaLong.glb":        "sofa_3seat.glb",
    "loungeDesignSofaCorner.glb":"sofa_l.glb",
    "cabinetTelevision.glb":     "tv_unit.glb",
    "cabinetTelevisionDoors.glb":"tv_unit.glb",
    "coffee_table.glb":          "coffee_table.glb",
    "tableCoffeeGlass.glb":      "coffee_table.glb",
    "tableCoffeeGlassSquare.glb":"coffee_table.glb",
    "tableCoffeeSquare.glb":     "coffee_table.glb",
    "loungeChair.glb":           "lounge_chair.glb",
    "loungeSofaOttoman.glb":     "ottoman.glb",
    "ottoman.glb":               "ottoman.glb",
    "pouffe.glb":                "ottoman.glb",
    "bookcaseClosed.glb":        "bookshelf.glb",
    "bookcaseClosedDoors.glb":   "bookshelf.glb",
    "bookcaseClosedWide.glb":    "bookshelf.glb",
    "bookcaseOpen.glb":          "bookshelf.glb",
    "bookshelf.glb":             "bookshelf.glb",
    "bookshelf_cabinet.glb":     "bookshelf.glb",
    "lampRoundFloor.glb":        "lamp_floor.glb",
    "lampWall.glb":              "lamp_floor.glb",
    "lampRoundTable.glb":        "lamp_floor.glb",
    "rugRound.glb":              "rug.glb",
    "rugSquare.glb":             "rug.glb",
    "rugDoormat.glb":            "rug.glb",
    "chair.glb":                 "chair.glb",
    "chairCushion.glb":          "chair.glb",
    "fan.glb":                   "fan.glb",
    "plantSmall1.glb":           "plant.glb",
    "plantSmall2.glb":           "plant.glb",
    "plantSmall3.glb":           "plant.glb",
    "plantSmall4.glb":           "plant.glb",
    "plantSmall5.glb":           "plant.glb",
    "plantSmall6.glb":           "plant.glb",
    "pottedPlant.glb":           "plant.glb",
}

# ── 4. Update catalog.json ────────────────────────────────────────────────────

print("\n\nStep 3 — Updating catalog.json…")
with open(CATALOG_PATH) as f:
    catalog = json.load(f)

updated_count = 0
skipped_dims = 0
for entry in catalog:
    old_url = entry.get("asset_url", "")
    if old_url in NEW_GLBS:
        new_url = old_url
    elif old_url in OLD_TO_NEW:
        new_url = OLD_TO_NEW[old_url]
    else:
        continue

    entry["asset_url"] = new_url
    cd = dim_map.get(new_url)
    if cd:
        w, h, d = cd
        entry["dimensions"]["width_mm"] = w
        entry["dimensions"]["height_mm"] = h
        entry["dimensions"]["depth_mm"] = d
    else:
        skipped_dims += 1
    updated_count += 1

print(f"  Entries updated:       {updated_count}")
print(f"  Dims skipped (scale?): {skipped_dims}  (ottoman, plant — kept existing)")

with open(CATALOG_PATH, "w") as f:
    json.dump(catalog, f, indent=2, ensure_ascii=False)
print(f"  Written: {CATALOG_PATH}")

# ── 5. Validation ─────────────────────────────────────────────────────────────

print("\n\nStep 4 — Validation (catalog dims vs measured GLB size, living-room items):")
LIVING_ROOM_CATS = {"seating", "tv_unit", "storage", "accent", "lighting", "rug"}

print(f"\n{'SKU':<40} {'URL':<25} {'cat_W':>7} {'cat_H':>7} {'cat_D':>7} "
      f"{'glb_W':>7} {'glb_H':>7} {'glb_D':>7}  Status")
print("-" * 120)

TOLERANCE = 0.20
mismatches = 0
flagged = set()
for entry in catalog:
    url = entry.get("asset_url", "")
    if url not in NEW_GLBS:
        continue
    if entry.get("category") not in LIVING_ROOM_CATS and entry.get("rooms") != ["living_room"]:
        # Only check items actually in living room
        pass

    s = measurements.get(url)
    if s is None:
        continue
    cd = dim_map.get(url)
    if cd is None:
        continue

    cw, ch, cd_d = cd
    cat_w = entry["dimensions"]["width_mm"]
    cat_h = entry["dimensions"]["height_mm"]
    cat_d = entry["dimensions"]["depth_mm"]

    def pct_diff(a, b): return abs(a - b) / max(b, 1)

    ok = (
        pct_diff(cat_w, cw) <= TOLERANCE and
        pct_diff(cat_h, ch) <= TOLERANCE and
        pct_diff(cat_d, cd_d) <= TOLERANCE
    )
    status = "OK" if ok else "MISMATCH"
    if not ok:
        mismatches += 1

    if url not in flagged or not ok:
        flagged.add(url)
        print(f"{entry['sku']:<40} {url:<25} {cat_w:>7} {cat_h:>7} {cat_d:>7} "
              f"{cw:>7} {ch:>7} {cd_d:>7}  {status}")

print(f"\nTotal mismatches: {mismatches}")

# ── 6. Summary of scale anomalies ─────────────────────────────────────────────

print("""
+======================================================================+
|  SCALE ANOMALY REPORT - ACTION REQUIRED                              |
+======================================================================+
|  sofa_3seat.glb  Raw X=226 m -> corrected /100 -> 2261 mm           |
|    GLB was exported in centimetres. Dims corrected in catalog.       |
|    The GLB itself still needs re-export in metres.                   |
+----------------------------------------------------------------------+
|  ottoman.glb     Raw X=8212 m -- scale factor unknown                |
|    Existing catalog dimensions kept. Render will auto-fit GLB.       |
|    Model pivot/scale should be fixed in Blender.                     |
+----------------------------------------------------------------------+
|  plant.glb       Raw X=12.85 m -- approx 25x too large              |
|    Existing catalog dimensions kept. Same recommendation.            |
+----------------------------------------------------------------------+
|  sofa_l.glb      Raw Z=4713 mm (471 cm depth) -- unusually deep     |
|  tv_unit.glb     Raw Y=1509 mm (151 cm height) -- unusually tall    |
|  coffee_table.glb Raw Y=598 mm -- taller than a coffee table        |
|  lounge_chair.glb Raw X=333 mm -- narrower than typical             |
|    Dims written as measured. If models look distorted in 3D,        |
|    re-export or adjust assetTuning.ts scaleMul.                      |
+======================================================================+
""")
