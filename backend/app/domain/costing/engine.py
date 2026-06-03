"""Pure cost math. No LLM, no IO."""
from __future__ import annotations

from app.domain.boq.boq import BUILD_CATEGORIES, build_boq
from app.domain.finishing import (
    DEFAULT_FLOOR_RATE_SQFT,
    DEFAULT_WALL_RATE_SQFT,
    floor_rate_for_hex,
    paint_rate_for_hex,
)
from app.schemas.state import (
    BudgetStory,
    CostBreakdown,
    CostLineItem,
    PlacedItem,
    RoomState,
)

# Anchor: Livspace's typical quote for a comparable Indian living room is roughly
# 2-3x what a curated middle-path design costs. This is a coarse anchor used only
# for the "comparison" line — exact value tunable per room type later.
_LIVSPACE_MULTIPLIER = 2.4

_SQM_TO_SQFT = 10.7639


def materials_cost(room: RoomState) -> int:
    """Cost of the user-selectable wall + floor finishes (area × ₹/sqft).

    This is the piece that was previously missing entirely from the live
    estimate — which is why changing a paint or floor never moved the number.
    The rate comes from the selected finish (stored on the room), falling back
    to the catalog default for an untouched room. Putty/skirting/polish are
    fixed overhead and stay in the BOQ only, so this stays a clean read of
    "what the chosen finishes cost".
    """
    dims = room.intake.room_dimensions
    width_m = dims.width_mm / 1000
    depth_m = dims.depth_mm / 1000
    height_m = dims.height_mm / 1000
    wall_sqft = 2 * (width_m + depth_m) * height_m * _SQM_TO_SQFT
    floor_sqft = width_m * depth_m * _SQM_TO_SQFT

    wall_rate = (
        room.wall_finish_rate_inr_sqft
        if room.wall_finish_rate_inr_sqft is not None
        else paint_rate_for_hex(room.palette.get("wall")) or DEFAULT_WALL_RATE_SQFT
    )
    floor_rate = (
        room.floor_rate_inr_sqft
        if room.floor_rate_inr_sqft is not None
        else floor_rate_for_hex(room.palette.get("floor")) or DEFAULT_FLOOR_RATE_SQFT
    )
    return int(round(wall_sqft * wall_rate + floor_sqft * floor_rate))


def effective_price(item: PlacedItem) -> int:
    """What this piece actually costs in the quotation: build items at their
    carpenter build price, bought items at retail. Mirrors the BOQ so the live
    estimate and the downloadable quote price every piece identically."""
    is_build = item.category in BUILD_CATEGORIES or not item.is_buy
    return (item.build_price_inr or item.price_inr) if is_build else item.price_inr


def build_cost_breakdown(room: RoomState) -> CostBreakdown:
    line_items = [
        CostLineItem(
            item_id=item.id,
            name=item.name_en,
            category=item.category,
            price_inr=effective_price(item),
            build_alternative_inr=item.build_price_inr,
            is_buy=item.is_buy,
        )
        for item in room.items
    ]
    # The ONE all-in number. We total it the way the carpenter's quotation does
    # — furniture + materials + installation labour + contingency + GST — so the
    # estimate the user sees IS what they'll pay, and every add / up-sell is
    # checked against the real cost (the carpenter's labour included), never a
    # furniture-only sticker that quietly overshoots once the work is priced.
    boq = build_boq(room, city=room.intake.city)
    materials = sum(l.amount_inr for l in boq.materials)
    labor = sum(l.amount_inr for l in boq.labor)
    taxes = boq.contingency_inr + boq.gst_inr
    total = boq.grand_total_inr
    budget = room.intake.budget_inr
    remaining = budget - total
    livspace_pct = round(100 * total / max(int(budget * _LIVSPACE_MULTIPLIER), 1))

    headline = _budget_headline(total=total, budget=budget, remaining=remaining)

    return CostBreakdown(
        story=BudgetStory(
            total_inr=total,
            budget_inr=budget,
            remaining_inr=remaining,
            livspace_comparison_pct=livspace_pct,
            headline=headline,
        ),
        line_items=line_items,
        materials_inr=materials,
        labor_inr=labor,
        taxes_inr=taxes,
    )


def _budget_headline(*, total: int, budget: int, remaining: int) -> str:
    if remaining >= 0:
        pct_used = round(100 * total / max(budget, 1))
        if pct_used <= 80:
            return f"Comfortably within your ₹{budget // 1000}k budget — ₹{remaining // 1000}k still in hand for cushions, curtains, styling."
        return f"Inside budget at ₹{total // 1000}k — ₹{remaining // 1000}k left for the finishing layer."
    over_by = -remaining
    return f"₹{over_by // 1000}k over budget — I have a few quick swaps in mind to bring this back."
