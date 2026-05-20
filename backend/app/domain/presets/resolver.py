"""Preset resolver — turns a PresetLayout + Intake into a list of PlacedItem objects.

Steps:
  1. Pick the matching PresetLayout by (room_type, philosophy, variant).
  2. For each FractionalItem, find the best-fitting catalog item by sub_category,
     filtered by vibe and budget. Non-optional items fall back to any vibe if
     nothing matches the current vibe.
  3. Scale (x_frac, z_frac) to mm, clamping so the item footprint stays at
     least _WALL_INSET_MM from every wall.
  4. Build PlacementRationale from the scaled position (vastu zone, near wall,
     sight-line target) so the collaborator knows why everything is where it is.
  5. Return the list of PlacedItem objects — identical shape to what the solver
     would produce, so the existing intent system, validate endpoint, and
     collaborator prompt all work without changes.
"""
from __future__ import annotations

import math
import uuid

from app.domain.catalog import CatalogQuery, get_catalog
from app.domain.catalog.repository import CatalogRepository
from app.domain.presets.layouts import ALL_PRESETS, get_preset
from app.domain.presets.model import FractionalItem, PresetLayout
from app.domain.vastu import VastuZone, preferred_zone_for_category
from app.domain.vastu.rules import point_zone
from app.schemas.state import (
    CatalogRef,
    DesignAnchor,
    DesignIntent,
    Dimensions,
    Direction,
    Intake,
    PlacedItem,
    PlacementRationale,
    Position,
    VisionPhilosophy,
)

_WALL_INSET_MM = 80   # minimum gap between item edge and room wall


def resolve_preset(
    intake: Intake,
    philosophy: VisionPhilosophy,
    variant: int = 0,
) -> list[PlacedItem] | None:
    """Return a list of PlacedItem objects for the given preset, or None if no
    preset matches the room_type + philosophy combination."""
    layout = get_preset(intake.room_type.value, philosophy.value, variant)
    if layout is None:
        return None
    catalog = get_catalog()
    return _resolve_layout(layout, intake, catalog)


def build_design_intent_from_preset(
    layout: PresetLayout,
    placed_items: list[PlacedItem],
    intake: Intake,
) -> DesignIntent:
    """Build DesignIntent from the preset definition + resolved placed items."""
    name_to_id: dict[str, str] = {
        i.catalog.sku.split("-")[1] if "-" in i.catalog.sku else i.id: i.id
        for i in placed_items
    }
    sub_to_id: dict[str, str] = {}
    for item in placed_items:
        sub = item.id.split("-")[0] if "-" in item.id else item.category
        sub_to_id.setdefault(sub, item.id)

    anchors: list[DesignAnchor] = []
    for fi in layout.items:
        if fi.sight_line_target_sub and fi.sub_category in sub_to_id:
            target_id = sub_to_id.get(fi.sight_line_target_sub)
            anchors.append(DesignAnchor(
                item_id=sub_to_id[fi.sub_category],
                sight_line_target_id=target_id,
            ))

    vastu_critical = [i.id for i in placed_items if i.rationale and i.rationale.vastu_compliant]
    no_move = [i.id for i in placed_items if i.category == "mandir" and i.rationale and i.rationale.vastu_compliant]

    return DesignIntent(
        anchors=anchors,
        no_move_items=no_move,
        vastu_critical_ids=vastu_critical,
        budget_ceiling_inr=intake.budget_inr,
    )


# ---------- Internal ----------


