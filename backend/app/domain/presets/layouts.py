"""The 24 curated preset layouts — 4 room types × 3 philosophies × 2 variants.

Every position is fractional (0.0–1.0) of the room's width/depth so layouts
scale cleanly to any room size the user enters. The resolver clamps item
centres to stay at least half-an-item-width from each wall.

Coordinate origin: entrance corner (x=0, z=0 = bottom-left when entering).
  x → east (right)
  z → north (into the room, away from entrance)
"""
from __future__ import annotations

from app.domain.presets.model import AnchoredItem as A
from app.domain.presets.model import PresetLayout

# ---------------------------------------------------------------------------
# LIVING ROOM — 6 layouts (3 philosophies × 2 variants)
# ---------------------------------------------------------------------------

LIVING_GATHERING_0 = PresetLayout(
    id="living_gathering_0",
    room_type="living", philosophy="gathering", variant=0,
    description="Sofa on west wall facing east; TV on east wall — dense social layout",
    items=(
        # Primary seating on west wall, faces east into the room
        A("sofa", anchor_x="W", offset_x_mm=520, anchor_z="C", offset_z_mm=0, rotation_deg=90,
          sight_line_target_sub="tv_unit"),
        A("tv_unit", anchor_x="E", offset_x_mm=-520, anchor_z="C", offset_z_mm=0, rotation_deg=270),
        A("coffee_table", anchor_x="C", offset_x_mm=-80, anchor_z="C", offset_z_mm=0, rotation_deg=0),
        A("lounge_chair", anchor_x="W", offset_x_mm=1040, anchor_z="S", offset_z_mm=960, rotation_deg=135, optional=True),
        A("rug", anchor_x="C", offset_x_mm=0, anchor_z="C", offset_z_mm=0, rotation_deg=0,   optional=True),
        A("side_table", anchor_x="C", offset_x_mm=-1360, anchor_z="C", offset_z_mm=-560, rotation_deg=0,   optional=True),
        A("plant", anchor_x="E", offset_x_mm=-480, anchor_z="S", offset_z_mm=720, rotation_deg=0,   optional=True),
        A("mandir_wall", anchor_x="E", offset_x_mm=-480, anchor_z="N", offset_z_mm=-640, rotation_deg=270, optional=True),
        A("bookshelf", anchor_x="W", offset_x_mm=520, anchor_z="N", offset_z_mm=-640, rotation_deg=90,  optional=True),
    ),
)

LIVING_GATHERING_1 = PresetLayout(
    id="living_gathering_1",
    room_type="living", philosophy="gathering", variant=1,
    description="Sofa on south wall facing north; TV on north wall — alternate social axis",
    items=(
        A("sofa", anchor_x="C", offset_x_mm=0, anchor_z="S", offset_z_mm=800, rotation_deg=0,
          sight_line_target_sub="tv_unit"),
        A("tv_unit", anchor_x="C", offset_x_mm=0, anchor_z="N", offset_z_mm=-480, rotation_deg=180),
        A("coffee_table", anchor_x="C", offset_x_mm=0, anchor_z="C", offset_z_mm=-280, rotation_deg=0),
        A("lounge_chair", anchor_x="E", offset_x_mm=-799, anchor_z="S", offset_z_mm=960, rotation_deg=225, optional=True),
        A("rug", anchor_x="C", offset_x_mm=0, anchor_z="C", offset_z_mm=80, rotation_deg=0,   optional=True),
        A("side_table", anchor_x="C", offset_x_mm=-639, anchor_z="S", offset_z_mm=640, rotation_deg=0,   optional=True),
        A("plant", anchor_x="W", offset_x_mm=480, anchor_z="N", offset_z_mm=-720, rotation_deg=0,   optional=True),
        A("mandir_wall", anchor_x="E", offset_x_mm=-480, anchor_z="N", offset_z_mm=-520, rotation_deg=270, optional=True),
    ),
)

