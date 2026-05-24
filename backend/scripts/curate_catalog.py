"""Pick dimensionally-appropriate 3D-Front meshes per sub_category, copy them
to frontend/public/models/curated/, and emit a JSON manifest.

The output is the *source-of-truth catalog of available meshes* — separate from
the per-preset catalogs (generate_preset_catalogs.py), which pick from this
pool. This script is idempotent: run it any time the extracted pool changes.

Why dimensionally pick, not name pick:
  The old swap_hero_catalog.py picked GLBs by filename (`3df_coffee_table.glb`),
  but those files were chosen heuristically and had wrong native dims
  (e.g. a 134mm "TV unit"). The renderer's auto-fit then stretched 134mm into
  1600mm. By picking the meshes that already match the target dims, declared
  = native, auto-fit ends at scale 1.0, no stretching.

Usage (from backend/):
    python -m scripts.curate_catalog
"""
from __future__ import annotations

import json
import shutil
import struct
from collections import defaultdict
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
EXTRACT_DIR = BACKEND_DIR / "data" / "3d-front" / "extracted"
REPO_ROOT = BACKEND_DIR.parent
CURATED_DIR = REPO_ROOT / "frontend" / "public" / "models" / "curated"
MANIFEST_OUT = BACKEND_DIR / "app" / "domain" / "catalog" / "curated_manifest.json"

# How many distinct picks to keep per sub_category. More = more variety across
# the 24 presets at the cost of extra GLB files.
PICKS_PER_SUB = 4

# Skip the structural meshes that ship in every room.
STRUCTURAL = {"floor.glb", "wall.glb", "ceil.glb", "others.glb"}

# Target dimensions (W × H × D in mm) per sub_category — drawn from
# hero_catalog.py so the existing preset offsets work without retuning.
# Each entry lists which 3D-Front category prefixes are valid candidates.
TARGETS: dict[str, dict] = {
    "sofa":         dict(target=(2200,  850,  900), prefixes=["Sofa"]),
    "diwan":        dict(target=(2000,  700,  900), prefixes=["Sofa"]),
    "coffee_table": dict(target=(1100,  450,  600), prefixes=["Table"]),
    "side_table":   dict(target=( 535,  500,  386), prefixes=["Table", "Pier_Stool"]),
    "tv_unit":      dict(target=(1800,  526,  465), prefixes=["Cabinet_Shelf_Desk"]),
    "bookshelf":    dict(target=(1663, 1863,  331), prefixes=["Cabinet_Shelf_Desk"]),
    "wardrobe":     dict(target=(1200, 2100,  600), prefixes=["Cabinet_Shelf_Desk"]),
    "cabinet":      dict(target=( 800,  790,  300), prefixes=["Cabinet_Shelf_Desk"]),
    "chest":        dict(target=(1000,  820,  520), prefixes=["Cabinet_Shelf_Desk"]),
    "sideboard":    dict(target=(1500,  850,  420), prefixes=["Cabinet_Shelf_Desk"]),
    "desk":         dict(target=(1200,  750,  600), prefixes=["Cabinet_Shelf_Desk", "Table"]),
    "lounge_chair": dict(target=( 804,  640,  705), prefixes=["Chair"]),
    "desk_chair":   dict(target=( 600,  900,  600), prefixes=["Chair"]),
    "dining_chair": dict(target=( 480,  920,  520), prefixes=["Chair"]),
    "dining_table": dict(target=(1200,  760,  800), prefixes=["Table"]),
    "bed_queen":    dict(target=(1623,  600, 2050), prefixes=["Bed"]),
    "bed_king":     dict(target=(1800,  600, 2050), prefixes=["Bed"]),
    "bed_single":   dict(target=( 900,  500, 1900), prefixes=["Bed"]),
    "lamp":         dict(target=( 400, 1673,  400), prefixes=["Lighting"]),
}


def parse_glb_native_dims(path: Path) -> tuple[float, float, float] | None:
    """Return (W, H, D) in MILLIMETRES from accessor min/max in the GLB JSON
    chunk. Returns None if no POSITION accessor with min/max is found."""
    try:
        with open(path, "rb") as f:
            f.read(12)  # magic + version + total
            chunk_len = struct.unpack("<I", f.read(4))[0]
            f.read(4)
            json_bytes = f.read(chunk_len)
        gltf = json.loads(json_bytes)
    except Exception:
        return None
    mn = [float("inf"), float("inf"), float("inf")]
    mx = [float("-inf"), float("-inf"), float("-inf")]
    for acc in gltf.get("accessors", []):
        if "min" in acc and "max" in acc and len(acc["min"]) == 3:
            for i in range(3):
                mn[i] = min(mn[i], acc["min"][i])
                mx[i] = max(mx[i], acc["max"][i])
    if mn[0] == float("inf"):
        return None
    # 3D-Front native units are metres; convert to mm.
    return tuple((mx[i] - mn[i]) * 1000.0 for i in range(3))  # type: ignore[return-value]


def parse_category_prefix(fname: str) -> str:
    # "Cabinet_Shelf_Desk" is a multi-word prefix — match it first.
    for pref in ("Cabinet_Shelf_Desk", "Pier_Stool"):
        if fname.startswith(pref + "_"):
            return pref
    return fname.split("_", 1)[0]


