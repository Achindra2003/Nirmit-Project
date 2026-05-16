"""PDF generation for the Suresh-standard quotation.

Generates a multi-page PDF containing:
  1. Cover (room name, date, validity, total)
  2. Top-down room sketch with mm dimensions and a North arrow
  3. Furniture line items with carpenter spec (Buy / Build columns)
  4. Materials + Labor BOQ
  5. Hindi specification section
  6. Execution sequence (8-phase timeline)
  7. Validity + payment notes

Uses ReportLab's flowable model so layout adapts to content size.
"""
from __future__ import annotations

import io
import math
from datetime import date, timedelta
from functools import lru_cache
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    Flowable,
)

from app.domain.boq.boq import BOQ
from app.domain.boq.hindi import generate_hindi_section
from app.schemas.state import RoomState

# ---------- Styles ----------

_styles = getSampleStyleSheet()

H1 = ParagraphStyle(
    "H1",
    parent=_styles["Heading1"],
    fontSize=22,
    leading=26,
    spaceBefore=4,
    spaceAfter=8,
    textColor=colors.HexColor("#2A2218"),
)
H2 = ParagraphStyle(
    "H2",
    parent=_styles["Heading2"],
    fontSize=14,
    leading=18,
    spaceBefore=14,
    spaceAfter=6,
    textColor=colors.HexColor("#3F3525"),
)
BODY = ParagraphStyle(
    "Body",
    parent=_styles["BodyText"],
    fontSize=10,
    leading=13,
    textColor=colors.HexColor("#2A2218"),
)
SMALL = ParagraphStyle(
    "Small",
    parent=BODY,
    fontSize=8,
    leading=10,
    textColor=colors.HexColor("#6B614F"),
)


# ---------- Sketch flowable ----------


