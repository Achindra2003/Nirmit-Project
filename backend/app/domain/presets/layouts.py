"""The 24 curated preset layouts — 4 room types × 3 philosophies × 2 variants.

Each preset is authored as a *designer composition*, not a wall-snap algorithm.
The philosophy drives item count, item kind, and the room's emotional axis:

  gathering — Indian family-room energy. Many seats, layered textures, multi-
              generational. L-sofa or sofa + diwan, accent chair, pouffe,
              floor lamp anchoring a corner, sideboard. 8–11 items.
  breath    — restraint as luxury. Fewer pieces, each one a statement, empty
              floor matters. One beautiful sofa, one lamp, generous gap to TV.
              3–5 items.
  keeper    — storage-as-architecture. Every wall earns its keep. Sideboard,
              bookshelf wall, cabinet, bench at foot of bed, chest. 7–10 items.

Coordinate origin: entrance corner (x=0, z=0).
  x → east (+);  z → north / into the room (+)

Rotation convention (matches solver + Three.js):
  0°   → front faces +z (north). Item back at S wall.
  90°  → front faces +x (east).  Item back at W wall.
  180° → front faces -z (south). Item back at N wall.
  270° → front faces -x (west).  Item back at E wall.

Room dimensions assumed by these layouts (intake may override):
  living   4200 × 3600
  bedroom  3600 × 3000
  dining   3300 × 3000
  study    2700 × 2400

Sub_categories available (see app/domain/catalog/curated_manifest.json):
  Seating  : sofa, sofa_l, sofa_2seat, diwan, accent_chair, lounge_chair,
             pouffe, bench, dining_chair, desk_chair
  Tables   : coffee_table, side_table, dining_table, desk
  Sleeping : bed_queen
  Storage  : wardrobe, chest, bookshelf, cabinet, sideboard, tv_unit
  Lighting : lamp  (floor lamp)
  Decor    : mirror
"""
from __future__ import annotations

from app.domain.presets.model import AnchoredItem as A
from app.domain.presets.model import PresetLayout


# ═══════════════════════════════════════════════════════════════════════════
# LIVING ROOM — 4200 × 3600
# ═══════════════════════════════════════════════════════════════════════════

# GATHERING 0 — "The Sunday Sofa"
# Sofa W (back west), TV E (back east) — keeps the entrance-wall door and the
# opposite-wall window clear. Accent chair NE (away from TV); pouffe near
# sofa front (away from coffee table). Floor lamp NE corner.
LIVING_GATHERING_0 = PresetLayout(
    id="living_gathering_0",
    room_type="living", philosophy="gathering", variant=0,
    description="Sofa west, TV east — family conversation triangle. Accent chair tucked into the NE area; pouffe near the sofa for the kids. Bookshelf on the north wall; floor lamp anchors the NE corner.",
    items=(
        A("sofa",         anchor_x="W", offset_x_mm=600,  anchor_z="C", offset_z_mm=0,    rotation_deg=90,
          sight_line_target_sub="tv_unit"),
        A("tv_unit",      anchor_x="E", offset_x_mm=-400, anchor_z="C", offset_z_mm=0,    rotation_deg=270),
        A("coffee_table", anchor_x="C", offset_x_mm=-300, anchor_z="C", offset_z_mm=0,    rotation_deg=90),
        # Accent chair moved into the NE quadrant — at rot=315 it had an
        # 1100mm diagonal eff-extent that overlapped the TV. rot=0 keeps the
        # chair facing the sofa axis and gives a clean footprint.
        A("accent_chair", anchor_x="C", offset_x_mm=1100, anchor_z="C", offset_z_mm=1100, rotation_deg=180, optional=True),
        # Pouffe shifted east so it sits between sofa and TV (engine had been
        # auto-shifting it east to clear the door arc anyway — anchor it there
        # explicitly).
        A("pouffe",       anchor_x="E", offset_x_mm=-1310,anchor_z="C", offset_z_mm=-1100,rotation_deg=0,   optional=True),
        A("bookshelf",    anchor_x="W", offset_x_mm=900,  anchor_z="N", offset_z_mm=-260, rotation_deg=180, optional=True),
        # Lamp dropped — the NW corner conflicts with the sofa's north end
        # (lamp eff-extent at rot=135 is 708×708 and the sofa runs to z≈2837).
        # User can pull a floor lamp from the catalog if they want one.
    ),
)