LIVING_BREATH_0 = PresetLayout(
    id="living_breath_0",
    room_type="living", philosophy="breath", variant=0,
    description="Sofa near entrance facing into the long axis — centre stays open",
    items=(
        A("sofa", anchor_x="C", offset_x_mm=0, anchor_z="S", offset_z_mm=800, rotation_deg=0,
          sight_line_target_sub="tv_unit"),
        A("tv_unit", anchor_x="C", offset_x_mm=0, anchor_z="N", offset_z_mm=-480, rotation_deg=180),
        A("coffee_table", anchor_x="C", offset_x_mm=0, anchor_z="C", offset_z_mm=-399, rotation_deg=0),
        A("rug", anchor_x="C", offset_x_mm=0, anchor_z="C", offset_z_mm=80, rotation_deg=0,   optional=True),
        A("plant", anchor_x="W", offset_x_mm=400, anchor_z="N", offset_z_mm=-640, rotation_deg=0,   optional=True),
        A("plant", anchor_x="E", offset_x_mm=-399, anchor_z="N", offset_z_mm=-640, rotation_deg=0,   optional=True),
        A("mandir_wall", anchor_x="E", offset_x_mm=-480, anchor_z="N", offset_z_mm=-520, rotation_deg=270, optional=True),
    ),
)

LIVING_BREATH_1 = PresetLayout(
    id="living_breath_1",
    room_type="living", philosophy="breath", variant=1,
    description="Sofa and TV in the lower third; deep north half completely open",
    items=(
        A("sofa", anchor_x="W", offset_x_mm=520, anchor_z="S", offset_z_mm=1120, rotation_deg=90,
          sight_line_target_sub="tv_unit"),
        A("tv_unit", anchor_x="E", offset_x_mm=-520, anchor_z="S", offset_z_mm=1120, rotation_deg=270),
        A("coffee_table", anchor_x="C", offset_x_mm=0, anchor_z="S", offset_z_mm=1200, rotation_deg=0),
        A("rug", anchor_x="C", offset_x_mm=0, anchor_z="C", offset_z_mm=-240, rotation_deg=0,   optional=True),
        A("plant", anchor_x="W", offset_x_mm=400, anchor_z="N", offset_z_mm=-640, rotation_deg=0,   optional=True),
        A("plant", anchor_x="E", offset_x_mm=-399, anchor_z="N", offset_z_mm=-640, rotation_deg=0,   optional=True),
        A("mandir_wall", anchor_x="E", offset_x_mm=-480, anchor_z="N", offset_z_mm=-520, rotation_deg=270, optional=True),
    ),
)

LIVING_KEEPER_0 = PresetLayout(
    id="living_keeper_0",
    room_type="living", philosophy="keeper", variant=0,
    description="Sofa on east wall; west wall packed with storage — every wall earns its keep",
    items=(
        A("sofa", anchor_x="E", offset_x_mm=-520, anchor_z="C", offset_z_mm=0, rotation_deg=270,
          sight_line_target_sub="tv_unit"),
        A("tv_unit", anchor_x="W", offset_x_mm=520, anchor_z="C", offset_z_mm=0, rotation_deg=90),
        A("coffee_table", anchor_x="C", offset_x_mm=0, anchor_z="C", offset_z_mm=0, rotation_deg=0),
        A("bookshelf", anchor_x="W", offset_x_mm=520, anchor_z="S", offset_z_mm=800, rotation_deg=90),
        A("bookshelf", anchor_x="W", offset_x_mm=520, anchor_z="N", offset_z_mm=-720, rotation_deg=90),
        A("rug", anchor_x="C", offset_x_mm=0, anchor_z="C", offset_z_mm=0, rotation_deg=0,   optional=True),
        A("mandir_wall", anchor_x="E", offset_x_mm=-520, anchor_z="N", offset_z_mm=-560, rotation_deg=270, optional=True),
        A("cabinet", anchor_x="C", offset_x_mm=0, anchor_z="N", offset_z_mm=-480, rotation_deg=180, optional=True),
        A("plant", anchor_x="E", offset_x_mm=-520, anchor_z="S", offset_z_mm=560, rotation_deg=0,   optional=True),
    ),
)

LIVING_KEEPER_1 = PresetLayout(
    id="living_keeper_1",
    room_type="living", philosophy="keeper", variant=1,
    description="Sofa south, TV north, bookshelves flanking both side walls",
    items=(
        A("sofa", anchor_x="C", offset_x_mm=0, anchor_z="S", offset_z_mm=800, rotation_deg=0,
          sight_line_target_sub="tv_unit"),
        A("tv_unit", anchor_x="C", offset_x_mm=0, anchor_z="N", offset_z_mm=-480, rotation_deg=180),
        A("coffee_table", anchor_x="C", offset_x_mm=0, anchor_z="C", offset_z_mm=-240, rotation_deg=0),
        A("bookshelf", anchor_x="W", offset_x_mm=480, anchor_z="C", offset_z_mm=0, rotation_deg=90),
        A("bookshelf", anchor_x="E", offset_x_mm=-480, anchor_z="C", offset_z_mm=0, rotation_deg=270),
        A("bookshelf", anchor_x="W", offset_x_mm=480, anchor_z="N", offset_z_mm=-640, rotation_deg=90, optional=True),
        A("rug", anchor_x="C", offset_x_mm=0, anchor_z="C", offset_z_mm=80, rotation_deg=0,   optional=True),
        A("mandir_wall", anchor_x="E", offset_x_mm=-480, anchor_z="N", offset_z_mm=-520, rotation_deg=270, optional=True),
    ),
)

