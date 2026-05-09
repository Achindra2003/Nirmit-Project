"""Pure cost math. No LLM, no IO."""
from __future__ import annotations

from app.schemas.state import (
    BudgetStory,
    CostBreakdown,
    CostLineItem,
    RoomState,
)

# Anchor: Livspace's typical quote for a comparable Indian living room is roughly
# 2-3x what a curated middle-path design costs. This is a coarse anchor used only
# for the "comparison" line — exact value tunable per room type later.
_LIVSPACE_MULTIPLIER = 2.4


def build_cost_breakdown(room: RoomState) -> CostBreakdown:
    line_items = [
        CostLineItem(
            item_id=item.id,
            name=item.name_en,
            category=item.category,
            price_inr=item.price_inr,
            build_alternative_inr=item.build_price_inr,
            is_buy=item.is_buy,
        )
        for item in room.items
    ]
    total = sum(li.price_inr for li in line_items)
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
    )


def _budget_headline(*, total: int, budget: int, remaining: int) -> str:
    if remaining >= 0:
        pct_used = round(100 * total / max(budget, 1))
        if pct_used <= 80:
            return f"Comfortably within your ₹{budget // 1000}k budget — ₹{remaining // 1000}k still in hand for cushions, curtains, paint."
        return f"Inside budget at ₹{total // 1000}k — ₹{remaining // 1000}k left for the finishing layer."
    over_by = -remaining
    return f"₹{over_by // 1000}k over budget — I have a few quick swaps in mind to bring this back."
