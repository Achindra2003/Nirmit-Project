"""Cross-sell / up-sell engine — deterministic, profile- and budget-aware."""
from __future__ import annotations

from app.domain.suggest import suggest_for_room
from app.schemas.state import (
    CatalogRef,
    Dimensions,
    Direction,
    Intake,
    IntentKind,
    PlacedItem,
    Position,
    RoomState,
    RoomType,
    Vibe,
)


def _item(sub: str, price: int, w: int = 2000, d: int = 900, h: int = 800) -> PlacedItem:
    return PlacedItem(
        id=f"{sub}-{sub[:3]}1",
        catalog=CatalogRef(sku=sub.upper(), asset_url=f"{sub}.glb"),
        name_en=sub.replace("_", " ").title(),
        category="seating" if "sofa" in sub else sub,
        dimensions=Dimensions(width_mm=w, depth_mm=d, height_mm=h),
        position=Position(x_mm=1000, z_mm=1000),
        price_inr=price,
        is_buy=True,
    )


def _room(who: str, items, budget: int = 500_000, philosophy: str = "gathering",
          room_type: RoomType = RoomType.LIVING) -> RoomState:
    intake = Intake(
        room_type=room_type,
        room_dimensions=Dimensions(width_mm=4200, depth_mm=3600, height_mm=3000),
        entrance_direction=Direction.S,
        who_lives_here=who,
        vibe=Vibe.WARM_TRADITIONAL,
        budget_inr=budget,
    )
    return RoomState(id="r1", philosophy=philosophy, intake=intake, items=items,
                     palette={"wall": "#EFE0CD", "floor": "#B89B7A"})


def test_cross_sell_suggests_missing_complements():
    room = _room("a young couple", [_item("sofa", 42000)])
    sugg = suggest_for_room(room)
    assert sugg, "expected complement suggestions for a bare living room"
    subs = {s.intent.parameters.get("sub_category") for s in sugg}
    # A rug is the headline complement and is in the living menu.
    assert "rug" in subs
    assert all(s.intent.kind == IntentKind.ADD for s in sugg if s.kind == "cross_sell")
    assert all(s.reason for s in sugg)  # every suggestion carries a why


def test_suggestions_never_break_budget():
    # Budget so small the room is already over → nothing should be suggested.
    room = _room("a young couple", [_item("sofa", 42000)], budget=10_000)
    assert suggest_for_room(room) == []


def test_couple_gets_no_extra_seat():
    room = _room("just the two of us, a couple", [_item("bed_queen", 30000)],
                 room_type=RoomType.BEDROOM)
    subs = {s.intent.parameters.get("sub_category") for s in suggest_for_room(room, limit=10)}
    assert "bench" not in subs  # a couple doesn't need a bench at the bed foot


def test_up_sell_sofa_for_joint_family():
    room = _room("joint family, parents and kids", [_item("sofa", 42000)])
    sugg = suggest_for_room(room, limit=10)
    up = [s for s in sugg if s.kind == "up_sell"]
    assert up, "joint family with a 3-seater should be offered the L-sectional"
    s = up[0]
    assert s.intent.kind == IntentKind.REPLACE
    assert s.intent.parameters.get("sub_category") == "sofa_l"
    assert s.price_inr > 0  # the delta is the up-sell cost