# ---------------------------------------------------------------------------
# BEDROOM — 6 layouts
# ---------------------------------------------------------------------------
# Vastu: bed head toward south (z≈0, the entrance/south wall) so the sleeper's
# head points south. Bed at z=0.18, rot=0° (footboard faces north).

BEDROOM_GATHERING_0 = PresetLayout(
    id="bedroom_gathering_0",
    room_type="bedroom", philosophy="gathering", variant=0,
    description="Queen bed against south wall (head south); wardrobes in NE & NW corners",
    items=(
        A("bed_queen", anchor_x="C", offset_x_mm=0, anchor_z="S", offset_z_mm=800, rotation_deg=0),
        A("wardrobe", anchor_x="W", offset_x_mm=520, anchor_z="N", offset_z_mm=-720, rotation_deg=90),
        A("wardrobe", anchor_x="E", offset_x_mm=-520, anchor_z="N", offset_z_mm=-720, rotation_deg=270),
        # Bedside tables flanking the bed, at the head end (south).
        # x_frac=0.16/0.84 keeps them outside the queen bed's 1623mm width
        # even in tight 3.5m rooms; z_frac=0.09 aligns with the bed head.
        A("side_table", anchor_x="C", offset_x_mm=-1100, anchor_z="S", offset_z_mm=360, rotation_deg=0),
        A("side_table", anchor_x="C", offset_x_mm=1100, anchor_z="S", offset_z_mm=360, rotation_deg=0),
        A("chest", anchor_x="E", offset_x_mm=-520, anchor_z="C", offset_z_mm=-199, rotation_deg=270, optional=True),
        A("rug", anchor_x="C", offset_x_mm=0, anchor_z="C", offset_z_mm=480, rotation_deg=0,   optional=True),
        A("plant", anchor_x="W", offset_x_mm=400, anchor_z="C", offset_z_mm=0, rotation_deg=0,   optional=True),
        A("lamp", anchor_x="C", offset_x_mm=0, anchor_z="N", offset_z_mm=-600, rotation_deg=0,   optional=True),
    ),
)

BEDROOM_GATHERING_1 = PresetLayout(
    id="bedroom_gathering_1",
    room_type="bedroom", philosophy="gathering", variant=1,
    description="Bed on west wall (head west — SW zone per Vastu); east wall open for dresser/desk",
    items=(
        A("bed_queen", anchor_x="W", offset_x_mm=800, anchor_z="C", offset_z_mm=0, rotation_deg=90),
        A("wardrobe", anchor_x="E", offset_x_mm=-720, anchor_z="N", offset_z_mm=-720, rotation_deg=270),
        A("wardrobe", anchor_x="E", offset_x_mm=-720, anchor_z="S", offset_z_mm=800, rotation_deg=270),
        # Bedside tables flanking the bed (north and south of bed body), at
        # the head end (west). x_frac=0.09 sits against the west wall, z_frac
        # 0.16/0.84 keeps them outside the queen bed's 1623mm length.
        A("side_table", anchor_x="W", offset_x_mm=360, anchor_z="S", offset_z_mm=640, rotation_deg=0),
        A("side_table", anchor_x="W", offset_x_mm=360, anchor_z="N", offset_z_mm=-640, rotation_deg=0),
        A("chest", anchor_x="C", offset_x_mm=0, anchor_z="N", offset_z_mm=-480, rotation_deg=180, optional=True),
        A("rug", anchor_x="C", offset_x_mm=399, anchor_z="C", offset_z_mm=0, rotation_deg=0,   optional=True),
        A("plant", anchor_x="C", offset_x_mm=0, anchor_z="S", offset_z_mm=400, rotation_deg=0,   optional=True),
    ),
)

