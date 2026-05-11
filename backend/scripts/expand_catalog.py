"""Procedural catalog expansion: 84 hero items -> ~3,000 SKUs.

For each hero item we generate the cross product of:
  * 3-5 size variants (compact / standard / large; sometimes XS / XL)
  * 4-7 material variants (only those listed for the item in the legacy)
  * vibe inferred from the material (warm_traditional / modern_minimal / etc)

Each variant has:
  * a unique SKU (e.g. SOFA-3SEAT-LIN-LARGE-TEAK)
  * scaled dimensions (size_variant.scale × original)
  * material-adjusted price (legacy material costMultiplier)
  * a deterministic vibe tag based on the material

This is a one-shot migration; idempotent — overwrites backend/data/catalog.json.
"""
from __future__ import annotations

import json
from pathlib import Path

# ---------- Paths ----------

ROOT = Path(__file__).resolve().parents[2]
SOURCE_JSON = ROOT / "backend" / "data" / "catalog_hero.json"
OUT = ROOT / "backend" / "data" / "catalog.json"

# ---------- Material catalog (lifted from legacy) ----------

MATERIALS: dict[str, dict] = {
    "fabric_cotton": {"label": "Cotton", "mult": 1.00, "vibes": ["warm_traditional", "earthy_crafted"]},
    "fabric_linen": {"label": "Linen", "mult": 1.30, "vibes": ["light_airy", "modern_minimal"]},
    "fabric_velvet": {"label": "Velvet", "mult": 1.60, "vibes": ["warm_traditional"]},
    "fabric_silk_blend": {"label": "Silk Blend", "mult": 2.00, "vibes": ["warm_traditional"]},
    "fabric_jute": {"label": "Jute", "mult": 0.85, "vibes": ["earthy_crafted"]},
    "leather_pu": {"label": "PU Leather", "mult": 1.80, "vibes": ["modern_minimal"]},
    "leather_genuine": {"label": "Genuine Leather", "mult": 3.00, "vibes": ["modern_minimal", "warm_traditional"]},
    "wood_teak": {"label": "Teak", "mult": 1.00, "vibes": ["warm_traditional"]},
    "wood_oak": {"label": "Oak", "mult": 1.15, "vibes": ["light_airy"]},
    "wood_walnut": {"label": "Walnut", "mult": 1.30, "vibes": ["warm_traditional", "modern_minimal"]},
    "wood_sheen": {"label": "Sheesham", "mult": 1.25, "vibes": ["earthy_crafted"]},
    "wood_rosewood": {"label": "Rosewood", "mult": 1.60, "vibes": ["warm_traditional"]},
    "wood_mango": {"label": "Mango Wood", "mult": 0.80, "vibes": ["earthy_crafted"]},
    "white_laminate": {"label": "White Laminate", "mult": 0.90, "vibes": ["modern_minimal", "light_airy"]},
    "grey_laminate": {"label": "Grey Laminate", "mult": 0.90, "vibes": ["modern_minimal"]},
    "black_laminate": {"label": "Black Laminate", "mult": 0.95, "vibes": ["modern_minimal"]},
    "woodgrain_laminate": {"label": "Wood-Grain Laminate", "mult": 0.85, "vibes": ["warm_traditional"]},
    "metal_chrome": {"label": "Chrome", "mult": 1.00, "vibes": ["modern_minimal"]},
    "metal_brass": {"label": "Brass", "mult": 1.40, "vibes": ["warm_traditional"]},
    "metal_matte_black": {"label": "Matte Black", "mult": 1.10, "vibes": ["modern_minimal"]},
    "marble_white": {"label": "White Marble", "mult": 2.00, "vibes": ["light_airy"]},
    "marble_beige": {"label": "Beige Marble", "mult": 1.80, "vibes": ["warm_traditional"]},
    "granite_black": {"label": "Black Granite", "mult": 1.50, "vibes": ["modern_minimal"]},
    "kota_stone": {"label": "Kota Stone", "mult": 0.70, "vibes": ["earthy_crafted"]},
    "tile_ceramic": {"label": "Ceramic Tile", "mult": 1.00, "vibes": ["light_airy"]},
    "tile_vitrified": {"label": "Vitrified Tile", "mult": 1.20, "vibes": ["modern_minimal"]},
}

