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
) -> CatalogItem:
    return CatalogItem(
        sku=sku,
        asset_url=asset_url,
        name_en=name_en,
        name_hi=name_hi,
        category=category,
        sub_category=sub_category,
        rooms=rooms,
        vibes=_ALL_VIBES,  # hero pieces are versatile — match any chosen vibe
        dimensions=Dimensions(width_mm=w, depth_mm=d, height_mm=h),
        price_inr=price,
        build_price_inr=build_price,
        materials=materials,
        tags=tags,
        tint_hex=None,  # keep the model's own colours; palette drives walls/floor
        size_label=None,
        material_label=None,
        finish_label=None,
        roughness_hint=roughness,
        front_clearance_mm=front_clearance_mm,
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

# All dimensions below = native GLB AABB measurements (see `scripts/measure_glb.py`).
# When declared = native, the renderer's auto-fit produces scale = 1.0 uniformly.
HERO_ITEMS: list[CatalogItem] = [
    # ── seating: sofas ───────────────────────────────────────────────────
    _item(  # sofa_3seat.glb native 2234×879×740 mm
        sku="HERO-SOFA3-01", asset_url="sofa_3seat.glb",
        name_en="Three-seat Sofa", name_hi="तीन-सीट सोफा",
        category="seating", sub_category="sofa", rooms=_LIVING,
        w=2234, h=879, d=740, price=42000, build_price=26000,
        materials=["fabric", "wood_frame"], tags=["sofa", "seating", "three_seat", "designer"], roughness=0.85,
        front_clearance_mm=900,
    ),
    _item(  # sofa_l.glb native 2766×684×1240 mm — generous L-shape sectional
        sku="HERO-SOFAL-01", asset_url="sofa_l.glb",
        name_en="L-shaped Sectional", name_hi="एल-आकार सेक्शनल",
        category="seating", sub_category="sofa_l", rooms=_LIVING,
        w=2766, h=684, d=1240, price=58000, build_price=36000,
        materials=["fabric", "wood_frame"], tags=["sofa", "seating", "sectional", "l_shape"], roughness=0.85,
        front_clearance_mm=900,
    ),
    _item(  # sofa_2seater.glb native 980×460×410 mm — compact 2-seater for Breath/small rooms
        sku="HERO-SOFA2-01", asset_url="sofa_2seater.glb",
        name_en="Two-seat Sofa", name_hi="दो-सीट सोफा",
        category="seating", sub_category="sofa_2seat", rooms=_LIVING,
        w=1620, h=760, d=680, price=26000, build_price=16000,
        materials=["fabric", "wood_frame"], tags=["sofa", "seating", "two_seat", "compact"], roughness=0.85,
        front_clearance_mm=900,
    ),
    _item(  # diwan.glb native 400×460×200 mm — declared bigger so it reads as a real diwan
        sku="HERO-DIWAN-01", asset_url="diwan.glb",
        name_en="Diwan", name_hi="दीवान",
        category="seating", sub_category="diwan", rooms=_LIVING_BEDROOM,
        w=1800, h=550, d=900, price=22000, build_price=14000,
        materials=["wood_teak", "fabric"], tags=["diwan", "seating", "indian", "multi_use"], roughness=0.75,
        front_clearance_mm=700,
    ),
    # ── seating: chairs ──────────────────────────────────────────────────
    _item(  # lounge_chair.glb native 804×640×705 mm
        sku="HERO-LCHAIR-01", asset_url="lounge_chair.glb",
        name_en="Lounge Armchair", name_hi="आराम कुर्सी",
        category="seating", sub_category="lounge_chair", rooms=_LIVING_BEDROOM,
        w=804, h=640, d=705, price=14000, build_price=9000,
        materials=["fabric", "wood_frame"], tags=["chair", "seating", "armchair", "accent"], roughness=0.8,
    ),
    _item(  # chair.glb native 502×815×547 mm — accent chair (taller, more formal)
        sku="HERO-CHAIR-01", asset_url="chair.glb",
        name_en="Accent Chair", name_hi="उच्चारण कुर्सी",
        category="seating", sub_category="accent_chair", rooms=_LIVING_BEDROOM,
        w=502, h=815, d=547, price=9000, build_price=5800,
        materials=["fabric", "wood_frame"], tags=["chair", "seating", "accent", "formal"], roughness=0.8,
    ),
    _item(  # ottoman.glb native 483×627×973 mm — long ottoman/bench
        sku="HERO-OTTO-01", asset_url="ottoman.glb",
        name_en="Upholstered Ottoman", name_hi="ओटोमन",
        category="seating", sub_category="ottoman", rooms=_LIVING,
        w=483, h=627, d=973, price=6500, build_price=4200,
        materials=["fabric"], tags=["ottoman", "footrest", "seating"], roughness=0.85,
    ),
    # ── tables ───────────────────────────────────────────────────────────
    _item(  # coffee_table.glb native 960×360×561 mm
        sku="HERO-COFFEE-01", asset_url="coffee_table.glb",
        name_en="Coffee Table", name_hi="सेंटर टेबल",
        category="table", sub_category="coffee_table", rooms=_LIVING,
        w=960, h=360, d=561, price=9500, build_price=6200,
        materials=["wood_teak"], tags=["table", "coffee_table", "centre_table"], roughness=0.6,
    ),
    _item(  # tableRound.glb native 693×367×800 mm — round coffee table
        sku="HERO-COFFEE-ROUND-01", asset_url="tableRound.glb",
        name_en="Round Coffee Table", name_hi="गोल सेंटर टेबल",
        category="table", sub_category="coffee_table_round", rooms=_LIVING,
        w=800, h=400, d=800, price=10500, build_price=6800,
        materials=["wood_teak"], tags=["table", "coffee_table", "round"], roughness=0.6,
    ),
    _item(  # sideTableDrawers.glb native 535×384×386 mm
        sku="HERO-SIDE-01", asset_url="sideTableDrawers.glb",
        name_en="Side Table with Drawer", name_hi="साइड टेबल",
        category="table", sub_category="side_table", rooms=_LIVING_BEDROOM,
        w=535, h=460, d=386, price=4500, build_price=2900,
        materials=["wood_teak"], tags=["table", "side_table", "nightstand"], roughness=0.6,
    ),
    _item(  # desk.glb native 735×384×556 mm — declared scaled to real desk height
        sku="HERO-DESK-01", asset_url="desk.glb",
        name_en="Work Desk", name_hi="अध्ययन मेज़",
        category="table", sub_category="desk", rooms=[RoomType.BEDROOM, RoomType.STUDY, RoomType.LIVING],
        w=1200, h=750, d=600, price=14000, build_price=9000,
        materials=["wood_engineered"], tags=["desk", "table", "study", "wfh"], roughness=0.55,
        front_clearance_mm=1000,
    ),
    # ── storage (carpenter-built) ────────────────────────────────────────
    _item(  # bookshelf.glb native 1663×1863×331 mm — wide tall bookcase
        sku="HERO-BOOK-01", asset_url="bookshelf.glb",
        name_en="Open Bookshelf", name_hi="किताबों की अलमारी",
        category="storage", sub_category="bookshelf", rooms=_LIVING_BEDROOM_STUDY,
        w=1663, h=1863, d=331, price=18000, build_price=11500,
        materials=["wood_engineered"], tags=["storage", "bookshelf", "display"], roughness=0.7,
    ),
    _item(  # bookcaseClosedWide.glb native 800×790×250 mm — medium cabinet
        sku="HERO-CABINET-01", asset_url="bookcaseClosedWide.glb",
        name_en="Storage Cabinet", name_hi="अलमारी",
        category="storage", sub_category="cabinet", rooms=_LIVING_BEDROOM_STUDY,
        w=800, h=790, d=300, price=13500, build_price=8500,
        materials=["wood_engineered", "laminate"], tags=["storage", "cabinet"], roughness=0.7,
    ),
    _item(  # chest_drawers.glb native 535×384×386 mm — declared larger for a real chest
        sku="HERO-CHEST-01", asset_url="chest_drawers.glb",
        name_en="Chest of Drawers", name_hi="दराज़ की अलमारी",
        category="storage", sub_category="chest", rooms=_LIVING_BEDROOM,
        w=1000, h=820, d=520, price=16500, build_price=10500,
        materials=["wood_engineered"], tags=["storage", "drawers", "chest"], roughness=0.7,
    ),
    _item(  # sideTableDrawers.glb native 535×384×386 mm — low drawer
        sku="HERO-DRAWER-01", asset_url="sideTableDrawers.glb",
        name_en="Low Drawer Unit", name_hi="दराज़ इकाई",
        category="storage", sub_category="drawer", rooms=_LIVING_BEDROOM_STUDY,
        w=800, h=520, d=420, price=9500, build_price=6000,
        materials=["wood_engineered"], tags=["storage", "drawers"], roughness=0.7,
    ),
    _item(  # shoe_rack.glb native 604×843×620 mm
        sku="HERO-SHOE-01", asset_url="shoe_rack.glb",
        name_en="Shoe Rack", name_hi="जूता रैक",
        category="storage", sub_category="shoe_rack", rooms=_LIVING,
        w=604, h=843, d=620, price=7000, build_price=4500,
        materials=["wood_engineered"], tags=["storage", "shoe_rack", "entryway"], roughness=0.7,
    ),
    _item(  # bookcaseClosed.glb native 400×850×250 mm — declared as wardrobe (taller, wider)
        sku="HERO-WARD-01", asset_url="bookcaseClosed.glb",
        name_en="Two-door Wardrobe", name_hi="अलमारी",
        category="storage", sub_category="wardrobe", rooms=_BEDROOM,
        w=1200, h=2100, d=600, price=34000, build_price=21000,
        materials=["wood_engineered", "laminate"], tags=["storage", "wardrobe", "closet"], roughness=0.65,
    ),
    _item(  # bookshelf_cabinet.glb native 560×850×270 mm — declared larger as sideboard
        sku="HERO-SBOARD-01", asset_url="bookshelf_cabinet.glb",
        name_en="Sideboard / Buffet", name_hi="साइडबोर्ड",
        category="storage", sub_category="sideboard", rooms=_LIVING_DINING,
        w=1500, h=850, d=420, price=16000, build_price=10000,
        materials=["wood_engineered", "laminate"], tags=["sideboard", "buffet", "storage", "dining"], roughness=0.65,
    ),
    # ── beds ─────────────────────────────────────────────────────────────
    _item(  # bed_queen.glb native 1623×505×1912 mm — already real-world sized
        sku="HERO-BEDQ-01", asset_url="bed_queen.glb",
        name_en="Queen Bed", name_hi="क्वीन बेड",
        category="sleeping", sub_category="bed_queen", rooms=_BEDROOM,
        w=1623, h=505, d=1912, price=32000, build_price=20000,
        materials=["wood_engineered", "fabric"], tags=["bed", "sleeping", "queen"], roughness=0.7,
    ),
    _item(  # bed_king.glb native 1623×505×1912 mm — same model, branded as king
        sku="HERO-BEDK-01", asset_url="bed_king.glb",
        name_en="King Bed", name_hi="किंग बेड",
        category="sleeping", sub_category="bed_king", rooms=_BEDROOM,
        w=1800, h=505, d=2000, price=42000, build_price=26000,
        materials=["wood_engineered", "fabric"], tags=["bed", "sleeping", "king"], roughness=0.7,
    ),
    # ── lighting ─────────────────────────────────────────────────────────
    _item(  # lamp_floor.glb native 679×1673×679 mm — proper floor lamp
        sku="HERO-LAMP-01", asset_url="lamp_floor.glb",
        name_en="Floor Lamp", name_hi="फ़र्श लैंप",
        category="lighting", sub_category="lamp", rooms=_ALL_ROOMS,
        w=400, h=1673, d=400, price=4500, build_price=None,
        materials=["metal", "fabric_shade"], tags=["lighting", "floor_lamp", "ambient"], roughness=0.5,
    ),
    _item(  # lampRoundTable.glb native 152×314×176 mm — table lamp
        sku="HERO-LAMP-TABLE-01", asset_url="lampRoundTable.glb",
        name_en="Table Lamp", name_hi="टेबल लैंप",
        category="lighting", sub_category="table_lamp", rooms=_ALL_ROOMS,
        w=200, h=420, d=200, price=2200, build_price=None,
        materials=["metal", "fabric_shade"], tags=["lighting", "table_lamp", "task"], roughness=0.5,
    ),
    _item(  # fan.glb native 1078×390×1029 mm — ceiling fan, hangs from ceiling
        sku="HERO-FAN-01", asset_url="fan.glb",
        name_en="Ceiling Fan", name_hi="छत का पंखा",
        category="lighting", sub_category="ceiling_fan", rooms=_ALL_ROOMS,
        w=1200, h=470, d=1200, price=5500, build_price=None,
        materials=["metal", "wood"], tags=["fan", "ceiling", "ventilation"], roughness=0.55,
    ),
    # ── decor ────────────────────────────────────────────────────────────
    _item(  # rug.glb native 2453×33×3401 mm — large rug, declared smaller for typical rooms
        sku="HERO-RUG-01", asset_url="rug.glb",
        name_en="Area Rug", name_hi="कालीन",
        category="decor", sub_category="rug", rooms=_ALL_ROOMS,
        w=1800, h=20, d=2400, price=8500, build_price=None,
        materials=["wool", "cotton"], tags=["rug", "decor", "floor"], roughness=0.95,
    ),
    _item(  # plant.glb native 435×404×459 mm — proper potted plant
        sku="HERO-PLANT-01", asset_url="plant.glb",
        name_en="Floor Plant", name_hi="गमले का पौधा",
        category="decor", sub_category="plant", rooms=_ALL_ROOMS,
        w=435, h=900, d=459, price=2500, build_price=None,
        materials=["ceramic", "foliage"], tags=["plant", "decor", "greenery"], roughness=0.8,
    ),
    _item(  # plantSmall1.glb native 189×280×189 mm — small tabletop plant
        sku="HERO-PLANT-SMALL-01", asset_url="plantSmall1.glb",
        name_en="Tabletop Plant", name_hi="छोटा पौधा",
        category="decor", sub_category="plant_small", rooms=_ALL_ROOMS,
        w=190, h=280, d=190, price=900, build_price=None,
        materials=["ceramic", "foliage"], tags=["plant", "decor", "small"], roughness=0.8,
    ),
    _item(  # mirror.glb native 301×435×144 mm — wall mirror (yNudge floats it)
        sku="HERO-MIRROR-01", asset_url="mirror.glb",
        name_en="Wall Mirror", name_hi="दीवार दर्पण",
        category="decor", sub_category="mirror", rooms=_ALL_ROOMS,
        w=600, h=900, d=80, price=3500, build_price=None,
        materials=["glass", "wood_frame"], tags=["mirror", "decor", "wall_mounted"], roughness=0.1,
    ),
    # ── mandir (carpenter-built) ─────────────────────────────────────────
    _item(  # pooja_wall.glb native 400×400×250 mm — wall-mounted mandir
        sku="HERO-MANDIRW-01", asset_url="pooja_wall.glb",
        name_en="Wall-mounted Mandir", name_hi="दीवार मंदिर",
        category="mandir", sub_category="mandir_wall", rooms=_MANDIR_ROOMS,
        w=600, h=600, d=375, price=9500, build_price=6000,
        materials=["wood_teak"], tags=["mandir", "pooja", "wall_mounted", "sacred"], roughness=0.55,
    ),
    _item(  # pooja_floor.glb native 400×850×250 mm
        sku="HERO-MANDIRF-01", asset_url="pooja_floor.glb",
        name_en="Floor Mandir Unit", name_hi="मंदिर इकाई",
        category="mandir", sub_category="mandir_floor", rooms=_MANDIR_ROOMS,
        w=620, h=1320, d=388, price=14000, build_price=9000,
        materials=["wood_teak"], tags=["mandir", "pooja", "floor", "sacred"], roughness=0.55,
    ),
    _item(  # pooja_chowki.glb native 400×230×400 mm — low square mandir platform
        sku="HERO-CHOWKI-01", asset_url="pooja_chowki.glb",
        name_en="Pooja Chowki", name_hi="पूजा चौकी",
        category="mandir", sub_category="mandir_chowki", rooms=_MANDIR_ROOMS,
        w=500, h=300, d=500, price=5500, build_price=3500,
        materials=["wood_teak"], tags=["mandir", "pooja", "chowki", "sacred"], roughness=0.6,
    ),
    # ── tv unit (carpenter-built) ────────────────────────────────────────
    _item(  # tv_unit.glb native 1351×526×465 mm
        sku="HERO-TV-01", asset_url="tv_unit.glb",
        name_en="TV Console with Storage", name_hi="टीवी यूनिट",
        category="tv_unit", sub_category="tv_unit", rooms=_LIVING,
        w=1800, h=526, d=465, price=16000, build_price=10000,
        materials=["wood_engineered", "laminate"], tags=["tv_unit", "media", "storage"], roughness=0.6,
        front_clearance_mm=1800,
    ),
    # ── desk chair ───────────────────────────────────────────────────────
    _item(  # chairDesk.glb native 479×418×443 mm
        sku="HERO-DCHAIR-01", asset_url="chairDesk.glb",
        name_en="Task Chair", name_hi="कार्य कुर्सी",
        category="seating", sub_category="desk_chair", rooms=[RoomType.BEDROOM, RoomType.STUDY, RoomType.LIVING],
        w=600, h=900, d=600, price=9000, build_price=None,
        materials=["mesh", "metal"], tags=["chair", "office", "task", "wfh"], roughness=0.6,
    ),
    # ── dining ──────────────────────────────────────────────────────────
    _item(  # dining_6.glb native 2029×827×1065 mm — declared to fit a 4-seater shape
        sku="HERO-DTBL4-01", asset_url="dining_6.glb",
        name_en="4-Seater Dining Table", name_hi="चार-सीट डाइनिंग टेबल",
        category="table", sub_category="dining_table", rooms=_LIVING_DINING,
        w=1200, h=760, d=800, price=22000, build_price=14000,
        materials=["wood_teak"], tags=["dining_table", "table", "dining"], roughness=0.6,
        front_clearance_mm=800,
    ),
    _item(  # dining_6.glb at its native 6-seater size
        sku="HERO-DTBL6-01", asset_url="dining_6.glb",
        name_en="6-Seater Dining Table", name_hi="छह-सीट डाइनिंग टेबल",
        category="table", sub_category="dining_table", rooms=_LIVING_DINING,
        w=2029, h=827, d=1065, price=32000, build_price=20000,
        materials=["wood_teak"], tags=["dining_table", "table", "dining", "six_seat"], roughness=0.6,
        front_clearance_mm=800,
    ),
    _item(  # dining_chair.glb native 200×470×200 mm — declared as real chair dims
        sku="HERO-DCHAIR-DIN-01", asset_url="dining_chair.glb",
        name_en="Dining Chair", name_hi="डाइनिंग कुर्सी",
        category="seating", sub_category="dining_chair", rooms=_LIVING_DINING,
        w=480, h=920, d=520, price=4500, build_price=2800,
        materials=["wood_teak", "fabric"], tags=["chair", "dining_chair", "dining"], roughness=0.7,
    ),
]

_BY_SUB_ROOM: dict[tuple[str, RoomType], list[CatalogItem]] = defaultdict(list)
for _it in HERO_ITEMS:
    for _r in _it.rooms:
        _BY_SUB_ROOM[(_it.sub_category or "", _r)].append(_it)


def hero_candidates(sub_category: str, room: RoomType) -> list[CatalogItem]:
    """Curated items for this (sub_category, room), or [] if none — in which
    case the selector falls back to the big auto-generated catalog."""
    return list(_BY_SUB_ROOM.get((sub_category, room), []))