BEDROOM_BREATH_0 = PresetLayout(
    id="bedroom_breath_0",
    room_type="bedroom", philosophy="breath", variant=0,
    description="Bed south, single wardrobe, open centre — minimal and restful",
    items=(
        A("bed_queen", anchor_x="C", offset_x_mm=0, anchor_z="S", offset_z_mm=800, rotation_deg=0),
        A("wardrobe", anchor_x="W", offset_x_mm=480, anchor_z="N", offset_z_mm=-720, rotation_deg=90),
        A("side_table", anchor_x="C", offset_x_mm=-1100, anchor_z="S", offset_z_mm=360, rotation_deg=0),
        A("side_table", anchor_x="C", offset_x_mm=1100, anchor_z="S", offset_z_mm=360, rotation_deg=0),
        A("rug", anchor_x="C", offset_x_mm=0, anchor_z="C", offset_z_mm=480, rotation_deg=0,   optional=True),
        A("plant", anchor_x="E", offset_x_mm=-480, anchor_z="N", offset_z_mm=-560, rotation_deg=0,   optional=True),
    ),
)

BEDROOM_BREATH_1 = PresetLayout(
    id="bedroom_breath_1",
    room_type="bedroom", philosophy="breath", variant=1,
    description="Bed west wall; east half completely open — maximum breathing space",
    items=(
        A("bed_queen", anchor_x="W", offset_x_mm=800, anchor_z="C", offset_z_mm=0, rotation_deg=90),
        A("wardrobe", anchor_x="E", offset_x_mm=-720, anchor_z="N", offset_z_mm=-640, rotation_deg=270),
        A("side_table", anchor_x="W", offset_x_mm=360, anchor_z="S", offset_z_mm=640, rotation_deg=0),
        A("side_table", anchor_x="W", offset_x_mm=360, anchor_z="N", offset_z_mm=-640, rotation_deg=0),
        A("rug", anchor_x="C", offset_x_mm=600, anchor_z="C", offset_z_mm=0, rotation_deg=0,   optional=True),
        A("plant", anchor_x="E", offset_x_mm=-480, anchor_z="S", offset_z_mm=640, rotation_deg=0,   optional=True),
    ),
)

BEDROOM_KEEPER_0 = PresetLayout(
    id="bedroom_keeper_0",
    room_type="bedroom", philosophy="keeper", variant=0,
    description="Bed south; wardrobes on three walls; study desk in west corner",
    items=(
        A("bed_queen", anchor_x="C", offset_x_mm=0, anchor_z="S", offset_z_mm=800, rotation_deg=0),
        A("wardrobe", anchor_x="W", offset_x_mm=520, anchor_z="N", offset_z_mm=-720, rotation_deg=90),
        A("wardrobe", anchor_x="E", offset_x_mm=-520, anchor_z="N", offset_z_mm=-720, rotation_deg=270),
        A("wardrobe", anchor_x="C", offset_x_mm=0, anchor_z="N", offset_z_mm=-480, rotation_deg=180),
        A("desk", anchor_x="W", offset_x_mm=520, anchor_z="C", offset_z_mm=-199, rotation_deg=90),
        A("desk_chair", anchor_x="W", offset_x_mm=1280, anchor_z="C", offset_z_mm=-199, rotation_deg=270),
        A("side_table", anchor_x="C", offset_x_mm=-1100, anchor_z="S", offset_z_mm=360, rotation_deg=0),
        A("side_table", anchor_x="C", offset_x_mm=1100, anchor_z="S", offset_z_mm=360, rotation_deg=0),
        A("rug", anchor_x="C", offset_x_mm=200, anchor_z="C", offset_z_mm=200, rotation_deg=0,   optional=True),
    ),
)

BEDROOM_KEEPER_1 = PresetLayout(
    id="bedroom_keeper_1",
    room_type="bedroom", philosophy="keeper", variant=1,
    description="Bed west; full east storage wall; desk in SE corner",
    items=(
        A("bed_queen", anchor_x="W", offset_x_mm=800, anchor_z="C", offset_z_mm=0, rotation_deg=90),
        A("wardrobe", anchor_x="E", offset_x_mm=-520, anchor_z="S", offset_z_mm=1120, rotation_deg=270),
        A("wardrobe", anchor_x="E", offset_x_mm=-520, anchor_z="N", offset_z_mm=-1200, rotation_deg=270),
        A("desk", anchor_x="C", offset_x_mm=200, anchor_z="N", offset_z_mm=-520, rotation_deg=180),
        A("desk_chair", anchor_x="C", offset_x_mm=200, anchor_z="N", offset_z_mm=-1200, rotation_deg=0),
        A("side_table", anchor_x="W", offset_x_mm=360, anchor_z="S", offset_z_mm=640, rotation_deg=0),
        A("side_table", anchor_x="W", offset_x_mm=360, anchor_z="N", offset_z_mm=-640, rotation_deg=0),
        A("bookshelf", anchor_x="C", offset_x_mm=0, anchor_z="S", offset_z_mm=480, rotation_deg=0,  optional=True),
        A("rug", anchor_x="C", offset_x_mm=200, anchor_z="C", offset_z_mm=0, rotation_deg=0,  optional=True),
    ),
)

