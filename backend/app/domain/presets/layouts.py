"""The 24 curated preset layouts — 4 room types × 3 philosophies × 2 variants.

Every position is fractional (0.0–1.0) of the room's width/depth so layouts
scale cleanly to any room size the user enters. The resolver clamps item
centres to stay at least half-an-item-width from each wall.

Coordinate origin: entrance corner (x=0, z=0 = bottom-left when entering).
  x → east (right)
  z → north (into the room, away from entrance)
"""
from __future__ import annotations

from app.domain.presets.model import FractionalItem as F
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
        F("sofa",          x_frac=0.13, z_frac=0.50, rotation_deg=90,
          sight_line_target_sub="tv_unit"),
        F("tv_unit",       x_frac=0.87, z_frac=0.50, rotation_deg=270),
        F("coffee_table",  x_frac=0.48, z_frac=0.50, rotation_deg=0),
        F("lounge_chair",  x_frac=0.26, z_frac=0.24, rotation_deg=135, optional=True),
        F("rug",           x_frac=0.50, z_frac=0.50, rotation_deg=0,   optional=True),
        F("side_table",    x_frac=0.24, z_frac=0.36, rotation_deg=0,   optional=True),
        F("plant",         x_frac=0.88, z_frac=0.18, rotation_deg=0,   optional=True),
        F("mandir_wall",   x_frac=0.88, z_frac=0.84, rotation_deg=270, optional=True),
        F("bookshelf",     x_frac=0.13, z_frac=0.84, rotation_deg=90,  optional=True),
    ),
)

LIVING_GATHERING_1 = PresetLayout(
    id="living_gathering_1",
    room_type="living", philosophy="gathering", variant=1,
    description="Sofa on south wall facing north; TV on north wall — alternate social axis",
    items=(
        F("sofa",          x_frac=0.50, z_frac=0.12, rotation_deg=0,
          sight_line_target_sub="tv_unit"),
        F("tv_unit",       x_frac=0.50, z_frac=0.88, rotation_deg=180),
        F("coffee_table",  x_frac=0.50, z_frac=0.43, rotation_deg=0),
        F("lounge_chair",  x_frac=0.80, z_frac=0.24, rotation_deg=225, optional=True),
        F("rug",           x_frac=0.50, z_frac=0.52, rotation_deg=0,   optional=True),
        F("side_table",    x_frac=0.34, z_frac=0.16, rotation_deg=0,   optional=True),
        F("plant",         x_frac=0.12, z_frac=0.82, rotation_deg=0,   optional=True),
        F("mandir_wall",   x_frac=0.88, z_frac=0.87, rotation_deg=270, optional=True),
    ),
)

LIVING_BREATH_0 = PresetLayout(
    id="living_breath_0",
    room_type="living", philosophy="breath", variant=0,
    description="Sofa near entrance facing into the long axis — centre stays open",
    items=(
        F("sofa",          x_frac=0.50, z_frac=0.12, rotation_deg=0,
          sight_line_target_sub="tv_unit"),
        F("tv_unit",       x_frac=0.50, z_frac=0.88, rotation_deg=180),
        F("coffee_table",  x_frac=0.50, z_frac=0.40, rotation_deg=0),
        F("rug",           x_frac=0.50, z_frac=0.52, rotation_deg=0,   optional=True),
        F("plant",         x_frac=0.10, z_frac=0.84, rotation_deg=0,   optional=True),
        F("plant",         x_frac=0.90, z_frac=0.84, rotation_deg=0,   optional=True),
        F("mandir_wall",   x_frac=0.88, z_frac=0.87, rotation_deg=270, optional=True),
    ),
)

