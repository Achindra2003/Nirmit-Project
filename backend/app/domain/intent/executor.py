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
        # A grown piece can now poke through a wall or into a neighbour from a
        # centre that was fine at the old size — re-place it safely.
        eff_w, eff_d = _effective_footprint(new_w, new_d, i.position.rotation_deg)
        nx, nz = _find_clear_centre(room, target_id, i.position.x_mm, i.position.z_mm, eff_w, eff_d)
        new_pos = i.position.model_copy(update={"x_mm": nx, "z_mm": nz})
        out.append(i.model_copy(update={"dimensions": new_dims, "position": new_pos}))
        found = True
    if not found:
        return None
    return room.model_copy(update={"items": out})


def _coord(params: dict, *keys, default: int = 0) -> int:
    """First parseable int among `keys`, else `default`. Accepts numeric
    strings since the intent coercer stringifies non-scalar params."""
    for k in keys:
        if k in params and params[k] is not None:
            try:
                return int(round(float(params[k])))
            except (TypeError, ValueError):
                continue
    return default


def _move(room: RoomState, target_id: str | None, params: dict) -> RoomState | None:
    """Re-place an item. The result is always bounds-safe and slid clear of
    other pieces — the LLM's numbers are treated as a request, not gospel.

    Three ways to express the move (in priority order):
      1. wall:    "N|S|E|W" (or "opp_entrance") — snap flush to that wall,
                  facing into the room. Best for "put the sofa on the north
                  wall"; the LLM never has to compute coordinates.
      2. nudge:   dx_mm / dz_mm — shift relative to the current centre.
      3. absolute: x_mm / z_mm — explicit footprint centre (last resort).

    Whatever path is taken, the final centre is clamped inside the room and
    nudged to the nearest non-overlapping slot. Other items never move."""
    if not target_id:
        return None
    target = next((i for i in room.items if i.id == target_id), None)
    if target is None:
        return None

    wall = _norm_wall(params.get("wall"), room)
    if wall is not None:
        new_pos = _wall_slot(room, wall, target.dimensions, exclude_id=target_id) \
            or _wall_flush_centre(room, wall, target.dimensions)
    else:
        if "dx_mm" in params or "dz_mm" in params or "dx" in params or "dz" in params:
            cx = target.position.x_mm + _coord(params, "dx_mm", "dx")
            cz = target.position.z_mm + _coord(params, "dz_mm", "dz")
        else:
            cx = _coord(params, "x_mm", "x", default=target.position.x_mm)
            cz = _coord(params, "z_mm", "z", default=target.position.z_mm)
        eff_w, eff_d = _effective_footprint(
            target.dimensions.width_mm, target.dimensions.depth_mm, target.position.rotation_deg
        )
        nx, nz = _find_clear_centre(room, target_id, cx, cz, eff_w, eff_d)
        new_pos = target.position.model_copy(update={"x_mm": nx, "z_mm": nz})

    out = [
        i.model_copy(update={"position": new_pos}) if i.id == target_id else i
        for i in room.items
    ]
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
        # Rotating swaps the footprint's room-axis extents — a long piece that
        # fit flush against a wall can now poke through it. Re-clamp the centre
        # for the new orientation (excluding itself from the collision check).
        eff_w, eff_d = _effective_footprint(i.dimensions.width_mm, i.dimensions.depth_mm, new_rot)
        nx, nz = _find_clear_centre(room, target_id, i.position.x_mm, i.position.z_mm, eff_w, eff_d)
        new_pos = i.position.model_copy(update={"rotation_deg": new_rot, "x_mm": nx, "z_mm": nz})
        out.append(i.model_copy(update={"position": new_pos}))
        found = True
    return room.model_copy(update={"items": out}) if found else None


