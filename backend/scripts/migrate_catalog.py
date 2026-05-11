"""One-shot migration: _legacy_poc/src/catalog/catalog.ts → backend/data/catalog.json.

The legacy file is auto-generated and structurally regular, so we use regex over
TypeScript text rather than trying to parse TS. We:

  - keep only `source: 'hero'` items (those backed by real GLB assets)
  - drop entries whose modelPath does not resolve under frontend/public/models/
  - convert dimensions from meters → millimeters
  - infer RoomType applicability from tags and category
  - infer Vibe applicability from tags + materials
  - propagate price (baseCost) and the labor-built equivalent (baseCost * 0.65)

Run from backend/:

    python -m scripts.migrate_catalog
"""
from __future__ import annotations

import json
import re
from pathlib import Path

# ---------- Paths ----------

ROOT = Path(__file__).resolve().parents[2]
LEGACY = ROOT / "_legacy_poc" / "src" / "catalog" / "catalog.ts"
GLB_DIR = ROOT / "frontend" / "public" / "models"
OUT = ROOT / "backend" / "data" / "catalog_hero.json"

# ---------- Mappings ----------

# Legacy CatalogCategory → our top-level "category" string used by the layout
# selector. We intentionally narrow to a small vocabulary.
CATEGORY_MAP = {
    "seating": "seating",
    "sleeping": "sleeping",
    "storage": "storage",
    "dining": "dining",
    "pooja": "mandir",
    "kitchen": "kitchen",
    "decor": "decor",
    "fixtures": "fixture",
    "work": "work",
}

# Sub-category inference from item label (helps the selector pick the right
# kind of seating / storage / etc.).
def infer_sub_category(label: str, category: str) -> str:
    name = label.lower()
    if category == "seating":
        if "sofa" in name and "l-shap" in name:
            return "sofa_l"
        if "sofa" in name:
            return "sofa"
        if "diwan" in name:
            return "diwan"
        if "lounge" in name:
            return "lounge_chair"
        if "office" in name or "desk" in name:
            return "desk_chair"
        if "ottoman" in name or "pouffe" in name or "pouf" in name:
            return "ottoman"
        if "bench" in name:
            return "bench"
        if "dining" in name:
            return "dining_chair"
        return "chair"
    if category == "sleeping":
        if "king" in name:
            return "bed_king"
        if "queen" in name:
            return "bed_queen"
        if "single" in name:
            return "bed_single"
        if "bunk" in name:
            return "bed_bunk"
        if "cabinet" in name:
            return "cabinet_bed"
        return "bed"
    if category == "storage":
        if "wardrobe" in name or "almirah" in name:
            return "wardrobe"
        if "tv unit" in name or "television" in name:
            return "tv_unit"
        if "bookshelf" in name or "bookcase" in name:
            return "bookshelf"
        if "kitchen" in name:
            return "kitchen_cabinet"
        if "shoe" in name:
            return "shoe_rack"
        if "chest" in name or "drawer" in name:
            return "drawer"
        if "coat" in name:
            return "coat_rack"
        return "cabinet"
    if category == "dining":
        if "coffee" in name:
            return "coffee_table"
        if "round" in name:
            return "table_round"
        if "dining" in name and "table" in name:
            return "dining_table"
        return "table"
    if category == "mandir":
        if "wall" in name:
            return "mandir_wall"
        if "floor" in name:
            return "mandir_floor"
        if "chowki" in name:
            return "mandir_chowki"
        return "mandir"
    if category == "work":
        if "desk" in name and "corner" in name:
            return "desk_corner"
        if "desk" in name or "study" in name:
            return "desk"
        if "chair" in name:
            return "desk_chair"
        return "work"
    if category == "decor":
        if "rug" in name:
            return "rug"
        if "lamp" in name:
            return "lamp"
        if "plant" in name:
            return "plant"
        if "pillow" in name:
            return "pillow"
        return "decor"
    if category == "fixture":
        if "fan" in name:
            return "fan"
        if "mirror" in name:
            return "mirror"
        if "light" in name or "ceiling" in name:
            return "ceiling_light"
        return "fixture"
    return category