# GATHERING 1 — "The Indian Drawing Room"
# A conversation room — no TV. Sofa west wall, diwan east wall facing each
# other. Sideboard on north (offset to clear the window). Accent chair in SW.
LIVING_GATHERING_1 = PresetLayout(
    id="living_gathering_1",
    room_type="living", philosophy="gathering", variant=1,
    description="The Indian drawing-room. Sofa west faces diwan east across a coffee table — multi-generational seating. No TV competes with the talk.",
    items=(
        A("sofa",         anchor_x="W", offset_x_mm=600,  anchor_z="C", offset_z_mm=0,    rotation_deg=90,
          sight_line_target_sub="diwan"),
        A("diwan",        anchor_x="E", offset_x_mm=-700, anchor_z="C", offset_z_mm=0,    rotation_deg=270),
        A("coffee_table", anchor_x="C", offset_x_mm=0,    anchor_z="C", offset_z_mm=0,    rotation_deg=90),
        A("sideboard",    anchor_x="W", offset_x_mm=900,  anchor_z="N", offset_z_mm=-260, rotation_deg=180, optional=True),
    ),
)

# BREATH 0 — "The Restraint"
# Sofa W, TV E. Three pieces and a lamp. The room speaks because so little does.
LIVING_BREATH_0 = PresetLayout(
    id="living_breath_0",
    room_type="living", philosophy="breath", variant=0,
    description="Sofa west, TV east. A single floor lamp anchors a corner. Three pieces; empty floor matters.",
    items=(
        A("sofa",         anchor_x="W", offset_x_mm=600,  anchor_z="C", offset_z_mm=0,    rotation_deg=90,
          sight_line_target_sub="tv_unit"),
        A("tv_unit",      anchor_x="E", offset_x_mm=-400, anchor_z="C", offset_z_mm=0,    rotation_deg=270),
        A("coffee_table", anchor_x="C", offset_x_mm=-100, anchor_z="C", offset_z_mm=0,    rotation_deg=90),
        A("lamp",         anchor_x="E", offset_x_mm=-500, anchor_z="N", offset_z_mm=-500, rotation_deg=225, optional=True),
    ),
)

# BREATH 1 — "The Reading Nook"
# Sofa west + accent chair NE angled toward sofa. The triangle is the room.
LIVING_BREATH_1 = PresetLayout(
    id="living_breath_1",
    room_type="living", philosophy="breath", variant=1,
    description="Sofa west, accent chair NE angled to face it. A small coffee table between. The conversation triangle is the entire room.",
    items=(
        A("sofa",         anchor_x="W", offset_x_mm=600,  anchor_z="C", offset_z_mm=0,    rotation_deg=90,
          sight_line_target_sub="accent_chair"),
        A("accent_chair", anchor_x="E", offset_x_mm=-800, anchor_z="N", offset_z_mm=-800, rotation_deg=225),
        A("coffee_table", anchor_x="C", offset_x_mm=-100, anchor_z="C", offset_z_mm=0,    rotation_deg=90),
        A("lamp",         anchor_x="E", offset_x_mm=-400, anchor_z="S", offset_z_mm=600,  rotation_deg=45,  optional=True),
        # Side table pulled south so its 500×425 footprint clears the accent
        # chair's diagonal eff-extent (the chair reaches as far south as
        # z≈2227, so side_table z_max must be < 2227 → cz ≤ 2014).
        A("side_table",   anchor_x="E", offset_x_mm=-300, anchor_z="C", offset_z_mm=-300, rotation_deg=0,   optional=True),
    ),
)