LIVING_BREATH_1 = PresetLayout(
    id="living_breath_1",
    room_type="living", philosophy="breath", variant=1,
    description="Sofa and TV in the lower third; deep north half completely open",
    items=(
        F("sofa",          x_frac=0.13, z_frac=0.28, rotation_deg=90,
          sight_line_target_sub="tv_unit"),
        F("tv_unit",       x_frac=0.87, z_frac=0.28, rotation_deg=270),
        F("coffee_table",  x_frac=0.50, z_frac=0.30, rotation_deg=0),
        F("rug",           x_frac=0.50, z_frac=0.44, rotation_deg=0,   optional=True),
        F("plant",         x_frac=0.10, z_frac=0.84, rotation_deg=0,   optional=True),
        F("plant",         x_frac=0.90, z_frac=0.84, rotation_deg=0,   optional=True),
        F("mandir_wall",   x_frac=0.88, z_frac=0.87, rotation_deg=270, optional=True),
    ),
)

LIVING_KEEPER_0 = PresetLayout(
    id="living_keeper_0",
    room_type="living", philosophy="keeper", variant=0,
    description="Sofa on east wall; west wall packed with storage — every wall earns its keep",
    items=(
        F("sofa",          x_frac=0.87, z_frac=0.50, rotation_deg=270,
          sight_line_target_sub="tv_unit"),
        F("tv_unit",       x_frac=0.13, z_frac=0.50, rotation_deg=90),
        F("coffee_table",  x_frac=0.50, z_frac=0.50, rotation_deg=0),
        F("bookshelf",     x_frac=0.13, z_frac=0.20, rotation_deg=90),
        F("bookshelf",     x_frac=0.13, z_frac=0.82, rotation_deg=90),
        F("rug",           x_frac=0.50, z_frac=0.50, rotation_deg=0,   optional=True),
        F("mandir_wall",   x_frac=0.87, z_frac=0.86, rotation_deg=270, optional=True),
        F("cabinet",       x_frac=0.50, z_frac=0.88, rotation_deg=180, optional=True),
        F("plant",         x_frac=0.87, z_frac=0.14, rotation_deg=0,   optional=True),
    ),
)

LIVING_KEEPER_1 = PresetLayout(
    id="living_keeper_1",
    room_type="living", philosophy="keeper", variant=1,
    description="Sofa south, TV north, bookshelves flanking both side walls",
    items=(
        F("sofa",          x_frac=0.50, z_frac=0.13, rotation_deg=0,
          sight_line_target_sub="tv_unit"),
        F("tv_unit",       x_frac=0.50, z_frac=0.88, rotation_deg=180),
        F("coffee_table",  x_frac=0.50, z_frac=0.44, rotation_deg=0),
        F("bookshelf",     x_frac=0.12, z_frac=0.50, rotation_deg=90),
        F("bookshelf",     x_frac=0.88, z_frac=0.50, rotation_deg=270),
        F("bookshelf",     x_frac=0.12, z_frac=0.84, rotation_deg=90, optional=True),
        F("rug",           x_frac=0.50, z_frac=0.52, rotation_deg=0,   optional=True),
        F("mandir_wall",   x_frac=0.88, z_frac=0.87, rotation_deg=270, optional=True),
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
        F("bed_queen",  x_frac=0.50, z_frac=0.20, rotation_deg=0),
        F("wardrobe",   x_frac=0.13, z_frac=0.82, rotation_deg=90),
        F("wardrobe",   x_frac=0.87, z_frac=0.82, rotation_deg=270),
        F("side_table", x_frac=0.30, z_frac=0.20, rotation_deg=0),
        F("side_table", x_frac=0.70, z_frac=0.20, rotation_deg=0),
        F("chest",      x_frac=0.87, z_frac=0.40, rotation_deg=270, optional=True),
        F("rug",        x_frac=0.50, z_frac=0.52, rotation_deg=0,   optional=True),
        F("plant",      x_frac=0.12, z_frac=0.16, rotation_deg=0,   optional=True),
        F("lamp",       x_frac=0.14, z_frac=0.40, rotation_deg=0,   optional=True),
    ),
)

