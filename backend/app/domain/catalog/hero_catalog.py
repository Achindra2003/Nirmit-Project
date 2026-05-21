"""Curated "hero" catalog — the furniture pieces the renderer can show *correctly*.

WHY THIS EXISTS
---------------
The big catalog (`data/catalog.json`, ~3.6k SKUs) is auto-generated and maps
many SKUs onto ~80 shared GLB meshes whose real geometry does NOT match the
declared dimensions. The frontend auto-fits a GLB to the declared box, so a
near-square "long sofa" mesh stretched to a 2.4 m declared width becomes a
2 m-deep block — visible clipping, items that "aren't what they say they are."

This catalog uses the modern GLBs at their MEASURED native dimensions
(see `scripts/measure_glb.py`). Declared dims = native dims means the auto-fit
ends up at scale = 1.0 uniformly, so the renderer shows the model exactly as
the modeler intended — no stretching, no clipping.

VARIETY
-------
Three philosophies plus four room types means the user expects different
furniture in different rooms. We cover:
  * 4 sofa variants (3-seat, L-shape, 2-seat, diwan) so the selector can
    differentiate Gathering's dense seating from Breath's minimalism.
  * 2 coffee table styles (rectangle, round) for design variety.
  * Multiple storage options (bookshelf, cabinet, drawer, sideboard, wardrobe).
  * Indian-context items: diwan, pooja chowki, ceiling fan, wall mirror.

The four wardrobe GLBs (`wardrobe_2d/3d.glb`, `WARD-*.glb`) have a garbage
7.62 m bounding box and are deliberately NOT referenced — `bookcaseClosed`
stands in for a wardrobe.
"""
from __future__ import annotations

from collections import defaultdict

from app.domain.catalog.model import CatalogItem
from app.schemas.state import Dimensions, RoomType, Vibe

_ALL_VIBES = list(Vibe)

# Vibe groupings — items tagged to these vibes are preferred by the selector
# when that vibe is active, giving each style a genuinely different furniture set.
_TRADITIONAL = [Vibe.WARM_TRADITIONAL, Vibe.EARTHY_CRAFTED, Vibe.MAXIMALIST]
_MINIMAL = [Vibe.MODERN_MINIMAL, Vibe.LIGHT_AIRY]
_COASTAL = [Vibe.COASTAL, Vibe.LIGHT_AIRY]
_EARTHY = [Vibe.EARTHY_CRAFTED, Vibe.WARM_TRADITIONAL]
_BOLD = [Vibe.MAXIMALIST, Vibe.WARM_TRADITIONAL]


def _item(
    *,
    sku: str,
    asset_url: str,
    name_en: str,
    name_hi: str | None,
    category: str,
    sub_category: str,
    rooms: list[RoomType],
    w: int,
    h: int,
    d: int,
    price: int,
    build_price: int | None,
    materials: list[str],
    tags: list[str],
    roughness: float,
    front_clearance_mm: int = 600,
    vibes: list[Vibe] | None = None,
    size_label: str | None = None,
    material_label: str | None = None,
    placement_type: str = "floor",
) -> CatalogItem:
    return CatalogItem(
        sku=sku,
        asset_url=asset_url,
        name_en=name_en,
        name_hi=name_hi,
        category=category,
        sub_category=sub_category,
        rooms=rooms,
        vibes=vibes if vibes is not None else _ALL_VIBES,
        dimensions=Dimensions(width_mm=w, depth_mm=d, height_mm=h),
        price_inr=price,
        build_price_inr=build_price,
        materials=materials,
        tags=tags,
        tint_hex=None,
        size_label=size_label,
        material_label=material_label,
        finish_label=None,
        roughness_hint=roughness,
        front_clearance_mm=front_clearance_mm,
        placement_type=placement_type,  # type: ignore[arg-type]
    )


_LIVING = [RoomType.LIVING]
_BEDROOM = [RoomType.BEDROOM]
_DINING = [RoomType.DINING]
_STUDY = [RoomType.STUDY]
_LIVING_BEDROOM = [RoomType.LIVING, RoomType.BEDROOM]
_LIVING_BEDROOM_STUDY = [RoomType.LIVING, RoomType.BEDROOM, RoomType.STUDY]
_LIVING_DINING = [RoomType.LIVING, RoomType.DINING]
_ALL_ROOMS = [RoomType.LIVING, RoomType.BEDROOM, RoomType.DINING, RoomType.STUDY]
_MANDIR_ROOMS = [RoomType.LIVING, RoomType.DINING, RoomType.POOJA]