# Color hex per material — used by the renderer to tint the GLB.
MATERIAL_HEX: dict[str, str] = {
    "fabric_cotton": "#D4C5B2", "fabric_linen": "#E8DFD2", "fabric_velvet": "#2D4A3A",
    "fabric_silk_blend": "#C9A96E", "fabric_jute": "#C4A882",
    "leather_pu": "#3E2723", "leather_genuine": "#4E342E",
    "wood_teak": "#8B6914", "wood_oak": "#D2B48C", "wood_walnut": "#5C4033",
    "wood_sheen": "#6B4226", "wood_rosewood": "#4A0000", "wood_mango": "#D4A054",
    "white_laminate": "#F5F5F5", "grey_laminate": "#808080", "black_laminate": "#2C2C2C",
    "woodgrain_laminate": "#A0845C",
    "metal_chrome": "#C0C0C0", "metal_brass": "#B5A642", "metal_matte_black": "#1A1A1A",
    "marble_white": "#F0ECE4", "marble_beige": "#E8DCC8", "granite_black": "#2D2D2D",
    "kota_stone": "#8B8B7A", "tile_ceramic": "#E0D8CC", "tile_vitrified": "#D5CFC4",
}

# ---------- Size variants per category ----------

# Each tuple: (label_suffix, scale_w, scale_d, scale_h, price_mult)
SIZE_VARIANTS: dict[str, list[tuple[str, float, float, float, float]]] = {
    "seating": [
        ("Compact", 0.85, 0.95, 1.00, 0.85),
        ("Standard", 1.00, 1.00, 1.00, 1.00),
        ("Large", 1.15, 1.05, 1.00, 1.20),
        ("XL", 1.30, 1.10, 1.00, 1.40),
    ],
    "sleeping": [
        ("Single", 0.55, 1.00, 1.00, 0.65),
        ("Double", 0.85, 1.00, 1.00, 0.85),
        ("Queen", 1.00, 1.00, 1.00, 1.00),
        ("King", 1.20, 1.05, 1.00, 1.25),
    ],
    "storage": [
        ("Compact", 0.80, 1.00, 0.85, 0.80),
        ("Standard", 1.00, 1.00, 1.00, 1.00),
        ("Tall", 1.00, 1.00, 1.20, 1.15),
        ("Wide", 1.30, 1.00, 1.00, 1.25),
        ("XL", 1.30, 1.00, 1.20, 1.45),
    ],
    "dining": [
        ("2-Seater", 0.70, 0.85, 1.00, 0.75),
        ("4-Seater", 0.85, 0.95, 1.00, 0.90),
        ("6-Seater", 1.00, 1.00, 1.00, 1.00),
        ("8-Seater", 1.25, 1.05, 1.00, 1.30),
    ],
    "mandir": [
        ("Compact", 0.85, 0.95, 1.00, 0.85),
        ("Standard", 1.00, 1.00, 1.00, 1.00),
        ("Statement", 1.20, 1.10, 1.10, 1.30),
    ],
    "kitchen": [
        ("Standard", 1.00, 1.00, 1.00, 1.00),
        ("Wide", 1.30, 1.00, 1.00, 1.25),
        ("L-Shape", 1.50, 1.40, 1.00, 1.55),
    ],
    "work": [
        ("Compact", 0.85, 0.95, 1.00, 0.85),
        ("Standard", 1.00, 1.00, 1.00, 1.00),
        ("Executive", 1.25, 1.10, 1.00, 1.25),
        ("L-Shape", 1.50, 1.40, 1.00, 1.55),
    ],
    "decor": [
        ("Standard", 1.00, 1.00, 1.00, 1.00),
    ],
    "fixture": [
        ("Standard", 1.00, 1.00, 1.00, 1.00),
        ("Large", 1.20, 1.20, 1.00, 1.20),
    ],
}

# Finish variants — applied as a third axis for wood/laminate-eligible items.
# Pure tonal variation; same .glb is rendered with different roughness/sheen.
FINISH_VARIANTS: dict[str, list[tuple[str, float, float]]] = {
    # category -> [(label, price_mult, roughness_hint)]
    "seating": [("Matte", 1.00, 0.85), ("Satin", 1.05, 0.55)],
    "sleeping": [("Matte", 1.00, 0.85), ("Satin", 1.08, 0.55)],
    "storage": [("Matte", 1.00, 0.85), ("Satin", 1.08, 0.55), ("High-gloss", 1.15, 0.20)],
    "dining": [("Matte", 1.00, 0.85), ("Satin", 1.05, 0.55)],
    "mandir": [("Matte", 1.00, 0.85), ("Polished", 1.12, 0.30)],
    "kitchen": [("Matte", 1.00, 0.85), ("High-gloss", 1.15, 0.20)],
    "work": [("Matte", 1.00, 0.85), ("Satin", 1.05, 0.55)],
    "decor": [("Standard", 1.00, 0.70)],
    "fixture": [("Matte", 1.00, 0.85), ("Polished", 1.10, 0.30)],
}


