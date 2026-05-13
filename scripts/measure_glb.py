"""
Measure the axis-aligned bounding-box (AABB) of every GLB in a directory.
Outputs a table: filename | X (m) | Y (m) | Z (m)
"""
import sys
import os
import trimesh
import numpy as np

MODELS_DIR = os.path.join(
    os.path.dirname(__file__),
    "..", "frontend", "public", "models"
)

NEW_FILES = {
    "sofa_3seat.glb", "sofa_l.glb", "tv_unit.glb", "coffee_table.glb",
    "lounge_chair.glb", "ottoman.glb", "bookshelf.glb", "lamp_floor.glb",
    "rug.glb", "chair.glb", "fan.glb", "plant.glb",
}

def measure(path: str):
    try:
        scene = trimesh.load(path, force="scene", process=False)
        if isinstance(scene, trimesh.Scene):
            meshes = [g for g in scene.geometry.values() if isinstance(g, trimesh.Trimesh)]
            if not meshes:
                return None
            # Apply transforms from scene graph
            bounds_list = []
            for name, geom in scene.geometry.items():
                if not isinstance(geom, trimesh.Trimesh):
                    continue
                # get the transform from scene graph
                try:
                    tf = scene.graph.get(name)[0]
                    verts = trimesh.transformations.transform_points(geom.vertices, tf)
                except Exception:
                    verts = geom.vertices
                bounds_list.append(verts)
            all_verts = np.vstack(bounds_list)
        elif isinstance(scene, trimesh.Trimesh):
            all_verts = scene.vertices
        else:
            return None

        mn = all_verts.min(axis=0)
        mx = all_verts.max(axis=0)
        size = mx - mn  # [x, y, z]
        return size
    except Exception as e:
        return None

def main():
    all_glbs = sorted(f for f in os.listdir(MODELS_DIR) if f.endswith(".glb"))

    # Print header
    print(f"\n{'Filename':<45} {'X (m)':>8} {'Y (m)':>8} {'Z (m)':>8}  {'NEW?':>5}")
    print("-" * 80)

    results = {}
    for fname in all_glbs:
        path = os.path.join(MODELS_DIR, fname)
        size = measure(path)
        if size is not None:
            tag = "***" if fname in NEW_FILES else ""
            print(f"{fname:<45} {size[0]:>8.4f} {size[1]:>8.4f} {size[2]:>8.4f}  {tag:>5}")
            results[fname] = size.tolist()
        else:
            tag = "***" if fname in NEW_FILES else ""
            print(f"{fname:<45} {'ERR':>8} {'ERR':>8} {'ERR':>8}  {tag:>5}")

    print("\n--- NEW FILES ONLY ---")
    print(f"{'Filename':<35} {'X_mm':>8} {'Y_mm':>8} {'Z_mm':>8}")
    print("-" * 60)
    for fname in sorted(NEW_FILES):
        if fname in results:
            s = results[fname]
            print(f"{fname:<35} {s[0]*1000:>8.1f} {s[1]*1000:>8.1f} {s[2]*1000:>8.1f}")
        else:
            print(f"{fname:<35} {'ERR':>8} {'ERR':>8} {'ERR':>8}")

    return results

if __name__ == "__main__":
    main()
