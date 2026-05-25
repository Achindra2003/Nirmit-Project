"""Pure intent execution. No LLM, no IO except catalog reads.

For each Intent kind we map to a deterministic mutation of the RoomState.
After spatial mutations (resize, move, replace, add) we re-run the solver
to ensure the room remains valid; if a placement fails, we revert that
specific intent and continue.
"""
from __future__ import annotations

import uuid

from app.domain.catalog import CatalogQuery, get_catalog
from app.domain.catalog.model import CatalogItem
from app.domain.catalog.presets import get_menu
from app.domain.solver import DoorOpening, SolverInput, SolverItem, composition_for, solve
from app.schemas.state import (
    CatalogRef,
    Dimensions,
    Intent,
    IntentKind,
    PlacedItem,
    Position,
    RoomState,
    Vision,
)


class IntentExecutionError(Exception):
    pass


# ---------- Public API ----------


# Intents that must NOT trigger a full solver re-run on all items.
# Key rule: if the user placed something or we handle placement inline, leave
# every other item at its current (x_mm, z_mm). The old solver reshuffled the
# whole room on every add/remove — that's the root of the "amateurish" complaint.
_NO_RESOLVE_KINDS = {
    # Manual placement — always in this set
    IntentKind.MOVE,
    IntentKind.ROTATE,
    # Cosmetic only
    IntentKind.RECOLOR_ROOM,
    IntentKind.CHANGE_FABRIC,
    IntentKind.CHANGE_FINISH,
    IntentKind.CHANGE_STYLE,   # catalog swap in-place; position kept
    # Structural but handled inline without global re-layout
    IntentKind.REMOVE,         # just filter, existing items stay put
    IntentKind.REPLACE,        # swap catalog ref on target only
    IntentKind.MAKE_BIGGER,    # resize target in-place
    IntentKind.MAKE_SMALLER,   # resize target in-place
    IntentKind.DUPLICATE,      # offset copy, no need to re-solve all
    IntentKind.ADD,            # wall-snap in _add; existing items untouched
}


def apply_intents(
    room: RoomState,
    intents: list[Intent],
    *,
    available_visions: list[Vision] | None = None,
) -> RoomState | None:
    """Apply intents in order. Returns the new RoomState or None if all
    intents were rejected."""
    current = room
    any_applied = False
    needs_resolve = False
    for intent in intents:
        next_room = _apply_one(current, intent, available_visions=available_visions)
        if next_room is None:
            continue
        current = next_room
        any_applied = True
        if intent.kind not in _NO_RESOLVE_KINDS:
            needs_resolve = True

    if not any_applied:
        return None
    return _resolve(current) if needs_resolve else current


# ---------- One-intent execution ----------


def _apply_one(
    room: RoomState,
    intent: Intent,
    *,
    available_visions: list[Vision] | None = None,
) -> RoomState | None:
    kind = intent.kind
    if kind is IntentKind.REMOVE:
        return _remove(room, intent.target_item_id)
    if kind is IntentKind.MAKE_BIGGER:
        return _scale(room, intent.target_item_id, factor=1.2)
    if kind is IntentKind.MAKE_SMALLER:
        return _scale(room, intent.target_item_id, factor=0.85)
    if kind is IntentKind.ROTATE:
        return _rotate(room, intent.target_item_id, intent.parameters)
    if kind is IntentKind.DUPLICATE:
        return _duplicate(room, intent.target_item_id)
    if kind is IntentKind.MOVE:
        return _move(room, intent.target_item_id, intent.parameters)
    if kind is IntentKind.RECOLOR_ROOM:
        return _recolor(room, intent.parameters)
    if kind is IntentKind.REPLACE:
        return _replace(room, intent.target_item_id, intent.parameters)
    if kind is IntentKind.ADD:
        return _add(room, intent.parameters)
    if kind is IntentKind.CHANGE_FABRIC:
        return _change_finish(room, intent.target_item_id, intent.parameters)
    if kind is IntentKind.CHANGE_FINISH:
        return _change_finish(room, intent.target_item_id, intent.parameters)
    if kind is IntentKind.CHANGE_STYLE:
        # Style swap is a *peer rotation*, not a generic catalog replace —
        # clicking ⇄ Style on a sofa cycles through the OTHER sofas in the
        # catalog. _replace requires the caller to know what to swap to;
        # _style_swap figures it out from the current item's primary tag.
        return _style_swap(room, intent.target_item_id)
    if kind is IntentKind.MIX_FROM_VISION:
        return _mix(room, intent.parameters, available_visions or [])
    if kind is IntentKind.FREE_TEXT:
        # The collaborator decided this turn carries no structural change.
        return None
    return None


