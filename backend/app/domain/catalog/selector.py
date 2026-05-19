"""Furniture selector — turns a (philosophy, intake) into a concrete item list.

Three philosophies (Gathering / Breath / Keeper) drive different requirement
templates. The selector queries the catalog for cheapest match per requirement
within budget; the solver places them.

This module is pure logic. No LLM, no IO beyond reading the catalog.
"""
from __future__ import annotations

from dataclasses import dataclass

from app.domain.catalog.model import CatalogItem
from app.domain.catalog.repository import CatalogRepository
from app.schemas.state import Intake, RoomType, Vibe, VisionPhilosophy


@dataclass(frozen=True)
class Requirement:
    sub_category: str
    priority: str  # "mandatory" | "recommended" | "optional"
    against_wall: bool = False
    count: int = 1  # multiple instances (e.g. 4 dining chairs around one table)


# ---------- Templates per philosophy + room ----------

# These templates encode the *idea* of each philosophy: what items belong, in
# what order. The solver gets to drop optional items if budget or space won't
# fit them.

_LIVING_GATHERING: tuple[Requirement, ...] = (
    Requirement("sofa_l", "mandatory", against_wall=True),       # L-shape for group seating
    Requirement("tv_unit", "mandatory", against_wall=True),
    Requirement("coffee_table", "mandatory"),
    Requirement("lounge_chair", "recommended"),
    Requirement("rug", "recommended"),
    Requirement("ottoman", "recommended"),
    Requirement("side_table", "recommended"),
    Requirement("bookshelf", "recommended", against_wall=True),
    Requirement("ceiling_fan", "recommended"),
    Requirement("plant", "optional"),
    Requirement("lamp", "optional"),
    Requirement("table_lamp", "optional"),
    Requirement("mirror", "optional"),
    Requirement("mandir_wall", "recommended", against_wall=True),
)

_LIVING_BREATH: tuple[Requirement, ...] = (
    Requirement("sofa_2seat", "mandatory", against_wall=True),   # Minimal 2-seater
    Requirement("tv_unit", "mandatory", against_wall=True),
    Requirement("coffee_table_round", "mandatory"),              # Round table, softer geometry
    Requirement("ceiling_fan", "recommended"),
    Requirement("plant", "recommended"),
    Requirement("rug_round", "recommended"),                     # Round rug, airy feel
    Requirement("lamp_round", "optional"),
    Requirement("mirror", "optional"),
    Requirement("mandir_wall", "recommended", against_wall=True),
)

_LIVING_KEEPER: tuple[Requirement, ...] = (
    Requirement("sofa", "mandatory", against_wall=True),         # Standard 3-seat workhorse
    Requirement("tv_unit", "mandatory", against_wall=True),
    Requirement("coffee_table", "mandatory"),
    Requirement("bookshelf", "recommended", against_wall=True),
    Requirement("cabinet", "recommended", against_wall=True),
    Requirement("shoe_rack", "recommended", against_wall=True),
    Requirement("drawer", "optional", against_wall=True),
    Requirement("ceiling_fan", "recommended"),
    Requirement("side_table", "optional"),
    Requirement("mandir_wall", "recommended", against_wall=True),
)

_BEDROOM_GATHERING: tuple[Requirement, ...] = (
    Requirement("bed_queen", "mandatory", against_wall=True),
    Requirement("wardrobe", "mandatory", against_wall=True),
    Requirement("side_table", "recommended", count=2),  # nightstands on both sides
    Requirement("desk", "recommended", against_wall=True),
    Requirement("desk_chair", "recommended"),
    Requirement("ceiling_fan", "recommended"),
    Requirement("rug", "optional"),
    Requirement("plant", "optional"),
    Requirement("mirror", "optional"),
    Requirement("table_lamp", "optional", count=2),
)

_BEDROOM_BREATH: tuple[Requirement, ...] = (
    Requirement("bed_queen", "mandatory", against_wall=True),
    Requirement("wardrobe", "mandatory", against_wall=True),
    Requirement("side_table", "recommended", count=2),
    Requirement("ceiling_fan", "recommended"),
    Requirement("plant", "recommended"),
    Requirement("mirror", "optional"),
)