# KEEPER 0 — "The Storage Wall"
# Sofa W, TV E. Bookshelf + sideboard on the north wall, flanking the window.
# Every wall earns its keep — south kept clear for the door.
LIVING_KEEPER_0 = PresetLayout(
    id="living_keeper_0",
    room_type="living", philosophy="keeper", variant=0,
    description="Sofa west, TV east. Bookshelf and sideboard on the north wall flank the window. South kept clear for the door.",
    items=(
        A("sofa",         anchor_x="W", offset_x_mm=600,  anchor_z="C", offset_z_mm=0,    rotation_deg=90,
          sight_line_target_sub="tv_unit"),
        A("tv_unit",      anchor_x="E", offset_x_mm=-400, anchor_z="C", offset_z_mm=0,    rotation_deg=270),
        A("coffee_table", anchor_x="C", offset_x_mm=-400, anchor_z="C", offset_z_mm=0,    rotation_deg=90),
        A("bookshelf",    anchor_x="W", offset_x_mm=900,  anchor_z="N", offset_z_mm=-260, rotation_deg=180),
        A("sideboard",    anchor_x="E", offset_x_mm=-900, anchor_z="N", offset_z_mm=-260, rotation_deg=180, optional=True),
        # Bench dropped — pinned to the SE corner it blocked the door arc;
        # the user can pull one from the catalog to extend overflow seating.
    ),
)

# KEEPER 1 — "The Library Living"
# Mirror image of keeper 0 — TV on west, sofa on east. Lets the room read
# differently depending on architectural light orientation.
LIVING_KEEPER_1 = PresetLayout(
    id="living_keeper_1",
    room_type="living", philosophy="keeper", variant=1,
    description="Sofa east, TV west — mirror of keeper 0. Bookshelf + sideboard on the north wall; chest under the entry-side wall opposite the conversation.",
    items=(
        A("sofa",         anchor_x="E", offset_x_mm=-600, anchor_z="C", offset_z_mm=0,    rotation_deg=270,
          sight_line_target_sub="tv_unit"),
        A("tv_unit",      anchor_x="W", offset_x_mm=400,  anchor_z="C", offset_z_mm=0,    rotation_deg=90),
        A("coffee_table", anchor_x="C", offset_x_mm=400,  anchor_z="C", offset_z_mm=0,    rotation_deg=90),
        A("bookshelf",    anchor_x="W", offset_x_mm=900,  anchor_z="N", offset_z_mm=-260, rotation_deg=180),
        A("sideboard",    anchor_x="E", offset_x_mm=-900, anchor_z="N", offset_z_mm=-260, rotation_deg=180, optional=True),
        A("chest",        anchor_x="C", offset_x_mm=-1400,anchor_z="S", offset_z_mm=260,  rotation_deg=0,   optional=True),
    ),
)


# ═══════════════════════════════════════════════════════════════════════════
# BEDROOM — 3600 × 3000
# ═══════════════════════════════════════════════════════════════════════════
# Default entrance is S, so the bed must NOT sit against the south wall (it
# would block the door clearance). Bed goes against the N wall (rot=180:
# headboard at +z, back at N), side tables flank the headboard at the N end,
# wardrobes live on the W/E side walls — clear of the door clearance zone
# (x in [1350, 2250], z in [0, 900]). compose.py rule3 refines side-table
# placement to hug the bed; the anchors here just put them in the
# neighbourhood.

# GATHERING 0 — "The Family Retreat"
# Bed against N wall. Wardrobes on W + E (perpendicular). SE corner gets a
# chest of drawers, leaving the centre of the room open for a child to play.
BEDROOM_GATHERING_0 = PresetLayout(
    id="bedroom_gathering_0",
    room_type="bedroom", philosophy="gathering", variant=0,
    description="Bed N wall, side tables flank the headboard. Wardrobes on W + E side walls; chest in the SE corner — south half stays clear so the door swings freely and kids have floor.",
    items=(
        A("bed_queen",    anchor_x="C", offset_x_mm=0,     anchor_z="N", offset_z_mm=-1200, rotation_deg=180),
        A("side_table",   anchor_x="C", offset_x_mm=-1200, anchor_z="N", offset_z_mm=-380,  rotation_deg=180),
        A("side_table",   anchor_x="C", offset_x_mm=1200,  anchor_z="N", offset_z_mm=-380,  rotation_deg=180),
        A("wardrobe",     anchor_x="W", offset_x_mm=440,   anchor_z="C", offset_z_mm=-450,  rotation_deg=90),
        A("wardrobe",     anchor_x="E", offset_x_mm=-440,  anchor_z="C", offset_z_mm=-450,  rotation_deg=270, optional=True),
        A("chest",        anchor_x="E", offset_x_mm=-300,  anchor_z="S", offset_z_mm=300,   rotation_deg=0,   optional=True),
    ),
)

