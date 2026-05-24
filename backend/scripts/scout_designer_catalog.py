"""Hunt sh3d manifest for best models per designer sub_category.
Output a dict {sub_category: [shortlist of (sku, name, dims) ...]} so the next
wave (catalog re-curation) can hand-pick from a curated short list rather than
re-grepping 1509 items each time.

Run from backend/:  python scripts/scout_designer_catalog.py
"""
from __future__ import annotations
import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
MANIFEST = REPO / "app" / "domain" / "catalog" / "sweethome3d_manifest.json"

# ── Sub-category recipes ───────────────────────────────────────────────────
# Each recipe: name-pattern (regex, case-insensitive) + tag hints + dim bounds.
# Dim bounds: width / depth / height in mm; None = no bound.
# 'reject' patterns kill bad matches (e.g. "toy sofa", "doll bed").

RECIPES = {
    # SEATING
    "sofa_l": dict(
        patterns=[r"sectional", r"l[\s_-]?shape", r"corner.{0,6}sofa", r"sofa.{0,6}corner", r"l[\s_-]?sofa"],
        w_min=2000, w_max=3400, d_min=900, d_max=2400,
    ),
    "sofa_3seat": dict(
        patterns=[r"\bsofa\b", r"couch", r"3[\s_-]?seat", r"three.{0,6}seat"],
        reject=[r"sectional", r"l[\s_-]?shape", r"corner", r"single", r"loveseat", r"single_seat"],
        w_min=1800, w_max=2400, d_min=700, d_max=1100,
    ),
    "sofa_2seat": dict(
        patterns=[r"loveseat", r"two[\s_-]?seat", r"2[\s_-]?seat"],
        w_min=1200, w_max=1800, d_min=700, d_max=1100,
    ),
    "diwan_daybed": dict(
        patterns=[r"diwan", r"daybed", r"day[\s_-]bed", r"chaise", r"divan"],
        w_min=1500, w_max=2200, d_min=600, d_max=1100,
    ),
    "accent_chair": dict(
        patterns=[r"armchair", r"accent.{0,6}chair", r"easy[\s_-]chair", r"club[\s_-]chair"],
        reject=[r"office", r"desk", r"task", r"swivel", r"executive", r"computer"],
        w_min=550, w_max=1000, d_min=550, d_max=1000,
    ),
    "lounge_chair": dict(
        patterns=[r"lounge", r"recliner", r"reading.{0,6}chair"],
        w_min=600, w_max=1000,
    ),
    "ottoman": dict(
        patterns=[r"ottoman", r"footstool", r"foot[\s_-]rest", r"pouf+e?"],
        w_min=300, w_max=900, d_min=300, d_max=800,
    ),
    "bench": dict(
        patterns=[r"bench"],
        reject=[r"park", r"garden", r"outdoor", r"weight", r"gym"],
        w_min=800, w_max=1800, d_min=300, d_max=600,
    ),
    "dining_chair": dict(
        patterns=[r"dining.{0,6}chair", r"\bchair\b"],
        reject=[r"office", r"desk", r"task", r"swivel", r"arm", r"lounge", r"executive", r"computer", r"baby", r"high.{0,4}chair", r"bar.{0,4}stool", r"rocking", r"folding", r"camping", r"deck"],
        w_min=380, w_max=600, d_min=380, d_max=650,
    ),
    "bar_stool": dict(
        patterns=[r"bar[\s_-]?stool", r"counter[\s_-]?stool"],
        w_min=350, w_max=600,
    ),
    "desk_chair": dict(
        patterns=[r"office.{0,6}chair", r"desk.{0,6}chair", r"task.{0,6}chair", r"swivel"],
        w_min=500, w_max=750,
    ),

    # TABLES
    "coffee_table": dict(
        patterns=[r"coffee", r"centre.{0,6}table", r"center.{0,6}table"],
        w_min=700, w_max=1500, d_min=400, d_max=900, h_max=550,
    ),
    "side_table": dict(
        patterns=[r"side.{0,6}table", r"end.{0,6}table", r"accent.{0,6}table", r"bedside", r"night.{0,6}stand", r"nightstand"],
        reject=[r"console", r"dining"],
        w_min=300, w_max=700, d_min=300, d_max=600,
    ),
    "console_table": dict(
        patterns=[r"console", r"sofa.{0,6}table", r"hallway.{0,6}table", r"entryway"],
        w_min=800, w_max=1800, d_min=250, d_max=500,
    ),
    "dining_table": dict(
        patterns=[r"dining.{0,6}table", r"kitchen.{0,6}table"],
        reject=[r"coffee", r"console"],
        w_min=900, w_max=2200, d_min=700, d_max=1200, h_min=650, h_max=850,
    ),
    "desk": dict(
        patterns=[r"\bdesk\b", r"writing.{0,6}table", r"work.{0,6}table", r"study.{0,6}table"],
        w_min=900, w_max=1800, d_min=450, d_max=900, h_min=650, h_max=850,
    ),

    # SLEEPING
    "bed_queen": dict(
        patterns=[r"queen.{0,6}bed", r"\bbed\b"],
        reject=[r"single", r"twin", r"king", r"baby", r"toddler", r"crib", r"sofa", r"daybed", r"rocking", r"hospital"],
        w_min=1500, w_max=2000, d_min=1900, d_max=2300,
    ),
    "bed_king": dict(
        patterns=[r"king.{0,6}bed", r"king[\s_-]size"],
        w_min=1800, w_max=2200, d_min=2000, d_max=2400,
    ),
    "bed_single": dict(
        patterns=[r"single.{0,6}bed", r"twin.{0,6}bed"],
        w_min=800, w_max=1100, d_min=1800, d_max=2200,
    ),

    # STORAGE
    "wardrobe": dict(
        patterns=[r"wardrobe", r"armoire", r"closet", r"almirah"],
        w_min=700, w_max=2400, d_min=500, d_max=750, h_min=1700,
    ),
    "chest": dict(
        patterns=[r"chest", r"dresser", r"commode"],
        reject=[r"medicine", r"tool"],
        w_min=700, w_max=1400, d_min=350, d_max=550, h_min=600, h_max=1300,
    ),
    "bookshelf": dict(
        patterns=[r"bookshelf", r"book[\s_-]?case", r"book[\s_-]?shelf", r"shelf", r"shelving"],
        reject=[r"kitchen", r"bathroom", r"tv"],
        w_min=600, w_max=2000, d_min=250, d_max=500, h_min=1200,
    ),
    "sideboard": dict(
        patterns=[r"sideboard", r"buffet", r"credenza"],
        w_min=1200, w_max=2200, d_min=400, d_max=600,
    ),
    "cabinet": dict(
        patterns=[r"cabinet", r"cupboard"],
        reject=[r"kitchen", r"bathroom", r"medicine", r"tv", r"file"],
        w_min=700, w_max=1600, d_min=350, d_max=550,
    ),
    "tv_unit": dict(
        patterns=[r"tv[\s_-]?stand", r"tv[\s_-]?unit", r"tv[\s_-]?cabinet", r"media[\s_-]?center", r"entertainment"],
        w_min=1000, w_max=2200, d_min=350, d_max=600,
    ),
    "vanity": dict(
        patterns=[r"vanity", r"dressing.{0,6}table", r"makeup.{0,6}table", r"dresser.{0,6}mirror"],
        w_min=700, w_max=1400, d_min=350, d_max=600,
    ),

    # LIGHTING
    "floor_lamp": dict(
        patterns=[r"floor.{0,6}lamp", r"standing.{0,6}lamp", r"tall.{0,6}lamp"],
        h_min=1100,
    ),
    "table_lamp": dict(
        patterns=[r"table.{0,6}lamp", r"desk.{0,6}lamp"],
        h_min=300, h_max=900,
    ),
    "pendant_light": dict(
        patterns=[r"pendant", r"chandelier", r"ceiling.{0,6}light", r"hanging.{0,6}light"],
    ),

    # DECOR
    "wall_art": dict(
        patterns=[r"painting", r"\bart\b", r"picture", r"frame", r"poster", r"canvas"],
        reject=[r"frame.{0,6}door", r"door", r"window", r"chair", r"bed"],
        d_max=120,
    ),
    "mirror": dict(
        patterns=[r"mirror"],
        reject=[r"car", r"side[\s_-]mirror", r"vanity"],
        d_max=120,
    ),
    "rug": dict(
        patterns=[r"\brug\b", r"\bcarpet\b"],
        h_max=80,
    ),
    "plant": dict(
        patterns=[r"plant", r"flower", r"vase", r"\bpot\b"],
        reject=[r"cooking.{0,6}pot", r"flowerpot.{0,6}small", r"saucepan"],
    ),
    "curtain": dict(
        patterns=[r"curtain", r"drape"],
    ),
}