_BEDROOM_KEEPER: tuple[Requirement, ...] = (
    Requirement("bed_queen", "mandatory", against_wall=True),
    Requirement("wardrobe", "mandatory", against_wall=True),
    Requirement("drawer", "recommended", against_wall=True),
    Requirement("cabinet", "recommended", against_wall=True),
    Requirement("side_table", "recommended", count=2),
    Requirement("ceiling_fan", "recommended"),
    Requirement("desk", "optional", against_wall=True),
)

_DINING_GATHERING: tuple[Requirement, ...] = (
    Requirement("dining_table", "mandatory"),
    Requirement("dining_chair", "mandatory", count=4),
    Requirement("sideboard", "recommended", against_wall=True),
    Requirement("ceiling_fan", "recommended"),
    Requirement("rug", "optional"),
    Requirement("plant", "optional"),
    Requirement("mirror", "optional"),
    Requirement("mandir_wall", "recommended", against_wall=True),
)

_DINING_BREATH: tuple[Requirement, ...] = (
    Requirement("dining_table", "mandatory"),
    Requirement("dining_chair", "mandatory", count=4),
    Requirement("ceiling_fan", "recommended"),
    Requirement("plant", "optional"),
    Requirement("mirror", "optional"),
)

_DINING_KEEPER: tuple[Requirement, ...] = (
    Requirement("dining_table", "mandatory"),
    Requirement("dining_chair", "mandatory", count=4),
    Requirement("sideboard", "recommended", against_wall=True),
    Requirement("cabinet", "optional", against_wall=True),
    Requirement("ceiling_fan", "recommended"),
)

_STUDY_GATHERING: tuple[Requirement, ...] = (
    Requirement("desk", "mandatory", against_wall=True),
    Requirement("desk_chair", "mandatory"),
    Requirement("bookshelf", "recommended", against_wall=True),
    Requirement("cabinet", "optional", against_wall=True),
    Requirement("ceiling_fan", "recommended"),
    Requirement("table_lamp", "recommended"),  # task lighting on the desk
    Requirement("plant_small", "optional"),
    Requirement("plant", "optional"),
    Requirement("lamp", "optional"),
)

_STUDY_BREATH: tuple[Requirement, ...] = (
    Requirement("desk", "mandatory", against_wall=True),
    Requirement("desk_chair", "mandatory"),
    Requirement("table_lamp", "recommended"),
    Requirement("ceiling_fan", "recommended"),
    Requirement("plant", "recommended"),
)

_STUDY_KEEPER: tuple[Requirement, ...] = (
    Requirement("desk", "mandatory", against_wall=True),
    Requirement("desk_chair", "mandatory"),
    Requirement("bookshelf", "mandatory", against_wall=True),
    Requirement("cabinet", "recommended", against_wall=True),
    Requirement("drawer", "optional", against_wall=True),
    Requirement("table_lamp", "recommended"),
    Requirement("ceiling_fan", "recommended"),
)

_KITCHEN_GATHERING: tuple[Requirement, ...] = (
    Requirement("kitchen_counter_l", "mandatory", against_wall=True),
    Requirement("kitchen_overhead", "mandatory", against_wall=True),
    Requirement("fridge", "mandatory", against_wall=True),
    Requirement("stove", "mandatory"),
    Requirement("kitchen_sink", "recommended", against_wall=True),
    Requirement("bar_stool", "recommended", count=2),
    Requirement("ceiling_fan", "recommended"),
    Requirement("plant_small", "optional"),
)

_KITCHEN_BREATH: tuple[Requirement, ...] = (
    Requirement("kitchen_counter", "mandatory", against_wall=True),
    Requirement("kitchen_overhead", "recommended", against_wall=True),
    Requirement("fridge", "mandatory", against_wall=True),
    Requirement("stove", "mandatory"),
    Requirement("kitchen_sink", "recommended", against_wall=True),
    Requirement("ceiling_fan", "recommended"),
    Requirement("plant_small", "optional"),
)