# GATHERING 1 — "The Cross-Axis Retreat"
# Bed N wall. Single wardrobe SE (off the door clearance). Mirror on E wall
# for the morning dressing routine.
BEDROOM_GATHERING_1 = PresetLayout(
    id="bedroom_gathering_1",
    room_type="bedroom", philosophy="gathering", variant=1,
    description="Bed N wall, side tables flanking. Wardrobe SE corner — off the south door's swing. Mirror on the east wall for the morning routine.",
    items=(
        A("bed_queen",    anchor_x="C", offset_x_mm=0,    anchor_z="N", offset_z_mm=-1200, rotation_deg=180),
        A("side_table",   anchor_x="C", offset_x_mm=-1200,anchor_z="N", offset_z_mm=-380,  rotation_deg=180),
        A("side_table",   anchor_x="C", offset_x_mm=1200, anchor_z="N", offset_z_mm=-380,  rotation_deg=180),
        A("wardrobe",     anchor_x="E", offset_x_mm=-440, anchor_z="S", offset_z_mm=600,   rotation_deg=270),
        A("mirror",       anchor_x="W", offset_x_mm=50,   anchor_z="C", offset_z_mm=-300,  rotation_deg=90,  optional=True),
    ),
)

# BREATH 0 — "The Bedroom of Silence"
# Bed, one wardrobe, two side tables. Nothing more.
BEDROOM_BREATH_0 = PresetLayout(
    id="bedroom_breath_0",
    room_type="bedroom", philosophy="breath", variant=0,
    description="Bed against the N wall, wardrobe tucked into the SW corner. Two side tables flank the headboard. Empty floor.",
    items=(
        A("bed_queen",  anchor_x="C", offset_x_mm=0,     anchor_z="N", offset_z_mm=-1200, rotation_deg=180),
        A("side_table", anchor_x="C", offset_x_mm=-1200, anchor_z="N", offset_z_mm=-380,  rotation_deg=180),
        A("side_table", anchor_x="C", offset_x_mm=1200,  anchor_z="N", offset_z_mm=-380,  rotation_deg=180),
        A("wardrobe",   anchor_x="W", offset_x_mm=440,   anchor_z="C", offset_z_mm=-300,  rotation_deg=90),
    ),
)

# BREATH 1 — "The Empty Bedroom"
# Bed against N wall, mirror-image of BREATH_0: wardrobe on the E wall instead
# of W. Stays minimal — three pieces and a mirror.
BEDROOM_BREATH_1 = PresetLayout(
    id="bedroom_breath_1",
    room_type="bedroom", philosophy="breath", variant=1,
    description="Bed against the N wall, wardrobe tucked into the SE corner. Two side tables flank the headboard. Mirror on the west wall.",
    items=(
        A("bed_queen",  anchor_x="C", offset_x_mm=0,     anchor_z="N", offset_z_mm=-1200, rotation_deg=180),
        A("side_table", anchor_x="C", offset_x_mm=-1200, anchor_z="N", offset_z_mm=-380,  rotation_deg=180),
        A("side_table", anchor_x="C", offset_x_mm=1200,  anchor_z="N", offset_z_mm=-380,  rotation_deg=180),
        A("wardrobe",   anchor_x="E", offset_x_mm=-440,  anchor_z="C", offset_z_mm=-300,  rotation_deg=270),
        A("mirror",     anchor_x="W", offset_x_mm=50,    anchor_z="C", offset_z_mm=200,   rotation_deg=90,  optional=True),
    ),
)