# ---------------------------------------------------------------------------
# DINING ROOM — 6 layouts
# ---------------------------------------------------------------------------

DINING_GATHERING_0 = PresetLayout(
    id="dining_gathering_0",
    room_type="dining", philosophy="gathering", variant=0,
    description="6-seater dining table centred; sideboard on north wall; mandir NE",
    items=(
        A("dining_table", anchor_x="C", offset_x_mm=0, anchor_z="C", offset_z_mm=0, rotation_deg=0),
        A("dining_chair", anchor_x="C", offset_x_mm=0, anchor_z="S", offset_z_mm=800, rotation_deg=180),  # south chair
        A("dining_chair", anchor_x="C", offset_x_mm=0, anchor_z="N", offset_z_mm=-799, rotation_deg=0),    # north chair
        A("dining_chair", anchor_x="W", offset_x_mm=1040, anchor_z="C", offset_z_mm=0, rotation_deg=90),   # west chair
        A("dining_chair", anchor_x="E", offset_x_mm=-1040, anchor_z="C", offset_z_mm=0, rotation_deg=270),  # east chair
        A("dining_chair", anchor_x="C", offset_x_mm=-600, anchor_z="S", offset_z_mm=800, rotation_deg=180,  optional=True),
        A("dining_chair", anchor_x="C", offset_x_mm=600, anchor_z="S", offset_z_mm=800, rotation_deg=180,  optional=True),
        A("sideboard", anchor_x="C", offset_x_mm=0, anchor_z="N", offset_z_mm=-480, rotation_deg=180),
        A("mandir_wall", anchor_x="E", offset_x_mm=-480, anchor_z="N", offset_z_mm=-480, rotation_deg=270,  optional=True),
        A("plant", anchor_x="W", offset_x_mm=480, anchor_z="N", offset_z_mm=-560, rotation_deg=0,    optional=True),
    ),
)

DINING_GATHERING_1 = PresetLayout(
    id="dining_gathering_1",
    room_type="dining", philosophy="gathering", variant=1,
    description="4-seater table centred; sideboard on west wall — warmer, more intimate",
    items=(
        A("dining_table", anchor_x="C", offset_x_mm=80, anchor_z="C", offset_z_mm=0, rotation_deg=0),
        A("dining_chair", anchor_x="C", offset_x_mm=80, anchor_z="S", offset_z_mm=800, rotation_deg=180),
        A("dining_chair", anchor_x="C", offset_x_mm=80, anchor_z="N", offset_z_mm=-799, rotation_deg=0),
        A("dining_chair", anchor_x="W", offset_x_mm=1040, anchor_z="C", offset_z_mm=0, rotation_deg=90),
        A("dining_chair", anchor_x="E", offset_x_mm=-879, anchor_z="C", offset_z_mm=0, rotation_deg=270),
        A("sideboard", anchor_x="W", offset_x_mm=520, anchor_z="C", offset_z_mm=0, rotation_deg=90),
        A("mandir_wall", anchor_x="E", offset_x_mm=-480, anchor_z="N", offset_z_mm=-520, rotation_deg=270,  optional=True),
        A("plant", anchor_x="E", offset_x_mm=-480, anchor_z="S", offset_z_mm=560, rotation_deg=0,    optional=True),
    ),
)

DINING_BREATH_0 = PresetLayout(
    id="dining_breath_0",
    room_type="dining", philosophy="breath", variant=0,
    description="4-seater table centred; no sideboard; maximum open floor around the table",
    items=(
        A("dining_table", anchor_x="C", offset_x_mm=0, anchor_z="C", offset_z_mm=0, rotation_deg=0),
        A("dining_chair", anchor_x="C", offset_x_mm=0, anchor_z="S", offset_z_mm=800, rotation_deg=180),
        A("dining_chair", anchor_x="C", offset_x_mm=0, anchor_z="N", offset_z_mm=-799, rotation_deg=0),
        A("dining_chair", anchor_x="W", offset_x_mm=1000, anchor_z="C", offset_z_mm=0, rotation_deg=90),
        A("dining_chair", anchor_x="E", offset_x_mm=-1000, anchor_z="C", offset_z_mm=0, rotation_deg=270),
        A("plant", anchor_x="W", offset_x_mm=400, anchor_z="N", offset_z_mm=-560, rotation_deg=0,    optional=True),
        A("plant", anchor_x="E", offset_x_mm=-399, anchor_z="N", offset_z_mm=-560, rotation_deg=0,    optional=True),
    ),
)