BEDROOM_GATHERING_1 = PresetLayout(
    id="bedroom_gathering_1",
    room_type="bedroom", philosophy="gathering", variant=1,
    description="Bed on west wall (head west — SW zone per Vastu); east wall open for dresser/desk",
    items=(
        F("bed_queen",  x_frac=0.20, z_frac=0.50, rotation_deg=90),
        F("wardrobe",   x_frac=0.82, z_frac=0.82, rotation_deg=270),
        F("wardrobe",   x_frac=0.82, z_frac=0.20, rotation_deg=270),
        F("side_table", x_frac=0.22, z_frac=0.30, rotation_deg=0),
        F("side_table", x_frac=0.22, z_frac=0.70, rotation_deg=0),
        F("chest",      x_frac=0.50, z_frac=0.88, rotation_deg=180, optional=True),
        F("rug",        x_frac=0.58, z_frac=0.50, rotation_deg=0,   optional=True),
        F("plant",      x_frac=0.88, z_frac=0.50, rotation_deg=0,   optional=True),
    ),
)

BEDROOM_BREATH_0 = PresetLayout(
    id="bedroom_breath_0",
    room_type="bedroom", philosophy="breath", variant=0,
    description="Bed south, single wardrobe, open centre — minimal and restful",
    items=(
        F("bed_queen",  x_frac=0.50, z_frac=0.20, rotation_deg=0),
        F("wardrobe",   x_frac=0.12, z_frac=0.82, rotation_deg=90),
        F("side_table", x_frac=0.30, z_frac=0.20, rotation_deg=0),
        F("side_table", x_frac=0.70, z_frac=0.20, rotation_deg=0),
        F("rug",        x_frac=0.50, z_frac=0.54, rotation_deg=0,   optional=True),
        F("plant",      x_frac=0.88, z_frac=0.86, rotation_deg=0,   optional=True),
    ),
)

BEDROOM_BREATH_1 = PresetLayout(
    id="bedroom_breath_1",
    room_type="bedroom", philosophy="breath", variant=1,
    description="Bed west wall; east half completely open — maximum breathing space",
    items=(
        F("bed_queen",  x_frac=0.20, z_frac=0.50, rotation_deg=90),
        F("wardrobe",   x_frac=0.82, z_frac=0.84, rotation_deg=270),
        F("side_table", x_frac=0.22, z_frac=0.34, rotation_deg=0),
        F("side_table", x_frac=0.22, z_frac=0.66, rotation_deg=0),
        F("rug",        x_frac=0.62, z_frac=0.50, rotation_deg=0,   optional=True),
        F("plant",      x_frac=0.88, z_frac=0.16, rotation_deg=0,   optional=True),
    ),
)

BEDROOM_KEEPER_0 = PresetLayout(
    id="bedroom_keeper_0",
    room_type="bedroom", philosophy="keeper", variant=0,
    description="Bed south; wardrobes on three walls; study desk in west corner",
    items=(
        F("bed_queen",  x_frac=0.50, z_frac=0.20, rotation_deg=0),
        F("wardrobe",   x_frac=0.13, z_frac=0.82, rotation_deg=90),
        F("wardrobe",   x_frac=0.87, z_frac=0.82, rotation_deg=270),
        F("wardrobe",   x_frac=0.50, z_frac=0.88, rotation_deg=180),
        F("desk",       x_frac=0.13, z_frac=0.36, rotation_deg=90),
        F("desk_chair", x_frac=0.32, z_frac=0.36, rotation_deg=270),
        F("side_table", x_frac=0.30, z_frac=0.20, rotation_deg=0),
        F("side_table", x_frac=0.70, z_frac=0.20, rotation_deg=0),
        F("rug",        x_frac=0.50, z_frac=0.52, rotation_deg=0,   optional=True),
    ),
)

