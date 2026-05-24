"""Generate one curated catalog module per (room_type, philosophy).

WHAT CHANGED (2026-05-23)
-------------------------
This used to emit 24 files (one per preset) where each catalog only contained
the sub_categories the preset *placed*. That made the per-preset files unusable
as a "what can I add to this room" menu — they were placement specs in catalog
clothing.

Now: 12 files, one per (room_type, philosophy), each containing the full
curated menu from `app/domain/catalog/presets/menus.py`. Variant 0 and 1 of
the same philosophy share a menu (the variation between them is positional, not
material). `__init__.py` still exposes `get_preset_catalog(preset_id)` so the
resolver's contract is unchanged — preset_id is routed to its philosophy menu.

Inputs:
  * `app/domain/catalog/presets/menus.py` — sub_category lists per philosophy.
  * `app/domain/catalog/curated_manifest.json` — curated GLB picks per sub_category.
  * `app/domain/catalog/hero_catalog.py` — pricing/metadata reference.

Per-philosophy variant strategy (which curated GLB variant to use):
  gathering → v1 (best dimensional match)
  breath    → v2 (alternate, often visually lighter)
  keeper    → v3 (third pick, often chunkier storage-leaning piece)

Run (from backend/):
    python -m scripts.generate_preset_catalogs
"""
from __future__ import annotations

import json
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
MANIFEST_PATH = BACKEND_DIR / "app" / "domain" / "catalog" / "curated_manifest.json"
PRESETS_OUT_DIR = BACKEND_DIR / "app" / "domain" / "catalog" / "presets"
INIT_OUT_PATH = PRESETS_OUT_DIR / "__init__.py"

PHILOSOPHY_VARIANT: dict[str, int] = {
    "gathering": 1,
    "breath": 2,
    "keeper": 3,
}


def _import_menus():
    from app.domain.catalog.presets.menus import MENUS, menu_id
    return MENUS, menu_id


def _import_layouts():
    from app.domain.presets.layouts import ALL_PRESETS
    return ALL_PRESETS


def _import_hero_pricing() -> dict[str, dict]:
    from app.domain.catalog.hero_catalog import HERO_ITEMS

    pricing: dict[str, dict] = {}
    for it in HERO_ITEMS:
        sub = it.sub_category
        if sub is None or sub in pricing:
            continue
        pricing[sub] = {
            "name_en": it.name_en,
            "name_hi": it.name_hi,
            "category": it.category,
            "rooms": [r.value if hasattr(r, "value") else r for r in it.rooms],
            "price_inr": it.price_inr,
            "build_price_inr": it.build_price_inr,
            "materials": list(it.materials),
            "tags": list(it.tags),
            "roughness_hint": it.roughness_hint,
            "front_clearance_mm": getattr(it, "front_clearance_mm", 600),
            "placement_type": it.placement_type,
        }
    return pricing


def _load_manifest() -> dict[str, list[dict]]:
    raw = json.loads(MANIFEST_PATH.read_text())
    by_sub: dict[str, list[dict]] = {}
    for item in raw["items"]:
        by_sub.setdefault(item["sub_category"], []).append(item)
    return by_sub


def _pick_for_philosophy(
    sub: str,
    philosophy: str,
    curated_by_sub: dict[str, list[dict]],
) -> dict | None:
    options = curated_by_sub.get(sub)
    if not options:
        return None
    want_variant = PHILOSOPHY_VARIANT.get(philosophy, 1)
    for opt in options:
        if opt["sku"] == f"{sub}_v{want_variant}":
            return opt
    return options[0]