def _duplicate(room: RoomState, target_id: str | None) -> RoomState | None:
    if not target_id:
        return None
    src = next((i for i in room.items if i.id == target_id), None)
    if src is None:
        return None
    # Offset the copy along +x, then slide it to the nearest clear, in-bounds
    # slot so it doesn't clip a wall or sit on top of its source.
    eff_w, eff_d = _effective_footprint(
        src.dimensions.width_mm, src.dimensions.depth_mm, src.position.rotation_deg
    )
    nx, nz = _find_clear_centre(
        room, None, src.position.x_mm + 400, src.position.z_mm, eff_w, eff_d
    )
    clone = src.model_copy(update={
        "id": f"{src.category}-{uuid.uuid4().hex[:6]}",
        "position": src.position.model_copy(update={"x_mm": nx, "z_mm": nz}),
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
    # Material rates (₹/sqft) for the chosen finish — these are what make the
    # selection flow through to the cost engine and BOQ. Stored alongside the
    # label so price and name can never drift apart.
    wall_rate = params.get("wall_finish_rate_inr_sqft")
    if isinstance(wall_rate, (int, float)) and wall_rate >= 0:
        update["wall_finish_rate_inr_sqft"] = int(wall_rate)
    floor_rate = params.get("floor_rate_inr_sqft")
    if isinstance(floor_rate, (int, float)) and floor_rate >= 0:
        update["floor_rate_inr_sqft"] = int(floor_rate)
    kelvin = params.get("lighting_kelvin")
    if isinstance(kelvin, (int, float)) and 2200 <= kelvin <= 6500:
        update["lighting_kelvin"] = int(kelvin)
    # Daylight direction — the compass wall the room's main window faces. Drives
    # the natural-light character in the 3D scene.
    direction = params.get("light_direction")
    if isinstance(direction, str) and direction.upper() in {"N", "NE", "E", "SE", "S", "SW", "W", "NW"}:
        update["light_direction"] = direction.upper()
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


def _effective_footprint(width_mm: int, depth_mm: int, rotation_deg: float) -> tuple[int, int]:
    """Footprint extents as they sit in room coords after rotation.

    A piece rotated 90°/270° has its width and depth swapped relative to the
    room's x/z axes. Every bounds/collision check below works in room coords,
    so it must use these effective extents — not the raw catalog dims."""
    if int(round(rotation_deg)) % 180 == 90:
        return depth_mm, width_mm
    return width_mm, depth_mm


def _clamp_centre(cx: int, cz: int, eff_w: int, eff_d: int, rw: int, rd: int) -> tuple[int, int]:
    """Pull a footprint CENTRE inside the room so no edge pokes through a wall.

    This is the guard the AI move path was missing — it mirrors the frontend's
    manual-drag clamp (`Planner2D.snapCentre`). If the piece is somehow larger
    than the room on an axis, we centre it on that axis rather than emit a
    nonsensical clamp."""
    half_w, half_d = eff_w / 2, eff_d / 2
    x = rw // 2 if eff_w >= rw else int(round(max(half_w, min(cx, rw - half_w))))
    z = rd // 2 if eff_d >= rd else int(round(max(half_d, min(cz, rd - half_d))))
    return x, z


def _aabb_overlaps(
    cx1: int, cz1: int, w1: int, d1: int,
    cx2: int, cz2: int, w2: int, d2: int,
    margin: int = _OVERLAP_MARGIN_MM,
) -> bool:
    return (
        abs(cx1 - cx2) < (w1 + w2) / 2 + margin
        and abs(cz1 - cz2) < (d1 + d2) / 2 + margin
    )


def _is_floor_obstacle(item: PlacedItem) -> bool:
    """Whether a placed item occupies floor space that another piece must avoid.

    Excludes things furniture is *meant* to coexist with: wall-mounted and
    ceiling pieces (art, mirrors, pendants — different vertical plane) and flat
    floor mats like rugs (height ≤ 60mm), which deliberately sit *under* the
    sofa and coffee table. Treating a rug as a solid obstacle made the move
    slide-clear unable to place anything over it — wrong, and it broke once the
    hero room gained a room-spanning rug."""
    pt = item.catalog.placement_type
    if pt in ("wall", "ceiling"):
        return False
    if item.dimensions.height_mm <= 60:
        return False
    return True


def _slot_clear(
    items: list[PlacedItem],
    cx: int, cz: int,
    new_w: int, new_d: int,
    *,
    exclude_id: str | None = None,
) -> bool:
    """True if a footprint at (cx, cz) clears every floor obstacle except
    `exclude_id`.

    `exclude_id` matters for MOVE/SCALE/ROTATE: the piece being re-placed must
    not be tested against its own old footprint, or it would always read as
    "blocked by itself"."""
    for i in items:
        if exclude_id is not None and i.id == exclude_id:
            continue
        if not _is_floor_obstacle(i):
            continue
        iw, id_ = _effective_footprint(i.dimensions.width_mm, i.dimensions.depth_mm, i.position.rotation_deg)
        if _aabb_overlaps(cx, cz, new_w, new_d, i.position.x_mm, i.position.z_mm, iw, id_):
            return False
    return True


def _find_clear_centre(
    room: RoomState,
    target_id: str | None,
    cx: int, cz: int,
    eff_w: int, eff_d: int,
) -> tuple[int, int]:
    """Clamp (cx, cz) into bounds, then slide to the nearest non-overlapping
    centre if it lands on another piece. Existing items are never moved.

    Returns the clamped centre even if no clear slot is found within range —
    better to land a slightly-overlapping piece than to throw the user's move
    away. The caller has already been told this is a best-effort placement."""
    rw = room.intake.room_dimensions.width_mm
    rd = room.intake.room_dimensions.depth_mm
    cx, cz = _clamp_centre(cx, cz, eff_w, eff_d, rw, rd)
    if _slot_clear(room.items, cx, cz, eff_w, eff_d, exclude_id=target_id):
        return cx, cz
    # Expanding ring search in the 8 compass directions — finds the closest
    # clear pocket without scanning the whole floor.
    dirs = [(1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)]
    for r in range(_SCAN_STEP_MM, max(rw, rd) + _SCAN_STEP_MM, _SCAN_STEP_MM):
        for ux, uz in dirs:
            nx, nz = _clamp_centre(cx + ux * r, cz + uz * r, eff_w, eff_d, rw, rd)
            if _slot_clear(room.items, nx, nz, eff_w, eff_d, exclude_id=target_id):
                return nx, nz
    return cx, cz


def _norm_wall(value, room: RoomState) -> str | None:
    """Normalise an LLM-supplied wall hint to N/S/E/W, or None if unusable.

    Accepts the four compass letters (any case) plus the convenience tokens
    'opp_entrance' / 'opposite' (resolved against the room's entrance)."""
    if not isinstance(value, str):
        return None
    v = value.strip().upper()
    if v in ("N", "S", "E", "W"):
        return v
    if v in ("OPP_ENTRANCE", "OPPOSITE", "OPP"):
        entrance = room.intake.entrance_direction
        entrance = entrance.value if hasattr(entrance, "value") else str(entrance)
        return _opposite_wall(entrance)
    return None


def _wall_slot(
    room: RoomState,
    wall: str,
    dims: Dimensions,
    *,
    exclude_id: str | None = None,
) -> Position | None:
    """Scan `wall` for a clear, in-bounds Position flush against it, depth
    facing into the room. Returns None if the wall has no clear slot."""
    rw = room.intake.room_dimensions.width_mm
    rd = room.intake.room_dimensions.depth_mm
    iw, id_ = dims.width_mm, dims.depth_mm
    m = _WALL_MARGIN_MM
    if wall in ("S", "N"):
        eff_w, eff_d = iw, id_
        z = m + eff_d // 2 if wall == "S" else rd - m - eff_d // 2
        rot = 0 if wall == "S" else 180
        for x in range(eff_w // 2 + 200, rw - eff_w // 2 - 200, _SCAN_STEP_MM):
            if _slot_clear(room.items, x, z, eff_w, eff_d, exclude_id=exclude_id):
                return Position(x_mm=x, z_mm=z, rotation_deg=rot)
    else:  # W or E — depth runs wall-parallel, so width sticks into the room
        eff_w, eff_d = id_, iw
        x = m + eff_w // 2 if wall == "W" else rw - m - eff_w // 2
        rot = 270 if wall == "W" else 90
        for z in range(eff_d // 2 + 200, rd - eff_d // 2 - 200, _SCAN_STEP_MM):
            if _slot_clear(room.items, x, z, eff_w, eff_d, exclude_id=exclude_id):
                return Position(x_mm=x, z_mm=z, rotation_deg=rot)
    return None


def _wall_flush_centre(room: RoomState, wall: str, dims: Dimensions) -> Position:
    """Flush midpoint of `wall` — the fallback when no clear slot exists."""
    rw = room.intake.room_dimensions.width_mm
    rd = room.intake.room_dimensions.depth_mm
    m = _WALL_MARGIN_MM
    if wall == "S":
        return Position(x_mm=rw // 2, z_mm=m + dims.depth_mm // 2, rotation_deg=0)
    if wall == "N":
        return Position(x_mm=rw // 2, z_mm=rd - m - dims.depth_mm // 2, rotation_deg=180)
    if wall == "W":
        return Position(x_mm=m + dims.depth_mm // 2, z_mm=rd // 2, rotation_deg=270)
    return Position(x_mm=rw - m - dims.depth_mm // 2, z_mm=rd // 2, rotation_deg=90)


def _wall_snap_place(
    room: RoomState,
    category: str,
    dims: Dimensions,
    *,
    exclude_id: str | None = None,
) -> Position:
    """Return a Position along a preferred wall where the item fits without
    overlapping existing items. Existing items are never moved."""
    entrance = room.intake.entrance_direction.value if hasattr(room.intake.entrance_direction, "value") else str(room.intake.entrance_direction)
    wall_order = _WALL_PREFS.get(category, ["S", "N", "W", "E"])
    resolved_walls = [
        _opposite_wall(entrance) if w == "opp_entrance" else w
        for w in wall_order
    ]

    fallback: Position | None = None
    for wall in resolved_walls:
        slot = _wall_slot(room, wall, dims, exclude_id=exclude_id)
        if slot is not None:
            return slot
        if fallback is None:
            fallback = _wall_flush_centre(room, wall, dims)

    rw = room.intake.room_dimensions.width_mm
    rd = room.intake.room_dimensions.depth_mm
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
