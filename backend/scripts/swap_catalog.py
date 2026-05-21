"""Swap the catalogue's asset_url references from the legacy toy GLBs to
curated 3D-FRONT meshes pulled into backend/data/3d-front/extracted.

Per founder decision (2026-05-20):
  - Scope: FULL catalog swap (both catalog_hero.json and catalog.json).
  - India-specific items 3D-FRONT cannot supply (mandir, plant, pillow,
    rug, fan, coat rack, miscellaneous decor) are DROPPED entirely.
  - The catalog's mm dimensions, prices, materials, tints stay as-is;
    only `asset_url` changes. GlbItem.tsx auto-fits any GLB to the
    declared dimensions, so proportions normalise automatically.

LICENSE: 3D-FRONT is cc-by-nc-4.0 — prototyping only, not shippable.

Run from backend/:
    python -m scripts.swap_catalog
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_DIR.parent
EXTRACTED = BACKEND_DIR / "data" / "3d-front" / "extracted"
FRONTEND_MODELS = PROJECT_ROOT / "frontend" / "public" / "models"
NEW_MESH_PREFIX = "3df/"  # /models/3df/<name>.glb in the browser
DST_DIR = FRONTEND_MODELS / "3df"

# Maps (category, sub_category) → (relative GLB path under EXTRACTED, target filename).
# Target filename is what gets copied into frontend/public/models/3df/.
# Several sub-categories may share a mesh (the existing catalog already does this).
MAPPING: dict[tuple[str, str], tuple[str, str]] = {
    # --- SEATING ---
    ("seating", "sofa"): (
        "f32ae7af-2144-411e-b8f4-d83da5a4f44a/LivingRoom-24544/Sofa_e406c52d-750d-4837-ba30-6a2bc6f9de23_3.glb",
        "3df_sofa_main.glb",
    ),
    ("seating", "sofa_l"): (
        "eb361c37-0d3a-4e23-bd54-8d54a66c8c1f/LivingRoom-1087/Sofa_afc05a06-e603-46d3-948f-1d695ab68dbf_3.glb",
        "3df_sofa_l.glb",
    ),
    ("seating", "diwan"): (
        "e9b1fe99-242b-46e5-85c5-59028015310d/LivingRoom-11414/Sofa_2d8e7040-14d8-4aba-84ee-356a1eae11e8_4.glb",
        "3df_diwan.glb",
    ),
    ("seating", "lounge_chair"): (
        "e59618e8-5341-4263-9e93-c9bca77d7eb1/KidsRoom-931/Chair_4a2a6bb3-4789-4816-aaaa-3e77244a8da5_5.glb",
        "3df_lounge_chair.glb",
    ),
    ("seating", "chair"): (
        "e7ea961c-5f06-499f-826e-d31ab8fc0b9e/DiningRoom-21420/Chair_09e093c6-45f8-3381-9466-a74d3e0dd195_4.glb",
        "3df_chair_dining.glb",
    ),
    ("seating", "bench"): (
        "e8924da7-9ca0-4dd0-8884-c4eef6a30ea7/Library-544/Chair_925bc907-2909-43e4-a988-261bf098e3be_5.glb",
        "3df_bench.glb",
    ),
    ("seating", "ottoman"): (
        "e2e54170-715e-44f6-8a8a-b58e4d0c30d8/SecondBedroom-4970/Chair_0a46f1ea-56e6-4504-9ba4-70e6ce886faf_1.glb",
        "3df_ottoman.glb",
    ),
    # --- SLEEPING ---
    ("sleeping", "bed"): (
        "df09aaac-b71f-431a-bd13-78cd3a5e1b76/SecondBedroom-32071/Bed_69a2550c-ec04-44d9-a621-e601330a9cb6_2.glb",
        "3df_bed.glb",
    ),
    ("sleeping", "bed_king"): (
        "df09aaac-b71f-431a-bd13-78cd3a5e1b76/SecondBedroom-32071/Bed_69a2550c-ec04-44d9-a621-e601330a9cb6_2.glb",
        "3df_bed.glb",
    ),
    ("sleeping", "bed_queen"): (
        "e5d0d4f7-dff5-4569-8caf-7c41cab8866a/MasterBedroom-17838/Bed_4048fcf9-1937-4a23-af7d-6982626ec2f1_1.glb",
        "3df_bed_queen.glb",
    ),
    ("sleeping", "bed_single"): (
        "fd9984b0-5f4a-4b68-9c8e-2bfe54f3c12d/Bedroom-9575/Bed_83db09d8-0c4c-4b13-8909-404bdf4ea3ec_1.glb",
        "3df_bed_single.glb",
    ),
    ("sleeping", "bed_bunk"): (
        "fd9984b0-5f4a-4b68-9c8e-2bfe54f3c12d/Bedroom-9575/Bed_83db09d8-0c4c-4b13-8909-404bdf4ea3ec_1.glb",
        "3df_bed_single.glb",
    ),
    # --- STORAGE ---
    ("storage", "cabinet"): (
        "e9b1fe99-242b-46e5-85c5-59028015310d/SecondBedroom-12139/Cabinet_Shelf_Desk_edd946e2-e35d-441f-a7b7-90b5476c61c1_1.glb",
        "3df_cabinet.glb",
    ),
    ("storage", "wardrobe"): (
        "e33e2a61-2891-4dc3-b332-cabc9b08d38a/LivingRoom-2549477/Cabinet_Shelf_Desk_8271423a-cb03-4186-a475-1817bd9af3fc_3.glb",
        "3df_wardrobe.glb",
    ),
    ("storage", "bookshelf"): (
        "f4434aea-9669-46df-89c0-1d4a7c5d5b08/StorageRoom-2338/Cabinet_Shelf_Desk_6741c3cc-ba74-40f8-9e44-ca792bcbbdda_1.glb",
        "3df_bookshelf.glb",
    ),
    ("storage", "kitchen_cabinet"): (
        "f3719575-1f2e-4b3a-9ef7-90fbf8d23f0e/Bedroom-29147/Cabinet_Shelf_Desk_1ff04aec-2aa8-417a-a19b-6e5e6ae1bf1d_3.glb",
        "3df_kitchen_cabinet.glb",
    ),
    ("storage", "tv_unit"): (
        "fdb7f1f3-c285-4cb9-83a7-31e0c43c40e8/MasterBedroom-14915/Cabinet_Shelf_Desk_be5d7ab4-33ab-47d6-9649-31185682579c_3.glb",
        "3df_tv_unit.glb",
    ),
    ("storage", "drawer"): (
        "e901e594-bf45-4d77-8aac-66b6a3a37bdf/SecondBedroom-19172/Cabinet_Shelf_Desk_20ae6ca9-6eb4-4f2c-9606-82c7ad1074b0_1.glb",
        "3df_drawer.glb",
    ),
    ("storage", "shoe_rack"): (
        "e59618e8-5341-4263-9e93-c9bca77d7eb1/KidsRoom-931/Cabinet_Shelf_Desk_d12201e8-4ad6-4833-b225-e788a51f561c_2.glb",
        "3df_shoe_rack.glb",
    ),
    # --- DINING ---
    ("dining", "dining_table"): (
        "fa21ce43-f02f-4e92-8e34-d83c3c4b3a4d/DiningRoom-42541/Table_62117100-7bc5-42c8-b8ce-626d46400970_1.glb",
        "3df_dining_table.glb",
    ),
    ("dining", "coffee_table"): (
        "fa21ce43-f02f-4e92-8e34-d83c3c4b3a4d/KidsRoom-42666/Table_57acd9f8-3a83-4b13-9c19-c8bc212361a6_2.glb",
        "3df_coffee_table.glb",
    ),
    ("dining", "table"): (
        "f2e4a9e6-3c1a-4d5c-9c4e-5cd5c4f5f4c7/Library-17592/Table_9bab8067-6b18-4b4c-b980-92b690005387_1.glb",
        "3df_table.glb",
    ),
    ("dining", "table_round"): (
        "e7ea961c-5f06-499f-826e-d31ab8fc0b9e/DiningRoom-21420/Table_7e79e5f8-d94b-4807-9676-4eb0e4e142aa_1.glb",
        "3df_table_round.glb",
    ),
    # --- WORK ---
    ("work", "desk"): (
        "f9f56ff0-e283-4b0c-bd1c-bce3c7e4f5f4/MasterBedroom-8296/Table_15b94a23-059b-4c12-98f8-bd651083d20f_4.glb",
        "3df_desk.glb",
    ),
    ("work", "desk_corner"): (
        "f9f56ff0-e283-4b0c-bd1c-bce3c7e4f5f4/MasterBedroom-8296/Table_15b94a23-059b-4c12-98f8-bd651083d20f_4.glb",
        "3df_desk.glb",
    ),
    ("work", "desk_chair"): (
        "f89c8def-be83-4f72-a8b0-6e7a7ed3fcd5/Library-12559/Chair_6f09d6a0-dcd6-472a-9793-bafc17a8486f_2.glb",
        "3df_desk_chair.glb",
    ),
    # --- FIXTURE / LIGHTING / DECOR ---
    ("fixture", "ceiling_light"): (
        "e5d0d4f7-dff5-4569-8caf-7c41cab8866a/SecondBedroom-17932/Lighting_85bf43f9-8086-422c-87b3-69d0ead9d4bc_3.glb",
        "3df_ceiling_light.glb",
    ),
    ("fixture", "fixture"): (
        "e5d0d4f7-dff5-4569-8caf-7c41cab8866a/SecondBedroom-17932/Lighting_85bf43f9-8086-422c-87b3-69d0ead9d4bc_3.glb",
        "3df_ceiling_light.glb",
    ),
    ("fixture", "mirror"): (
        "e5d0d4f7-dff5-4569-8caf-7c41cab8866a/MasterBedroom-17838/Pier_Stool_b91b536c-c861-4412-a452-9c6e18f0a0ea_5.glb",
        "3df_mirror.glb",
    ),
    ("decor", "lamp"): (
        "ef0613b7-446a-4612-bfdb-1bf3f8b29c70/Bedroom-16717/Lighting_7be78e99-5ace-466f-84bf-e4509dabebb3_3.glb",
        "3df_lamp.glb",
    ),
    # --- KITCHEN ---
    ("kitchen", "kitchen"): (
        "f3719575-1f2e-4b3a-9ef7-90fbf8d23f0e/Bedroom-29147/Cabinet_Shelf_Desk_1ff04aec-2aa8-417a-a19b-6e5e6ae1bf1d_3.glb",
        "3df_kitchen_cabinet.glb",
    ),
}

# Drop categories entirely (no SKUs survive in the rewritten catalog).
DROP: set[tuple[str, str]] = {
    ("mandir", "mandir_chowki"),
    ("mandir", "mandir_floor"),
    ("mandir", "mandir_wall"),
    ("decor", "plant"),
    ("decor", "pillow"),
    ("decor", "rug"),
    ("decor", "decor"),
    ("fixture", "fan"),
    ("storage", "coat_rack"),
    ("sleeping", "cabinet_bed"),
}


def _build_filename_index() -> dict[str, Path]:
    """Walk EXTRACTED and build a {glb_filename: full_path} map.
    GLB names contain UUIDs so they're globally unique."""
    idx: dict[str, Path] = {}
    for house_dir in EXTRACTED.iterdir():
        if not house_dir.is_dir():
            continue
        for room_dir in house_dir.iterdir():
            if not room_dir.is_dir():
                continue
            for glb in room_dir.glob("*.glb"):
                if glb.name not in idx:
                    idx[glb.name] = glb
    return idx