# ---------- Mutations ----------


def _remove(room: RoomState, target_id: str | None) -> RoomState | None:
    if not target_id:
        return None
    new_items = [i for i in room.items if i.id != target_id]
    if len(new_items) == len(room.items):
        return None
    return room.model_copy(update={"items": new_items})


def _scale(room: RoomState, target_id: str | None, *, factor: float) -> RoomState | None:
    if not target_id:
        return None
    out: list[PlacedItem] = []
    found = False
    for i in room.items:
        if i.id != target_id:
            out.append(i)
            continue
        new_w = max(300, int(round(i.dimensions.width_mm * factor)))
        new_d = max(300, int(round(i.dimensions.depth_mm * factor)))
        # Cap at room dimensions.
        new_w = min(new_w, room.intake.room_dimensions.width_mm)
        new_d = min(new_d, room.intake.room_dimensions.depth_mm)
        new_dims = Dimensions(width_mm=new_w, depth_mm=new_d, height_mm=i.dimensions.height_mm)
        out.append(i.model_copy(update={"dimensions": new_dims}))
        found = True
    if not found:
        return None
    return room.model_copy(update={"items": out})


def _move(room: RoomState, target_id: str | None, params: dict) -> RoomState | None:
    """Move an item. (x_mm, z_mm) is the new footprint CENTRE."""
    if not target_id:
        return None
    try:
        x = int(params.get("x_mm") or params.get("x") or 0)
        z = int(params.get("z_mm") or params.get("z") or 0)
    except (TypeError, ValueError):
        return None
    out: list[PlacedItem] = []
    found = False
    for i in room.items:
        if i.id != target_id:
            out.append(i)
            continue
        new_pos = i.position.model_copy(update={"x_mm": x, "z_mm": z})
        out.append(i.model_copy(update={"position": new_pos}))
        found = True
    if not found:
        return None
    return room.model_copy(update={"items": out})


def _rotate(room: RoomState, target_id: str | None, params: dict) -> RoomState | None:
    if not target_id:
        return None
    try:
        delta = float(params.get("delta_deg") or params.get("delta") or 90)
    except (TypeError, ValueError):
        delta = 90.0
    out: list[PlacedItem] = []
    found = False
    for i in room.items:
        if i.id != target_id:
            out.append(i)
            continue
        new_rot = (i.position.rotation_deg + delta) % 360
        out.append(i.model_copy(update={"position": i.position.model_copy(update={"rotation_deg": new_rot})}))
        found = True
    return room.model_copy(update={"items": out}) if found else None


def _duplicate(room: RoomState, target_id: str | None) -> RoomState | None:
    if not target_id:
        return None
    src = next((i for i in room.items if i.id == target_id), None)
    if src is None:
        return None
    # Offset the copy 400mm along +x, clamped, so it doesn't perfectly overlap.
    new_x = min(src.position.x_mm + 400, room.intake.room_dimensions.width_mm - 200)
    clone = src.model_copy(update={
        "id": f"{src.category}-{uuid.uuid4().hex[:6]}",
        "position": src.position.model_copy(update={"x_mm": new_x}),
    })
    return room.model_copy(update={"items": [*room.items, clone]})


