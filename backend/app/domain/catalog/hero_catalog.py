"""Curated "hero" catalog — the furniture pieces the renderer can show *correctly*.

WHY THIS EXISTS
---------------
The big catalog (`data/catalog.json`, ~3.6k SKUs) is auto-generated and maps
many SKUs onto ~80 shared GLB meshes whose real geometry does NOT match the
declared dimensions. The frontend auto-fits a GLB to the declared box, so a
near-square "long sofa" mesh stretched to a 2.4 m declared width becomes a
2 m-deep block — visible clipping, items that "aren't what they say they are."

The working room planners (Blueprint3D, Sweet Home 3D) all solve this the same
way: a small curated catalog where the declared dimensions ARE the model's real
dimensions (up to one clean uniform scale). Then the renderer's scale factor is
exactly that uniform number — no aspect distortion, no clipping surprises.

HOW THE NUMBERS WERE DERIVED
----------------------------
Each GLB's native bounding box was measured directly from its accessor min/max
(X = width, Y = height, Z = depth; these are Kenney furniture-kit assets, Y-up,
modelled at roughly 1:2 real scale). `dimensions` below = native_bbox × SCALE,
where SCALE was chosen per item so the result is a realistic real-world size
*and* keeps the mesh's natural proportions. The frontend then computes
scale = declared / native = SCALE exactly (uniform), so what you see is what the
solver placed.

The four wardrobe GLBs (`wardrobe_2d/3d.glb`, `WARD-*.glb`) have a garbage
7.62 m bounding box and are deliberately NOT referenced here — `bookcaseClosed`
stands in for a wardrobe.

This module is the source of truth for the items the selector can place; it
falls back to the big catalog only for sub-categories not covered here.
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
    )


_LIVING = [RoomType.LIVING]
_BEDROOM = [RoomType.BEDROOM]
_LIVING_BEDROOM = [RoomType.LIVING, RoomType.BEDROOM]

# native bbox (m) → declared dims (mm) noted in comments as W×H×D after ×SCALE
HERO_ITEMS: list[CatalogItem] = [
    # ── seating ──────────────────────────────────────────────────────────
    _item(  # loungeDesignSofa.glb 1.120×0.400×0.410  ×1.95
        sku="HERO-SOFA3-01", asset_url="loungeDesignSofa.glb",
        name_en="Three-seat Sofa", name_hi="तीन-सीट सोफा",
        category="seating", sub_category="sofa", rooms=_LIVING,
        w=2184, h=780, d=800, price=34000, build_price=21000,
        materials=["fabric", "wood_frame"], tags=["sofa", "seating", "three_seat"], roughness=0.85,
    ),
    _item(  # loungeSofa.glb 0.980×0.460×0.410  ×1.65
        sku="HERO-SOFA2-01", asset_url="loungeSofa.glb",
        name_en="Two-seat Sofa", name_hi="दो-सीट सोफा",
        category="seating", sub_category="sofa_2seat", rooms=_LIVING,
        w=1617, h=759, d=677, price=24000, build_price=15000,
        materials=["fabric", "wood_frame"], tags=["sofa", "seating", "two_seat"], roughness=0.85,
    ),
    _item(  # loungeDesignSofaCorner.glb 1.350×0.400×1.350  ×1.85
        sku="HERO-SOFAL-01", asset_url="loungeDesignSofaCorner.glb",
        name_en="L-shaped Sectional", name_hi="एल-आकार सेक्शनल",
        category="seating", sub_category="sofa_l", rooms=_LIVING,
        w=2498, h=740, d=2498, price=52000, build_price=33000,
        materials=["fabric", "wood_frame"], tags=["sofa", "seating", "sectional", "l_shape"], roughness=0.85,
    ),
    _item(  # loungeChair.glb 0.490×0.460×0.410  ×1.75
        sku="HERO-LCHAIR-01", asset_url="loungeChair.glb",
        name_en="Lounge Armchair", name_hi="आराम कुर्सी",
        category="seating", sub_category="lounge_chair", rooms=_LIVING_BEDROOM,
        w=858, h=805, d=718, price=11000, build_price=7000,
        materials=["fabric", "wood_frame"], tags=["chair", "seating", "armchair", "accent"], roughness=0.8,
    ),
    _item(  # ottoman.glb 0.440×0.230×0.450  ×1.45
        sku="HERO-OTTO-01", asset_url="ottoman.glb",
        name_en="Upholstered Ottoman", name_hi="ओटोमन",
        category="seating", sub_category="ottoman", rooms=_LIVING,
        w=638, h=334, d=653, price=5500, build_price=3500,
        materials=["fabric"], tags=["ottoman", "footrest", "seating"], roughness=0.85,
    ),
    # ── tables ───────────────────────────────────────────────────────────
    _item(  # tableCoffee.glb 0.661×0.230×0.400  ×1.65
        sku="HERO-COFFEE-01", asset_url="tableCoffee.glb",
        name_en="Coffee Table", name_hi="सेंटर टेबल",
        category="table", sub_category="coffee_table", rooms=_LIVING,
        w=1091, h=380, d=660, price=8000, build_price=5200,
        materials=["wood_teak"], tags=["table", "coffee_table", "centre_table"], roughness=0.6,
    ),
    _item(  # sideTableDrawers.glb 0.534×0.384×0.386  ×1.30
        sku="HERO-SIDE-01", asset_url="sideTableDrawers.glb",
        name_en="Side Table with Drawer", name_hi="साइड टेबल",
        category="table", sub_category="side_table", rooms=_LIVING_BEDROOM,
        w=694, h=499, d=502, price=4500, build_price=2900,
        materials=["wood_teak"], tags=["table", "side_table", "nightstand"], roughness=0.6,
    ),
    _item(  # desk.glb 0.734×0.384×0.556  ×1.70
        sku="HERO-DESK-01", asset_url="desk.glb",
        name_en="Work Desk", name_hi="अध्ययन मेज़",
        category="table", sub_category="desk", rooms=[RoomType.BEDROOM, RoomType.STUDY, RoomType.LIVING],
        w=1248, h=653, d=945, price=12000, build_price=7800,
        materials=["wood_engineered"], tags=["desk", "table", "study", "wfh"], roughness=0.55,
    ),
    # ── storage (carpenter-built) ────────────────────────────────────────
    _item(  # bookcaseOpen.glb 0.400×0.880×0.250  ×2.10
        sku="HERO-BOOK-01", asset_url="bookcaseOpen.glb",
        name_en="Open Bookshelf", name_hi="किताबों की अलमारी",
        category="storage", sub_category="bookshelf", rooms=_LIVING_BEDROOM,
        w=840, h=1848, d=525, price=11000, build_price=7000,
        materials=["wood_engineered"], tags=["storage", "bookshelf", "display"], roughness=0.7,
    ),
    _item(  # chest_drawers.glb 0.534×0.384×0.386  ×1.90
        sku="HERO-CHEST-01", asset_url="chest_drawers.glb",
        name_en="Chest of Drawers", name_hi="दराज़ की अलमारी",
        category="storage", sub_category="cabinet", rooms=_LIVING_BEDROOM,
        w=1015, h=730, d=733, price=15000, build_price=9500,
        materials=["wood_engineered"], tags=["storage", "drawers", "cabinet"], roughness=0.7,
    ),
    _item(  # sideTableDrawers.glb 0.534×0.384×0.386  ×1.50
        sku="HERO-DRAWER-01", asset_url="sideTableDrawers.glb",
        name_en="Low Drawer Unit", name_hi="दराज़ इकाई",
        category="storage", sub_category="drawer", rooms=_LIVING_BEDROOM,
        w=801, h=576, d=579, price=9000, build_price=5800,
        materials=["wood_engineered"], tags=["storage", "drawers"], roughness=0.7,
    ),
    _item(  # bookcaseOpenLow.glb 0.400×0.400×0.250  ×1.85
        sku="HERO-SHOE-01", asset_url="bookcaseOpenLow.glb",
        name_en="Shoe Rack", name_hi="जूता रैक",
        category="storage", sub_category="shoe_rack", rooms=_LIVING,
        w=740, h=740, d=463, price=6000, build_price=3800,
        materials=["wood_engineered"], tags=["storage", "shoe_rack", "entryway"], roughness=0.7,
    ),
    _item(  # bookcaseClosed.glb 0.400×0.850×0.250  ×2.45  (stands in for wardrobe)
        sku="HERO-WARD-01", asset_url="bookcaseClosed.glb",
        name_en="Two-door Wardrobe", name_hi="अलमारी",
        category="storage", sub_category="wardrobe", rooms=_BEDROOM,
        w=980, h=2083, d=613, price=31000, build_price=19500,
        materials=["wood_engineered", "laminate"], tags=["storage", "wardrobe", "closet"], roughness=0.65,
    ),
    # ── beds ─────────────────────────────────────────────────────────────
    _item(  # bed_queen.glb 1.623×0.505×1.912  ×0.95  (already near real scale)
        sku="HERO-BEDQ-01", asset_url="bed_queen.glb",
        name_en="Queen Bed", name_hi="क्वीन बेड",
        category="sleeping", sub_category="bed_queen", rooms=_BEDROOM,
        w=1542, h=480, d=1816, price=28000, build_price=18000,
        materials=["wood_engineered", "fabric"], tags=["bed", "sleeping", "queen"], roughness=0.7,
    ),
    # ── lighting ─────────────────────────────────────────────────────────
    _item(  # lampRoundFloor.glb 0.152×0.860×0.176  ×1.60
        sku="HERO-LAMP-01", asset_url="lampRoundFloor.glb",
        name_en="Floor Lamp", name_hi="फ़र्श लैंप",
        category="lighting", sub_category="lamp", rooms=_LIVING_BEDROOM,
        w=243, h=1376, d=282, price=3500, build_price=None,
        materials=["metal", "fabric_shade"], tags=["lighting", "floor_lamp", "ambient"], roughness=0.5,
    ),
    # ── decor ────────────────────────────────────────────────────────────
    _item(  # rugRectangle.glb 1.570×0.010×0.920  ×1.50
        sku="HERO-RUG-01", asset_url="rugRectangle.glb",
        name_en="Area Rug", name_hi="कालीन",
        category="decor", sub_category="rug", rooms=_LIVING_BEDROOM,
        w=2355, h=15, d=1380, price=7000, build_price=None,
        materials=["wool", "cotton"], tags=["rug", "decor", "floor"], roughness=0.95,
    ),
    _item(  # pottedPlant.glb 0.255×0.536×0.291  ×1.60
        sku="HERO-PLANT-01", asset_url="pottedPlant.glb",
        name_en="Potted Floor Plant", name_hi="गमले का पौधा",
        category="decor", sub_category="plant", rooms=_LIVING_BEDROOM,
        w=408, h=858, d=466, price=1800, build_price=None,
        materials=["ceramic", "foliage"], tags=["plant", "decor", "greenery"], roughness=0.8,
    ),
    # ── mandir (carpenter-built) ─────────────────────────────────────────
    _item(  # pooja_wall.glb 0.400×0.400×0.250  ×1.50  (wall-mounted — frontend yNudge floats it)
        sku="HERO-MANDIRW-01", asset_url="pooja_wall.glb",
        name_en="Wall-mounted Mandir", name_hi="दीवार मंदिर",
        category="mandir", sub_category="mandir_wall", rooms=[RoomType.LIVING, RoomType.POOJA],
        w=600, h=600, d=375, price=8000, build_price=5000,
        materials=["wood_teak"], tags=["mandir", "pooja", "wall_mounted", "sacred"], roughness=0.55,
    ),
    _item(  # pooja_floor.glb 0.400×0.850×0.250  ×1.55
        sku="HERO-MANDIRF-01", asset_url="pooja_floor.glb",
        name_en="Floor Mandir Unit", name_hi="मंदिर",
        category="mandir", sub_category="mandir_floor", rooms=[RoomType.LIVING, RoomType.POOJA],
        w=620, h=1318, d=388, price=12000, build_price=8000,
        materials=["wood_teak"], tags=["mandir", "pooja", "floor", "sacred"], roughness=0.55,
    ),
    # ── tv unit (carpenter-built) ────────────────────────────────────────
    _item(  # cabinetTelevisionDoors.glb 1.160×0.310×0.280  ×1.55
        sku="HERO-TV-01", asset_url="cabinetTelevisionDoors.glb",
        name_en="TV Console with Storage", name_hi="टीवी यूनिट",
        category="tv_unit", sub_category="tv_unit", rooms=_LIVING,
        w=1798, h=481, d=434, price=14000, build_price=9000,
        materials=["wood_engineered", "laminate"], tags=["tv_unit", "media", "storage"], roughness=0.6,
    ),
    # ── desk chair ───────────────────────────────────────────────────────
    _item(  # office_chair.glb 0.479×0.418×0.443  ×1.90
        sku="HERO-DCHAIR-01", asset_url="office_chair.glb",
        name_en="Task Chair", name_hi="कार्य कुर्सी",
        category="seating", sub_category="desk_chair", rooms=[RoomType.BEDROOM, RoomType.STUDY, RoomType.LIVING],
        w=910, h=794, d=842, price=8000, build_price=None,
        materials=["mesh", "metal"], tags=["chair", "office", "task", "wfh"], roughness=0.6,
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
