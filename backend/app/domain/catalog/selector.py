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


# ---------- Templates per philosophy + room ----------

# These templates encode the *idea* of each philosophy: what items belong, in
# what order. The solver gets to drop optional items if budget or space won't
# fit them.

_LIVING_GATHERING: tuple[Requirement, ...] = (
    Requirement("sofa", "mandatory", against_wall=True),
    Requirement("tv_unit", "mandatory", against_wall=True),
    Requirement("coffee_table", "mandatory"),
    Requirement("lounge_chair", "recommended"),
    Requirement("rug", "recommended"),
    Requirement("ottoman", "recommended"),
    Requirement("bookshelf", "recommended", against_wall=True),
    Requirement("plant", "optional"),
    Requirement("lamp", "optional"),
    Requirement("mandir_wall", "recommended", against_wall=True),
)

_LIVING_BREATH: tuple[Requirement, ...] = (
    Requirement("sofa", "mandatory", against_wall=True),
    Requirement("tv_unit", "mandatory", against_wall=True),
    Requirement("coffee_table", "mandatory"),
    Requirement("plant", "recommended"),
    Requirement("lamp", "optional"),
    Requirement("mandir_wall", "recommended", against_wall=True),
)

_LIVING_KEEPER: tuple[Requirement, ...] = (
    Requirement("sofa", "mandatory", against_wall=True),
    Requirement("tv_unit", "mandatory", against_wall=True),
    Requirement("coffee_table", "mandatory"),
    Requirement("bookshelf", "recommended", against_wall=True),
    Requirement("cabinet", "recommended", against_wall=True),
    Requirement("shoe_rack", "recommended", against_wall=True),
    Requirement("drawer", "optional", against_wall=True),
    Requirement("mandir_wall", "recommended", against_wall=True),
)

_BEDROOM_GATHERING: tuple[Requirement, ...] = (
    Requirement("bed_queen", "mandatory", against_wall=True),
    Requirement("wardrobe", "mandatory", against_wall=True),
    Requirement("desk", "recommended", against_wall=True),
    Requirement("desk_chair", "recommended"),
    Requirement("rug", "optional"),
    Requirement("plant", "optional"),
)

_BEDROOM_BREATH: tuple[Requirement, ...] = (
    Requirement("bed_queen", "mandatory", against_wall=True),
    Requirement("wardrobe", "mandatory", against_wall=True),
    Requirement("plant", "recommended"),
)

_BEDROOM_KEEPER: tuple[Requirement, ...] = (
    Requirement("bed_queen", "mandatory", against_wall=True),
    Requirement("wardrobe", "mandatory", against_wall=True),
    Requirement("drawer", "recommended", against_wall=True),
    Requirement("cabinet", "recommended", against_wall=True),
    Requirement("desk", "optional", against_wall=True),
)

_TEMPLATES: dict[tuple[RoomType, VisionPhilosophy], tuple[Requirement, ...]] = {
    (RoomType.LIVING, VisionPhilosophy.GATHERING): _LIVING_GATHERING,
    (RoomType.LIVING, VisionPhilosophy.BREATH): _LIVING_BREATH,
    (RoomType.LIVING, VisionPhilosophy.KEEPER): _LIVING_KEEPER,
    (RoomType.BEDROOM, VisionPhilosophy.GATHERING): _BEDROOM_GATHERING,
    (RoomType.BEDROOM, VisionPhilosophy.BREATH): _BEDROOM_BREATH,
    (RoomType.BEDROOM, VisionPhilosophy.KEEPER): _BEDROOM_KEEPER,
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
        if not is_mandatory and (spent + cheapest.price_inr) > int(target_spend * 1.15):
            continue

        chosen.append(SelectedItem(
            item_id=f"{req.sub_category}-{idx}",
            catalog=cheapest,
            against_wall=req.against_wall,
        ))
        spent += cheapest.price_inr
        seen_skus.add(cheapest.sku)

    return chosen


def _candidates_for(
    sub: str,
    room: RoomType,
    vibe: Vibe,
    catalog: CatalogRepository,
) -> list[CatalogItem]:
    """Catalog items matching sub_category + room. Vibe is a soft preference:
    prefer items that include the vibe, fall through to all room matches."""
    matches: list[CatalogItem] = []
    fallback: list[CatalogItem] = []
    for item in catalog._items:  # noqa: SLF001 — internal access acceptable inside domain
        if item.sub_category != sub:
            continue
        if room not in item.rooms:
            continue
        if vibe in item.vibes:
            matches.append(item)
        else:
            fallback.append(item)
    return matches if matches else fallback