# KEEPER 0 — "The Storage Bedroom"
# Bed N wall. Two wardrobes line the W wall (the chest SKU for this menu is
# 1435mm wide — too wide to fit beside the south door, so storage is doubled
# up on the W wall instead). Mirror on E wall for the dressing routine.
BEDROOM_KEEPER_0 = PresetLayout(
    id="bedroom_keeper_0",
    room_type="bedroom", philosophy="keeper", variant=0,
    description="Bed N wall. Two wardrobes line the W wall — south of the bed footprint; the chest SKU is too wide for the S wall, so storage doubles up on W. Mirror on the E wall.",
    items=(
        A("bed_queen",  anchor_x="C", offset_x_mm=0,    anchor_z="N", offset_z_mm=-1200, rotation_deg=180),
        A("side_table", anchor_x="C", offset_x_mm=-1200,anchor_z="N", offset_z_mm=-380,  rotation_deg=180),
        A("side_table", anchor_x="C", offset_x_mm=1200, anchor_z="N", offset_z_mm=-380,  rotation_deg=180),
        # Two wardrobes on W wall, stacked along z, gap ≈80mm — both south of
        # the headboard side_tables so nothing overlaps.
        A("wardrobe",   anchor_x="W", offset_x_mm=440,  anchor_z="S", offset_z_mm=600,   rotation_deg=90),
        A("wardrobe",   anchor_x="W", offset_x_mm=440,  anchor_z="S", offset_z_mm=1600,  rotation_deg=90),
        A("mirror",     anchor_x="E", offset_x_mm=-50,  anchor_z="C", offset_z_mm=-300,  rotation_deg=270, optional=True),
    ),
)

# KEEPER 1 — "The Reading Bedroom"
# Bed N wall. Wardrobe W wall. NE corner becomes a reading nook: bookshelf
# south on the E wall (clear of side-table) — quiet storage.
BEDROOM_KEEPER_1 = PresetLayout(
    id="bedroom_keeper_1",
    room_type="bedroom", philosophy="keeper", variant=1,
    description="Bed N wall, wardrobe W wall. Reading corner on the east: bookshelf low on the E wall, south of the bed area so it doesn't crowd the side table.",
    items=(
        A("bed_queen",    anchor_x="C", offset_x_mm=0,    anchor_z="N", offset_z_mm=-1200, rotation_deg=180),
        A("side_table",   anchor_x="C", offset_x_mm=-1200,anchor_z="N", offset_z_mm=-380,  rotation_deg=180),
        A("side_table",   anchor_x="C", offset_x_mm=1200, anchor_z="N", offset_z_mm=-380,  rotation_deg=180),
        A("wardrobe",     anchor_x="W", offset_x_mm=440,  anchor_z="C", offset_z_mm=-300,  rotation_deg=90),
        A("bookshelf",    anchor_x="E", offset_x_mm=-260, anchor_z="S", offset_z_mm=900,   rotation_deg=270, optional=True),
        # Chest dropped — the chest SKU for this menu is 1435mm wide and won't
        # fit on the S wall without blocking the door arc. User can add via
        # the catalog drawer if they want more storage.
    ),
)


# ═══════════════════════════════════════════════════════════════════════════
# DINING ROOM — 3300 × 3000
# ═══════════════════════════════════════════════════════════════════════════
# Door at S wall. The table is shifted NORTH (cz ~1500+) so the south chair
# slot would clash with the door arc — we drop the south chair in every
# preset and seat 3 sides (N/W/E). For a real Indian dining set the user
# pulls a chair from the catalog if they want a fourth.
# Table dim ~1400×900; chair ~480×560.

# GATHERING 0 — "The Long Table"
# Sunday lunch table. Sideboard at the N wall consumes the north-chair slot,
# so only W/E chairs are used here — south stays clear of the door, north
# is sideboard.
DINING_GATHERING_0 = PresetLayout(
    id="dining_gathering_0",
    room_type="dining", philosophy="gathering", variant=0,
    description="Table just north of centre, chairs on W + E. Sideboard serves from the north; south is left clear for the door.",
    items=(
        A("dining_table", anchor_x="C", offset_x_mm=0,     anchor_z="C", offset_z_mm=100,  rotation_deg=0),
        A("dining_chair", anchor_x="C", offset_x_mm=-1050, anchor_z="C", offset_z_mm=100,  rotation_deg=90),
        A("dining_chair", anchor_x="C", offset_x_mm=1050,  anchor_z="C", offset_z_mm=100,  rotation_deg=270),
        A("sideboard",    anchor_x="C", offset_x_mm=0,     anchor_z="N", offset_z_mm=-300, rotation_deg=180),
    ),
)