def _emit_menu_module(
    menu_id_str: str,
    room_type: str,
    philosophy: str,
    sub_picks: list[tuple[str, dict, dict]],
) -> str:
    """Render the Python source for one per-philosophy catalog module.
    sub_picks: list of (sub_category, curated_pick, pricing_meta) tuples."""
    lines = [
        '"""Auto-generated curated menu. DO NOT EDIT BY HAND.',
        "Run scripts/generate_preset_catalogs.py to regenerate.",
        "",
        f"Menu: {menu_id_str}  (room_type={room_type}, philosophy={philosophy})",
        "Shared by both presets of this philosophy (variant 0 and variant 1).",
        "Sub_categories curated in menus.py; geometry from curated_manifest.json;",
        'pricing carried from hero_catalog.py."""',
        "from __future__ import annotations",
        "",
        "from app.domain.catalog.model import CatalogItem",
        "from app.schemas.state import Dimensions, RoomType",
        "",
        "CATALOG: dict[str, CatalogItem] = {",
    ]
    for sub, pick, meta in sub_picks:
        w, h, d = pick["native_dims_mm"]
        sku = f"{menu_id_str.upper().replace('_', '-')}-{sub.upper()}"
        rooms_repr = ", ".join(f"RoomType.{r.upper()}" for r in (meta["rooms"] or [room_type]))
        materials = meta["materials"] or []
        tags = (meta["tags"] or []) + ["curated"]
        name_hi = f'"{meta["name_hi"]}"' if meta["name_hi"] else "None"
        build_price = meta["build_price_inr"] if meta["build_price_inr"] is not None else "None"
        rough = meta["roughness_hint"] if meta["roughness_hint"] is not None else "None"
        lines.extend([
            f'    "{sub}": CatalogItem(',
            f'        sku="{sku}",',
            f'        asset_url="{pick["asset_url"]}",',
            f'        name_en="{meta["name_en"]}",',
            f"        name_hi={name_hi},",
            f'        category="{meta["category"]}",',
            f'        sub_category="{sub}",',
            f"        rooms=[{rooms_repr}],",
            f"        vibes=[],  # vibe-agnostic for now; preset philosophy drives selection",
            f"        dimensions=Dimensions(width_mm={w}, height_mm={h}, depth_mm={d}),",
            f"        price_inr={meta['price_inr']},",
            f"        build_price_inr={build_price},",
            f"        materials={materials!r},",
            f"        tags={tags!r},",
            f"        tint_hex=None,",
            f"        size_label=None,",
            f"        material_label=None,",
            f"        finish_label=None,",
            f"        roughness_hint={rough},",
            f"        front_clearance_mm={meta['front_clearance_mm']},",
            f'        placement_type="{meta["placement_type"]}",',
            f"    ),",
        ])
    lines += ["}", ""]
    return "\n".join(lines)


def _emit_init(
    menu_ids: list[str],
    preset_to_menu: dict[str, str],
) -> str:
    lines = [
        '"""Auto-generated catalog menu index.',
        "",
        "Twelve curated menus (one per room_type × philosophy) shared across the",
        "24 presets. `get_preset_catalog(preset_id)` routes a preset to its",
        'philosophy menu — variant 0 and variant 1 of the same philosophy share."""',
        "from __future__ import annotations",
        "",
        "from app.domain.catalog.model import CatalogItem",
        "",
    ]
    for mid in sorted(menu_ids):
        lines.append(f"from app.domain.catalog.presets.{mid} import CATALOG as _{mid}_catalog")
    lines += [
        "",
        "_MENUS: dict[str, dict[str, CatalogItem]] = {",
    ]
    for mid in sorted(menu_ids):
        lines.append(f'    "{mid}": _{mid}_catalog,')
    lines += [
        "}",
        "",
        "# preset_id (e.g. 'living_gathering_0') -> menu_id ('living_gathering')",
        "_PRESET_TO_MENU: dict[str, str] = {",
    ]
    for pid in sorted(preset_to_menu):
        lines.append(f'    "{pid}": "{preset_to_menu[pid]}",')
    lines += [
        "}",
        "",
        "",
        "def get_preset_catalog(preset_id: str) -> dict[str, CatalogItem]:",
        '    """Return the curated menu for the given preset_id.',
        "    Variant 0 and variant 1 of the same philosophy return the same menu.",
        '    Returns an empty dict if preset_id is unknown."""',
        "    mid = _PRESET_TO_MENU.get(preset_id)",
        "    if mid is None:",
        "        return {}",
        "    return _MENUS.get(mid, {})",
        "",
        "",
        "def get_menu(room_type: str, philosophy: str) -> dict[str, CatalogItem]:",
        '    """Return the curated menu for a (room_type, philosophy) pair.',
        '    Returns an empty dict if the pair has no curated menu."""',
        '    return _MENUS.get(f"{room_type}_{philosophy}", {})',
        "",
        "",
        "ALL_MENU_IDS = tuple(sorted(_MENUS.keys()))",
        "ALL_PRESET_IDS = tuple(sorted(_PRESET_TO_MENU.keys()))",
        "",
    ]
    return "\n".join(lines)


