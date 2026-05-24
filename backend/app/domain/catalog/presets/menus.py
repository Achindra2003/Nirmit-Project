"""Curated furniture menus per (room_type, philosophy).

Each menu lists the sub_categories a designer would reach for in that room
character. The preset's anchored items (in layouts.py) are a SUBSET of the
menu — the menu is what the user/AI can pick from when ADDing furniture later.

Why this exists
---------------
The per-preset catalog files used to contain ONLY the items the preset placed
(5–7 SKUs). When the user opened the furniture drawer to add a chair, they
saw the *global* hero catalog (60+ items per room) — not the curated subset
that fits this room's character. The drawer became a warehouse list instead of
a designer's swatch book.

Now: one menu per (room_type, philosophy) = 12 menus shared across the 24
presets (variant 0 and variant 1 of the same philosophy share a menu).

Constraint: every sub_category here MUST exist in `curated_manifest.json`.
The 25 sub_categories that ship with a curated 3D-Front GLB are:

  accent_chair, bed_king, bed_queen, bed_single, bench, bookshelf, cabinet,
  chest, coffee_table, desk, desk_chair, dining_chair, dining_table, diwan,
  lamp, lounge_chair, mirror, pouffe, side_table, sideboard, sofa, sofa_2seat,
  sofa_l, tv_unit, wardrobe.

When adding new sub_cats to a menu, run `python -m scripts.curate_catalog`
first to confirm a curated GLB exists for it.
"""
from __future__ import annotations

# (room_type, philosophy) -> list of sub_categories the user can add to this room.
# Order matters: it's the display order in the drawer.
MENUS: dict[tuple[str, str], list[str]] = {
    # ─── LIVING ────────────────────────────────────────────────────────────
    ("living", "gathering"): [
        # The Indian family room — layered, multi-generational, many seats.
        "sofa", "sofa_l", "sofa_2seat", "diwan",
        "accent_chair", "lounge_chair", "pouffe", "bench",
        "coffee_table", "side_table",
        "tv_unit",
        "bookshelf", "sideboard", "cabinet", "floating_shelf",
        "lamp", "desk_lamp", "pendant_light",
        "mirror", "wall_art", "rug", "plant", "fireplace",
    ],
    ("living", "breath"): [
        # Restraint as luxury — fewer pieces, each a statement.
        "sofa", "sofa_2seat",
        "accent_chair", "lounge_chair",
        "coffee_table", "side_table",
        "tv_unit",
        "bookshelf", "floating_shelf",
        "lamp", "pendant_light",
        "mirror", "wall_art", "rug", "plant",
    ],
    ("living", "keeper"): [
        # Storage-as-architecture — every wall earns its keep.
        "sofa", "sofa_2seat",
        "accent_chair", "lounge_chair", "pouffe", "bench",
        "coffee_table", "side_table",
        "tv_unit",
        "bookshelf", "sideboard", "cabinet", "chest", "floating_shelf",
        "lamp", "desk_lamp",
        "mirror", "wall_art", "rug", "plant",
    ],

    # ─── BEDROOM ──────────────────────────────────────────────────────────
    ("bedroom", "gathering"): [
        # Family retreat — bed plus reading/dressing nooks.
        "bed_queen", "bed_king", "bed_single",
        "side_table",
        "wardrobe", "chest", "dressing_table",
        "accent_chair", "lounge_chair", "bench", "pouffe",
        "lamp", "desk_lamp",
        "mirror", "wall_art", "rug", "plant",
    ],
    ("bedroom", "breath"): [
        # Bedroom of silence — bed, side tables, single wardrobe.
        "bed_queen", "bed_king",
        "side_table",
        "wardrobe",
        "accent_chair",
        "lamp", "desk_lamp",
        "mirror", "wall_art", "rug", "plant",
    ],
    ("bedroom", "keeper"): [
        # Storage bedroom — wardrobes flanking, chest, drawers, vanity.
        "bed_queen", "bed_king",
        "side_table",
        "wardrobe", "chest", "cabinet", "bookshelf", "dressing_table", "floating_shelf",
        "bench", "accent_chair",
        "lamp", "desk_lamp",
        "mirror", "wall_art", "rug",
    ],

    # ─── DINING ───────────────────────────────────────────────────────────
    ("dining", "gathering"): [
        # The long Sunday table.
        "dining_table", "dining_chair",
        "bench", "accent_chair",
        "sideboard", "cabinet",
        "lamp", "pendant_light",
        "mirror", "wall_art", "rug", "plant",
    ],
    ("dining", "breath"): [
        # The empty centre — table + chairs + maybe one accent.
        "dining_table", "dining_chair",
        "sideboard",
        "lamp", "pendant_light",
        "mirror", "wall_art", "rug", "plant",
    ],
    ("dining", "keeper"): [
        # Buffet dining — sideboards, cabinets, display, the wedding china.
        "dining_table", "dining_chair",
        "bench",
        "sideboard", "cabinet", "bookshelf", "chest", "floating_shelf",
        "lamp", "pendant_light",
        "mirror", "wall_art", "rug",
    ],

    # ─── STUDY ────────────────────────────────────────────────────────────
    ("study", "gathering"): [
        # Library den — desk plus a reading nook.
        "desk", "desk_chair",
        "bookshelf", "cabinet", "floating_shelf",
        "accent_chair", "lounge_chair", "pouffe",
        "side_table",
        "lamp", "desk_lamp",
        "wall_art", "rug", "plant",
    ],
    ("study", "breath"): [
        # Thinking room — desk + chair + bookshelf. Almost nothing else.
        "desk", "desk_chair",
        "bookshelf", "floating_shelf",
        "side_table",
        "lamp", "desk_lamp",
        "wall_art", "plant",
    ],
    ("study", "keeper"): [
        # Document office — three walls of storage.
        "desk", "desk_chair",
        "bookshelf", "cabinet", "chest", "floating_shelf",
        "side_table", "bench", "accent_chair",
        "lamp", "desk_lamp",
        "wall_art", "rug",
    ],
}


def menu_for(room_type: str, philosophy: str) -> list[str]:
    """Return the curated sub_category menu for this (room, philosophy).
    Returns [] if no menu is defined."""
    return list(MENUS.get((room_type, philosophy), ()))


def menu_id(room_type: str, philosophy: str) -> str:
    """Stable identifier for a menu — used as the filename of the generated
    catalog module (e.g., 'living_gathering' → living_gathering.py)."""
    return f"{room_type}_{philosophy}"