def copy_meshes() -> dict[tuple[str, str], str]:
    DST_DIR.mkdir(parents=True, exist_ok=True)
    filename_idx = _build_filename_index()
    print(f"[swap_catalog] indexed {len(filename_idx)} unique GLB filenames on disk")

    resolved: dict[tuple[str, str], str] = {}
    copied: set[str] = set()
    missing: list[tuple[tuple[str, str], str]] = []
    for key, (rel, target_name) in MAPPING.items():
        # Match on filename only — UUIDs in 3D-FRONT GLB names are globally unique.
        fname = rel.replace("\\", "/").split("/")[-1]
        src = filename_idx.get(fname)
        if src is None:
            missing.append((key, fname))
            continue
        dst = DST_DIR / target_name
        if target_name not in copied:
            shutil.copy2(src, dst)
            copied.add(target_name)
        resolved[key] = NEW_MESH_PREFIX + target_name
    print(f"[swap_catalog] copied {len(copied)} unique mesh(es) to {DST_DIR}")
    if missing:
        print(f"[swap_catalog] WARNING: {len(missing)} mapping(s) had no source mesh on disk:")
        for key, fname in missing:
            print(f"  {key} -> {fname}")
    return resolved


def rewrite_catalog(path: Path, asset_for_key: dict[tuple[str, str], str]) -> None:
    backup = path.with_suffix(path.suffix + ".bak")
    if not backup.exists():
        shutil.copy2(path, backup)
        print(f"[swap_catalog] backup -> {backup.name}")

    entries = json.loads(path.read_text(encoding="utf-8"))
    kept: list[dict] = []
    dropped_count = 0
    unmapped_count = 0
    dropped_keys: set[tuple[str, str]] = set()
    unmapped_keys: set[tuple[str, str]] = set()
    for e in entries:
        key = (e.get("category"), e.get("sub_category"))
        if key in DROP:
            dropped_count += 1
            dropped_keys.add(key)
            continue
        new_url = asset_for_key.get(key)
        if not new_url:
            unmapped_count += 1
            unmapped_keys.add(key)
            continue
        e["asset_url"] = new_url
        kept.append(e)

    path.write_text(json.dumps(kept, indent=2, ensure_ascii=False), encoding="utf-8")
    print(
        f"[swap_catalog] {path.name}: kept {len(kept)} / dropped {dropped_count} / "
        f"unmapped {unmapped_count} (out of {len(entries)})"
    )
    if dropped_keys:
        print(f"  dropped categories: {sorted(dropped_keys)}")
    if unmapped_keys:
        print(f"  WARNING — unmapped categories (skipped): {sorted(unmapped_keys)}")


def main() -> None:
    asset_for_key = copy_meshes()
    print()
    rewrite_catalog(BACKEND_DIR / "data" / "catalog_hero.json", asset_for_key)
    print()
    rewrite_catalog(BACKEND_DIR / "data" / "catalog.json", asset_for_key)


if __name__ == "__main__":
    main()