# Real-world dimensions — the auto-fit system in GlbItem.tsx scales the GLB
# mesh to fill these declared boxes. The GLBs are modelled at toy scale (~1/5
# real size); the renderer stretches them to these target dimensions at render time.
HERO_ITEMS: list[CatalogItem] = [
    # ── seating: sofas ───────────────────────────────────────────────────
    _item(
        sku="HERO-SOFA3-01", asset_url="3df/3df_sofa_main.glb",
        name_en="Three-seat Sofa", name_hi="तीन-सीट सोफा",
        category="seating", sub_category="sofa", rooms=_LIVING,
        w=2200, h=850, d=900, price=42000, build_price=26000,
        materials=["fabric", "wood_frame"], tags=["sofa", "seating", "three_seat", "designer"], roughness=0.85,
        front_clearance_mm=900,
    ),
    _item(
        sku="HERO-SOFAL-01", asset_url="3df/3df_sofa_l.glb",
        name_en="L-shaped Sectional", name_hi="एल-आकार सेक्शनल",
        category="seating", sub_category="sofa_l", rooms=_LIVING,
        w=2400, h=850, d=1600, price=58000, build_price=36000,
        materials=["fabric", "wood_frame"], tags=["sofa", "seating", "sectional", "l_shape"], roughness=0.85,
        front_clearance_mm=900,
    ),
    _item(
        sku="HERO-SOFA2-01", asset_url="3df/3df_sofa_main.glb",
        name_en="Two-seat Sofa", name_hi="दो-सीट सोफा",
        category="seating", sub_category="sofa_2seat", rooms=_LIVING,
        w=1620, h=760, d=680, price=26000, build_price=16000,
        materials=["fabric", "wood_frame"], tags=["sofa", "seating", "two_seat", "compact"], roughness=0.85,
        front_clearance_mm=900,
    ),
    _item(
        sku="HERO-DIWAN-01", asset_url="3df/3df_diwan.glb",
        name_en="Diwan", name_hi="दीवान",
        category="seating", sub_category="diwan", rooms=_LIVING_BEDROOM,
        w=1800, h=550, d=900, price=22000, build_price=14000,
        materials=["wood_teak", "fabric"], tags=["diwan", "seating", "indian", "multi_use"], roughness=0.75,
        front_clearance_mm=700,
    ),
    # ── seating: chairs ──────────────────────────────────────────────────
    _item(
        sku="HERO-LCHAIR-01", asset_url="3df/3df_lounge_chair.glb",
        name_en="Lounge Armchair", name_hi="आराम कुर्सी",
        category="seating", sub_category="lounge_chair", rooms=_LIVING_BEDROOM,
        w=804, h=640, d=705, price=14000, build_price=9000,
        materials=["fabric", "wood_frame"], tags=["chair", "seating", "armchair", "accent"], roughness=0.8,
    ),
    _item(
        sku="HERO-CHAIR-01", asset_url="3df/3df_chair_dining.glb",
        name_en="Accent Chair", name_hi="उच्चारण कुर्सी",
        category="seating", sub_category="accent_chair", rooms=_LIVING_BEDROOM,
        w=502, h=815, d=547, price=9000, build_price=5800,
        materials=["fabric", "wood_frame"], tags=["chair", "seating", "accent", "formal"], roughness=0.8,
    ),
    _item(
        sku="HERO-OTTO-01", asset_url="3df/3df_ottoman.glb",
        name_en="Upholstered Ottoman", name_hi="ओटोमन",
        category="seating", sub_category="ottoman", rooms=_LIVING,
        w=483, h=627, d=973, price=6500, build_price=4200,
        materials=["fabric"], tags=["ottoman", "footrest", "seating"], roughness=0.85,
    ),
    # ── tables ───────────────────────────────────────────────────────────
    _item(
        sku="HERO-COFFEE-01", asset_url="3df/3df_coffee_table.glb",
        name_en="Coffee Table", name_hi="सेंटर टेबल",
        category="table", sub_category="coffee_table", rooms=_LIVING,
        w=1100, h=450, d=600, price=9500, build_price=6200,
        materials=["wood_teak"], tags=["table", "coffee_table", "centre_table"], roughness=0.6,
    ),
    _item(
        sku="HERO-COFFEE-ROUND-01", asset_url="3df/3df_table_round.glb",
        name_en="Round Coffee Table", name_hi="गोल सेंटर टेबल",
        category="table", sub_category="coffee_table_round", rooms=_LIVING,
        w=800, h=400, d=800, price=10500, build_price=6800,
        materials=["wood_teak"], tags=["table", "coffee_table", "round"], roughness=0.6,
    ),
    _item(
        sku="HERO-SIDE-01", asset_url="3df/3df_drawer.glb",
        name_en="Side Table with Drawer", name_hi="साइड टेबल",
        category="table", sub_category="side_table", rooms=_LIVING_BEDROOM,
        w=535, h=500, d=386, price=4500, build_price=2900,
        materials=["wood_teak"], tags=["table", "side_table", "nightstand"], roughness=0.6,
    ),
    _item(
        sku="HERO-DESK-01", asset_url="3df/3df_desk.glb",
        name_en="Work Desk", name_hi="अध्ययन मेज़",
        category="table", sub_category="desk", rooms=[RoomType.BEDROOM, RoomType.STUDY, RoomType.LIVING],
        w=1200, h=750, d=600, price=14000, build_price=9000,
        materials=["wood_engineered"], tags=["desk", "table", "study", "wfh"], roughness=0.55,
        front_clearance_mm=1000,
    ),
    # ── storage (carpenter-built) ────────────────────────────────────────
    _item(
        sku="HERO-BOOK-01", asset_url="3df/3df_bookshelf.glb",
        name_en="Open Bookshelf", name_hi="किताबों की अलमारी",
        category="storage", sub_category="bookshelf", rooms=_LIVING_BEDROOM_STUDY,
        w=1663, h=1863, d=331, price=18000, build_price=11500,
        materials=["wood_engineered"], tags=["storage", "bookshelf", "display"], roughness=0.7,
    ),
    _item(
        sku="HERO-CABINET-01", asset_url="3df/3df_cabinet.glb",
        name_en="Storage Cabinet", name_hi="अलमारी",
        category="storage", sub_category="cabinet", rooms=_LIVING_BEDROOM_STUDY,
        w=800, h=790, d=300, price=13500, build_price=8500,
        materials=["wood_engineered", "laminate"], tags=["storage", "cabinet"], roughness=0.7,
    ),
    _item(
        sku="HERO-CHEST-01", asset_url="3df/3df_drawer.glb",
        name_en="Chest of Drawers", name_hi="दराज़ की अलमारी",
        category="storage", sub_category="chest", rooms=_LIVING_BEDROOM,
        w=1000, h=820, d=520, price=16500, build_price=10500,
        materials=["wood_engineered"], tags=["storage", "drawers", "chest"], roughness=0.7,
    ),
    _item(
        sku="HERO-DRAWER-01", asset_url="3df/3df_drawer.glb",
        name_en="Low Drawer Unit", name_hi="दराज़ इकाई",
        category="storage", sub_category="drawer", rooms=_LIVING_BEDROOM_STUDY,
        w=800, h=520, d=420, price=9500, build_price=6000,
        materials=["wood_engineered"], tags=["storage", "drawers"], roughness=0.7,
    ),
    _item(
        sku="HERO-SHOE-01", asset_url="3df/3df_shoe_rack.glb",
        name_en="Shoe Rack", name_hi="जूता रैक",
        category="storage", sub_category="shoe_rack", rooms=_LIVING,
        w=604, h=843, d=620, price=7000, build_price=4500,
        materials=["wood_engineered"], tags=["storage", "shoe_rack", "entryway"], roughness=0.7,
    ),
    _item(
        sku="HERO-WARD-01", asset_url="3df/3df_wardrobe.glb",
        name_en="Two-door Wardrobe", name_hi="अलमारी",
        category="storage", sub_category="wardrobe", rooms=_BEDROOM,
        w=1200, h=2100, d=600, price=34000, build_price=21000,
        materials=["wood_engineered", "laminate"], tags=["storage", "wardrobe", "closet"], roughness=0.65,
    ),
    _item(
        sku="HERO-SBOARD-01", asset_url="3df/3df_cabinet.glb",
        name_en="Sideboard / Buffet", name_hi="साइडबोर्ड",
        category="storage", sub_category="sideboard", rooms=_LIVING_DINING,
        w=1500, h=850, d=420, price=16000, build_price=10000,
        materials=["wood_engineered", "laminate"], tags=["sideboard", "buffet", "storage", "dining"], roughness=0.65,
    ),
    # ── beds ─────────────────────────────────────────────────────────────
    _item(
        sku="HERO-BEDQ-01", asset_url="3df/3df_bed_queen.glb",
        name_en="Queen Bed", name_hi="क्वीन बेड",
        category="sleeping", sub_category="bed_queen", rooms=_BEDROOM,
        w=1623, h=505, d=1912, price=32000, build_price=20000,
        materials=["wood_engineered", "fabric"], tags=["bed", "sleeping", "queen"], roughness=0.7,
    ),
    _item(
        sku="HERO-BEDK-01", asset_url="3df/3df_bed.glb",
        name_en="King Bed", name_hi="किंग बेड",
        category="sleeping", sub_category="bed_king", rooms=_BEDROOM,
        w=1800, h=505, d=2000, price=42000, build_price=26000,
        materials=["wood_engineered", "fabric"], tags=["bed", "sleeping", "king"], roughness=0.7,
    ),
    # ── lighting ─────────────────────────────────────────────────────────
    _item(
        sku="HERO-LAMP-01", asset_url="3df/3df_lamp.glb",
        name_en="Floor Lamp", name_hi="फ़र्श लैंप",
        category="lighting", sub_category="lamp", rooms=_ALL_ROOMS,
        w=400, h=1673, d=400, price=4500, build_price=None,
        materials=["metal", "fabric_shade"], tags=["lighting", "floor_lamp", "ambient"], roughness=0.5,
    ),
    _item(
        sku="HERO-LAMP-TABLE-01", asset_url="3df/3df_lamp.glb",
        name_en="Table Lamp", name_hi="टेबल लैंप",
        category="lighting", sub_category="table_lamp", rooms=_ALL_ROOMS,
        w=200, h=420, d=200, price=2200, build_price=None,
        materials=["metal", "fabric_shade"], tags=["lighting", "table_lamp", "task"], roughness=0.5,
    ),
    # ── decor ────────────────────────────────────────────────────────────
    _item(
        sku="HERO-MIRROR-01", asset_url="3df/3df_mirror.glb",
        name_en="Wall Mirror", name_hi="दीवार दर्पण",
        category="decor", sub_category="mirror", rooms=_ALL_ROOMS,
        w=600, h=900, d=80, price=3500, build_price=None,
        materials=["glass", "wood_frame"], tags=["mirror", "decor", "wall_mounted"], roughness=0.1,
        placement_type="wall",
    ),
    # ── mandir (carpenter-built) ─────────────────────────────────────────
    # ── tv unit (carpenter-built) ────────────────────────────────────────
    _item(
        sku="HERO-TV-01", asset_url="3df/3df_tv_unit.glb",
        name_en="TV Console with Storage", name_hi="टीवी यूनिट",
        category="tv_unit", sub_category="tv_unit", rooms=_LIVING,
        w=1800, h=526, d=465, price=16000, build_price=10000,
        materials=["wood_engineered", "laminate"], tags=["tv_unit", "media", "storage"], roughness=0.6,
        front_clearance_mm=1800,
    ),
    # ── desk chair ───────────────────────────────────────────────────────
    _item(
        sku="HERO-DCHAIR-01", asset_url="3df/3df_desk_chair.glb",
        name_en="Task Chair", name_hi="कार्य कुर्सी",
        category="seating", sub_category="desk_chair", rooms=[RoomType.BEDROOM, RoomType.STUDY, RoomType.LIVING],
        w=600, h=900, d=600, price=9000, build_price=None,
        materials=["mesh", "metal"], tags=["chair", "office", "task", "wfh"], roughness=0.6,
    ),
    # ── dining ──────────────────────────────────────────────────────────
    _item(
        sku="HERO-DTBL4-01", asset_url="3df/3df_dining_table.glb",
        name_en="4-Seater Dining Table", name_hi="चार-सीट डाइनिंग टेबल",
        category="table", sub_category="dining_table", rooms=_LIVING_DINING,
        w=1200, h=760, d=800, price=22000, build_price=14000,
        materials=["wood_teak"], tags=["dining_table", "table", "dining"], roughness=0.6,
        front_clearance_mm=800,
    ),
    _item(
        sku="HERO-DTBL6-01", asset_url="3df/3df_dining_table.glb",
        name_en="6-Seater Dining Table", name_hi="छह-सीट डाइनिंग टेबल",
        category="table", sub_category="dining_table", rooms=_LIVING_DINING,
        w=1800, h=760, d=900, price=32000, build_price=20000,
        materials=["wood_teak"], tags=["dining_table", "table", "dining", "six_seat"], roughness=0.6,
        front_clearance_mm=800,
    ),
    _item(
        sku="HERO-DCHAIR-DIN-01", asset_url="3df/3df_chair_dining.glb",
        name_en="Dining Chair", name_hi="डाइनिंग कुर्सी",
        category="seating", sub_category="dining_chair", rooms=_LIVING_DINING,
        w=480, h=920, d=520, price=4500, build_price=2800,
        materials=["wood_teak", "fabric"], tags=["chair", "dining_chair", "dining"], roughness=0.7,
    ),

    # ── Seating: vibe-differentiated accent chairs ───────────────────────
    _item(
        sku="HERO-ACHAIR-TRAD-01", asset_url="3df/3df_chair_dining.glb",
        name_en="Cushion Accent Chair", name_hi="गद्देदार कुर्सी",
        category="seating", sub_category="accent_chair_cushion", rooms=_LIVING_BEDROOM,
        w=700, h=850, d=700, price=11000, build_price=7000,
        materials=["fabric", "wood_frame"], tags=["chair", "seating", "accent", "cushion"],
        roughness=0.85, vibes=_TRADITIONAL, size_label="standard", material_label="fabric",
    ),
    _item(
        sku="HERO-ACHAIR-MOD-01", asset_url="3df/3df_chair_dining.glb",
        name_en="Modern Accent Chair", name_hi="आधुनिक कुर्सी",
        category="seating", sub_category="accent_chair_modern", rooms=_LIVING_BEDROOM,
        w=650, h=820, d=650, price=10000, build_price=6500,
        materials=["fabric", "metal_frame"], tags=["chair", "seating", "accent", "modern"],
        roughness=0.75, vibes=_MINIMAL, size_label="compact", material_label="fabric",
    ),
    _item(
        sku="HERO-RELAX-01", asset_url="3df/3df_lounge_chair.glb",
        name_en="Relax Lounger", name_hi="रिलैक्स चेयर",
        category="seating", sub_category="lounge_chair_relax", rooms=_LIVING_BEDROOM,
        w=850, h=950, d=1050, price=18000, build_price=11000,
        materials=["fabric", "wood_frame"], tags=["chair", "seating", "lounge", "relax"],
        roughness=0.85, vibes=_COASTAL + [Vibe.WARM_TRADITIONAL],
        size_label="large", material_label="fabric",
    ),
    _item(
        sku="HERO-BENCH-01", asset_url="3df/3df_bench.glb",
        name_en="Upholstered Bench", name_hi="गद्देदार बेंच",
        category="seating", sub_category="bench", rooms=_LIVING_BEDROOM,
        w=1200, h=460, d=450, price=8000, build_price=5000,
        materials=["fabric", "wood_frame"], tags=["bench", "seating", "entry"],
        roughness=0.85, vibes=_EARTHY + _COASTAL,
        size_label="standard", material_label="fabric",
    ),
    _item(
        sku="HERO-SOFA3-MOD-01", asset_url="3df/3df_sofa_main.glb",
        name_en="Modern 3-Seat Sofa", name_hi="आधुनिक सोफा",
        category="seating", sub_category="sofa_modern", rooms=_LIVING,
        w=2100, h=840, d=880, price=38000, build_price=24000,
        materials=["fabric", "metal_frame"], tags=["sofa", "seating", "modern", "three_seat"],
        roughness=0.8, vibes=_MINIMAL + [Vibe.MAXIMALIST],
        front_clearance_mm=900, size_label="large", material_label="fabric",
    ),
    _item(
        sku="HERO-SOFASINGLE-01", asset_url="3df/3df_sofa_main.glb",
        name_en="Single Seat Sofa", name_hi="एकल सोफा",
        category="seating", sub_category="sofa_single", rooms=_LIVING_BEDROOM,
        w=900, h=800, d=900, price=15000, build_price=9500,
        materials=["fabric", "wood_frame"], tags=["sofa", "seating", "single", "accent"],
        roughness=0.82, vibes=_MINIMAL,
        front_clearance_mm=700, size_label="compact", material_label="fabric",
    ),
    _item(
        sku="HERO-POUFFE-01", asset_url="3df/3df_ottoman.glb",
        name_en="Round Pouffe", name_hi="पूफ",
        category="seating", sub_category="pouffe", rooms=_ALL_ROOMS,
        w=600, h=380, d=600, price=3500, build_price=2200,
        materials=["fabric"], tags=["pouffe", "seating", "floor", "casual"],
        roughness=0.9, vibes=_EARTHY + _COASTAL,
        size_label="standard", material_label="fabric",
    ),

    # ── Storage variants ─────────────────────────────────────────────────
    _item(
        sku="HERO-BOOK-CLOSED-01", asset_url="3df/3df_cabinet.glb",
        name_en="Closed-Door Bookcase", name_hi="बंद अलमारी",
        category="storage", sub_category="bookshelf_closed", rooms=_LIVING_BEDROOM_STUDY,
        w=800, h=1800, d=380, price=21000, build_price=13000,
        materials=["wood_engineered", "laminate"], tags=["storage", "bookshelf", "closed", "formal"],
        roughness=0.65, vibes=_TRADITIONAL,
        size_label="standard", material_label="laminate",
    ),
    _item(
        sku="HERO-BOOK-LOW-01", asset_url="3df/3df_bookshelf.glb",
        name_en="Low Open Shelf", name_hi="लो ओपन शेल्फ",
        category="storage", sub_category="bookshelf_low", rooms=_LIVING_BEDROOM_STUDY,
        w=900, h=900, d=300, price=11000, build_price=7000,
        materials=["wood_engineered"], tags=["storage", "bookshelf", "open", "low"],
        roughness=0.7, vibes=_MINIMAL + _COASTAL,
        size_label="compact", material_label="wood",
    ),
    _item(
        sku="HERO-BEDSIDE-01", asset_url="3df/3df_cabinet.glb",
        name_en="Bedside Cabinet", name_hi="बेडसाइड कैबिनेट",
        category="storage", sub_category="bedside_cabinet", rooms=_BEDROOM,
        w=450, h=560, d=420, price=6500, build_price=4200,
        materials=["wood_engineered"], tags=["storage", "bedside", "cabinet", "bedroom"],
        roughness=0.65,
        size_label="compact", material_label="wood",
    ),
    _item(
        sku="HERO-CABINET-SIMPLE-01", asset_url="3df/3df_cabinet.glb",
        name_en="Simple Storage Cabinet", name_hi="सादा कैबिनेट",
        category="storage", sub_category="cabinet_simple", rooms=_LIVING_BEDROOM_STUDY,
        w=600, h=800, d=360, price=9000, build_price=5800,
        materials=["wood_engineered"], tags=["storage", "cabinet", "simple"],
        roughness=0.68, vibes=_MINIMAL,
        size_label="compact", material_label="wood",
    ),

    # ── Beds ─────────────────────────────────────────────────────────────
    _item(
        sku="HERO-BEDS-01", asset_url="3df/3df_bed_single.glb",
        name_en="Single Bed", name_hi="एकल पलंग",
        category="sleeping", sub_category="bed_single", rooms=_BEDROOM,
        w=950, h=480, d=1950, price=18000, build_price=11500,
        materials=["wood_engineered", "fabric"], tags=["bed", "sleeping", "single", "kids"],
        roughness=0.7,
        size_label="single", material_label="fabric",
    ),
    _item(
        sku="HERO-BEDD-01", asset_url="3df/3df_bed.glb",
        name_en="Double Bed", name_hi="डबल बेड",
        category="sleeping", sub_category="bed_double", rooms=_BEDROOM,
        w=1400, h=500, d=2000, price=26000, build_price=16500,
        materials=["wood_engineered", "fabric"], tags=["bed", "sleeping", "double"],
        roughness=0.7,
        size_label="double", material_label="fabric",
    ),

    # ── Dining compact variant ───────────────────────────────────────────
    _item(
        sku="HERO-DTBL4-COMPACT-01", asset_url="3df/3df_dining_table.glb",
        name_en="Compact 4-Seat Dining Table", name_hi="छोटी डाइनिंग टेबल",
        category="table", sub_category="dining_table_compact", rooms=_LIVING_DINING,
        w=1100, h=760, d=750, price=16000, build_price=10000,
        materials=["wood_teak"], tags=["dining_table", "table", "dining", "compact"],
        roughness=0.6, front_clearance_mm=800,
        size_label="compact", material_label="teak",
    ),
    _item(
        sku="HERO-STOOL-01", asset_url="3df/3df_ottoman.glb",
        name_en="Bar Stool", name_hi="बार स्टूल",
        category="seating", sub_category="bar_stool", rooms=[RoomType.KITCHEN, RoomType.DINING, RoomType.LIVING],
        w=380, h=700, d=380, price=3800, build_price=2400,
        materials=["wood_teak", "metal"], tags=["stool", "seating", "bar", "kitchen"],
        roughness=0.65,
        size_label="standard", material_label="wood",
    ),

    # ── Lighting variants ────────────────────────────────────────────────
    _item(
        sku="HERO-LAMP-ROUND-01", asset_url="3df/3df_lamp.glb",
        name_en="Round Arc Floor Lamp", name_hi="गोल आर्क लैंप",
        category="lighting", sub_category="lamp_round", rooms=_ALL_ROOMS,
        w=400, h=1700, d=400, price=5500, build_price=None,
        materials=["metal", "fabric_shade"], tags=["lighting", "floor_lamp", "round", "arc"],
        roughness=0.45, vibes=_EARTHY + _COASTAL,
        size_label="tall", material_label="metal",
    ),
    _item(
        sku="HERO-CEIL-01", asset_url="3df/3df_ceiling_light.glb",
        name_en="Ceiling Pendant Light", name_hi="सीलिंग लाइट",
        category="lighting", sub_category="ceiling_light", rooms=_ALL_ROOMS,
        w=500, h=300, d=500, price=6500, build_price=None,
        materials=["metal", "glass"], tags=["lighting", "ceiling", "pendant", "modern"],
        roughness=0.35, vibes=_MINIMAL,
        size_label="standard", material_label="metal",
        placement_type="ceiling",
    ),
    _item(
        sku="HERO-LAMP-SQ-01", asset_url="3df/3df_lamp.glb",
        name_en="Square Floor Lamp", name_hi="चौकोर फ़र्श लैंप",
        category="lighting", sub_category="lamp_square", rooms=_ALL_ROOMS,
        w=350, h=1600, d=350, price=4800, build_price=None,
        materials=["metal"], tags=["lighting", "floor_lamp", "square", "modern"],
        roughness=0.4, vibes=_MINIMAL,
        size_label="tall", material_label="metal",
    ),
    _item(
        sku="HERO-WALL-LAMP-01", asset_url="3df/3df_lamp.glb",
        name_en="Wall Sconce", name_hi="दीवार लैंप",
        category="lighting", sub_category="wall_lamp", rooms=_ALL_ROOMS,
        w=200, h=350, d=200, price=2800, build_price=None,
        materials=["metal", "fabric_shade"], tags=["lighting", "wall_lamp", "sconce"],
        roughness=0.45,
        size_label="small", material_label="metal",
        placement_type="wall",
    ),
    _item(
        sku="HERO-LAMP-SQTBL-01", asset_url="3df/3df_lamp.glb",
        name_en="Square Table Lamp", name_hi="चौकोर टेबल लैंप",
        category="lighting", sub_category="table_lamp_square", rooms=_ALL_ROOMS,
        w=220, h=450, d=220, price=2500, build_price=None,
        materials=["metal"], tags=["lighting", "table_lamp", "square"],
        roughness=0.4, vibes=_MINIMAL,
        size_label="small", material_label="metal",
    ),

    # ── Rug variants (big visual quality lever) ──────────────────────────

    # ── Kitchen items ────────────────────────────────────────────────────
    _item(
        sku="HERO-KCNT-01", asset_url="3df/3df_kitchen_cabinet.glb",
        name_en="Kitchen Base Counter", name_hi="किचन काउंटर",
        category="storage", sub_category="kitchen_counter", rooms=[RoomType.KITCHEN],
        w=1800, h=900, d=600, price=28000, build_price=18000,
        materials=["wood_engineered", "granite"], tags=["kitchen", "counter", "base"],
        roughness=0.5,
        front_clearance_mm=900,
        size_label="standard", material_label="granite",
    ),
    _item(
        sku="HERO-KCNTL-01", asset_url="3df/3df_kitchen_cabinet.glb",
        name_en="L-Shape Kitchen Counter", name_hi="एल-आकार किचन काउंटर",
        category="storage", sub_category="kitchen_counter_l", rooms=[RoomType.KITCHEN],
        w=2400, h=900, d=600, price=42000, build_price=28000,
        materials=["wood_engineered", "granite"], tags=["kitchen", "counter", "l_shape"],
        roughness=0.5,
        front_clearance_mm=900,
        size_label="large", material_label="granite",
    ),
    _item(
        sku="HERO-KOVER-01", asset_url="3df/3df_kitchen_cabinet.glb",
        name_en="Kitchen Overhead Cabinet", name_hi="ओवरहेड कैबिनेट",
        category="storage", sub_category="kitchen_overhead", rooms=[RoomType.KITCHEN],
        w=900, h=700, d=350, price=16000, build_price=10000,
        materials=["wood_engineered", "laminate"], tags=["kitchen", "overhead", "cabinet", "wall"],
        roughness=0.6,
        size_label="standard", material_label="laminate",
        placement_type="wall",
    ),
    _item(
        sku="HERO-FRIDGE-01", asset_url="3df/3df_cabinet.glb",
        name_en="Refrigerator", name_hi="रेफ्रिजरेटर",
        category="storage", sub_category="fridge", rooms=[RoomType.KITCHEN],
        w=700, h=1800, d=700, price=35000, build_price=None,
        materials=["metal"], tags=["kitchen", "fridge", "appliance"],
        roughness=0.3,
        front_clearance_mm=1000,
        size_label="standard", material_label="metal",
    ),
    _item(
        sku="HERO-STOVE-01", asset_url="3df/3df_kitchen_cabinet.glb",
        name_en="Gas Stove", name_hi="गैस चूल्हा",
        category="table", sub_category="stove", rooms=[RoomType.KITCHEN],
        w=900, h=900, d=600, price=12000, build_price=None,
        materials=["metal", "glass"], tags=["kitchen", "stove", "appliance"],
        roughness=0.35,
        front_clearance_mm=900,
        size_label="standard", material_label="metal",
    ),
    _item(
        sku="HERO-SINK-01", asset_url="3df/3df_kitchen_cabinet.glb",
        name_en="Kitchen Sink", name_hi="किचन सिंक",
        category="table", sub_category="kitchen_sink", rooms=[RoomType.KITCHEN],
        w=600, h=200, d=600, price=8000, build_price=5000,
        materials=["stainless_steel"], tags=["kitchen", "sink", "plumbing"],
        roughness=0.2,
        size_label="single", material_label="steel",
    ),

    # ── Study additions ──────────────────────────────────────────────────
    _item(
        sku="HERO-DESK-CORNER-01", asset_url="3df/3df_desk.glb",
        name_en="Corner Study Desk", name_hi="कोने की मेज़",
        category="table", sub_category="desk_corner", rooms=[RoomType.BEDROOM, RoomType.STUDY],
        w=1500, h=750, d=1200, price=18000, build_price=12000,
        materials=["wood_engineered"], tags=["desk", "corner", "study", "wfh"],
        roughness=0.55,
        front_clearance_mm=1000,
        size_label="large", material_label="wood",
    ),

    # ── Decor: additional plants ─────────────────────────────────────────
]

_BY_SUB_ROOM: dict[tuple[str, RoomType], list[CatalogItem]] = defaultdict(list)
for _it in HERO_ITEMS:
    for _r in _it.rooms:
        _BY_SUB_ROOM[(_it.sub_category or "", _r)].append(_it)


def hero_candidates(sub_category: str, room: RoomType) -> list[CatalogItem]:
    """Curated items for this (sub_category, room), or [] if none — in which
    case the selector falls back to the big auto-generated catalog."""
    return list(_BY_SUB_ROOM.get((sub_category, room), []))
