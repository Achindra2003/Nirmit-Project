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

# Gathering: sofa on the west/south wall — dense, social, close to the action.
LIVING_SEATING_ZONE = ZoneTemplate(
    id="seating",
    anchor_sub_category="sofa",
    against_wall=True,
    preferred_compass_zones=("W", "SW", "S"),
    sight_line_target_zone="entertainment",
    members=(
        # Coffee table close in — 450mm for that cosy gathering feel
        RelativePlacement("coffee_table", offset_axial_mm=450, offset_lateral_mm=0, rotation_relative_deg=0),
        # Lounge chair — social corner, perpendicular to sofa
        RelativePlacement("lounge_chair", offset_axial_mm=1100, offset_lateral_mm=1300, rotation_relative_deg=270, optional=True),
        RelativePlacement("ottoman", offset_axial_mm=1200, offset_lateral_mm=-700, rotation_relative_deg=0, optional=True),
        RelativePlacement("rug", offset_axial_mm=400, offset_lateral_mm=0, rotation_relative_deg=0, optional=True),
    ),
)

# Breath: sofa near the entrance wall — creates a long view axis, center stays open.
LIVING_SEATING_ZONE_BREATH = ZoneTemplate(
    id="seating",
    anchor_sub_category="sofa",
    against_wall=True,
    preferred_compass_zones=("S", "SE", "SW"),
    sight_line_target_zone="entertainment",
    members=(
        # Coffee table further out — 750mm gives the open "room to breathe" feel
        RelativePlacement("coffee_table", offset_axial_mm=750, offset_lateral_mm=0, rotation_relative_deg=0),
        RelativePlacement("rug", offset_axial_mm=600, offset_lateral_mm=0, rotation_relative_deg=0, optional=True),
    ),
)

# Keeper: sofa on the E side — frees the W and SW walls completely for
# storage units (bookshelf, cabinet, mandir) so every wall earns its keep.
LIVING_SEATING_ZONE_KEEPER = ZoneTemplate(
    id="seating",
    anchor_sub_category="sofa",
    against_wall=True,
    preferred_compass_zones=("E", "SE", "S"),
    sight_line_target_zone="entertainment",
    members=(
        RelativePlacement("coffee_table", offset_axial_mm=500, offset_lateral_mm=0, rotation_relative_deg=0),
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
    members=(
        # Nightstands on both sides of the bed headboard wall.
        # offset_axial_mm=-100 places them slightly behind the bed midpoint
        # (toward the headboard side). offset_lateral_mm +/- 1000 flanks a
        # 1800mm wide queen bed (half 900mm + 100mm gap from side table edge).
        RelativePlacement("side_table", offset_axial_mm=-100, offset_lateral_mm=1000, rotation_relative_deg=0, optional=True),
        RelativePlacement("side_table", offset_axial_mm=-100, offset_lateral_mm=-1000, rotation_relative_deg=0, optional=True),
    ),
)

BEDROOM_WARDROBE_ZONE = ZoneTemplate(
    id="wardrobe",
    anchor_sub_category="wardrobe",
    against_wall=True,
    preferred_compass_zones=("N", "NW"),
    members=(),
)

# ---------- Dining room zones ----------

DINING_TABLE_ZONE = ZoneTemplate(
    id="dining_table",
    anchor_sub_category="dining_table",
    against_wall=False,
    preferred_compass_zones=("CENTER", "N", "NE"),
    members=(
        # Four chairs around a 1200×800 dining table — axial offsets account for
        # the table's half-depth (400 mm) + chair seat depth (250 mm) + tuck-in
        # space (~250 mm). Lateral offsets account for half-width (600 mm) +
        # chair half-width (250 mm) + tuck-in space (~150 mm).
        # axial chairs: front sits at +z (faces -z = rot 180 toward table),
        # back sits at -z (faces +z = rot 0 toward table)
        RelativePlacement("dining_chair", offset_axial_mm=900, offset_lateral_mm=0, rotation_relative_deg=180),
        RelativePlacement("dining_chair", offset_axial_mm=-900, offset_lateral_mm=0, rotation_relative_deg=0),
        # lateral chairs: right side (+x) faces -x (rot 90 → -x), left side (-x) faces +x (rot 270 → +x)
        RelativePlacement("dining_chair", offset_axial_mm=0, offset_lateral_mm=1000, rotation_relative_deg=90),
        RelativePlacement("dining_chair", offset_axial_mm=0, offset_lateral_mm=-1000, rotation_relative_deg=270),
    ),
)

DINING_SIDEBOARD_ZONE = ZoneTemplate(
    id="sideboard",
    anchor_sub_category="sideboard",
    against_wall=True,
    preferred_compass_zones=("S", "SW", "W"),
    members=(),
)

# ---------- Study room zones ----------

STUDY_DESK_ZONE = ZoneTemplate(
    id="desk",
    anchor_sub_category="desk",
    against_wall=True,
    preferred_compass_zones=("E", "NE", "N"),
    members=(
        RelativePlacement("desk_chair", offset_axial_mm=700, offset_lateral_mm=0, rotation_relative_deg=180),
    ),
)

STUDY_STORAGE_ZONE = ZoneTemplate(
    id="study_storage",
    anchor_sub_category="bookshelf",
    against_wall=True,
    preferred_compass_zones=("W", "SW", "S"),
    members=(),
)

# ---------- Composition by (room_type, philosophy) ----------

ZONE_COMPOSITIONS: dict[tuple[str, str], tuple[ZoneTemplate, ...]] = {
    ("living", "gathering"): (
        LIVING_ENTERTAINMENT_ZONE,
        LIVING_SEATING_ZONE,           # W/SW — dense, social corner
        LIVING_MANDIR_ZONE,
        LIVING_STORAGE_ZONE,
    ),
    ("living", "breath"): (
        LIVING_ENTERTAINMENT_ZONE,
        LIVING_SEATING_ZONE_BREATH,    # S/SE — sofa near entrance, long open axis
        LIVING_MANDIR_ZONE,
    ),
    ("living", "keeper"): (
        LIVING_ENTERTAINMENT_ZONE,
        LIVING_SEATING_ZONE_KEEPER,    # W/NW — sofa back, walls free for storage
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
    ("dining", "gathering"): (
        DINING_TABLE_ZONE,
        DINING_SIDEBOARD_ZONE,
        LIVING_MANDIR_ZONE,
    ),
    ("dining", "breath"): (
        DINING_TABLE_ZONE,
    ),
    ("dining", "keeper"): (
        DINING_TABLE_ZONE,
        DINING_SIDEBOARD_ZONE,
    ),
    ("study", "gathering"): (
        STUDY_DESK_ZONE,
        STUDY_STORAGE_ZONE,
        LIVING_MANDIR_ZONE,
    ),
    ("study", "breath"): (
        STUDY_DESK_ZONE,
    ),
    ("study", "keeper"): (
        STUDY_DESK_ZONE,
        STUDY_STORAGE_ZONE,
    ),
}


def composition_for(room_type: str, philosophy: str) -> tuple[ZoneTemplate, ...]:
    return ZONE_COMPOSITIONS.get(
        (room_type, philosophy),
        (LIVING_ENTERTAINMENT_ZONE, LIVING_SEATING_ZONE, LIVING_MANDIR_ZONE),
    )