def _resolve_layout(
    layout: PresetLayout,
    intake: Intake,
    catalog: CatalogRepository,
) -> list[PlacedItem]:
    room_w = intake.room_dimensions.width_mm
    room_d = intake.room_dimensions.depth_mm
    budget_per_item = intake.budget_inr // max(len(layout.items), 1)

    # Build a sub_category → item_id map as we place items, so sight-line
    # targets can be resolved.
    sub_to_placed_id: dict[str, str] = {}
    placed: list[PlacedItem] = []

    for fi in layout.items:
        catalog_item = _pick_catalog_item(fi, intake, catalog, budget_per_item)
        if catalog_item is None:
            if not fi.optional:
                # Non-optional item missing — skip silently; the room is still
                # valid, the frontend can surface the gap.
                pass
            continue

        # Scale fractional position to mm, clamped so the footprint stays inside.
        eff_w, eff_d = _eff_extent(catalog_item.dimensions.width_mm, catalog_item.dimensions.depth_mm, fi.rotation_deg)
        cx = _clamp(fi.x_frac * room_w, eff_w / 2 + _WALL_INSET_MM, room_w - eff_w / 2 - _WALL_INSET_MM)
        cz = _clamp(fi.z_frac * room_d, eff_d / 2 + _WALL_INSET_MM, room_d - eff_d / 2 - _WALL_INSET_MM)

        # Build PlacementRationale
        vastu_zone = point_zone(
            int(cx), int(cz),
            width_mm=room_w, depth_mm=room_d,
            entrance=intake.entrance_direction,
        )
        pref_zones = preferred_zone_for_category(
            category=catalog_item.category,
            room_type=intake.room_type.value,
            vastu_enabled=intake.vastu_matters,
        )
        vastu_compliant = bool(pref_zones) and vastu_zone in pref_zones
        near_wall = _detect_near_wall(cx, cz, eff_w, eff_d, room_w, room_d)

        # Resolve sight-line target item_id if declared on this FractionalItem.
        sight_line_target = sub_to_placed_id.get(fi.sight_line_target_sub or "") if fi.sight_line_target_sub else None

        item_id = f"{fi.sub_category}-{uuid.uuid4().hex[:6]}"
        sub_to_placed_id[fi.sub_category] = item_id

        placed.append(PlacedItem(
            id=item_id,
            catalog=CatalogRef(
                sku=catalog_item.sku,
                asset_url=catalog_item.asset_url,
                tint_hex=catalog_item.tint_hex,
                roughness_hint=catalog_item.roughness_hint,
                size_label=catalog_item.size_label,
                material_label=catalog_item.material_label,
                finish_label=None,
                placement_type=catalog_item.placement_type,
            ),
            name_en=catalog_item.name_en,
            name_hi=catalog_item.name_hi,
            category=catalog_item.category,
            dimensions=Dimensions(
                width_mm=catalog_item.dimensions.width_mm,
                depth_mm=catalog_item.dimensions.depth_mm,
                height_mm=catalog_item.dimensions.height_mm,
            ),
            position=Position(x_mm=int(round(cx)), z_mm=int(round(cz)), rotation_deg=float(fi.rotation_deg)),
            facing=_facing_for_category(catalog_item.sub_category or catalog_item.category, intake.entrance_direction),
            is_buy=catalog_item.category not in {"storage", "tv_unit", "mandir"},
            price_inr=catalog_item.price_inr,
            build_price_inr=catalog_item.build_price_inr,
            rationale=PlacementRationale(
                zone_id=None,  # presets don't use solver zones
                vastu_zone=vastu_zone.value,
                near_wall=near_wall,
                sight_line_target=sight_line_target,
                score=0.0,
                vastu_compliant=vastu_compliant,
            ),
        ))

    return placed


def _pick_catalog_item(
    fi: FractionalItem,
    intake: Intake,
    catalog: CatalogRepository,
    budget_hint: int,
):
    """Find the best catalog item for this FractionalItem.

    Priority: vibe-matching within budget → vibe-matching any price →
    any vibe within budget → any vibe. Returns None only if sub_category
    is not in the catalog at all.
    """
    sub = fi.sub_category

    def _query(room=None, vibe=None, max_price=None):
        return catalog.query(CatalogQuery(
            room=room,
            vibe=vibe,
            max_price_inr=max_price,
            tags_any=[sub],
            limit=20,
        ))

    for items in [
        _query(room=intake.room_type, vibe=intake.vibe, max_price=budget_hint * 3),
        _query(room=intake.room_type, vibe=intake.vibe),
        _query(room=intake.room_type, max_price=budget_hint * 3),
        _query(room=intake.room_type),
        _query(vibe=intake.vibe),
        _query(),
    ]:
        if items:
            # Among candidates prefer the one whose dimensions best fit the
            # item's expected role — take the median-sized option to avoid
            # extremes.
            items.sort(key=lambda i: i.price_inr)
            mid = len(items) // 2
            return items[mid]
    return None


# ---------- Geometry helpers ----------


def _eff_extent(w: int, d: int, rot_deg: int) -> tuple[float, float]:
    rad = math.radians(rot_deg)
    return (
        abs(w * math.cos(rad)) + abs(d * math.sin(rad)),
        abs(w * math.sin(rad)) + abs(d * math.cos(rad)),
    )


def _clamp(v: float, lo: float, hi: float) -> float:
    if hi < lo:
        return (lo + hi) / 2
    return max(lo, min(v, hi))


def _detect_near_wall(cx: float, cz: float, eff_w: float, eff_d: float, room_w: int, room_d: int) -> str | None:
    gaps = {
        "S": cz - eff_d / 2,
        "N": room_d - (cz + eff_d / 2),
        "W": cx - eff_w / 2,
        "E": room_w - (cx + eff_w / 2),
    }
    min_wall = min(gaps, key=lambda k: gaps[k])
    return min_wall if gaps[min_wall] < 200 else None


def _facing_for_category(category: str, entrance: Direction) -> Direction | None:
    if category == "tv_unit":
        return entrance
    if category == "mandir":
        return Direction.E
    return None
