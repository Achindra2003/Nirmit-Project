"""Costing — turns a RoomState into a BudgetStory.

Cost is a psychological tool (CLAUDE.md §5). Display logic lives on the
frontend; this module is responsible only for the math and the warm headline.
"""
from app.domain.costing.engine import build_cost_breakdown

__all__ = ["build_cost_breakdown"]