# RoomType applicability. A sofa is for living + dining (informal), a bed is
# for bedroom + kids, etc. Tags from the legacy item help where category is
# coarse.
def infer_rooms(category: str, sub: str, tags: list[str]) -> list[str]:
    rooms: set[str] = set()
    tagset = set(t.lower() for t in tags)
    if category == "seating":
        if sub in ("sofa", "sofa_l", "lounge_chair", "diwan", "ottoman"):
            rooms.add("living")
        if sub == "dining_chair":
            rooms.add("dining")
        if sub == "desk_chair":
            rooms.update({"study", "bedroom"})
        if sub == "bench":
            rooms.update({"living", "dining"})
        if sub == "chair":
            rooms.update({"living", "bedroom"})
    if category == "sleeping":
        rooms.add("bedroom")
        if sub in ("bed_single", "bed_bunk"):
            rooms.add("kids")
    if category == "storage":
        if sub == "wardrobe":
            rooms.update({"bedroom", "kids"})
        if sub == "tv_unit":
            rooms.add("living")
        if sub == "bookshelf":
            rooms.update({"study", "living", "kids"})
        if sub == "kitchen_cabinet":
            rooms.add("kitchen")
        if sub == "shoe_rack":
            rooms.add("living")
        if sub == "drawer":
            rooms.update({"bedroom", "living"})
    if category == "dining":
        if sub == "coffee_table":
            rooms.add("living")
        else:
            rooms.add("dining")
    if category == "mandir":
        rooms.update({"pooja", "living"})
    if category == "kitchen":
        rooms.add("kitchen")
    if category == "work":
        rooms.update({"study", "bedroom"})
    if category == "decor":
        rooms.update({"living", "bedroom", "dining", "study", "kids"})
    if category == "fixture":
        if sub == "mirror":
            rooms.update({"bedroom", "bathroom"})
        else:
            rooms.update({"living", "bedroom", "dining", "kitchen", "study", "kids"})
    # Tag-driven hints
    if "kids" in tagset or "kid" in tagset:
        rooms.add("kids")
    if "bathroom" in tagset:
        rooms.add("bathroom")
    if "kitchen" in tagset:
        rooms.add("kitchen")
    if "pooja" in tagset or "mandir" in tagset:
        rooms.update({"pooja", "living"})
    return sorted(rooms)


# Vibe inference. A heavy carved mandir reads warm_traditional; a clean
# modular sofa reads modern_minimal. We use materialIds as the primary cue.
def infer_vibes(material_ids: list[str], tags: list[str]) -> list[str]:
    mats = set(material_ids)
    tagset = set(t.lower() for t in tags)
    vibes: set[str] = set()
    if mats & {"wood_teak", "wood_rosewood", "wood_walnut", "metal_brass", "fabric_silk_blend"}:
        vibes.add("warm_traditional")
    if mats & {"white_laminate", "grey_laminate", "black_laminate", "metal_chrome", "metal_matte_black"}:
        vibes.add("modern_minimal")
    if mats & {"wood_mango", "wood_sheen", "fabric_jute", "kota_stone"}:
        vibes.add("earthy_crafted")
    if mats & {"fabric_linen", "fabric_cotton", "marble_white", "wood_oak"}:
        vibes.add("light_airy")
    # If nothing matched, all vibes apply (e.g. plain decor items).
    return sorted(vibes) if vibes else ["warm_traditional", "modern_minimal", "earthy_crafted", "light_airy"]


# ---------- Parser ----------

# The data lines look like:
#   { id: 'cat_0001', source: 'hero', category: 'storage', label: 'Bathroom Cabinet',
#     dimensions: { width: 1, depth: 0.4, height: 1.5 },
#     modelPath: '/models/bathroomCabinet.glb', thumbnail: '',
#     tags: ['storage', 'versatile'], quality: 'hero',
#     pricing: { baseCost: 7000, costUnit: 'piece',
#                materialIds: ['wood_teak', ...],
#                laborCost: 500, leadTime: '15_days' } },
#
# Single line per entry, single quotes. Use one regex.