class RoomSketch(Flowable):
    """A top-down floor plan with mm dimensions, North arrow, door, items."""

    def __init__(self, room: RoomState, target_size_mm: float = 150) -> None:
        super().__init__()
        self.room = room
        self.target_size_mm = target_size_mm
        self.width = target_size_mm * mm
        self.height = target_size_mm * mm

    def wrap(self, _aw: float, _ah: float) -> tuple[float, float]:
        return self.width, self.height + 12 * mm  # extra for axis labels

    def draw(self) -> None:
        c: Canvas = self.canv
        rw_mm = self.room.intake.room_dimensions.width_mm
        rd_mm = self.room.intake.room_dimensions.depth_mm
        scale = (self.target_size_mm * mm) / max(rw_mm, rd_mm)

        room_w = rw_mm * scale
        room_d = rd_mm * scale
        ox = (self.target_size_mm * mm - room_w) / 2
        oy = (self.target_size_mm * mm - room_d) / 2 + 6 * mm

        # Floor fill
        c.setFillColor(colors.HexColor("#F5F0EB"))
        c.setStrokeColor(colors.HexColor("#1C1917"))
        c.setLineWidth(1.4)
        c.rect(ox, oy, room_w, room_d, stroke=1, fill=1)

        # 1m grid
        c.setStrokeColor(colors.HexColor("#E8E2DA"))
        c.setLineWidth(0.3)
        steps_x = int(rw_mm // 1000)
        steps_y = int(rd_mm // 1000)
        for i in range(1, steps_x + 1):
            xline = ox + (1000 * scale) * i
            c.line(xline, oy, xline, oy + room_d)
        for j in range(1, steps_y + 1):
            yline = oy + (1000 * scale) * j
            c.line(ox, yline, ox + room_w, yline)

        # Door arc on the entrance wall
        c.setStrokeColor(colors.HexColor("#1C1917"))
        c.setLineWidth(0.8)
        c.setDash(2, 2)
        door_w = min(900, rw_mm * 0.25) * scale
        c.arc(
            ox + room_w * 0.4 - door_w / 2,
            oy - door_w / 2,
            ox + room_w * 0.4 + door_w / 2,
            oy + door_w / 2,
            startAng=0,
            extent=90,
        )
        c.setDash()

        # Items — position.x_mm/z_mm is the footprint CENTRE.
        c.setFillColor(colors.HexColor("#8B6F52"))
        c.setStrokeColor(colors.HexColor("#5C4632"))
        c.setLineWidth(0.6)
        for it in self.room.items:
            iw = it.dimensions.width_mm * scale
            id_ = it.dimensions.depth_mm * scale
            cx = ox + it.position.x_mm * scale  # centre, in PDF coords
            cz = oy + it.position.z_mm * scale
            c.saveState()
            # Rotate about the footprint centre.
            if it.position.rotation_deg:
                c.translate(cx, cz)
                c.rotate(it.position.rotation_deg)
                c.translate(-cx, -cz)
            c.setFillAlpha(0.55)
            c.rect(cx - iw / 2, cz - id_ / 2, iw, id_, stroke=1, fill=1)
            c.setFillAlpha(1.0)
            if iw > 40 and id_ > 18:
                c.setFillColor(colors.white)
                c.setFont("Helvetica-Bold", 6)
                label = it.name_en if len(it.name_en) <= 16 else it.name_en[:14] + ".."
                c.drawCentredString(cx, cz - 2, label)
                c.setFillColor(colors.HexColor("#8B6F52"))
            c.restoreState()

        # Dimensions
        c.setFillColor(colors.HexColor("#4A4035"))
        c.setFont("Helvetica", 8)
        c.drawCentredString(
            ox + room_w / 2, oy - 4 * mm, f"{rw_mm} mm  ({rw_mm / 304.8:.1f} ft)"
        )
        c.saveState()
        c.translate(ox - 4 * mm, oy + room_d / 2)
        c.rotate(90)
        c.drawCentredString(0, 0, f"{rd_mm} mm  ({rd_mm / 304.8:.1f} ft)")
        c.restoreState()

        # North arrow — based on the entrance direction.
        north_angle = _north_angle(self.room.intake.entrance_direction.value)
        arrow_x = ox + room_w + 3 * mm
        arrow_y = oy + room_d - 5 * mm
        c.saveState()
        c.translate(arrow_x, arrow_y)
        c.rotate(north_angle)
        c.setFillColor(colors.HexColor("#D4A574"))
        c.setStrokeColor(colors.HexColor("#1C1917"))
        c.setLineWidth(0.5)
        path = c.beginPath()
        path.moveTo(0, -4 * mm)
        path.lineTo(2 * mm, 4 * mm)
        path.lineTo(0, 2 * mm)
        path.lineTo(-2 * mm, 4 * mm)
        path.close()
        c.drawPath(path, stroke=1, fill=1)
        c.setFillColor(colors.HexColor("#1C1917"))
        c.setFont("Helvetica-Bold", 7)
        c.drawCentredString(0, 5 * mm, "N")
        c.restoreState()


def _north_angle(entrance_value: str) -> float:
    """Rotation in degrees so the N arrow points to compass north relative
    to the page. Entrance facing S => N is at the top => 0 deg rotation.
    Entrance facing N => N is at the bottom => 180 deg, etc."""
    return {
        "S": 0, "SE": 45, "E": 90, "NE": 135, "N": 180, "NW": 225, "W": 270, "SW": 315
    }.get(entrance_value, 0)


# ---------- Builders ----------


def _money(n: int) -> str:
    return f"INR {n:,}"


def _cover_block(room: RoomState, boq: BOQ) -> list[Flowable]:
    today = date.today()
    valid_until = today + timedelta(days=30)
    rd = room.intake.room_dimensions
    # Devanagari font for निर्मित — falls back to Helvetica if not installed.
    dev_font = _devanagari_font()
    logo_style = ParagraphStyle(
        "Logo",
        parent=H1,
        fontSize=24,
        leading=28,
    )
    # Build the wordmark: English in serif, Devanagari in the Hindi font.
    logo = Paragraph(
        f'Nirmit <font name="{dev_font}" size="16" color="#8B6F52">निर्मित</font> '
        f'<font size="11" color="#6B614F">· Room Quotation</font>',
        logo_style,
    )
    return [
        logo,
        Spacer(1, 6),
        Paragraph(
            f"<b>{room.intake.room_type.value.title()}</b> · "
            f"{rd.width_mm} mm × {rd.depth_mm} mm "
            f"({rd.width_mm / 304.8:.1f} × {rd.depth_mm / 304.8:.1f} ft)",
            BODY,
        ),
        Paragraph(
            f"Issued {today.isoformat()} · Valid until {valid_until.isoformat()} · City: {boq.city}",
            SMALL,
        ),
        Spacer(1, 12),
        Paragraph(f"<b>Grand Total: {_money(boq.grand_total_inr)}</b>", H2),
        Paragraph(
            f"Furniture {_money(sum(l.amount_inr for l in boq.furniture))} · "
            f"Materials {_money(sum(l.amount_inr for l in boq.materials))} · "
            f"Labor {_money(sum(l.amount_inr for l in boq.labor))} · "
            f"Contingency {_money(boq.contingency_inr)} · "
            f"GST {_money(boq.gst_inr)}",
            SMALL,
        ),
    ]


def _furniture_table(boq: BOQ) -> Table:
    data = [["Sl", "Item", "Path", "Spec", "Amount (INR)"]]
    for line in boq.furniture:
        data.append(
            [
                str(line.sl_no),
                Paragraph(line.description, BODY),
                "Build" if line.procurement == "build" else "Buy",
                Paragraph(line.carpenter_spec or "", SMALL),
                f"{line.amount_inr:,}",
            ]
        )
    t = Table(data, colWidths=[12 * mm, 50 * mm, 16 * mm, 70 * mm, 25 * mm], repeatRows=1)
    t.setStyle(_table_style())
    return t


def _simple_table(lines, title: str) -> list[Flowable]:
    if not lines:
        return []
    data = [["Sl", "Description", "Qty", "Unit", "Rate", "Amount"]]
    for l in lines:
        data.append(
            [str(l.sl_no), Paragraph(l.description, BODY), str(l.qty), l.unit, f"{l.rate_inr:,}", f"{l.amount_inr:,}"]
        )
    t = Table(data, colWidths=[12 * mm, 80 * mm, 16 * mm, 16 * mm, 22 * mm, 27 * mm], repeatRows=1)
    t.setStyle(_table_style())
    return [Paragraph(title, H2), t]


def _table_style() -> TableStyle:
    return TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2A2218")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("ALIGN", (0, 0), (-1, 0), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("FONTSIZE", (0, 1), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FBF7EE")]),
            ("BOX", (0, 0), (-1, -1), 0.4, colors.HexColor("#A89A8C")),
            ("INNERGRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#D8CFBA")),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]
    )