_KITCHEN_KEEPER: tuple[Requirement, ...] = (
    Requirement("kitchen_counter_l", "mandatory", against_wall=True),
    Requirement("kitchen_overhead", "mandatory", against_wall=True),
    Requirement("fridge", "mandatory", against_wall=True),
    Requirement("stove", "mandatory"),
    Requirement("kitchen_sink", "mandatory", against_wall=True),
    Requirement("bar_stool", "optional", count=2),
    Requirement("ceiling_fan", "recommended"),
)

_TEMPLATES: dict[tuple[RoomType, VisionPhilosophy], tuple[Requirement, ...]] = {
    (RoomType.LIVING, VisionPhilosophy.GATHERING): _LIVING_GATHERING,
    (RoomType.LIVING, VisionPhilosophy.BREATH): _LIVING_BREATH,
    (RoomType.LIVING, VisionPhilosophy.KEEPER): _LIVING_KEEPER,
    (RoomType.BEDROOM, VisionPhilosophy.GATHERING): _BEDROOM_GATHERING,
    (RoomType.BEDROOM, VisionPhilosophy.BREATH): _BEDROOM_BREATH,
    (RoomType.BEDROOM, VisionPhilosophy.KEEPER): _BEDROOM_KEEPER,
    (RoomType.DINING, VisionPhilosophy.GATHERING): _DINING_GATHERING,
    (RoomType.DINING, VisionPhilosophy.BREATH): _DINING_BREATH,
    (RoomType.DINING, VisionPhilosophy.KEEPER): _DINING_KEEPER,
    (RoomType.STUDY, VisionPhilosophy.GATHERING): _STUDY_GATHERING,
    (RoomType.STUDY, VisionPhilosophy.BREATH): _STUDY_BREATH,
    (RoomType.STUDY, VisionPhilosophy.KEEPER): _STUDY_KEEPER,
    (RoomType.KITCHEN, VisionPhilosophy.GATHERING): _KITCHEN_GATHERING,
    (RoomType.KITCHEN, VisionPhilosophy.BREATH): _KITCHEN_BREATH,
    (RoomType.KITCHEN, VisionPhilosophy.KEEPER): _KITCHEN_KEEPER,
}

_BUDGET_TARGET_PCT: dict[VisionPhilosophy, float] = {
    VisionPhilosophy.GATHERING: 0.95,
    VisionPhilosophy.BREATH: 0.70,
    VisionPhilosophy.KEEPER: 0.85,
}


# ---------- Selection ----------


@dataclass(frozen=True)
class SelectedItem:
    item_id: str
    catalog: CatalogItem
    against_wall: bool