DINING_BREATH_1 = PresetLayout(
    id="dining_breath_1",
    room_type="dining", philosophy="breath", variant=1,
    description="Table offset toward north; south half entirely open for easy entry",
    items=(
        A("dining_table", anchor_x="C", offset_x_mm=0, anchor_z="C", offset_z_mm=319, rotation_deg=0),
        A("dining_chair", anchor_x="C", offset_x_mm=0, anchor_z="N", offset_z_mm=-680, rotation_deg=0),
        A("dining_chair", anchor_x="W", offset_x_mm=1040, anchor_z="C", offset_z_mm=319, rotation_deg=90),
        A("dining_chair", anchor_x="E", offset_x_mm=-1040, anchor_z="C", offset_z_mm=319, rotation_deg=270),
        A("plant", anchor_x="W", offset_x_mm=400, anchor_z="S", offset_z_mm=560, rotation_deg=0,    optional=True),
        A("plant", anchor_x="E", offset_x_mm=-399, anchor_z="S", offset_z_mm=560, rotation_deg=0,    optional=True),
    ),
)

DINING_KEEPER_0 = PresetLayout(
    id="dining_keeper_0",
    room_type="dining", philosophy="keeper", variant=0,
    description="6-seater centred; sideboard north; bookshelf on west for display storage",
    items=(
        A("dining_table", anchor_x="C", offset_x_mm=0, anchor_z="C", offset_z_mm=-80, rotation_deg=0),
        A("dining_chair", anchor_x="C", offset_x_mm=0, anchor_z="S", offset_z_mm=680, rotation_deg=180),
        A("dining_chair", anchor_x="C", offset_x_mm=0, anchor_z="N", offset_z_mm=-799, rotation_deg=0),
        A("dining_chair", anchor_x="W", offset_x_mm=1040, anchor_z="C", offset_z_mm=-80, rotation_deg=90),
        A("dining_chair", anchor_x="E", offset_x_mm=-1040, anchor_z="C", offset_z_mm=-80, rotation_deg=270),
        A("dining_chair", anchor_x="C", offset_x_mm=-600, anchor_z="S", offset_z_mm=680, rotation_deg=180, optional=True),
        A("dining_chair", anchor_x="C", offset_x_mm=600, anchor_z="S", offset_z_mm=680, rotation_deg=180, optional=True),
        A("sideboard", anchor_x="C", offset_x_mm=0, anchor_z="N", offset_z_mm=-480, rotation_deg=180),
        A("bookshelf", anchor_x="W", offset_x_mm=480, anchor_z="C", offset_z_mm=0, rotation_deg=90),
        A("mandir_wall", anchor_x="E", offset_x_mm=-480, anchor_z="N", offset_z_mm=-520, rotation_deg=270, optional=True),
    ),
)

DINING_KEEPER_1 = PresetLayout(
    id="dining_keeper_1",
    room_type="dining", philosophy="keeper", variant=1,
    description="Table on west half; east half open; sideboard on east wall",
    items=(
        A("dining_table", anchor_x="C", offset_x_mm=-560, anchor_z="C", offset_z_mm=0, rotation_deg=0),
        A("dining_chair", anchor_x="C", offset_x_mm=-560, anchor_z="S", offset_z_mm=880, rotation_deg=180),
        A("dining_chair", anchor_x="C", offset_x_mm=-560, anchor_z="N", offset_z_mm=-879, rotation_deg=0),
        A("dining_chair", anchor_x="W", offset_x_mm=560, anchor_z="C", offset_z_mm=0, rotation_deg=90),
        A("dining_chair", anchor_x="C", offset_x_mm=319, anchor_z="C", offset_z_mm=0, rotation_deg=270),
        A("sideboard", anchor_x="E", offset_x_mm=-520, anchor_z="C", offset_z_mm=0, rotation_deg=270),
        A("mandir_wall", anchor_x="E", offset_x_mm=-520, anchor_z="N", offset_z_mm=-520, rotation_deg=270, optional=True),
        A("plant", anchor_x="E", offset_x_mm=-520, anchor_z="S", offset_z_mm=560, rotation_deg=0,   optional=True),
    ),
)

# ---------------------------------------------------------------------------
# STUDY ROOM — 6 layouts
# ---------------------------------------------------------------------------