# GATHERING 1 — "The Buffet Side"
# Table shifted east. Sideboard fills the west wall as the buffet. Chair-to-
# table required gap is (table_w/2 + chair_d/2 + 50) ≈ 1050mm, so the W chair
# offset must be more than 1050 west of the table centre.
DINING_GATHERING_1 = PresetLayout(
    id="dining_gathering_1",
    room_type="dining", philosophy="gathering", variant=1,
    description="Table shifted east, chairs on three sides (N/W/E). Sideboard runs along the west wall as the buffet.",
    items=(
        A("dining_table", anchor_x="C", offset_x_mm=400,   anchor_z="C", offset_z_mm=100,  rotation_deg=0),
        A("dining_chair", anchor_x="C", offset_x_mm=400,   anchor_z="C", offset_z_mm=900,  rotation_deg=0),
        # W chair pulled 650mm west of C (= 1050mm from table at +400) so it
        # clears the table footprint. Engine wall-snap will pin it to the W
        # wall if it ends up too close.
        A("dining_chair", anchor_x="C", offset_x_mm=-650,  anchor_z="C", offset_z_mm=100,  rotation_deg=90),
        # E chair dropped — the table is offset east (+400), so there's not
        # enough room between the table and the E wall for a chair without
        # overlap (E-wall snap pulls a chair to cx≈2897, only 847mm from the
        # table centre, below the 1050mm minimum gap).
        A("sideboard",    anchor_x="W", offset_x_mm=300,   anchor_z="C", offset_z_mm=0,    rotation_deg=90),
    ),
)

# BREATH 0 — "The Empty Centre"
# Table + 3 chairs. Generous floor. The room is its own decoration.
DINING_BREATH_0 = PresetLayout(
    id="dining_breath_0",
    room_type="dining", philosophy="breath", variant=0,
    description="Table centred. Three chairs (N/W/E) — south leaves the door clear. Generous floor.",
    items=(
        A("dining_table", anchor_x="C", offset_x_mm=0,    anchor_z="C", offset_z_mm=200,  rotation_deg=0),
        A("dining_chair", anchor_x="C", offset_x_mm=0,    anchor_z="C", offset_z_mm=1000, rotation_deg=0),
        A("dining_chair", anchor_x="C", offset_x_mm=-960, anchor_z="C", offset_z_mm=200,  rotation_deg=90),
        A("dining_chair", anchor_x="C", offset_x_mm=960,  anchor_z="C", offset_z_mm=200,  rotation_deg=270),
    ),
)

# BREATH 1 — "The Asymmetric"
# Table pushed north. South half breathes.
DINING_BREATH_1 = PresetLayout(
    id="dining_breath_1",
    room_type="dining", philosophy="breath", variant=1,
    description="Table pushed north, chairs on three sides. The south half breathes — open to the door.",
    items=(
        A("dining_table", anchor_x="C", offset_x_mm=0,     anchor_z="C", offset_z_mm=400,  rotation_deg=0),
        A("dining_chair", anchor_x="C", offset_x_mm=0,     anchor_z="C", offset_z_mm=1200, rotation_deg=0),
        A("dining_chair", anchor_x="C", offset_x_mm=-960,  anchor_z="C", offset_z_mm=400,  rotation_deg=90),
        A("dining_chair", anchor_x="C", offset_x_mm=960,   anchor_z="C", offset_z_mm=400,  rotation_deg=270),
    ),
)

# KEEPER 0 — "The Buffet Dining"
# Sideboard north (consumes N chair slot). Chairs on W/E only.
DINING_KEEPER_0 = PresetLayout(
    id="dining_keeper_0",
    room_type="dining", philosophy="keeper", variant=0,
    description="2-seater dining (W/E). Sideboard north — serving runs from there; south stays clear for the door.",
    items=(
        A("dining_table", anchor_x="C", offset_x_mm=-100,  anchor_z="C", offset_z_mm=100,  rotation_deg=0),
        A("dining_chair", anchor_x="C", offset_x_mm=-1150, anchor_z="C", offset_z_mm=100,  rotation_deg=90),
        A("dining_chair", anchor_x="C", offset_x_mm=950,   anchor_z="C", offset_z_mm=100,  rotation_deg=270),
        A("sideboard",    anchor_x="C", offset_x_mm=0,     anchor_z="N", offset_z_mm=-300, rotation_deg=180),
    ),
)