def select_items(
    *,
    intake: Intake,
    philosophy: VisionPhilosophy,
    catalog: CatalogRepository,
    design_brief: dict | None = None,
) -> list[SelectedItem]:
    """Pick concrete catalog items for the given philosophy + intake.

    Strategy: walk the requirement template; for each requirement, prefer the
    cheapest catalog item matching (sub_category, room, vibe). Stop adding
    optional items once we hit ~budget × _BUDGET_TARGET_PCT.
    """
    template = _TEMPLATES.get((intake.room_type, philosophy))
    if template is None:
        # Fallback to living-Gathering for unsupported room types in v1.
        template = _LIVING_GATHERING

    # Adjust optional item priorities based on who lives here.
    brief = design_brief or {}
    if brief.get("has_kids") or brief.get("has_elderly"):
        adjusted: list[Requirement] = []
        for req in template:
            if brief.get("has_kids") and req.sub_category == "ottoman":
                # Ottoman = trip hazard with kids — demote to optional
                adjusted.append(Requirement(req.sub_category, "optional", req.against_wall))
            elif brief.get("has_elderly") and req.sub_category == "lounge_chair":
                # Lounge chair with arms = important for elderly — promote to recommended
                adjusted.append(Requirement(req.sub_category, "recommended", req.against_wall))
            elif brief.get("has_elderly") and req.sub_category == "desk":
                # Desk less important for elderly households
                adjusted.append(Requirement(req.sub_category, "optional", req.against_wall))
            else:
                adjusted.append(req)
        template = tuple(adjusted)

    target_spend = int(intake.budget_inr * _BUDGET_TARGET_PCT[philosophy])
    chosen: list[SelectedItem] = []
    spent = 0
    seen_skus: set[str] = set()

    for idx, req in enumerate(template):
        candidates = _candidates_for(req.sub_category, intake.room_type, intake.vibe, catalog)
        # Drop already-selected exact SKUs to avoid duplicate picks.
        candidates = [c for c in candidates if c.sku not in seen_skus]
        if not candidates:
            continue

        # For mandatory items: cheapest match. For recommended/optional: also
        # cheapest, but skip if it would push us materially over budget (with a
        # 15% buffer because we want philosophies to *feel* their density).
        cheapest = min(candidates, key=lambda c: c.price_inr)
        is_mandatory = req.priority == "mandatory"
        total_cost = cheapest.price_inr * req.count
        if not is_mandatory and (spent + total_cost) > int(target_spend * 1.15):
            continue

        # Create N instances when count > 1 (e.g. 4 dining chairs share the same
        # SKU but each needs its own placement). IDs stay unique per instance.
        for i in range(req.count):
            chosen.append(SelectedItem(
                item_id=f"{req.sub_category}-{idx}-{i}" if req.count > 1 else f"{req.sub_category}-{idx}",
                catalog=cheapest,
                against_wall=req.against_wall,
            ))
        spent += total_cost
        seen_skus.add(cheapest.sku)

    return chosen


# Sub-category fallbacks: if the preferred sub_category has no items, try these
# in order. Prevents mandatory requirements from silently producing empty rooms.
_SUB_ALIASES: dict[str, list[str]] = {
    "sofa_l":           ["sofa_l", "sofa_modern", "sofa"],
    "sofa_2seat":       ["sofa_2seat", "sofa_modern", "sofa"],
    "sofa_modern":      ["sofa_modern", "sofa"],
    "coffee_table_round": ["coffee_table_round", "coffee_table"],
    "rug_round":        ["rug_round", "rug_rounded", "rug_rectangle", "rug"],
    "rug_rectangle":    ["rug_rectangle", "rug"],
    "rug_rounded":      ["rug_rounded", "rug_rectangle", "rug"],
    "lamp_round":       ["lamp_round", "lamp"],
    "lounge_chair_relax": ["lounge_chair_relax", "lounge_chair"],
    "accent_chair_cushion": ["accent_chair_cushion", "accent_chair"],
    "accent_chair_modern":  ["accent_chair_modern", "accent_chair"],
    "bookshelf_closed": ["bookshelf_closed", "bookshelf"],
    "bookshelf_low":    ["bookshelf_low", "bookshelf"],
    "bedside_cabinet":  ["bedside_cabinet", "side_table"],
    "dining_table_compact": ["dining_table_compact", "dining_table"],
    "desk_corner":      ["desk_corner", "desk"],
}


def _candidates_for(
    sub: str,
    room: RoomType,
    vibe: Vibe,
    catalog: CatalogRepository,
) -> list[CatalogItem]:
    """Catalog items matching sub_category + room, with vibe preference and
    sub-category fallback so philosophy-specific requests don't silently fail."""
    for sub_try in _SUB_ALIASES.get(sub, [sub]):
        matches: list[CatalogItem] = []
        fallback: list[CatalogItem] = []
        for item in catalog._items:  # noqa: SLF001
            if item.sub_category != sub_try:
                continue
            if room not in item.rooms:
                continue
            if vibe in item.vibes:
                matches.append(item)
            else:
                fallback.append(item)
        candidates = matches if matches else fallback
        if candidates:
            return candidates
    return []