def _recolor(room: RoomState, params: dict) -> RoomState:
    new_palette = dict(room.palette)
    for key in ("wall", "floor", "accent"):
        v = params.get(key)
        if isinstance(v, str) and v.startswith("#") and len(v) in (4, 7):
            new_palette[key] = v
    update: dict = {"palette": new_palette}
    if isinstance(params.get("flooring"), str):
        update["flooring"] = params["flooring"]
    if isinstance(params.get("wall_finish"), str):
        update["wall_finish"] = params["wall_finish"]
    kelvin = params.get("lighting_kelvin")
    if isinstance(kelvin, (int, float)) and 2200 <= kelvin <= 6500:
        update["lighting_kelvin"] = int(kelvin)
    return room.model_copy(update=update)


def _replace(room: RoomState, target_id: str | None, params: dict) -> RoomState | None:
    if not target_id:
        return None
    sku = params.get("sku")
    sub = params.get("sub_category")
    catalog = get_catalog()
    new_catalog_item = None
    if isinstance(sku, str):
        new_catalog_item = catalog.get(sku)
    elif isinstance(sub, str):
        candidates = catalog.query(
            CatalogQuery(
                category=None,
                room=room.intake.room_type,
                vibe=room.intake.vibe,
                tags_any=[sub],
            )
        )
        if candidates:
            new_catalog_item = min(candidates, key=lambda c: c.price_inr)
    if new_catalog_item is None:
        return None

    out: list[PlacedItem] = []
    found = False
    for i in room.items:
        if i.id != target_id:
            out.append(i)
            continue
        out.append(
            PlacedItem(
                id=i.id,
                catalog=CatalogRef(
                    sku=new_catalog_item.sku,
                    asset_url=new_catalog_item.asset_url,
                    tint_hex=new_catalog_item.tint_hex,
                    roughness_hint=new_catalog_item.roughness_hint,
                    size_label=new_catalog_item.size_label,
                    material_label=new_catalog_item.material_label,
                    finish_label=new_catalog_item.finish_label,
                    placement_type=new_catalog_item.placement_type,
                ),
                name_en=new_catalog_item.name_en,
                name_hi=new_catalog_item.name_hi,
                category=new_catalog_item.category,
                dimensions=Dimensions(
                    width_mm=new_catalog_item.dimensions.width_mm,
                    depth_mm=new_catalog_item.dimensions.depth_mm,
                    height_mm=new_catalog_item.dimensions.height_mm,
                ),
                position=i.position,
                facing=i.facing,
                is_buy=i.is_buy,
                price_inr=new_catalog_item.price_inr,
                build_price_inr=new_catalog_item.build_price_inr,
            )
        )
        found = True
    if not found:
        return None
    return room.model_copy(update={"items": out})


