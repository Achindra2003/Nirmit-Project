"""Functional zones — the design-driven units the solver operates on.

A real designer doesn't place 10 items independently — they decide where the
"seating zone" goes (sofa + coffee table + lounge chair + side tables, all
related to each other), then where the "TV zone" goes (TV unit + stand-by
plants), then the "mandir zone", and so on.

Each zone has:
  - an anchor (the first thing placed; everything else relates to it)
  - members (placed relative to the anchor with declared offsets)
  - a sight-line constraint (anchor's primary axis must intersect another
    zone's facing rectangle, e.g. sofa-anchor faces TV-anchor)
"""
from __future__ import annotations

from dataclasses import dataclass, field

from app.schemas.state import Direction


@dataclass(frozen=True)
class RelativePlacement:
    """Where a zone-member sits relative to the anchor.

    `offset_axial_mm`: distance along the anchor's facing axis (positive = in
        front of the anchor, negative = behind).
    `offset_lateral_mm`: distance perpendicular to the facing axis (positive =
        to the anchor's right when looking out from it).
    `rotation_relative_deg`: rotation relative to the anchor's rotation
        (typically 0, 90, 180, 270).
    """

    sub_category: str
    offset_axial_mm: int
    offset_lateral_mm: int
    rotation_relative_deg: int = 0
    optional: bool = False


@dataclass(frozen=True)
class ZoneTemplate:
    """A reusable zone shape — e.g. 'living room seating zone'."""

    id: str
    anchor_sub_category: str
    members: tuple[RelativePlacement, ...]
    sight_line_target_zone: str | None = None  # e.g. seating zone faces tv zone
    against_wall: bool = True
    preferred_compass_zones: tuple[str, ...] = field(default_factory=tuple)


# ---------- Living room zones ----------

LIVING_SEATING_ZONE = ZoneTemplate(
    id="seating",
    anchor_sub_category="sofa",
    against_wall=True,
    preferred_compass_zones=("W", "S", "SW"),
    sight_line_target_zone="entertainment",
    members=(
        # Coffee table — 450mm in front of the sofa, centred
        RelativePlacement("coffee_table", offset_axial_mm=450, offset_lateral_mm=0, rotation_relative_deg=0),
        # Lounge chair — 1100mm in front, 1300mm to the right, perpendicular
        RelativePlacement("lounge_chair", offset_axial_mm=1100, offset_lateral_mm=1300, rotation_relative_deg=270, optional=True),
        # Pouffe / ottoman — 1200mm in front, 700mm to the left
        RelativePlacement("ottoman", offset_axial_mm=1200, offset_lateral_mm=-700, rotation_relative_deg=0, optional=True),
        # Rug — under the coffee table, slightly larger
        RelativePlacement("rug", offset_axial_mm=400, offset_lateral_mm=0, rotation_relative_deg=0, optional=True),
    ),
)

LIVING_ENTERTAINMENT_ZONE = ZoneTemplate(
    id="entertainment",
    anchor_sub_category="tv_unit",
    against_wall=True,
    # The TV must be on the wall the sofa faces. The sight-line system handles this.
    members=(
        RelativePlacement("plant", offset_axial_mm=200, offset_lateral_mm=900, rotation_relative_deg=0, optional=True),
    ),
)

LIVING_MANDIR_ZONE = ZoneTemplate(
    id="mandir",
    anchor_sub_category="mandir_wall",
    against_wall=True,
    preferred_compass_zones=("NE", "E", "N"),
    members=(),
)

LIVING_STORAGE_ZONE = ZoneTemplate(
    id="storage",
    anchor_sub_category="bookshelf",
    against_wall=True,
    preferred_compass_zones=("SW", "S", "W"),
    members=(),
)

LIVING_WORK_ZONE = ZoneTemplate(
    id="work",
    anchor_sub_category="desk",
    against_wall=True,
    preferred_compass_zones=("E", "NE"),
    members=(
        RelativePlacement("desk_chair", offset_axial_mm=600, offset_lateral_mm=0, rotation_relative_deg=180, optional=True),
    ),
)

# ---------- Bedroom zones ----------

BEDROOM_SLEEPING_ZONE = ZoneTemplate(
    id="sleeping",
    anchor_sub_category="bed_queen",
    against_wall=True,
    preferred_compass_zones=("S", "SW", "W"),
    members=(),
)

BEDROOM_WARDROBE_ZONE = ZoneTemplate(
    id="wardrobe",
    anchor_sub_category="wardrobe",
    against_wall=True,
    preferred_compass_zones=("N", "NW"),
    members=(),
)

# ---------- Composition by (room_type, philosophy) ----------

ZONE_COMPOSITIONS: dict[tuple[str, str], tuple[ZoneTemplate, ...]] = {
    ("living", "gathering"): (
        LIVING_ENTERTAINMENT_ZONE,
        LIVING_SEATING_ZONE,
        LIVING_MANDIR_ZONE,
        LIVING_STORAGE_ZONE,
    ),
    ("living", "breath"): (
        LIVING_ENTERTAINMENT_ZONE,
        LIVING_SEATING_ZONE,
        LIVING_MANDIR_ZONE,
    ),
    ("living", "keeper"): (
        LIVING_ENTERTAINMENT_ZONE,
        LIVING_SEATING_ZONE,
        LIVING_STORAGE_ZONE,
        LIVING_MANDIR_ZONE,
    ),
    ("bedroom", "gathering"): (
        BEDROOM_SLEEPING_ZONE,
        BEDROOM_WARDROBE_ZONE,
        LIVING_WORK_ZONE,
    ),
    ("bedroom", "breath"): (
        BEDROOM_SLEEPING_ZONE,
        BEDROOM_WARDROBE_ZONE,
    ),
    ("bedroom", "keeper"): (
        BEDROOM_SLEEPING_ZONE,
        BEDROOM_WARDROBE_ZONE,
    ),
}


def composition_for(room_type: str, philosophy: str) -> tuple[ZoneTemplate, ...]:
    return ZONE_COMPOSITIONS.get(
        (room_type, philosophy),
        (LIVING_ENTERTAINMENT_ZONE, LIVING_SEATING_ZONE, LIVING_MANDIR_ZONE),
    )