BEDROOM_KEEPER_1 = PresetLayout(
    id="bedroom_keeper_1",
    room_type="bedroom", philosophy="keeper", variant=1,
    description="Bed west; full east storage wall; desk in SE corner",
    items=(
        F("bed_queen",  x_frac=0.20, z_frac=0.50, rotation_deg=90),
        F("wardrobe",   x_frac=0.87, z_frac=0.28, rotation_deg=270),
        F("wardrobe",   x_frac=0.87, z_frac=0.70, rotation_deg=270),
        F("desk",       x_frac=0.82, z_frac=0.87, rotation_deg=270),
        F("desk_chair", x_frac=0.62, z_frac=0.87, rotation_deg=90),
        F("side_table", x_frac=0.22, z_frac=0.34, rotation_deg=0),
        F("side_table", x_frac=0.22, z_frac=0.66, rotation_deg=0),
        F("bookshelf",  x_frac=0.12, z_frac=0.84, rotation_deg=90, optional=True),
        F("rug",        x_frac=0.50, z_frac=0.50, rotation_deg=0,  optional=True),
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
        F("dining_table",  x_frac=0.50, z_frac=0.50, rotation_deg=0),
        F("dining_chair",  x_frac=0.50, z_frac=0.20, rotation_deg=180),  # south chair
        F("dining_chair",  x_frac=0.50, z_frac=0.80, rotation_deg=0),    # north chair
        F("dining_chair",  x_frac=0.26, z_frac=0.50, rotation_deg=90),   # west chair
        F("dining_chair",  x_frac=0.74, z_frac=0.50, rotation_deg=270),  # east chair
        F("dining_chair",  x_frac=0.35, z_frac=0.20, rotation_deg=180,  optional=True),
        F("dining_chair",  x_frac=0.65, z_frac=0.20, rotation_deg=180,  optional=True),
        F("sideboard",     x_frac=0.50, z_frac=0.88, rotation_deg=180),
        F("mandir_wall",   x_frac=0.88, z_frac=0.88, rotation_deg=270,  optional=True),
        F("plant",         x_frac=0.12, z_frac=0.86, rotation_deg=0,    optional=True),
    ),
)

DINING_GATHERING_1 = PresetLayout(
    id="dining_gathering_1",
    room_type="dining", philosophy="gathering", variant=1,
    description="4-seater table centred; sideboard on west wall — warmer, more intimate",
    items=(
        F("dining_table",  x_frac=0.52, z_frac=0.50, rotation_deg=0),
        F("dining_chair",  x_frac=0.52, z_frac=0.20, rotation_deg=180),
        F("dining_chair",  x_frac=0.52, z_frac=0.80, rotation_deg=0),
        F("dining_chair",  x_frac=0.26, z_frac=0.50, rotation_deg=90),
        F("dining_chair",  x_frac=0.78, z_frac=0.50, rotation_deg=270),
        F("sideboard",     x_frac=0.13, z_frac=0.50, rotation_deg=90),
        F("mandir_wall",   x_frac=0.88, z_frac=0.87, rotation_deg=270,  optional=True),
        F("plant",         x_frac=0.88, z_frac=0.14, rotation_deg=0,    optional=True),
    ),
)

DINING_BREATH_0 = PresetLayout(
    id="dining_breath_0",
    room_type="dining", philosophy="breath", variant=0,
    description="4-seater table centred; no sideboard; maximum open floor around the table",
    items=(
        F("dining_table",  x_frac=0.50, z_frac=0.50, rotation_deg=0),
        F("dining_chair",  x_frac=0.50, z_frac=0.20, rotation_deg=180),
        F("dining_chair",  x_frac=0.50, z_frac=0.80, rotation_deg=0),
        F("dining_chair",  x_frac=0.25, z_frac=0.50, rotation_deg=90),
        F("dining_chair",  x_frac=0.75, z_frac=0.50, rotation_deg=270),
        F("plant",         x_frac=0.10, z_frac=0.86, rotation_deg=0,    optional=True),
        F("plant",         x_frac=0.90, z_frac=0.86, rotation_deg=0,    optional=True),
    ),
)

DINING_BREATH_1 = PresetLayout(
    id="dining_breath_1",
    room_type="dining", philosophy="breath", variant=1,
    description="Table offset toward north; south half entirely open for easy entry",
    items=(
        F("dining_table",  x_frac=0.50, z_frac=0.58, rotation_deg=0),
        F("dining_chair",  x_frac=0.50, z_frac=0.83, rotation_deg=0),
        F("dining_chair",  x_frac=0.26, z_frac=0.58, rotation_deg=90),
        F("dining_chair",  x_frac=0.74, z_frac=0.58, rotation_deg=270),
        F("plant",         x_frac=0.10, z_frac=0.14, rotation_deg=0,    optional=True),
        F("plant",         x_frac=0.90, z_frac=0.14, rotation_deg=0,    optional=True),
    ),
)