def _style_swap(room: RoomState, target_id: str | None) -> RoomState | None:
    """Rotate the target item to the next peer that shares its primary tag.

    Lookup order — important because the runtime room is composed from the
    curated philosophy menus (SKUs like `LIVING-GATHERING-SOFA`), not the
    hero catalog. Hitting the hero catalog first would return None for
    every placed item and silently no-op the Style button.

      1. Resolve the current item from `get_menu(room_type, philosophy)`.
         Peers come from the SAME menu, so a swap stays inside the room's
         philosophy (a "gathering" sofa won't morph into a "breath" sofa).
      2. Fall back to the hero catalog if the room has no philosophy (rare,
         only happens for legacy room_states without philosophy set).

    The "primary tag" is the first entry in CatalogItem.tags, which the
    curated menus use as the natural item-kind label ("sofa", "chair",
    "bed", "wardrobe", …). Items that share it are the natural style peers
    — a 3-seat sofa swaps with the L-shaped sectional and the 2-seat
    compact, but not with a diwan or an ottoman.

    We additionally guard against wildly different footprints (within
    900mm on each axis) so the layout doesn't break — a wide king bed
    won't swap to a single bed and leave the bedside tables stranded.

    Returns None when there are no compatible peers, which the planner
    surfaces to the user as "couldn't change style". That matches the
    Suresh-standard: never silently produce a non-change.
    """
    if not target_id:
        return None
    target = next((i for i in room.items if i.id == target_id), None)
    if target is None:
        return None

    # Resolve current + peer pool from the philosophy menu when possible.
    pool: list[CatalogItem] = []
    current: CatalogItem | None = None
    if room.philosophy:
        menu = get_menu(room.intake.room_type.value, room.philosophy)
        pool = list(menu.values())
        current = next((c for c in pool if c.sku == target.catalog.sku), None)
    if current is None:
        # Legacy room state without philosophy attached, or item from the
        # hero catalog. Search the full hero catalog as a fallback.
        catalog = get_catalog()
        current = catalog.get(target.catalog.sku)
        pool = list(catalog._items)  # noqa: SLF001
    if current is None:
        return None

    def _dims_ok(c: CatalogItem) -> bool:
        # ±1000mm on each axis — generous enough to let a 3-seat sofa swap
        # with a 2-seat sofa, but tight enough that an ottoman doesn't take
        # over a sofa's spot and leave the layout broken.
        return (
            abs(c.dimensions.width_mm - current.dimensions.width_mm) <= 1000
            and abs(c.dimensions.depth_mm - current.dimensions.depth_mm) <= 1000
        )

    # Two-tier peer search. Most curated menus group same-kind items (sofa,
    # sofa_l, sofa_2seat) under the same first tag, so tag-match gives the
    # cleanest swap pool. But singletons like 'diwan' or 'coffee_table' have
    # no tag peers — for those, fall back to same-category matching so the
    # user still gets a meaningful swap (a diwan can become a sofa) instead
    # of silent no-op. Both tiers respect the ±1m dimension tolerance.
    primary_tag = current.tags[0] if current.tags else None
    tag_peers: list[CatalogItem] = []
    if primary_tag:
        tag_peers = [
            c for c in pool
            if c.sku != current.sku
            and c.tags
            and c.tags[0] == primary_tag
            and _dims_ok(c)
        ]
    if tag_peers:
        peers = sorted(tag_peers, key=lambda c: c.sku)
    else:
        peers = sorted(
            (c for c in pool if c.sku != current.sku and c.category == current.category and _dims_ok(c)),
            key=lambda c: c.sku,
        )
    if not peers:
        return None

    # Pick the next peer alphabetically AFTER the current SKU so clicking
    # Style repeatedly rotates around the available alternatives.
    next_item = next((p for p in peers if p.sku > current.sku), peers[0])

    out: list[PlacedItem] = []
    for i in room.items:
        if i.id != target_id:
            out.append(i)
            continue
        out.append(
            PlacedItem(
                id=i.id,
                catalog=CatalogRef(
                    sku=next_item.sku,
                    asset_url=next_item.asset_url,
                    tint_hex=next_item.tint_hex,
                    roughness_hint=next_item.roughness_hint,
                    size_label=next_item.size_label,
                    material_label=next_item.material_label,
                    finish_label=next_item.finish_label,
                    placement_type=next_item.placement_type,
                ),
                name_en=next_item.name_en,
                name_hi=next_item.name_hi,
                category=next_item.category,
                dimensions=Dimensions(
                    width_mm=next_item.dimensions.width_mm,
                    depth_mm=next_item.dimensions.depth_mm,
                    height_mm=next_item.dimensions.height_mm,
                ),
                position=i.position,
                facing=i.facing,
                is_buy=i.is_buy,
                price_inr=next_item.price_inr,
                build_price_inr=next_item.build_price_inr,
            )
        )
    return room.model_copy(update={"items": out})