# ── Loader + matcher ───────────────────────────────────────────────────────


def _compile(p): return re.compile(p, re.IGNORECASE)


def load_manifest():
    return json.loads(MANIFEST.read_text(encoding="utf-8"))["items"]


def matches(item, recipe):
    name = (item.get("name_en") or "") + " " + " ".join(item.get("tags") or [])
    name_l = name.lower()
    pats = [_compile(p) for p in recipe.get("patterns", [])]
    if not any(p.search(name_l) for p in pats):
        return False
    for rp in recipe.get("reject", []):
        if _compile(rp).search(name_l):
            return False
    dims = item.get("native_dims_mm") or {}
    w, d, h = dims.get("width", 0), dims.get("depth", 0), dims.get("height", 0)
    bounds = [
        ("w_min", w, lambda v, b: v >= b),
        ("w_max", w, lambda v, b: v <= b),
        ("d_min", d, lambda v, b: v >= b),
        ("d_max", d, lambda v, b: v <= b),
        ("h_min", h, lambda v, b: v >= b),
        ("h_max", h, lambda v, b: v <= b),
    ]
    for key, val, fn in bounds:
        if key in recipe and not fn(val, recipe[key]):
            return False
    return True


def score(item, recipe):
    """Lower is better — prefers items with shorter file sizes (cleaner)
    and dims closer to the recipe's mid-range."""
    s = item.get("glb_bytes", 999_999_999) / 1_000_000  # MB
    # prefer items whose dims sit near the centre of the band
    dims = item.get("native_dims_mm") or {}
    w, d = dims.get("width", 0), dims.get("depth", 0)
    if "w_min" in recipe and "w_max" in recipe:
        mid_w = (recipe["w_min"] + recipe["w_max"]) / 2
        s += abs(w - mid_w) / mid_w * 0.5
    if "d_min" in recipe and "d_max" in recipe:
        mid_d = (recipe["d_min"] + recipe["d_max"]) / 2
        s += abs(d - mid_d) / mid_d * 0.5
    return s


def main():
    items = load_manifest()
    print(f"# Scouted {len(items)} sh3d items across {len(RECIPES)} sub_categories\n")
    results = {}
    for sub, recipe in RECIPES.items():
        hits = [it for it in items if matches(it, recipe)]
        hits.sort(key=lambda it: score(it, recipe))
        results[sub] = hits[:12]   # top 12

    # Save full result for next wave
    out_path = REPO / "scripts" / "_designer_shortlist.json"
    serial = {
        sub: [
            {
                "sku": it["sku"],
                "name": it["name_en"],
                "asset": it["asset_url"],
                "dims": it["native_dims_mm"],
                "tags": it.get("tags", []),
            } for it in hits
        ] for sub, hits in results.items()
    }
    out_path.write_text(json.dumps(serial, indent=2), encoding="utf-8")
    print(f"# Wrote {out_path}\n")

    # Print summary
    for sub, hits in results.items():
        if not hits:
            print(f"  {sub:18s}  NONE FOUND")
            continue
        first = hits[0]
        dims = first["native_dims_mm"]
        print(f"  {sub:18s}  {len(hits):2d} hits  | top: {first['name_en'][:36]:36s} {dims['width']}x{dims['depth']}x{dims['height']}")


if __name__ == "__main__":
    main()