DINING_KEEPER_0 = PresetLayout(
    id="dining_keeper_0",
    room_type="dining", philosophy="keeper", variant=0,
    description="6-seater centred; sideboard north; bookshelf on west for display storage",
    items=(
        F("dining_table",  x_frac=0.50, z_frac=0.48, rotation_deg=0),
        F("dining_chair",  x_frac=0.50, z_frac=0.17, rotation_deg=180),
        F("dining_chair",  x_frac=0.50, z_frac=0.80, rotation_deg=0),
        F("dining_chair",  x_frac=0.26, z_frac=0.48, rotation_deg=90),
        F("dining_chair",  x_frac=0.74, z_frac=0.48, rotation_deg=270),
        F("dining_chair",  x_frac=0.35, z_frac=0.17, rotation_deg=180, optional=True),
        F("dining_chair",  x_frac=0.65, z_frac=0.17, rotation_deg=180, optional=True),
        F("sideboard",     x_frac=0.50, z_frac=0.88, rotation_deg=180),
        F("bookshelf",     x_frac=0.12, z_frac=0.50, rotation_deg=90),
        F("mandir_wall",   x_frac=0.88, z_frac=0.87, rotation_deg=270, optional=True),
    ),
)

DINING_KEEPER_1 = PresetLayout(
    id="dining_keeper_1",
    room_type="dining", philosophy="keeper", variant=1,
    description="Table on west half; east half open; sideboard on east wall",
    items=(
        F("dining_table",  x_frac=0.36, z_frac=0.50, rotation_deg=0),
        F("dining_chair",  x_frac=0.36, z_frac=0.22, rotation_deg=180),
        F("dining_chair",  x_frac=0.36, z_frac=0.78, rotation_deg=0),
        F("dining_chair",  x_frac=0.14, z_frac=0.50, rotation_deg=90),
        F("dining_chair",  x_frac=0.58, z_frac=0.50, rotation_deg=270),
        F("sideboard",     x_frac=0.87, z_frac=0.50, rotation_deg=270),
        F("mandir_wall",   x_frac=0.87, z_frac=0.87, rotation_deg=270, optional=True),
        F("plant",         x_frac=0.87, z_frac=0.14, rotation_deg=0,   optional=True),
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
        F("desk",          x_frac=0.87, z_frac=0.50, rotation_deg=270),
        F("desk_chair",    x_frac=0.67, z_frac=0.50, rotation_deg=90),
        F("bookshelf",     x_frac=0.12, z_frac=0.28, rotation_deg=90),
        F("bookshelf",     x_frac=0.12, z_frac=0.74, rotation_deg=90),
        F("bookshelf",     x_frac=0.50, z_frac=0.88, rotation_deg=180, optional=True),
        F("lounge_chair",  x_frac=0.40, z_frac=0.20, rotation_deg=0,   optional=True),
        F("side_table",    x_frac=0.30, z_frac=0.26, rotation_deg=0,   optional=True),
        F("plant",         x_frac=0.88, z_frac=0.14, rotation_deg=0,   optional=True),
        F("plant",         x_frac=0.12, z_frac=0.14, rotation_deg=0,   optional=True),
    ),
)