def _add(room: RoomState, params: dict) -> RoomState | None:
    sku = params.get("sku")
    sub = params.get("sub_category") if isinstance(params.get("sub_category"), str) else None

    # Prefer the curated menu for this (room_type, philosophy) — that's the same
    # menu the planner drawer serves and the AI sees in its prompt. Round-tripped
    # SKUs always resolve; sub_category lookups land on a real curated GLB.
    menu = get_menu(room.intake.room_type.value, room.philosophy) if room.philosophy else {}
    item = None
    if isinstance(sku, str):
        for entry in menu.values():
            if entry.sku == sku:
                item = entry
                break
    if item is None and sub:
        item = menu.get(sub)

    # Hero catalog fallback ONLY when the room has no philosophy attached.
    # When philosophy IS set, refusing unknown subs is safer than serving a hero
    # SKU that points at a deleted `3df/*.glb` asset — the frontend would silently
    # fail to render. The drawer/AI both already steer toward menu items.
    if item is None and not room.philosophy:
        catalog = get_catalog()
        item = catalog.get(sku) if isinstance(sku, str) else None
        if item is None and sub:
            candidates = [
                c for c in catalog._items  # noqa: SLF001
                if c.sub_category == sub and room.intake.room_type in c.rooms
            ]
            if not candidates:
                candidates = [c for c in catalog._items if c.sub_category == sub]  # noqa: SLF001
            if candidates:
                item = min(candidates, key=lambda c: c.price_inr)
    if item is None:
        return None
    new_id = f"{item.sub_category}-{uuid.uuid4().hex[:6]}"
    new_dims = Dimensions(
        width_mm=item.dimensions.width_mm,
        depth_mm=item.dimensions.depth_mm,
        height_mm=item.dimensions.height_mm,
    )
    # Find a wall-snapped position that doesn't disturb existing items.
    position = _wall_snap_place(room, item.category, new_dims)
    placed = PlacedItem(
        id=new_id,
        catalog=CatalogRef(
            sku=item.sku,
            asset_url=item.asset_url,
            tint_hex=item.tint_hex,
            roughness_hint=item.roughness_hint,
            size_label=item.size_label,
            material_label=item.material_label,
            finish_label=item.finish_label,
            placement_type=item.placement_type,
        ),
        name_en=item.name_en,
        name_hi=item.name_hi,
        category=item.category,
        dimensions=new_dims,
        position=position,
        facing=None,
        is_buy=item.category not in {"storage", "tv_unit", "mandir", "kitchen"},
        price_inr=item.price_inr,
        build_price_inr=item.build_price_inr,
    )
    return room.model_copy(update={"items": [*room.items, placed]})


# ---------- Smart wall-snap placement for ADD ----------


# Preferred wall order by category. First hit that produces a non-overlapping
# slot wins; if nothing fits, fall back to the first wall's center.
_WALL_PREFS: dict[str, list[str]] = {
    "sleeping":  ["opp_entrance", "W", "E", "N", "S"],
    "seating":   ["W", "E", "S", "N"],
    "storage":   ["W", "E", "N", "S"],
    "tv_unit":   ["opp_entrance", "W", "E", "N", "S"],
    "dining":    ["N", "S", "W", "E"],
    "mandir":    ["N", "S", "W", "E"],
    "decor":     ["W", "E", "N", "S"],
    "lighting":  ["N", "S", "W", "E"],
}
_WALL_MARGIN_MM = 150   # mm from wall face to item centre
_SCAN_STEP_MM = 200     # mm step when scanning along a wall for a clear slot
_OVERLAP_MARGIN_MM = 100  # minimum clearance between items


def _opposite_wall(d: str) -> str:
    return {"N": "S", "S": "N", "E": "W", "W": "E"}.get(d, "N")


def _aabb_overlaps(
    cx1: int, cz1: int, w1: int, d1: int,
    cx2: int, cz2: int, w2: int, d2: int,
    margin: int = _OVERLAP_MARGIN_MM,
) -> bool:
    return (
        abs(cx1 - cx2) < (w1 + w2) / 2 + margin
        and abs(cz1 - cz2) < (d1 + d2) / 2 + margin
    )


