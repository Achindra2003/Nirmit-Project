"""Vastu spatial reasoning. Pure-Python rules engine — no LLM, no IO.

Each rule is data, not procedure. The solver reads rules to bias placement
scoring; the Ranker reads applied rules to surface them in the
"why this was made for you" reasoning.

Vastu in CLAUDE.md §2 is "foundational spatial logic," not a toggle. We model
it as a set of zoning preferences that the solver respects when the user has
opted in via Intake.vastu_matters.
"""
from app.domain.vastu.rules import (
    VastuApplied,
    VastuRule,
    VastuZone,
    applicable_rules,
    apply_rules,
    point_zone,
    preferred_zone_for_category,
    zone_center_mm,
)

__all__ = [
    "VastuApplied",
    "VastuRule",
    "VastuZone",
    "applicable_rules",
    "apply_rules",
    "point_zone",
    "preferred_zone_for_category",
    "zone_center_mm",
]
