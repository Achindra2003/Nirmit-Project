"""Infer per-asset yawDeg overrides for the SH3D GLB pool.

Approach: backend convention is "0° = front faces +Z". For a chair / sofa / bed
the BACK of the item is the tallest mass (the backrest or headboard). We:

  1. Load each GLB with trimesh.
  2. Get the AABB. Compute the per-vertex centroid using only vertices in the
     upper 40 % of the bbox (y > y_min + 0.6 * (y_max − y_min)). That biases
     the centroid toward backrests / headboards.
  3. Compare (cx, cz) against the bbox centre. Whichever XZ direction has the
     larger normalised offset (>15 % of that axis's extent) is taken to be the
     direction the BACK points; everything else is treated as symmetric (0°).
  4. Map "back direction" → yawDeg that rotates the mesh so its FRONT (opposite
     of back) ends up facing +Z.

We deliberately ignore items with weak upper-mass asymmetry — for symmetric
items (tables, lamps, vases) facing doesn't matter, so yawDeg = 0 is fine.

Output: a Python dict literal written to backend/scripts/_yaw_overrides.py that
the user pastes into frontend/src/three/assetTuning.ts.
"""
from __future__ import annotations

import json
from pathlib import Path

import trimesh

REPO_ROOT = Path(__file__).resolve().parents[2]
GLB_DIR = REPO_ROOT / "frontend" / "public" / "models" / "sh3d"
PRESET_DIR = REPO_ROOT / "backend" / "app" / "domain" / "catalog" / "presets"
OUT_JSON = REPO_ROOT / "backend" / "scripts" / "_yaw_overrides.json"

UPPER_BAND = 0.6   # consider only vertices above y_min + 0.6*(y_max-y_min)
MIN_OFFSET = 0.15  # require centroid offset > 15 % of axis extent to commit


def used_assets() -> set[str]:
    """Scan preset catalog files for asset_url='sh3d/...' references."""
    import re
    out: set[str] = set()
    pattern = re.compile(r'asset_url="(sh3d/[^"]+)"')
    for p in PRESET_DIR.glob("*.py"):
        out.update(pattern.findall(p.read_text(encoding="utf-8")))
    return out


def analyse(path: Path) -> tuple[float, dict]:
    """Returns (yawDeg, debug_info) for a single GLB."""
    scene = trimesh.load(str(path), force="scene", process=False)
    if isinstance(scene, trimesh.Trimesh):
        meshes = [scene]
    else:
        meshes = [g for g in scene.geometry.values() if isinstance(g, trimesh.Trimesh)]
    if not meshes:
        return 0.0, {"reason": "no_meshes"}

    # Concatenate vertices (apply each node's world transform when in a scene).
    if isinstance(scene, trimesh.Scene):
        verts_list = []
        for name, transform in scene.graph.to_flattened().items():
            geom_name = transform.get("geometry", None)
            if geom_name and geom_name in scene.geometry:
                mesh = scene.geometry[geom_name]
                T = transform["transform"]
                v = trimesh.transformations.transform_points(mesh.vertices, T)
                verts_list.append(v)
        if not verts_list:
            verts = meshes[0].vertices
        else:
            import numpy as np
            verts = np.vstack(verts_list)
    else:
        verts = meshes[0].vertices

    if len(verts) == 0:
        return 0.0, {"reason": "no_vertices"}

    import numpy as np
    vmin = verts.min(axis=0)
    vmax = verts.max(axis=0)
    extents = vmax - vmin
    if extents[0] < 1e-5 or extents[2] < 1e-5:
        return 0.0, {"reason": "degenerate_bbox"}

    y_thresh = vmin[1] + UPPER_BAND * extents[1]
    upper = verts[verts[:, 1] >= y_thresh]
    if len(upper) < 8:
        return 0.0, {"reason": "no_upper_mass"}

    centre = (vmin + vmax) / 2
    upper_centroid = upper.mean(axis=0)
    dx = (upper_centroid[0] - centre[0]) / extents[0]   # signed, normalised
    dz = (upper_centroid[2] - centre[2]) / extents[2]
    debug = {
        "extents": [round(float(x), 3) for x in extents],
        "dx_norm": round(float(dx), 3),
        "dz_norm": round(float(dz), 3),
    }

    # Pick dominant axis only if its offset is meaningfully large.
    abs_dx, abs_dz = abs(dx), abs(dz)
    if max(abs_dx, abs_dz) < MIN_OFFSET:
        debug["reason"] = "symmetric"
        return 0.0, debug

    if abs_dz >= abs_dx:
        # Back along ±Z
        if dz < 0:
            # Back at -Z → front already at +Z. No rotation.
            return 0.0, {**debug, "back_dir": "-Z", "reason": "already_correct"}
        # Back at +Z → front at -Z → rotate 180° to get front to +Z.
        return 180.0, {**debug, "back_dir": "+Z"}
    # Back along ±X
    if dx < 0:
        # Back at -X → front at +X → rotate +X to +Z = -90° = 270°.
        return 270.0, {**debug, "back_dir": "-X"}
    # Back at +X → front at -X → rotate -X to +Z = +90°.
    return 90.0, {**debug, "back_dir": "+X"}


def main() -> None:
    assets = sorted(used_assets())
    print(f"Analysing {len(assets)} GLBs referenced by 24 presets…\n")

    overrides: dict[str, int] = {}
    rows: list[tuple[str, str, str]] = []
    for url in assets:
        path = GLB_DIR / Path(url).name
        if not path.exists():
            rows.append((url, "MISSING", ""))
            continue
        try:
            yaw, dbg = analyse(path)
        except Exception as exc:  # noqa: BLE001
            rows.append((url, "ERROR", str(exc)[:80]))
            continue
        if yaw != 0.0:
            overrides[url] = int(yaw)
        marker = f"yaw={int(yaw):>3}°" if yaw != 0 else "—"
        rows.append((url, marker, f"dx={dbg.get('dx_norm', 0):+.2f} dz={dbg.get('dz_norm', 0):+.2f} {dbg.get('back_dir', '')} {dbg.get('reason', '')}".strip()))

    for url, marker, info in rows:
        print(f"  {marker:>10}  {url:<55}  {info}")

    OUT_JSON.write_text(json.dumps(overrides, indent=2, sort_keys=True), encoding="utf-8")
    print(f"\n{len(overrides)} non-zero overrides written to {OUT_JSON.relative_to(REPO_ROOT)}.")


if __name__ == "__main__":
    main()