STUDY_GATHERING_0 = PresetLayout(
    id="study_gathering_0",
    room_type="study", philosophy="gathering", variant=0,
    description="Desk east wall; bookshelves west; lounge chair near entrance for reading",
    items=(
        A("desk", anchor_x="E", offset_x_mm=-520, anchor_z="C", offset_z_mm=0, rotation_deg=270),
        A("desk_chair", anchor_x="E", offset_x_mm=-1319, anchor_z="C", offset_z_mm=0, rotation_deg=90),
        A("bookshelf", anchor_x="W", offset_x_mm=480, anchor_z="S", offset_z_mm=1120, rotation_deg=90),
        A("bookshelf", anchor_x="W", offset_x_mm=480, anchor_z="N", offset_z_mm=-1040, rotation_deg=90),
        A("bookshelf", anchor_x="C", offset_x_mm=0, anchor_z="N", offset_z_mm=-480, rotation_deg=180, optional=True),
        A("lounge_chair", anchor_x="C", offset_x_mm=-399, anchor_z="S", offset_z_mm=800, rotation_deg=0,   optional=True),
        A("side_table", anchor_x="C", offset_x_mm=-1360, anchor_z="S", offset_z_mm=1040, rotation_deg=0,   optional=True),
        A("plant", anchor_x="E", offset_x_mm=-480, anchor_z="S", offset_z_mm=560, rotation_deg=0,   optional=True),
        A("plant", anchor_x="W", offset_x_mm=480, anchor_z="S", offset_z_mm=560, rotation_deg=0,   optional=True),
    ),
)

STUDY_GATHERING_1 = PresetLayout(
    id="study_gathering_1",
    room_type="study", philosophy="gathering", variant=1,
    description="Desk north wall; bookshelves on east and west; reading chair in south corner",
    items=(
        A("desk", anchor_x="C", offset_x_mm=0, anchor_z="N", offset_z_mm=-480, rotation_deg=180),
        A("desk_chair", anchor_x="C", offset_x_mm=0, anchor_z="N", offset_z_mm=-1200, rotation_deg=0),
        A("bookshelf", anchor_x="W", offset_x_mm=480, anchor_z="C", offset_z_mm=0, rotation_deg=90),
        A("bookshelf", anchor_x="E", offset_x_mm=-480, anchor_z="C", offset_z_mm=0, rotation_deg=270),
        A("bookshelf", anchor_x="E", offset_x_mm=-480, anchor_z="N", offset_z_mm=-720, rotation_deg=270, optional=True),
        A("lounge_chair", anchor_x="W", offset_x_mm=1120, anchor_z="S", offset_z_mm=800, rotation_deg=45,  optional=True),
        A("side_table", anchor_x="C", offset_x_mm=-1360, anchor_z="S", offset_z_mm=1120, rotation_deg=0,   optional=True),
        A("plant", anchor_x="E", offset_x_mm=-480, anchor_z="S", offset_z_mm=560, rotation_deg=0,   optional=True),
    ),
)

STUDY_BREATH_0 = PresetLayout(
    id="study_breath_0",
    room_type="study", philosophy="breath", variant=0,
    description="Desk east wall; single bookshelf; wide open floor — clean thinking space",
    items=(
        A("desk", anchor_x="E", offset_x_mm=-520, anchor_z="C", offset_z_mm=0, rotation_deg=270),
        A("desk_chair", anchor_x="E", offset_x_mm=-1319, anchor_z="C", offset_z_mm=0, rotation_deg=90),
        A("bookshelf", anchor_x="W", offset_x_mm=480, anchor_z="C", offset_z_mm=0, rotation_deg=90),
        A("plant", anchor_x="W", offset_x_mm=480, anchor_z="N", offset_z_mm=-560, rotation_deg=0,  optional=True),
        A("plant", anchor_x="E", offset_x_mm=-480, anchor_z="N", offset_z_mm=-560, rotation_deg=0,  optional=True),
    ),
)

STUDY_BREATH_1 = PresetLayout(
    id="study_breath_1",
    room_type="study", philosophy="breath", variant=1,
    description="Desk floating near north wall; nothing on east or west walls",
    items=(
        A("desk", anchor_x="C", offset_x_mm=0, anchor_z="N", offset_z_mm=-960, rotation_deg=180),
        A("desk_chair", anchor_x="C", offset_x_mm=0, anchor_z="C", offset_z_mm=319, rotation_deg=0),
        A("bookshelf", anchor_x="W", offset_x_mm=480, anchor_z="N", offset_z_mm=-720, rotation_deg=90, optional=True),
        A("plant", anchor_x="E", offset_x_mm=-480, anchor_z="S", offset_z_mm=560, rotation_deg=0,  optional=True),
        A("plant", anchor_x="W", offset_x_mm=480, anchor_z="S", offset_z_mm=560, rotation_deg=0,  optional=True),
    ),
)