def _slot_clear(
    items: list[PlacedItem],
    cx: int, cz: int,
    new_w: int, new_d: int,
) -> bool:
    for i in items:
        iw, id_ = i.dimensions.width_mm, i.dimensions.depth_mm
        if int(i.position.rotation_deg) % 180 == 90:
            iw, id_ = id_, iw
        if _aabb_overlaps(cx, cz, new_w, new_d, i.position.x_mm, i.position.z_mm, iw, id_):
            return False
    return True


def _wall_snap_place(room: RoomState, category: str, dims: Dimensions) -> Position:
    """Return a Position along a preferred wall where the item fits without overlapping
    existing items. Existing items are never moved."""
    rw = room.intake.room_dimensions.width_mm
    rd = room.intake.room_dimensions.depth_mm
    entrance = room.intake.entrance_direction.value if hasattr(room.intake.entrance_direction, "value") else str(room.intake.entrance_direction)
    iw, id_ = dims.width_mm, dims.depth_mm

    wall_order = _WALL_PREFS.get(category, ["S", "N", "W", "E"])
    resolved_walls = [
        _opposite_wall(entrance) if w == "opp_entrance" else w
        for w in wall_order
    ]

    fallback: Position | None = None
    m = _WALL_MARGIN_MM

    for wall in resolved_walls:
        if wall in ("S", "N"):
            # Item long-axis runs along x; depth sticks into the room.
            eff_w, eff_d = iw, id_
            z = m + eff_d // 2 if wall == "S" else rd - m - eff_d // 2
            rot = 0 if wall == "S" else 180
            for x in range(eff_w // 2 + 200, rw - eff_w // 2 - 200, _SCAN_STEP_MM):
                if _slot_clear(room.items, x, z, eff_w, eff_d):
                    return Position(x_mm=x, z_mm=z, rotation_deg=rot)
            if fallback is None:
                fallback = Position(x_mm=rw // 2, z_mm=z, rotation_deg=rot)
        else:  # W or E
            eff_w, eff_d = id_, iw  # rotated 90° — depth becomes wall-parallel
            x = m + eff_w // 2 if wall == "W" else rw - m - eff_w // 2
            rot = 270 if wall == "W" else 90
            for z in range(eff_d // 2 + 200, rd - eff_d // 2 - 200, _SCAN_STEP_MM):
                if _slot_clear(room.items, x, z, eff_w, eff_d):
                    return Position(x_mm=x, z_mm=z, rotation_deg=rot)
            if fallback is None:
                fallback = Position(x_mm=x, z_mm=rd // 2, rotation_deg=rot)

    return fallback or Position(x_mm=rw // 2, z_mm=rd // 2, rotation_deg=0)


def _mix(
    room: RoomState,
    params: dict,
    available: list[Vision],
) -> RoomState | None:
    """Bring an item / palette / philosophy from a sibling vision into this room.

    Parameters supported:
      - source_vision: vision id OR philosophy ('gathering' / 'breath' / 'keeper')
      - bring: 'mandir' | 'palette' | 'flooring' | 'storage' | <category> | <sub_category>
    """
    if not available:
        return None
    src_key = str(params.get("source_vision") or "").lower()
    bring = str(params.get("bring") or "").lower()
    if not src_key or not bring:
        return None
    source = next(
        (
            v for v in available
            if v.id == src_key or v.philosophy.value == src_key or v.name.lower() == src_key
        ),
        None,
    )
    if source is None:
        return None

    update: dict = {}
    new_items = list(room.items)

    if bring == "palette":
        update["palette"] = dict(source.room_state.palette)
    elif bring == "flooring":
        update["flooring"] = source.room_state.flooring
        if "floor" in source.room_state.palette:
            new_palette = dict(room.palette)
            new_palette["floor"] = source.room_state.palette["floor"]
            update["palette"] = new_palette
    else:
        # Bring an item by category / sub_category from the source vision.
        match = _find_item(source.room_state, bring)
        if match is None:
            return None
        # Replace existing same-category item if present, else append.
        replaced = False
        for i, existing in enumerate(new_items):
            if existing.category == match.category:
                new_items[i] = match.model_copy(update={"id": existing.id})
                replaced = True
                break
        if not replaced:
            new_items.append(match.model_copy(update={"id": f"{match.category}-{uuid.uuid4().hex[:6]}"}))
        update["items"] = new_items

    return room.model_copy(update=update)


def _find_item(source_room: RoomState, bring: str):
    """Find an item in the source room matching `bring` (sub_category | category)."""
    bring = bring.replace(" ", "_")
    for it in source_room.items:
        if it.category == bring:
            return it
    # Heuristic name match
    for it in source_room.items:
        if bring in it.name_en.lower():
            return it
    return None


def _change_finish(room: RoomState, target_id: str | None, params: dict) -> RoomState | None:
    """Apply a finish/material change visually via tint_hex and roughness_hint on CatalogRef."""
    if not target_id:
        return None
    tint = params.get("tint_hex")
    roughness = params.get("roughness_hint")
    if not tint and roughness is None:
        return room
    out: list[PlacedItem] = []
    found = False
    for i in room.items:
        if i.id != target_id:
            out.append(i)
            continue
        updates: dict = {}
        if tint and isinstance(tint, str) and tint.startswith("#"):
            updates["tint_hex"] = tint
        if roughness is not None:
            try:
                updates["roughness_hint"] = max(0.0, min(1.0, float(roughness)))
            except (TypeError, ValueError):
                pass
        new_catalog = i.catalog.model_copy(update=updates) if updates else i.catalog
        out.append(i.model_copy(update={"catalog": new_catalog}))
        found = True
    if not found:
        return None
    return room.model_copy(update={"items": out})


# ---------- Solver re-run ----------


def _resolve(room: RoomState) -> RoomState:
    """Re-run the solver against the current items. If the solver succeeds,
    update positions to the new layout. If it fails for some items, leave
    those items at their current (potentially overlapping) position — the
    frontend can flag this; better than throwing the whole change away."""
    if not room.items:
        return room

    entrance_door = DoorOpening(
        wall=room.intake.entrance_direction,
        position_frac=0.5,
        width_mm=900,
    )
    solver_items = tuple(
        SolverItem(
            id=i.id,
            category=i.category,
            # Item IDs are formatted as "{sub_category}-{hex}" by selector.py;
            # extract the prefix so the TV back-wall bonus fires correctly.
            sub_category=i.id.split("-")[0] if "-" in i.id else i.category,
            width_mm=i.dimensions.width_mm,
            depth_mm=i.dimensions.depth_mm,
            height_mm=i.dimensions.height_mm,
            against_wall=i.category in {"seating", "sleeping", "storage", "tv_unit", "mandir"},
        )
        for i in room.items
    )
    zones = composition_for(room.intake.room_type.value, room.philosophy) if room.philosophy else ()
    res = solve(
        SolverInput(
            width_mm=room.intake.room_dimensions.width_mm,
            depth_mm=room.intake.room_dimensions.depth_mm,
            entrance=room.intake.entrance_direction,
            items=solver_items,
            zones=zones,
            vastu_enabled=room.intake.vastu_matters,
            room_type=room.intake.room_type.value,
            doors=(entrance_door,),
        )
    )
    by_id = {p.item_id: p for p in res.placements}
    new_items: list[PlacedItem] = []
    for i in room.items:
        p = by_id.get(i.id)
        if p is None:
            new_items.append(i)  # solver couldn't place — keep prior position
            continue
        new_pos = i.position.model_copy(update={
            "x_mm": p.x_mm,
            "z_mm": p.z_mm,
            "rotation_deg": float(p.rotation_deg),
        })
        new_items.append(i.model_copy(update={"position": new_pos}))
    return room.model_copy(update={"items": new_items})