STUDY_GATHERING_1 = PresetLayout(
    id="study_gathering_1",
    room_type="study", philosophy="gathering", variant=1,
    description="Desk north wall; bookshelves on east and west; reading chair in south corner",
    items=(
        F("desk",          x_frac=0.50, z_frac=0.88, rotation_deg=180),
        F("desk_chair",    x_frac=0.50, z_frac=0.70, rotation_deg=0),
        F("bookshelf",     x_frac=0.12, z_frac=0.50, rotation_deg=90),
        F("bookshelf",     x_frac=0.88, z_frac=0.50, rotation_deg=270),
        F("bookshelf",     x_frac=0.88, z_frac=0.82, rotation_deg=270, optional=True),
        F("lounge_chair",  x_frac=0.28, z_frac=0.20, rotation_deg=45,  optional=True),
        F("side_table",    x_frac=0.20, z_frac=0.28, rotation_deg=0,   optional=True),
        F("plant",         x_frac=0.88, z_frac=0.14, rotation_deg=0,   optional=True),
    ),
)

STUDY_BREATH_0 = PresetLayout(
    id="study_breath_0",
    room_type="study", philosophy="breath", variant=0,
    description="Desk east wall; single bookshelf; wide open floor — clean thinking space",
    items=(
        F("desk",       x_frac=0.87, z_frac=0.50, rotation_deg=270),
        F("desk_chair", x_frac=0.67, z_frac=0.50, rotation_deg=90),
        F("bookshelf",  x_frac=0.12, z_frac=0.50, rotation_deg=90),
        F("plant",      x_frac=0.12, z_frac=0.86, rotation_deg=0,  optional=True),
        F("plant",      x_frac=0.88, z_frac=0.86, rotation_deg=0,  optional=True),
    ),
)

STUDY_BREATH_1 = PresetLayout(
    id="study_breath_1",
    room_type="study", philosophy="breath", variant=1,
    description="Desk floating near north wall; nothing on east or west walls",
    items=(
        F("desk",       x_frac=0.50, z_frac=0.76, rotation_deg=180),
        F("desk_chair", x_frac=0.50, z_frac=0.58, rotation_deg=0),
        F("bookshelf",  x_frac=0.12, z_frac=0.82, rotation_deg=90, optional=True),
        F("plant",      x_frac=0.88, z_frac=0.14, rotation_deg=0,  optional=True),
        F("plant",      x_frac=0.12, z_frac=0.14, rotation_deg=0,  optional=True),
    ),
)

STUDY_KEEPER_0 = PresetLayout(
    id="study_keeper_0",
    room_type="study", philosophy="keeper", variant=0,
    description="Desk east; three bookshelves on west wall; cabinet in NE — maximum storage",
    items=(
        F("desk",       x_frac=0.87, z_frac=0.50, rotation_deg=270),
        F("desk_chair", x_frac=0.67, z_frac=0.50, rotation_deg=90),
        F("bookshelf",  x_frac=0.12, z_frac=0.20, rotation_deg=90),
        F("bookshelf",  x_frac=0.12, z_frac=0.52, rotation_deg=90),
        F("bookshelf",  x_frac=0.12, z_frac=0.82, rotation_deg=90),
        F("bookshelf",  x_frac=0.50, z_frac=0.88, rotation_deg=180, optional=True),
        F("cabinet",    x_frac=0.87, z_frac=0.87, rotation_deg=270, optional=True),
        F("plant",      x_frac=0.88, z_frac=0.14, rotation_deg=0,   optional=True),
    ),
)

STUDY_KEEPER_1 = PresetLayout(
    id="study_keeper_1",
    room_type="study", philosophy="keeper", variant=1,
    description="Desk north; bookshelves on east and west walls; fully packed storage",
    items=(
        F("desk",       x_frac=0.50, z_frac=0.88, rotation_deg=180),
        F("desk_chair", x_frac=0.50, z_frac=0.70, rotation_deg=0),
        F("bookshelf",  x_frac=0.12, z_frac=0.28, rotation_deg=90),
        F("bookshelf",  x_frac=0.12, z_frac=0.70, rotation_deg=90),
        F("bookshelf",  x_frac=0.88, z_frac=0.28, rotation_deg=270),
        F("bookshelf",  x_frac=0.88, z_frac=0.70, rotation_deg=270),
        F("plant",      x_frac=0.88, z_frac=0.12, rotation_deg=0,  optional=True),
        F("plant",      x_frac=0.12, z_frac=0.12, rotation_deg=0,  optional=True),
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