STUDY_KEEPER_0 = PresetLayout(
    id="study_keeper_0",
    room_type="study", philosophy="keeper", variant=0,
    description="Desk east; three bookshelves on west wall; cabinet in NE — maximum storage",
    items=(
        A("desk", anchor_x="E", offset_x_mm=-520, anchor_z="C", offset_z_mm=0, rotation_deg=270),
        A("desk_chair", anchor_x="E", offset_x_mm=-1319, anchor_z="C", offset_z_mm=0, rotation_deg=90),
        A("bookshelf", anchor_x="W", offset_x_mm=480, anchor_z="S", offset_z_mm=800, rotation_deg=90),
        A("bookshelf", anchor_x="W", offset_x_mm=480, anchor_z="C", offset_z_mm=80, rotation_deg=90),
        A("bookshelf", anchor_x="W", offset_x_mm=480, anchor_z="N", offset_z_mm=-720, rotation_deg=90),
        A("bookshelf", anchor_x="C", offset_x_mm=0, anchor_z="N", offset_z_mm=-480, rotation_deg=180, optional=True),
        A("cabinet", anchor_x="E", offset_x_mm=-520, anchor_z="N", offset_z_mm=-520, rotation_deg=270, optional=True),
        A("plant", anchor_x="E", offset_x_mm=-480, anchor_z="S", offset_z_mm=560, rotation_deg=0,   optional=True),
    ),
)

STUDY_KEEPER_1 = PresetLayout(
    id="study_keeper_1",
    room_type="study", philosophy="keeper", variant=1,
    description="Desk north; bookshelves on east and west walls; fully packed storage",
    items=(
        A("desk", anchor_x="C", offset_x_mm=0, anchor_z="N", offset_z_mm=-480, rotation_deg=180),
        A("desk_chair", anchor_x="C", offset_x_mm=0, anchor_z="N", offset_z_mm=-1200, rotation_deg=0),
        A("bookshelf", anchor_x="W", offset_x_mm=480, anchor_z="S", offset_z_mm=1120, rotation_deg=90),
        A("bookshelf", anchor_x="W", offset_x_mm=480, anchor_z="N", offset_z_mm=-1200, rotation_deg=90),
        A("bookshelf", anchor_x="E", offset_x_mm=-480, anchor_z="S", offset_z_mm=1120, rotation_deg=270),
        A("bookshelf", anchor_x="E", offset_x_mm=-480, anchor_z="N", offset_z_mm=-1200, rotation_deg=270),
        A("plant", anchor_x="E", offset_x_mm=-480, anchor_z="S", offset_z_mm=480, rotation_deg=0,  optional=True),
        A("plant", anchor_x="W", offset_x_mm=480, anchor_z="S", offset_z_mm=480, rotation_deg=0,  optional=True),
    ),
)

# ---------------------------------------------------------------------------
# Index — keyed by (room_type, philosophy, variant)
# ---------------------------------------------------------------------------

ALL_PRESETS: dict[tuple[str, str, int], PresetLayout] = {
    p.room_type: None  # populated below
    for p in []  # just for type inference
}

ALL_PRESETS = {
    (p.room_type, p.philosophy, p.variant): p
    for p in [
        LIVING_GATHERING_0, LIVING_GATHERING_1,
        LIVING_BREATH_0,    LIVING_BREATH_1,
        LIVING_KEEPER_0,    LIVING_KEEPER_1,
        BEDROOM_GATHERING_0, BEDROOM_GATHERING_1,
        BEDROOM_BREATH_0,    BEDROOM_BREATH_1,
        BEDROOM_KEEPER_0,    BEDROOM_KEEPER_1,
        DINING_GATHERING_0, DINING_GATHERING_1,
        DINING_BREATH_0,    DINING_BREATH_1,
        DINING_KEEPER_0,    DINING_KEEPER_1,
        STUDY_GATHERING_0,  STUDY_GATHERING_1,
        STUDY_BREATH_0,     STUDY_BREATH_1,
        STUDY_KEEPER_0,     STUDY_KEEPER_1,
    ]
}


def get_preset(room_type: str, philosophy: str, variant: int = 0) -> PresetLayout | None:
    return ALL_PRESETS.get((room_type, philosophy, variant))