def main() -> None:
    if not MANIFEST_PATH.exists():
        raise SystemExit(
            f"Missing manifest: {MANIFEST_PATH}\nRun `python -m scripts.curate_catalog` first."
        )

    menus, menu_id_fn = _import_menus()
    presets = _import_layouts()
    pricing = _import_hero_pricing()
    curated_by_sub = _load_manifest()

    print(f"[generate_preset_catalogs] {len(menus)} menus, {len(presets)} presets")
    print(f"  pricing entries: {len(pricing)} sub_categories")
    print(f"  curated entries: {len(curated_by_sub)} sub_categories")

    PRESETS_OUT_DIR.mkdir(parents=True, exist_ok=True)

    # ── 1. Emit one module per (room_type, philosophy) ──────────────────────
    coverage = {"covered": 0, "missing_pricing": 0, "missing_curated": 0}
    skipped: set[str] = set()
    menu_ids: list[str] = []

    for (room_type, philosophy), subs in menus.items():
        mid = menu_id_fn(room_type, philosophy)
        sub_picks: list[tuple[str, dict, dict]] = []
        for sub in subs:
            pick = _pick_for_philosophy(sub, philosophy, curated_by_sub)
            meta = pricing.get(sub)
            if pick is None:
                coverage["missing_curated"] += 1
                skipped.add(f"{sub} (no curated mesh)")
                continue
            if meta is None:
                coverage["missing_pricing"] += 1
                skipped.add(f"{sub} (no pricing)")
                continue
            sub_picks.append((sub, pick, meta))
            coverage["covered"] += 1
        if not sub_picks:
            print(f"  [warn] {mid}: 0 items covered; skipping module")
            continue
        out = PRESETS_OUT_DIR / f"{mid}.py"
        out.write_text(
            _emit_menu_module(mid, room_type, philosophy, sub_picks), encoding="utf-8"
        )
        menu_ids.append(mid)

    # ── 2. Build preset_id -> menu_id map for the index ─────────────────────
    preset_to_menu: dict[str, str] = {}
    for (room_type, philosophy, _variant), layout in presets.items():
        preset_to_menu[layout.id] = menu_id_fn(room_type, philosophy)

    # ── 3. Remove legacy per-preset .py modules (those whose name is in
    # preset_to_menu but NOT in menu_ids — i.e. the old `*_0.py` / `*_1.py`
    # files that previously contained per-preset catalogs).
    keep = set(menu_ids) | {"menus", "__init__"}
    removed: list[str] = []
    for path in PRESETS_OUT_DIR.glob("*.py"):
        if path.stem in keep:
            continue
        path.unlink()
        removed.append(path.name)

    INIT_OUT_PATH.write_text(_emit_init(menu_ids, preset_to_menu), encoding="utf-8")

    print(f"\n[generate_preset_catalogs] wrote {len(menu_ids)} menu modules")
    print(f"  items covered: {coverage['covered']}")
    print(f"  items missing pricing: {coverage['missing_pricing']}")
    print(f"  items missing curated mesh: {coverage['missing_curated']}")
    if skipped:
        print(f"  skipped sub_categories: {sorted(skipped)}")
    if removed:
        print(f"  removed legacy modules: {len(removed)}")


if __name__ == "__main__":
    main()