def _allowed_materials_for(item_materials: list[str], category: str) -> list[str]:
    """Pick the subset of MATERIALS we'll generate variants for. We honor the
    legacy item's listed materials but cap at 5-6 to avoid combinatorial blow."""
    if not item_materials:
        # Items with empty materials (plants, mirrors) — single material variant.
        return ["wood_teak"] if category in {"storage", "seating"} else ["metal_chrome"]
    keep: list[str] = []
    for m in item_materials:
        if m in MATERIALS and m not in keep:
            keep.append(m)
        if len(keep) >= 6:
            break
    return keep or ["wood_teak"]


def _vibe_for(material: str) -> list[str]:
    return MATERIALS.get(material, {}).get("vibes", ["warm_traditional", "modern_minimal"])


def main() -> None:
    raw = json.loads(SOURCE_JSON.read_text(encoding="utf-8"))
    print(f"loaded {len(raw)} hero items from catalog.json")

    out: list[dict] = []
    seen_skus: set[str] = set()

    for hero in raw:
        category = hero["category"]
        sub = hero["sub_category"]
        sizes = SIZE_VARIANTS.get(category, SIZE_VARIANTS["decor"])
        materials = _allowed_materials_for(hero.get("materials", []), category)

        base_w = hero["dimensions"]["width_mm"]
        base_d = hero["dimensions"]["depth_mm"]
        base_h = hero["dimensions"]["height_mm"]
        base_price = hero["price_inr"]

        # The hero's existing SKU prefix; e.g. "SOFA" for sub_category "sofa".
        sub_token = sub.upper().replace("_", "")
        # Stable deduper from the original numeric id at the end of the SKU.
        legacy_id = hero["sku"].rsplit("-", 1)[-1]

        finishes = FINISH_VARIANTS.get(category, FINISH_VARIANTS["decor"])
        for size_label, sw, sd, sh, sp in sizes:
            for mat in materials:
                mat_label = MATERIALS[mat]["label"]
                mat_mult = MATERIALS[mat]["mult"]
                for finish_label, finish_mult, roughness in finishes:
                    w_mm = int(round(base_w * sw))
                    d_mm = int(round(base_d * sd))
                    h_mm = int(round(base_h * sh))
                    price = int(round(base_price * sp * mat_mult * finish_mult))
                    build = int(round(price * 0.65)) if hero.get("build_price_inr") else None

                    size_token = size_label.upper().replace(" ", "").replace("-", "")[:8]
                    mat_token = mat.upper().replace("_", "").replace("FABRIC", "F").replace(
                        "WOOD", "W"
                    ).replace("LAMINATE", "L").replace("METAL", "M").replace("LEATHER", "LE").replace(
                        "MARBLE", "MA"
                    ).replace("GRANITE", "G").replace("STONE", "S").replace("TILE", "T")[:6]
                    finish_token = finish_label[:3].upper()
                    sku = f"{sub_token}-{legacy_id}-{size_token}-{mat_token}-{finish_token}"
                    if sku in seen_skus:
                        continue
                    seen_skus.add(sku)

                    # Vibes: combination of inherited (from hero) + material-driven.
                    vibes = sorted(set([*_vibe_for(mat), *(hero.get("vibes") or [])])) or hero.get("vibes")

                    out.append(
                        {
                            "sku": sku,
                            "asset_url": hero["asset_url"],
                            "name_en": _name_for(hero["name_en"], size_label, mat_label, finish_label),
                            "name_hi": hero.get("name_hi"),
                            "category": category,
                            "sub_category": sub,
                            "rooms": hero["rooms"],
                            "vibes": vibes,
                            "dimensions": {
                                "width_mm": w_mm,
                                "depth_mm": d_mm,
                                "height_mm": h_mm,
                            },
                            "price_inr": price,
                            "build_price_inr": build,
                            "materials": [mat],
                            "tags": [*hero.get("tags", []), size_label.lower(), mat_label.lower(), finish_label.lower()],
                            "tint_hex": MATERIAL_HEX.get(mat, "#A89A8C"),
                            "size_label": size_label,
                            "material_label": mat_label,
                            "finish_label": finish_label,
                            "roughness_hint": roughness,
                        }
                    )

    OUT.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {len(out)} expanded SKUs -> {OUT}")
    print(f"  unique categories: {len({i['category'] for i in out})}")
    print(f"  unique sub_categories: {len({i['sub_category'] for i in out})}")


def _name_for(base: str, size_label: str, mat_label: str, finish_label: str) -> str:
    # "3-Seater Sofa" + Large + Teak + Matte -> "Large 3-Seater Sofa in Matte Teak"
    finish_prefix = "" if finish_label.lower() in {"standard", "matte"} else f"{finish_label} "
    if size_label.lower() in {"standard", "queen"} and "Sofa" in base:
        return f"{base} in {finish_prefix}{mat_label}".strip()
    return f"{size_label} {base} in {finish_prefix}{mat_label}".strip()


if __name__ == "__main__":
    main()
