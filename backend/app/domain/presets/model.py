"""Preset domain types.

A PresetLayout is a room composition expressed in fractional coordinates
(0.0–1.0 of room width/depth) so it scales to any room size the user enters.

Coordinate convention matches the solver:
  x=0.0  →  west wall (left when facing into the room from the entrance)
  x=1.0  →  east wall
  z=0.0  →  entrance/south wall
  z=1.0  →  back/north wall

Rotation convention (same as solver and Three.js renderer):
  0°   → item front faces +z (north / into the room)
  90°  → item front faces +x (east)
  180° → item front faces -z (south / toward entrance)
  270° → item front faces -x (west)
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class FractionalItem:
    """One furniture piece in fractional room coordinates."""

    sub_category: str
    x_frac: float       # centre x as fraction of room width
    z_frac: float       # centre z as fraction of room depth
    rotation_deg: int   # 0 / 90 / 180 / 270
    optional: bool = False
    sight_line_target_sub: str | None = None  # sub_category of the item this faces


@dataclass(frozen=True)
class PresetLayout:
    """A complete room layout definition, parameterised by room size."""

    id: str
    room_type: str       # "living" | "bedroom" | "dining" | "study"
    philosophy: str      # "gathering" | "breath" | "keeper"
    variant: int         # 0 = primary, 1 = alternate layout
    items: tuple[FractionalItem, ...]
    description: str = ""
