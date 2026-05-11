"""Bill of Quantities computation. Pure math, mm-based.

Outputs:
  - Furniture lines (per PlacedItem, with carpenter spec where buildable)
  - Materials lines (paint, putty, flooring, skirting, finish)
  - Labor lines (carpentry, painting, flooring install, electrical points)
  - Subtotal, contingency, GST breakdown, grand total
  - Execution sequence (8-phase carpenter-ready timeline)
"""
from __future__ import annotations

from dataclasses import dataclass, field

from app.schemas.state import RoomState

# ---------- Tax / labor rates ----------
# Same Indian-context rates the legacy used.

CITY_LABOR_RATES: dict[str, dict[str, int]] = {
    "Mumbai": {"carpentry": 450, "painting": 28, "flooring": 35, "electrical": 600},
    "Delhi": {"carpentry": 400, "painting": 25, "flooring": 30, "electrical": 550},
    "Bangalore": {"carpentry": 420, "painting": 26, "flooring": 32, "electrical": 580},
    "Chennai": {"carpentry": 380, "painting": 24, "flooring": 28, "electrical": 500},
    "Hyderabad": {"carpentry": 390, "painting": 25, "flooring": 30, "electrical": 520},
    "Pune": {"carpentry": 410, "painting": 26, "flooring": 32, "electrical": 560},
    "Kolkata": {"carpentry": 370, "painting": 22, "flooring": 28, "electrical": 480},
}

DEFAULT_CITY = "Mumbai"

# Categories that are typically built locally vs. bought.
BUILD_CATEGORIES = {"storage", "tv_unit", "mandir", "kitchen"}


@dataclass
class BOQLine:
    sl_no: int
    description: str
    qty: int
    unit: str
    rate_inr: int
    amount_inr: int
    section: str  # "furniture" | "materials" | "labor"
    procurement: str  # "buy" | "build"
    carpenter_spec: str | None = None
    item_id: str | None = None


@dataclass
class BOQ:
    furniture: list[BOQLine] = field(default_factory=list)
    materials: list[BOQLine] = field(default_factory=list)
    labor: list[BOQLine] = field(default_factory=list)
    subtotal_inr: int = 0
    contingency_inr: int = 0
    gst_inr: int = 0
    grand_total_inr: int = 0
    execution_phases: list[dict] = field(default_factory=list)
    city: str = DEFAULT_CITY

    @property
    def all_lines(self) -> list[BOQLine]:
        return [*self.furniture, *self.materials, *self.labor]


# ---------- Helpers ----------


def _carpenter_spec_for(item_w_mm: int, item_d_mm: int, item_h_mm: int, name: str) -> str:
    """The legacy spec format, kept consistent so a contractor reading two
    Nirmit quotations side-by-side sees the same shape."""
    return (
        f"{name}: {item_w_mm}mm (W) x {item_d_mm}mm (D) x {item_h_mm}mm (H). "
        "Material: 18mm BWP marine ply with laminate finish. "
        "Joinery: dowel + confirmat screw, concealed Hettich hinges. "
        "Edges: 2mm PVC edge banding, matching finish. "
        "Hardware: SS304 anti-rust."
    )


# ---------- Build ----------