ENTRY_RE = re.compile(
    r"\{\s*id:\s*'(?P<id>[^']+)',\s*"
    r"source:\s*'(?P<source>[^']+)',\s*"
    r"category:\s*'(?P<cat>[^']+)',\s*"
    r"label:\s*'(?P<label>[^']+)',\s*"
    r"dimensions:\s*\{\s*width:\s*(?P<w>[0-9.]+),\s*depth:\s*(?P<d>[0-9.]+),\s*height:\s*(?P<h>[0-9.]+)\s*\},\s*"
    r"modelPath:\s*'(?P<path>[^']*)',\s*"
    r"thumbnail:\s*'[^']*',\s*"
    r"tags:\s*\[(?P<tags>[^\]]*)\],\s*"
    r"quality:\s*'(?P<quality>[^']+)',\s*"
    r"pricing:\s*\{\s*baseCost:\s*(?P<base>[0-9]+),\s*"
    r"costUnit:\s*'(?P<unit>[^']+)',\s*"
    r"materialIds:\s*\[(?P<mats>[^\]]*)\],\s*"
    r"laborCost:\s*(?P<labor>[0-9]+),\s*"
    r"leadTime:\s*'(?P<lead>[^']+)'\s*\}\s*\}",
    re.MULTILINE,
)


def _parse_string_array(raw: str) -> list[str]:
    return [s.strip().strip("'\"") for s in raw.split(",") if s.strip()]


def main() -> None:
    if not LEGACY.exists():
        raise SystemExit(f"legacy catalog not found at {LEGACY}")

    text = LEGACY.read_text(encoding="utf-8")
    available_glbs = {p.name for p in GLB_DIR.glob("*.glb")} if GLB_DIR.exists() else set()
    if not available_glbs:
        print(f"WARNING: no .glb files in {GLB_DIR}; all items will be filtered out.")

    items: list[dict] = []
    seen_skus: set[str] = set()
    skipped_no_glb = 0
    skipped_non_hero = 0

    for m in ENTRY_RE.finditer(text):
        if m.group("source") != "hero":
            skipped_non_hero += 1
            continue

        path = m.group("path")  # e.g. /models/bathroomCabinet.glb
        asset = path.rsplit("/", 1)[-1]
        if asset not in available_glbs:
            skipped_no_glb += 1
            continue

        legacy_cat = m.group("cat")
        category = CATEGORY_MAP.get(legacy_cat, legacy_cat)
        tags = _parse_string_array(m.group("tags"))
        material_ids = _parse_string_array(m.group("mats"))
        sub = infer_sub_category(m.group("label"), category)
        rooms = infer_rooms(category, sub, tags)
        vibes = infer_vibes(material_ids, tags)

        # Stable, human-readable SKU. Combine sub + sequential id from legacy.
        sku = f"{sub.upper()}-{m.group('id').split('_')[-1]}"
        if sku in seen_skus:
            continue
        seen_skus.add(sku)

        base_cost = int(m.group("base"))
        labor_cost = int(m.group("labor"))
        # In the legacy schema price = baseCost (material variants are cost
        # multipliers — we drop the variant axis here and treat baseCost as the
        # default-material price). The carpenter-built equivalent saves ~35%
        # on materials but bears similar labor — treat as 0.65× of base + labor.
        price_inr = base_cost + labor_cost
        build_inr = int(round(base_cost * 0.65)) + labor_cost

        items.append(
            {
                "sku": sku,
                "asset_url": asset,
                "name_en": m.group("label"),
                "name_hi": None,
                "category": category,
                "sub_category": sub,
                "rooms": rooms,
                "vibes": vibes,
                "dimensions": {
                    "width_mm": int(round(float(m.group("w")) * 1000)),
                    "depth_mm": int(round(float(m.group("d")) * 1000)),
                    "height_mm": int(round(float(m.group("h")) * 1000)),
                },
                "price_inr": price_inr,
                "build_price_inr": build_inr,
                "materials": material_ids,
                "tags": tags,
            }
        )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(items, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {len(items)} items -> {OUT}")
    print(f"  skipped (no .glb): {skipped_no_glb}")
    print(f"  skipped (non-hero): {skipped_non_hero}")


if __name__ == "__main__":
    main()
