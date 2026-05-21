"""Rewrite app/domain/catalog/hero_catalog.py to point asset_url strings at the
new 3D-FRONT meshes (under /models/3df/), and drop entries the catalogue swap
removed (mandir, rug, plant, ceiling fan).

This is the RUNTIME source of truth — the JSON catalogue files
(`data/catalog.json`, `data/catalog_hero.json`) are research artefacts only,
per `app/domain/catalog/repository.py`.

Run from backend/:
    python -m scripts.swap_hero_catalog
"""
from __future__ import annotations

import re
import shutil
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
TARGET = BACKEND_DIR / "app" / "domain" / "catalog" / "hero_catalog.py"

# Old filename → new 3df mesh. Multiple olds may map to the same new mesh —
# GlbItem.tsx auto-fits each instance to its declared mm dimensions, so the
# same Sofa GLB serves a 1.6 m 2-seater and a 2.4 m L-shape without stretching.
URL_MAP: dict[str, str] = {
    # seating
    "sofa_3seat.glb": "3df/3df_sofa_main.glb",
    "sofa_3seater.glb": "3df/3df_sofa_main.glb",
    "sofa_2seater.glb": "3df/3df_sofa_main.glb",
    "sofa_single.glb": "3df/3df_sofa_main.glb",
    "sofa_l.glb": "3df/3df_sofa_l.glb",
    "diwan.glb": "3df/3df_diwan.glb",
    "lounge_chair.glb": "3df/3df_lounge_chair.glb",
    "loungeChairRelax.glb": "3df/3df_lounge_chair.glb",
    "chair.glb": "3df/3df_chair_dining.glb",
    "chairCushion.glb": "3df/3df_chair_dining.glb",
    "chairModernCushion.glb": "3df/3df_chair_dining.glb",
    "ottoman.glb": "3df/3df_ottoman.glb",
    "pouffe.glb": "3df/3df_ottoman.glb",
    "stoolBar.glb": "3df/3df_ottoman.glb",
    "benchCushion.glb": "3df/3df_bench.glb",
    "chairDesk.glb": "3df/3df_desk_chair.glb",
    "dining_chair.glb": "3df/3df_chair_dining.glb",
    # tables
    "coffee_table.glb": "3df/3df_coffee_table.glb",
    "tableRound.glb": "3df/3df_table_round.glb",
    "sideTableDrawers.glb": "3df/3df_drawer.glb",
    "desk.glb": "3df/3df_desk.glb",
    "deskCorner.glb": "3df/3df_desk.glb",
    "dining_6.glb": "3df/3df_dining_table.glb",
    "dining_4.glb": "3df/3df_dining_table.glb",
    # storage
    "bookshelf.glb": "3df/3df_bookshelf.glb",
    "bookcaseClosed.glb": "3df/3df_wardrobe.glb",
    "bookcaseClosedWide.glb": "3df/3df_cabinet.glb",
    "bookcaseClosedDoors.glb": "3df/3df_cabinet.glb",
    "bookcaseOpenLow.glb": "3df/3df_bookshelf.glb",
    "bookshelf_cabinet.glb": "3df/3df_cabinet.glb",
    "chest_drawers.glb": "3df/3df_drawer.glb",
    "shoe_rack.glb": "3df/3df_shoe_rack.glb",
    "cabinetBed.glb": "3df/3df_cabinet.glb",
    "SimpleCabinet.glb": "3df/3df_cabinet.glb",
    # beds
    "bed_queen.glb": "3df/3df_bed_queen.glb",
    "bed_king.glb": "3df/3df_bed.glb",
    "bed_single.glb": "3df/3df_bed_single.glb",
    "bedDouble.glb": "3df/3df_bed.glb",
    # lighting
    "lamp_floor.glb": "3df/3df_lamp.glb",
    "lampRoundTable.glb": "3df/3df_lamp.glb",
    "lampRoundFloor.glb": "3df/3df_lamp.glb",
    "lampSquareFloor.glb": "3df/3df_lamp.glb",
    "lampSquareTable.glb": "3df/3df_lamp.glb",
    "lampWall.glb": "3df/3df_lamp.glb",
    "lampSquareCeiling.glb": "3df/3df_ceiling_light.glb",
    # decor & fixtures
    "mirror.glb": "3df/3df_mirror.glb",
    # kitchen — repurpose the kitchen-style cabinet mesh
    "counter_straight.glb": "3df/3df_kitchen_cabinet.glb",
    "counter_l.glb": "3df/3df_kitchen_cabinet.glb",
    "overhead_cabinet.glb": "3df/3df_kitchen_cabinet.glb",
    "kitchenFridge.glb": "3df/3df_cabinet.glb",
    "kitchenStove.glb": "3df/3df_kitchen_cabinet.glb",
    "sink.glb": "3df/3df_kitchen_cabinet.glb",
    # tv unit
    "tv_unit.glb": "3df/3df_tv_unit.glb",
}

# Categories/sub_categories whose entire _item(...) block must be removed.
# Matched by inspecting the block text for `category=...` and `sub_category=...`.
DROP_CATEGORIES: set[str] = {"mandir"}
DROP_SUB_CATEGORIES: set[str] = {
    "rug", "rug_rectangle", "rug_round", "rug_rounded",
    "plant", "plant_small",
    "ceiling_fan",
}


def _block_should_be_dropped(block: str) -> bool:
    cat_m = re.search(r'category="([^"]+)"', block)
    sub_m = re.search(r'sub_category="([^"]+)"', block)
    cat = cat_m.group(1) if cat_m else None
    sub = sub_m.group(1) if sub_m else None
    if cat in DROP_CATEGORIES:
        return True
    if sub in DROP_SUB_CATEGORIES:
        return True
    return False


def main() -> None:
    src = TARGET.read_text(encoding="utf-8")
    backup = TARGET.with_suffix(TARGET.suffix + ".bak")
    if not backup.exists():
        shutil.copy2(TARGET, backup)
        print(f"[swap_hero_catalog] backup -> {backup.name}")

    # 1) Drop _item(...) blocks for unwanted categories.
    #    We use a non-greedy match between `_item(` and `),` followed by newline.
    block_re = re.compile(r"(    _item\([^()]*?\),\n)", re.DOTALL)
    blocks = block_re.findall(src)
    print(f"[swap_hero_catalog] found {len(blocks)} _item(...) blocks")

    dropped = 0
    rewritten = src
    for block in blocks:
        if _block_should_be_dropped(block):
            rewritten = rewritten.replace(block, "", 1)
            dropped += 1

    # 2) Swap asset_url filenames.
    swap_count = 0
    unmapped: set[str] = set()
    def _swap(m: re.Match[str]) -> str:
        nonlocal swap_count
        old = m.group(1)
        if old in URL_MAP:
            swap_count += 1
            return f'asset_url="{URL_MAP[old]}"'
        unmapped.add(old)
        return m.group(0)

    rewritten = re.sub(r'asset_url="([^"]+)"', _swap, rewritten)

    TARGET.write_text(rewritten, encoding="utf-8")

    print(f"[swap_hero_catalog] dropped {dropped} blocks (mandir/rug/plant/fan)")
    print(f"[swap_hero_catalog] swapped {swap_count} asset_url(s)")
    if unmapped:
        print(f"[swap_hero_catalog] WARNING — {len(unmapped)} asset_url(s) had no mapping:")
        for u in sorted(unmapped):
            print(f"  {u}")


if __name__ == "__main__":
    main()
