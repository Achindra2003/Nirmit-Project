"""Pick the best Sweet Home 3D models per sub_category and write
curated_manifest.json in the format generate_preset_catalogs.py already consumes.

Why a new script instead of editing curate_catalog.py:
  The old picker matched against 3D-Front, where category was inferred from
  filename prefix. SH3D ships a *real* taxonomy ("Living room", "Bedroom", etc.)
  per model plus a real model name — so we can filter by category AND match the
  name against a regex, which is much more accurate than dim-score alone.

Input:
  backend/app/domain/catalog/sweethome3d_manifest.json  (built by convert_sh3d.mjs)
Output:
  backend/app/domain/catalog/curated_manifest.json      (consumed by generate_preset_catalogs.py)

Run (from backend/):
    python -m scripts.curate_from_sh3d
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

# Windows consoles default to cp1252 and crash on U+FFFD characters that show
# up in some SH3D model names. Reconfigure stdout/stderr to UTF-8 so we can
# print SH3D names without hitting UnicodeEncodeError mid-run (which used to
# strand the manifest in a stale half-written state).
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

BACKEND_DIR = Path(__file__).resolve().parents[1]
SH3D_MANIFEST = BACKEND_DIR / "app" / "domain" / "catalog" / "sweethome3d_manifest.json"
CURATED_MANIFEST_OUT = BACKEND_DIR / "app" / "domain" / "catalog" / "curated_manifest.json"

# How many distinct picks to keep per sub_category. Three covers
# gathering/breath/keeper variants per the philosophy mapping in
# generate_preset_catalogs.py; the fourth is insurance.
PICKS_PER_SUB = 4

# Per sub_category: target dims (mm), allowed SH3D categories, name regex,
# optional name *exclusion* regex (to skip kid beds when looking for queen beds, etc.)
TARGETS: dict[str, dict] = {
    "sofa":         dict(target=(2200,  850,  900),
                         sh3d_cats=["Living room"],
                         name_re=r"\bsofa\b|\bcouch\b|\bsettee\b|\bchesterfield\b",
                         name_exclude=r"chair|stool"),
    "diwan":        dict(target=(2000,  700,  900),
                         sh3d_cats=["Living room", "Bedroom"],
                         name_re=r"diwan|daybed|chaise|chesterfield|day bed",
                         name_exclude=None),
    "coffee_table": dict(target=(1100,  450,  600),
                         sh3d_cats=["Living room"],
                         name_re=r"coffee\s*table|cocktail\s*table|center\s*table|low\s*table",
                         name_exclude=None),
    "side_table":   dict(target=( 535,  500,  386),
                         sh3d_cats=["Living room", "Bedroom"],
                         name_re=r"side\s*table|end\s*table|nightstand|bedside|night\s*table",
                         name_exclude=None),
    "tv_unit":      dict(target=(1800,  526,  465),
                         sh3d_cats=["Living room"],
                         name_re=r"tv\s*(unit|console|stand|cabinet|shelf)|television\s*(unit|console|stand|cabinet)|media\s*(unit|console|center)|entertainment\s*(unit|center)|hifi",
                         name_exclude=r"tv\s*16|television\s+set|screen|monitor"),
    "bookshelf":    dict(target=(1663, 1863,  331),
                         sh3d_cats=["Living room", "Office", "Bedroom"],
                         name_re=r"bookshelf|bookcase|library|\bshelf|étagère|etagere",
                         name_exclude=r"closet"),
    "wardrobe":     dict(target=(1200, 2100,  600),
                         sh3d_cats=["Bedroom"],
                         name_re=r"wardrobe|armoire|closet|cupboard",
                         name_exclude=None),
    "cabinet":      dict(target=( 800, 1200,  400),
                         sh3d_cats=["Living room", "Bedroom", "Office"],
                         name_re=r"\bcabinet\b|cupboard|storage\s*unit",
                         name_exclude=r"wardrobe|kitchen|bathroom|upper|lower|overhead|wall\s*cabinet|hifi|tv|nightstand|bedside|washbasin|sink|toilet"),
    "chest":        dict(target=(1000,  820,  520),
                         sh3d_cats=["Bedroom"],
                         name_re=r"\bchest\b|\bdresser\b|drawer",
                         name_exclude=r"trunk"),
    "sideboard":    dict(target=(1500,  850,  420),
                         sh3d_cats=["Living room", "Dining"],
                         name_re=r"sideboard|buffet|credenza|console\s*table",
                         name_exclude=None),
    "desk":         dict(target=(1200,  750,  600),
                         sh3d_cats=["Office", "Bedroom"],
                         name_re=r"\bdesk\b|workstation|writing\s*table|study\s*table",
                         name_exclude=None),
    "lounge_chair": dict(target=( 804,  640,  705),
                         sh3d_cats=["Living room", "Bedroom"],
                         name_re=r"armchair|lounge\s*chair|club\s*chair|wingback|recliner|easy\s*chair",
                         name_exclude=r"office|desk|stool"),
    "desk_chair":   dict(target=( 600,  900,  600),
                         sh3d_cats=["Office"],
                         name_re=r"office\s*chair|desk\s*chair|swivel|task\s*chair",
                         name_exclude=None),
    "dining_chair": dict(target=( 480,  920,  520),
                         sh3d_cats=["Living room", "Dining"],
                         name_re=r"dining\s*chair|^chair$|wooden\s*chair|plastic\s*chair|oak\s*chair|metal\s*chair",
                         name_exclude=r"lounge|arm|sofa|office|stool|rocking|bar|baby|child|task"),
    "dining_table": dict(target=(1500,  750,  950),
                         sh3d_cats=["Living room", "Dining"],
                         name_re=r"dining\s*table|kitchen\s*table|rectangular\s*table|round\s*table|wood\s*table|oak\s*table|\btable\b",
                         name_exclude=r"coffee|side|end|night|console|bedside|tea|pool|football|tennis|technical|fan|tablecloth|footrest|cuisine|gnome"),
    "bed_queen":    dict(target=(1623,  600, 2050),
                         sh3d_cats=["Bedroom"],
                         name_re=r"\bbed\b|queen\s*bed|double\s*bed",
                         name_exclude=r"baby|kid|crib|single|bedside|bunk"),
    "bed_king":     dict(target=(1800,  600, 2050),
                         sh3d_cats=["Bedroom"],
                         name_re=r"\bbed\b|king\s*bed",
                         name_exclude=r"baby|kid|crib|single|bedside|bunk"),
    "bed_single":   dict(target=( 900,  500, 1900),
                         sh3d_cats=["Bedroom"],
                         name_re=r"single\s*bed|twin\s*bed",
                         name_exclude=r"crib|baby|bedside|bunk"),
    "lamp":         dict(target=( 400, 1673,  400),
                         sh3d_cats=["Living room", "Bedroom", "Lights"],
                         name_re=r"floor\s*lamp|standing\s*lamp|tall\s*lamp|halogen|tripod\s*lamp",
                         name_exclude=r"table\s*lamp|desk\s*lamp|pendant|ceiling|shelf|shelves|bookcase|ladder|wall|chair|clock|guitar|cushion"),
    # ── Designer additions (2026-05-22) ───────────────────────────────────
    "sofa_l":       dict(target=(2400, 800, 1500),
                         sh3d_cats=["Living room"],
                         name_re=r"corner\s*sofa|sectional|l[\s-]?shape|l[\s-]?sofa",
                         name_exclude=r"chair"),
    "sofa_2seat":   dict(target=(1600, 850,  800),
                         sh3d_cats=["Living room"],
                         name_re=r"loveseat|two\s*seat|2[\s-]?seat|small\s*sofa",
                         name_exclude=r"chair|3"),
    "accent_chair": dict(target=( 800, 900,  800),
                         sh3d_cats=["Living room", "Bedroom"],
                         name_re=r"armchair|club\s*chair|wingback|accent\s*chair",
                         name_exclude=r"office|desk|swivel|stool|task"),
    "pouffe":       dict(target=( 450, 470,  450),
                         sh3d_cats=["Living room", "Bedroom"],
                         name_re=r"\bstool\b|ottoman|pouffe|pouf|foot\s*rest|footstool",
                         name_exclude=r"bar|piano|kitchen|shower|chair"),
    "bench":        dict(target=(1300, 500,  500),
                         sh3d_cats=["Bedroom", "Living room"],
                         name_re=r"\bbench\b",
                         name_exclude=r"workbench|abdominal|gym|piano|garden|park"),
    "mirror":       dict(target=( 600, 900,   30),
                         sh3d_cats=["Bedroom", "Living room", "Bathroom"],
                         name_re=r"\bmirror\b",
                         name_exclude=r"car|side|vanity"),
    # ── Expansion (2026-05-23): unlock the SH3D back catalogue ───────────
    # Reach was 25 sub_cats while 834 furniture GLBs sat unused. These add
    # rug/plant/art/lighting/storage variety so the planner's add-drawer feels
    # like a designer's swatch book, not a 5-item leaflet.
    "rug":            dict(target=(2000,   10, 1400),
                           sh3d_cats=["Living room", "Bedroom", "Miscellaneous"],
                           name_re=r"\brug\b|\bcarpet\b",
                           name_exclude=r"bath|door|car"),
    "plant":          dict(target=( 500, 1200,  500),
                           sh3d_cats=["Living room", "Bedroom", "Exterior", "Miscellaneous"],
                           name_re=r"\bplant\b|flower\s*pot|potted|ficus|bonsai|palm\s*tree",
                           name_exclude=r"factory|industrial|wall|cat\s*tree"),
    "wall_art":       dict(target=( 700,   30,  500),
                           sh3d_cats=["Living room", "Bedroom", "Office", "Miscellaneous"],
                           name_re=r"\bframe\s+\w|\bpainting\b|\bposter\b|wall\s*art|\bpicture\b",
                           name_exclude=r"door|window|bed\s*frame|chair|car|light|mule"),
    "dressing_table": dict(target=(1100,  760,  500),
                           sh3d_cats=["Bedroom"],
                           name_re=r"dressing\s*table|makeup\s*table|vanity\s*table",
                           name_exclude=r"toilet|sink|car|double|bath"),
    "desk_lamp":      dict(target=( 200,  450,  200),
                           sh3d_cats=["Lights", "Office", "Bedroom"],
                           name_re=r"desk\s*lamp|table\s*lamp|study\s*lamp|reading\s*lamp",
                           name_exclude=r"floor|standing|pendant|ceiling|wall"),
    "pendant_light":  dict(target=( 400,  500,  400),
                           sh3d_cats=["Lights"],
                           name_re=r"pendant|chandelier|hanging\s*lamp",
                           name_exclude=r"floor|table|desk|wall"),
    "floating_shelf": dict(target=(1200,   30,  300),
                           sh3d_cats=["Living room", "Office", "Bedroom"],
                           name_re=r"^shelf|^shelves|floating\s*shelf|wall\s*shelf|corner\s*shelf|maple\s*shelf",
                           name_exclude=r"bookcase|cabinet|kitchen|tv\s*shelf"),
    "fireplace":      dict(target=(1200, 1100,  400),
                           sh3d_cats=["Living room"],
                           name_re=r"fireplace|fire\s*place|hearth",
                           name_exclude=r"outdoor|garden|chimney"),
}


def dim_score(native: dict, target: tuple[int, int, int]) -> float:
    w0, h0, d0 = native["width"], native["height"], native["depth"]
    w1, h1, d1 = target
    if w0 < 1 or h0 < 1 or d0 < 1:
        return float("inf")
    return ((w0 - w1) / w1) ** 2 + ((h0 - h1) / h1) ** 2 + ((d0 - d1) / d1) ** 2


def name_score(name: str, name_re: str, name_exclude: str | None) -> float:
    """Lower is better. 0 if name matches; +1 if excluded; +2 if no match at all."""
    n = name.lower()
    if name_exclude and re.search(name_exclude, n):
        return 5.0
    if re.search(name_re, n):
        return 0.0
    return 2.0


def category_score(sh3d_cat: str, allowed: list[str]) -> float:
    return 0.0 if sh3d_cat in allowed else 1.0


def score(item: dict, target_spec: dict) -> float:
    return (
        dim_score(item["native_dims_mm"], target_spec["target"])
        + name_score(item["name_en"], target_spec["name_re"], target_spec.get("name_exclude"))
        + category_score(item["category_sh3d"], target_spec["sh3d_cats"])
    )


def main() -> None:
    if not SH3D_MANIFEST.exists():
        raise SystemExit(
            f"Missing SH3D manifest at {SH3D_MANIFEST}\nRun `node backend/scripts/convert_sh3d.mjs` first."
        )
    sh3d = json.loads(SH3D_MANIFEST.read_text(encoding="utf-8"))
    items = sh3d["items"]
    print(f"[curate_from_sh3d] {len(items)} SH3D models available")

    out_items: list[dict] = []
    for sub, spec in TARGETS.items():
        # Reject items that don't actually match the name regex — they tank the
        # quality of niche sub_cats (was picking "PWD symbol" / "Dress" /
        # "Skirt" as rugs/art/shelves because dim_score alone is permissive).
        eligible = [
            it for it in items
            if not it["door_or_window"]
            and name_score(it["name_en"], spec["name_re"], spec.get("name_exclude")) == 0.0
        ]
        ranked = sorted(eligible, key=lambda it: score(it, spec))
        seen_ids: set[str] = set()
        picks: list[dict] = []
        for it in ranked:
            if it["source_id"] in seen_ids:
                continue
            picks.append(it)
            seen_ids.add(it["source_id"])
            if len(picks) >= PICKS_PER_SUB:
                break

        target = spec["target"]
        print(f"\n  {sub:14s}  target {target[0]:>5d} x {target[1]:>4d} x {target[2]:>4d}")
        if not picks:
            print(f"    -- NO MATCHES")
            continue
        for idx, p in enumerate(picks):
            nd = p["native_dims_mm"]
            sc = round(score(p, spec), 3)
            print(
                f"    v{idx+1}  {nd['width']:>5d} x {nd['height']:>4d} x {nd['depth']:>4d}  "
                f"score={sc:>5.2f}  [{p['category_sh3d']:12s}]  {p['name_en'][:40]}"
            )
            out_items.append({
                "sku": f"{sub}_v{idx+1}",
                "sub_category": sub,
                "asset_url": p["asset_url"],
                "native_dims_mm": [nd["width"], nd["height"], nd["depth"]],
                "target_dims_mm": list(target),
                "source_sku": p["sku"],
                "source_pack": p["source_pack"],
                "source_name": p["name_en"],
                "source_category": p["category_sh3d"],
                "license": p["license"],
                "creator": p["creator"],
                "score": sc,
            })

    out = {"generated_at": sh3d.get("generated_at"), "items": out_items}
    CURATED_MANIFEST_OUT.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"\n[curate_from_sh3d] wrote {len(out_items)} curated picks to {CURATED_MANIFEST_OUT}")


if __name__ == "__main__":
    main()