# KEEPER 1 — "Buffet + Display"
# Sideboard runs the east wall, so the table is shifted west enough that the
# W chair fits (need ~1050mm between W chair centre and table centre) — but
# the E chair slot is consumed by the sideboard, so only W chair sits on the
# axis. N chair is on the table axis.
DINING_KEEPER_1 = PresetLayout(
    id="dining_keeper_1",
    room_type="dining", philosophy="keeper", variant=1,
    description="Table west half, sideboard fills the east wall as a buffet. N + W chairs — south stays open as the entry path; the sideboard occupies the E chair slot.",
    items=(
        A("dining_table", anchor_x="C", offset_x_mm=-500,  anchor_z="C", offset_z_mm=200,  rotation_deg=0),
        A("dining_chair", anchor_x="C", offset_x_mm=-500,  anchor_z="C", offset_z_mm=1000, rotation_deg=0),
        # W chair dropped — wall-snap pinned it at cx=403, only 747mm from
        # the table centre (need 1050mm). Sideboard on E + N chair is the
        # complete dining function for this preset.
        A("sideboard",    anchor_x="E", offset_x_mm=-300,  anchor_z="C", offset_z_mm=0,    rotation_deg=270),
    ),
)


# ═══════════════════════════════════════════════════════════════════════════
# STUDY ROOM — 2700 × 2400
# ═══════════════════════════════════════════════════════════════════════════
# Small. Desk + chair + bookshelf is the spine. Gathering adds a reading nook.

# GATHERING 0 — "The Library Den"
# Desk east wall (back east), bookshelf north wall. Tight 2700×2400 room —
# the accent-chair / side-table / lamp pile-up against the south wall was
# all in the door arc, so the reading nook has been condensed to a single
# accent chair in the SW corner; user adds the rest from the catalog.
STUDY_GATHERING_0 = PresetLayout(
    id="study_gathering_0",
    room_type="study", philosophy="gathering", variant=0,
    description="Desk east, bookshelf north. Accent chair tucked into the SW corner as a small reading perch — the room is too tight for a full nook.",
    items=(
        # Desk + chair back at the original cz=1200 (centre of 2400-deep room)
        # — pulling them north made the chair overlap the bookshelf on the N
        # wall. The chair sits in front of one hinge's arc only, so the door
        # can be hung the other way (the engine accepts a single-hinge clear).
        A("desk",         anchor_x="E", offset_x_mm=-450, anchor_z="C", offset_z_mm=0,    rotation_deg=270),
        A("desk_chair",   anchor_x="E", offset_x_mm=-1150,anchor_z="C", offset_z_mm=0,    rotation_deg=90),
        A("bookshelf",    anchor_x="W", offset_x_mm=900,  anchor_z="N", offset_z_mm=-260, rotation_deg=180),
        # Accent chair tucked into the SW corner at rot=0 (smaller eff-extent
        # than rot=45). Clears the door arc and doesn't fight the desk_chair.
        A("accent_chair", anchor_x="W", offset_x_mm=440,  anchor_z="C", offset_z_mm=-300, rotation_deg=0,   optional=True),
    ),
)

# GATHERING 1 — "The Open Studio"
# Desk against W wall, chair faces east. Desk + chair pushed north so the
# chair's 626×597 footprint stays out of the south door arc.
STUDY_GATHERING_1 = PresetLayout(
    id="study_gathering_1",
    room_type="study", philosophy="gathering", variant=1,
    description="Desk west wall, chair facing east. Bookshelf north wall. Desk + chair pushed toward the north so the chair clears the door arc.",
    items=(
        A("desk",         anchor_x="W", offset_x_mm=450,  anchor_z="C", offset_z_mm=400,  rotation_deg=90),
        A("desk_chair",   anchor_x="W", offset_x_mm=1100, anchor_z="C", offset_z_mm=400,  rotation_deg=270),
        A("bookshelf",    anchor_x="E", offset_x_mm=-900, anchor_z="N", offset_z_mm=-260, rotation_deg=180),
        # Lamp dropped — the W-wall NW corner position landed inside the
        # desk's footprint (desk runs W wall too). Room is too tight.
    ),
)