def score(native: tuple[float, float, float], target: tuple[int, int, int]) -> float:
    """Lower is better. Squared proportional difference per axis. A pick that
    matches all three axes within 20% scores ~0.12; one that matches two axes
    perfectly but is 3× off on one scores 4.0."""
    if any(n < 1e-3 for n in native):
        return float("inf")
    return sum(((native[i] - target[i]) / target[i]) ** 2 for i in range(3))


def scan_extraction() -> list[dict]:
    catalog: list[dict] = []
    if not EXTRACT_DIR.exists():
        return catalog
    for scene_dir in EXTRACT_DIR.iterdir():
        if not scene_dir.is_dir():
            continue
        for room_dir in scene_dir.iterdir():
            if not room_dir.is_dir():
                continue
            for fpath in room_dir.iterdir():
                if not fpath.name.endswith(".glb"):
                    continue
                if fpath.name in STRUCTURAL:
                    continue
                dims = parse_glb_native_dims(fpath)
                if dims is None:
                    continue
                catalog.append({
                    "path": fpath,
                    "fname": fpath.name,
                    "dims_mm": dims,
                    "prefix": parse_category_prefix(fpath.name),
                    "scene": scene_dir.name,
                    "room": room_dir.name,
                })
    return catalog


def pick_per_sub(catalog: list[dict]) -> dict[str, list[dict]]:
    picks: dict[str, list[dict]] = {}
    for sub, t in TARGETS.items():
        candidates = [c for c in catalog if c["prefix"] in t["prefixes"]]
        if not candidates:
            picks[sub] = []
            continue
        candidates.sort(key=lambda c: score(c["dims_mm"], t["target"]))
        # Dedupe near-identical picks (avoid PICK_PER_SUB choices that are the
        # same source mesh from different rooms with tiny dim drift).
        kept: list[dict] = []
        for c in candidates:
            is_dup = any(
                abs(c["dims_mm"][i] - k["dims_mm"][i]) < 20 for k in kept for i in range(3)
            ) and any(
                # All three axes within 20mm of an already-kept pick.
                all(abs(c["dims_mm"][i] - k["dims_mm"][i]) < 20 for i in range(3)) for k in kept
            )
            if is_dup:
                continue
            kept.append(c)
            if len(kept) >= PICKS_PER_SUB:
                break
        picks[sub] = kept
    return picks


def emit_picks(picks: dict[str, list[dict]]) -> dict:
    """Copy each pick into CURATED_DIR with a stable name; build a manifest the
    per-preset catalog generator can read."""
    if CURATED_DIR.exists():
        # Clear existing curated picks so renaming/removals don't leave orphans.
        for p in CURATED_DIR.iterdir():
            if p.is_file() and p.suffix == ".glb":
                p.unlink()
    CURATED_DIR.mkdir(parents=True, exist_ok=True)

    manifest: dict = {"items": []}
    for sub, picked in picks.items():
        for idx, c in enumerate(picked):
            sku = f"{sub}_v{idx + 1}"
            out_name = f"{sku}.glb"
            shutil.copyfile(c["path"], CURATED_DIR / out_name)
            manifest["items"].append({
                "sku": sku,
                "sub_category": sub,
                "asset_url": f"curated/{out_name}",
                "native_dims_mm": [round(c["dims_mm"][i]) for i in range(3)],
                "target_dims_mm": list(TARGETS[sub]["target"]),
                "source_scene": c["scene"],
                "source_room": c["room"],
                "source_fname": c["fname"],
                "score": round(score(c["dims_mm"], TARGETS[sub]["target"]), 4),
            })
    return manifest


def main() -> None:
    print(f"[curate_catalog] scanning {EXTRACT_DIR} ...")
    catalog = scan_extraction()
    print(f"  found {len(catalog)} candidate GLBs")
    if not catalog:
        print("  no extracted GLBs — pull more via fetch_3dfront first")
        return

    counts_by_prefix: dict[str, int] = defaultdict(int)
    for c in catalog:
        counts_by_prefix[c["prefix"]] += 1
    print("  by 3D-Front category:")
    for pref, n in sorted(counts_by_prefix.items(), key=lambda x: -x[1]):
        print(f"    {pref:25s} {n}")

    print(f"[curate_catalog] picking top {PICKS_PER_SUB} per sub_category ...")
    picks = pick_per_sub(catalog)

    coverage = 0
    for sub, lst in picks.items():
        target = TARGETS[sub]["target"]
        print(f"\n  {sub:14s}  target {target[0]:>5d} x {target[1]:>4d} x {target[2]:>4d} mm")
        if not lst:
            print(f"    -- NO CANDIDATES (3D-Front has no {TARGETS[sub]['prefixes']} matches)")
            continue
        for idx, c in enumerate(lst):
            d = c["dims_mm"]
            sc = score(d, target)
            print(
                f"    v{idx + 1}  {d[0]:>5.0f} x {d[1]:>4.0f} x {d[2]:>4.0f}  "
                f"score={sc:.3f}  {c['scene'][:8]}/{c['room']}/{c['fname']}"
            )
            coverage += 1

    print(f"\n[curate_catalog] copying {coverage} picks to {CURATED_DIR} ...")
    manifest = emit_picks(picks)
    MANIFEST_OUT.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_OUT.write_text(json.dumps(manifest, indent=2))
    print(f"[curate_catalog] manifest written to {MANIFEST_OUT}")
    print(f"[curate_catalog] {len(manifest['items'])} curated SKUs available")


if __name__ == "__main__":
    main()