def build_boq(room: RoomState, *, city: str = DEFAULT_CITY) -> BOQ:
    rates = CITY_LABOR_RATES.get(city, CITY_LABOR_RATES[DEFAULT_CITY])
    sl = 0
    boq = BOQ(city=city)

    # ---- Furniture ----
    for item in room.items:
        sl += 1
        is_build = item.category in BUILD_CATEGORIES or not item.is_buy
        amount = item.build_price_inr or item.price_inr if is_build else item.price_inr
        line = BOQLine(
            sl_no=sl,
            description=item.name_en,
            qty=1,
            unit="piece",
            rate_inr=amount,
            amount_inr=amount,
            section="furniture",
            procurement="build" if is_build else "buy",
            item_id=item.id,
        )
        if is_build:
            line.carpenter_spec = _carpenter_spec_for(
                item.dimensions.width_mm,
                item.dimensions.depth_mm,
                item.dimensions.height_mm,
                item.name_en,
            )
        boq.furniture.append(line)

    # ---- Materials ----
    width_m = room.intake.room_dimensions.width_mm / 1000
    depth_m = room.intake.room_dimensions.depth_mm / 1000
    height_m = room.intake.room_dimensions.height_mm / 1000
    wall_sqft = int(round(2 * (width_m + depth_m) * height_m * 10.7639))
    floor_sqft = int(round(width_m * depth_m * 10.7639))
    perimeter_rft = int(round(2 * (width_m + depth_m) * 3.2808))
    item_count = max(len(room.items), 1)

    materials_inputs = [
        (f"Wall Paint - {room.wall_finish or 'Asian Paints Royale Emulsion'}", wall_sqft, "sqft", 38),
        ("Wall Putty + Primer", wall_sqft, "sqft", 12),
        (f"Flooring - {room.flooring or 'engineered laminate'}", floor_sqft, "sqft", 95),
        ("Skirting", perimeter_rft, "rft", 120),
        ("Wood Finish + Polish", item_count, "items", 800),
    ]
    for desc, qty, unit, rate in materials_inputs:
        sl += 1
        boq.materials.append(
            BOQLine(
                sl_no=sl,
                description=desc,
                qty=qty,
                unit=unit,
                rate_inr=rate,
                amount_inr=qty * rate,
                section="materials",
                procurement="buy",
            )
        )

    # ---- Labor ----
    labor_inputs = [
        ("Carpentry & Assembly", item_count, "items", rates["carpentry"]),
        ("Painting Labor", wall_sqft, "sqft", rates["painting"]),
        ("Flooring Installation", floor_sqft, "sqft", rates["flooring"]),
        ("Electrical Points", 4, "points", rates["electrical"]),
    ]
    for desc, qty, unit, rate in labor_inputs:
        sl += 1
        boq.labor.append(
            BOQLine(
                sl_no=sl,
                description=desc,
                qty=qty,
                unit=unit,
                rate_inr=rate,
                amount_inr=qty * rate,
                section="labor",
                procurement="build",
            )
        )

    # ---- Totals ----
    furniture_total = sum(l.amount_inr for l in boq.furniture)
    materials_total = sum(l.amount_inr for l in boq.materials)
    labor_total = sum(l.amount_inr for l in boq.labor)
    boq.subtotal_inr = furniture_total + materials_total + labor_total
    boq.contingency_inr = int(round(boq.subtotal_inr * 0.10))
    # GST: simplified — 18% on furniture/materials, labor exempt for unorganised carpenters.
    boq.gst_inr = int(round((furniture_total + materials_total) * 0.18))
    boq.grand_total_inr = boq.subtotal_inr + boq.contingency_inr + boq.gst_inr

    # ---- Execution sequence ----
    boq.execution_phases = _execution_phases(boq)

    return boq


_PHASES = [
    ("demolition", "1. Site Preparation & Demolition", 2, []),
    ("civil", "2. Civil Work & Leveling", 3, ["demolition"]),
    ("electrical", "3. Electrical Points & Conduits", 2, ["civil"]),
    ("flooring", "4. Flooring Installation", 3, ["civil"]),
    ("painting", "5. Painting & Finishing", 4, ["civil"]),
    ("carpentry", "6. Carpentry & Built-in Units", 7, ["painting", "flooring"]),
    ("furnishing", "7. Furniture Installation", 2, ["carpentry"]),
    ("finishing", "8. Final Clean & Handover", 1, ["furnishing", "electrical"]),
]


def _execution_phases(boq: BOQ) -> list[dict]:
    bucket: dict[str, list[BOQLine]] = {p[0]: [] for p in _PHASES}
    bucket_total: dict[str, int] = {p[0]: 0 for p in _PHASES}

    for line in boq.all_lines:
        d = line.description.lower()
        if line.section == "labor":
            if "electric" in d:
                key = "electrical"
            elif "paint" in d:
                key = "painting"
            elif "floor" in d:
                key = "flooring"
            else:
                key = "carpentry"
        elif line.section == "materials":
            if "floor" in d or "skirting" in d:
                key = "flooring"
            elif "paint" in d or "putty" in d or "primer" in d:
                key = "painting"
            elif "wood" in d:
                key = "carpentry"
            else:
                key = "carpentry"
        else:  # furniture
            key = "carpentry" if line.procurement == "build" else "furnishing"
        bucket[key].append(line)
        bucket_total[key] += line.amount_inr

    out: list[dict] = []
    for key, label, days, depends in _PHASES:
        if not bucket[key]:
            continue
        out.append(
            {
                "phase": key,
                "label": label,
                "duration_days": days,
                "depends_on": depends,
                "total_inr": bucket_total[key],
                "lines": [
                    {"sl_no": l.sl_no, "description": l.description, "amount_inr": l.amount_inr}
                    for l in bucket[key]
                ],
            }
        )
    return out
