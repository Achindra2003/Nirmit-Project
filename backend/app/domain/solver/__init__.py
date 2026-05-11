"""Spatial solver. Pure geometry, millimeters only.

Inputs: a rectangular room (width × depth in mm), a list of items with
mm dimensions, optional Vastu rules, optional door positions.

Output: a Placement per item (or a Placement-failure for that item) plus an
overall score. The solver does not know about furniture pricing, the LLM,
or the API surface — those are upstream concerns.

Algorithm: grid search over (x, z, rotation) per item, scored against
proximity to walls, Vastu zone bias, walkway clearance, and door breathing
room. Items are placed largest-first; the wall-anchored items (sofa, bed,
wardrobe, mandir, tv_unit) get a wall-priority pass before center items.
"""
from app.domain.solver.solver import (
    DoorOpening,
    Placement,
    PlacementFailure,
    SolverInput,
    SolverItem,
    SolverResult,
    solve,
)
from app.domain.solver.zones import (
    RelativePlacement,
    ZoneTemplate,
    composition_for,
)

__all__ = [
    "DoorOpening",
    "Placement",
    "PlacementFailure",
    "RelativePlacement",
    "SolverInput",
    "SolverItem",
    "SolverResult",
    "ZoneTemplate",
    "composition_for",
    "solve",
]