def _execution_block(boq: BOQ) -> list[Flowable]:
    out: list[Flowable] = [Paragraph("Execution Sequence", H2)]
    for phase in boq.execution_phases:
        out.append(
            Paragraph(
                f"<b>{phase['label']}</b> &nbsp; "
                f"<font color='#6B614F'>~{phase['duration_days']} days · {_money(phase['total_inr'])}</font>",
                BODY,
            )
        )
    out.append(Spacer(1, 6))
    out.append(
        Paragraph(
            "Payment milestones: 30% on start of carpentry, 40% on installation, 30% on handover. "
            "This estimate is valid for 30 days. Product prices may shift — verify at purchase.",
            SMALL,
        )
    )
    return out


@lru_cache(maxsize=1)
def _devanagari_font() -> str:
    """Register a Devanagari TTF for the Hindi section and return its name.

    Drop a font at backend/data/fonts/NotoSansDevanagari-Regular.ttf (download
    from Google Fonts) and the Hindi block renders proper glyphs. If it's
    missing we fall back to Helvetica — the layout still works, the Devanagari
    just shows as tofu boxes (acceptable for a prototype; fix before launch).
    """
    candidates = [
        Path(__file__).resolve().parents[3] / "data" / "fonts" / "NotoSansDevanagari-Regular.ttf",
        Path("C:/Windows/Fonts/Nirmala.ttf"),  # Windows ships Nirmala UI (Devanagari)
        Path("/usr/share/fonts/truetype/noto/NotoSansDevanagari-Regular.ttf"),
    ]
    for path in candidates:
        try:
            if path.exists():
                pdfmetrics.registerFont(TTFont("NirmitDevanagari", str(path)))
                return "NirmitDevanagari"
        except Exception:
            continue
    return "Helvetica"


def _hindi_block(boq: BOQ) -> list[Flowable]:
    text = generate_hindi_section(boq)
    if not text:
        return []
    font = _devanagari_font()
    hi_h2 = ParagraphStyle("HiH2", parent=H2, fontName=font)
    out: list[Flowable] = [Paragraph("Hindi Specification — कारपेंटर के लिए", hi_h2)]
    pre_style = ParagraphStyle(
        "Pre", parent=BODY, fontName=font, fontSize=9.5, leading=13, leftIndent=4
    )
    for line in text.splitlines():
        if not line.strip():
            out.append(Spacer(1, 3))
        else:
            esc = line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            out.append(Paragraph(esc, pre_style))
    return out


# ---------- Public API ----------


def build_quotation_pdf(room: RoomState, *, city: str = "Mumbai") -> bytes:
    from app.domain.boq.boq import build_boq

    boq = build_boq(room, city=city)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
        title="Nirmit Quotation",
        author="Nirmit",
    )
    flow: list[Flowable] = []
    flow.extend(_cover_block(room, boq))
    flow.append(Spacer(1, 12))
    flow.append(Paragraph("Floor Plan", H2))
    flow.append(RoomSketch(room, target_size_mm=150))
    flow.append(PageBreak())

    flow.append(Paragraph("Furniture", H2))
    flow.append(_furniture_table(boq))
    flow.append(Spacer(1, 8))
    flow.extend(_simple_table(boq.materials, "Materials"))
    flow.append(Spacer(1, 8))
    flow.extend(_simple_table(boq.labor, "Labor"))

    flow.append(PageBreak())
    flow.extend(_execution_block(boq))

    if any(l.procurement == "build" for l in boq.furniture):
        flow.append(PageBreak())
        flow.extend(_hindi_block(boq))

    doc.build(flow)
    return buf.getvalue()
