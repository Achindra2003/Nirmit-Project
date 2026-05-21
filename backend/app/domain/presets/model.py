"""Preset domain types.

A PresetLayout is a room composition expressed in anchored coordinates
(e.g., anchored to the West wall + 500mm). This data-driven approach scales
perfectly to any room size the user enters, unlike naive fractions.

Coordinate convention matches the solver:
  x=0.0  ->  west wall (left when facing into the room from the entrance)
  x=room_w  ->  east wall
  z=0.0  ->  entrance/south wall
  z=room_d  ->  back/north wall

Rotation convention (same as solver and Three.js renderer):
  0°   -> item front faces +z (north / into the room)
  90°  -> item front faces +x (east)
  180° -> item front faces -z (south / toward entrance)
  270° -> item front faces -x (west)
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

AnchorX = Literal["W", "E", "C"]
AnchorZ = Literal["S", "N", "C"]

@dataclass(frozen=True)
class AnchoredItem:
    """One furniture piece placed using architectural anchors.
    
    offset_x_mm: mm from the anchor point (positive = East)
    offset_z_mm: mm from the anchor point (positive = North)
    """

    sub_category: str
    anchor_x: AnchorX
    anchor_z: AnchorZ
    offset_x_mm: int
    offset_z_mm: int
    rotation_deg: int   # 0 / 90 / 180 / 270
    optional: bool = False
    sight_line_target_sub: str | None = None  # sub_category of the item this faces


@dataclass(frozen=True)
class PresetLayout:
    """A complete room layout definition, parameterised by anchors."""

    id: str
    room_type: str       # "living" | "bedroom" | "dining" | "study"
    philosophy: str      # "gathering" | "breath" | "keeper"
    variant: int         # 0 = primary, 1 = alternate layout
    items: tuple[AnchoredItem, ...]
    description: str = ""
