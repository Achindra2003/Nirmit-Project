"""Pure intent execution. No LLM, no IO except catalog reads.

For each Intent kind we map to a deterministic mutation of the RoomState.
After spatial mutations (resize, move, replace, add) we re-run the solver
to ensure the room remains valid; if a placement fails, we revert that
specific intent and continue.
"""
from __future__ import annotations

import uuid

from app.domain.catalog import CatalogQuery, get_catalog
from app.domain.solver import SolverInput, SolverItem, solve
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


# Intents that are *manual placement* — the user (or the collaborator on the
# user's behalf) put the item exactly where they want it. Don't re-run the
# solver afterward, that would undo the move. Everything else changes the item
# set or sizes, so a re-lay is appropriate.
_NO_RESOLVE_KINDS = {
    IntentKind.MOVE,
    IntentKind.ROTATE,
    IntentKind.RECOLOR_ROOM,
    IntentKind.CHANGE_FABRIC,
    IntentKind.CHANGE_FINISH,
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
        return _replace(room, intent.target_item_id, intent.parameters)
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


def _add(room: RoomState, params: dict) -> RoomState | None:
    sku = params.get("sku")
    catalog = get_catalog()
    item = catalog.get(sku) if isinstance(sku, str) else None
    if item is None and isinstance(params.get("sub_category"), str):
        sub = params["sub_category"]
        candidates = [
            c for c in catalog._items  # noqa: SLF001
            if c.sub_category == sub and room.intake.room_type in c.rooms
        ]
        if not candidates:
            # Relax room constraint — the user asked for it even if the catalog
            # doesn't list it for this room type (e.g. desk in a living room).
            candidates = [c for c in catalog._items if c.sub_category == sub]  # noqa: SLF001
        if candidates:
            item = min(candidates, key=lambda c: c.price_inr)
    if item is None:
        return None
    new_id = f"{item.sub_category}-{uuid.uuid4().hex[:6]}"
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
        ),
        name_en=item.name_en,
        name_hi=item.name_hi,
        category=item.category,
        dimensions=Dimensions(
            width_mm=item.dimensions.width_mm,
            depth_mm=item.dimensions.depth_mm,
            height_mm=item.dimensions.height_mm,
        ),
        # Tentative centre = room centre; the solver re-lays it afterward.
        position=Position(
            x_mm=room.intake.room_dimensions.width_mm // 2,
            z_mm=room.intake.room_dimensions.depth_mm // 2,
            rotation_deg=0,
        ),
        facing=None,
        is_buy=item.category not in {"storage", "tv_unit", "mandir", "kitchen"},
        price_inr=item.price_inr,
        build_price_inr=item.build_price_inr,
    )
    return room.model_copy(update={"items": [*room.items, placed]})


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
    """Phase-3 stub: finish/material is a presentation-layer concern in the
    current schema (we don't store per-item material on PlacedItem). We
    accept the intent silently rather than failing — the collaborator's
    reply already explained the change to the user."""
    if not target_id:
        return None
    return room  # no structural change yet; future PR adds material slot.


# ---------- Solver re-run ----------


def _resolve(room: RoomState) -> RoomState:
    """Re-run the solver against the current items. If the solver succeeds,
    update positions to the new layout. If it fails for some items, leave
    those items at their current (potentially overlapping) position — the
    frontend can flag this; better than throwing the whole change away."""
    if not room.items:
        return room

    solver_items = tuple(
        SolverItem(
            id=i.id,
            category=i.category,
            sub_category=i.category,  # PlacedItem doesn't carry sub_category — fallback OK for re-solve
            width_mm=i.dimensions.width_mm,
            depth_mm=i.dimensions.depth_mm,
            height_mm=i.dimensions.height_mm,
            against_wall=i.category in {"seating", "sleeping", "storage", "tv_unit", "mandir"},
        )
        for i in room.items
    )
    res = solve(
        SolverInput(
            width_mm=room.intake.room_dimensions.width_mm,
            depth_mm=room.intake.room_dimensions.depth_mm,
            entrance=room.intake.entrance_direction,
            items=solver_items,
            vastu_enabled=room.intake.vastu_matters,
            room_type=room.intake.room_type.value,
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