# BREATH 0 — "The Thinking Room"
# Desk east, bookshelf west. Nothing else.
STUDY_BREATH_0 = PresetLayout(
    id="study_breath_0",
    room_type="study", philosophy="breath", variant=0,
    description="Desk east, bookshelf west. Two pieces and a chair — a quiet thinking room.",
    items=(
        A("desk",       anchor_x="E", offset_x_mm=-450, anchor_z="C", offset_z_mm=0, rotation_deg=270),
        A("desk_chair", anchor_x="E", offset_x_mm=-1150,anchor_z="C", offset_z_mm=0, rotation_deg=90),
        A("bookshelf",  anchor_x="W", offset_x_mm=260,  anchor_z="C", offset_z_mm=0, rotation_deg=90),
    ),
)

# BREATH 1 — "The Empty Desk"
# Desk only. No bookshelf. Pure focus.
STUDY_BREATH_1 = PresetLayout(
    id="study_breath_1",
    room_type="study", philosophy="breath", variant=1,
    description="Desk north (back to the window). One chair facing south. Nothing else.",
    items=(
        A("desk",       anchor_x="C", offset_x_mm=0, anchor_z="N", offset_z_mm=-450, rotation_deg=180),
        A("desk_chair", anchor_x="C", offset_x_mm=0, anchor_z="N", offset_z_mm=-1100,rotation_deg=0),
    ),
)

# KEEPER 0 — "The Document Office"
# Desk east, bookshelf west, cabinet on the south wall — but pushed to the SE
# corner (off the door arc).
STUDY_KEEPER_0 = PresetLayout(
    id="study_keeper_0",
    room_type="study", philosophy="keeper", variant=0,
    description="Desk east, bookshelf west, cabinet anchors the SE corner — south stays clear of the door.",
    items=(
        A("desk",       anchor_x="E", offset_x_mm=-450, anchor_z="C", offset_z_mm=200,  rotation_deg=270),
        A("desk_chair", anchor_x="E", offset_x_mm=-1150,anchor_z="C", offset_z_mm=200,  rotation_deg=90),
        A("bookshelf",  anchor_x="W", offset_x_mm=260,  anchor_z="C", offset_z_mm=200,  rotation_deg=90),
        # Cabinet moved to the SE corner — at the centre-S it sat in the door
        # arc.  386×526 is small enough to tuck into the corner.
        A("cabinet",    anchor_x="E", offset_x_mm=-225, anchor_z="S", offset_z_mm=300,  rotation_deg=270, optional=True),
    ),
)

# KEEPER 1 — "The Twin-Storage Office"
# Desk west, chair east. Bookshelf north. Cabinet at the SE corner — east of
# the door arc so it doesn't get auto-shifted into the chair.
STUDY_KEEPER_1 = PresetLayout(
    id="study_keeper_1",
    room_type="study", philosophy="keeper", variant=1,
    description="Desk west wall, bookshelf north. Cabinet tucked into the SE corner — clear of the door arc and the desk chair.",
    items=(
        # Desk + chair pulled slightly south (offset=200) so the chair's
        # 626-deep footprint doesn't reach into the bookshelf on the N wall.
        A("desk",       anchor_x="W", offset_x_mm=450,  anchor_z="C", offset_z_mm=200,  rotation_deg=90),
        A("desk_chair", anchor_x="W", offset_x_mm=1100, anchor_z="C", offset_z_mm=200,  rotation_deg=270),
        A("bookshelf",  anchor_x="E", offset_x_mm=-900, anchor_z="N", offset_z_mm=-260, rotation_deg=180),
        # Cabinet shifted to SE corner (was at centre-S where the door-shift
        # pushed it into the desk_chair).
        A("cabinet",    anchor_x="E", offset_x_mm=-225, anchor_z="S", offset_z_mm=300,  rotation_deg=270, optional=True),
    ),
)


# ═══════════════════════════════════════════════════════════════════════════
# Index — keyed by (room_type, philosophy, variant)
# ═══════════════════════════════════════════════════════════════════════════

ALL_PRESETS: dict[tuple[str, str, int], PresetLayout] = {
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
