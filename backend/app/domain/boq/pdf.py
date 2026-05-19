"""PDF generation for the Suresh-standard quotation.

Renders a PDF that is visually identical to the on-screen quotation in
ExportRoute.tsx — same fonts (Playfair Display / DM Sans / JetBrains Mono),
same colours, same section structure.

Section order mirrors the web page exactly:
  1. Header   — Nirmit logotype + निर्मित, vision name, tagline, drawing number
  2. Summary  — 6-cell grid (Room, City, Vibe, Budget, Total, Remaining)
  3. A — Furniture & Furnishings (grouped, CARPENTER / BUY badges)
  4. B — Materials & Finishing
  5. C — Labour
  6. Cost box  — Subtotal → Contingency → GST → Grand Total
  7. Execution sequence (numbered phases, days, cost)
  8. Hindi specification
  9. Footer   — NIRMIT · BUILT FOR YOUR HOME / DRAWING 0042-A · SCALE 1:48
"""
from __future__ import annotations

import io
import re
from datetime import date
from functools import lru_cache
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Flowable,
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)

from app.domain.boq.boq import BOQ
from app.domain.boq.hindi import generate_hindi_section
from app.schemas.state import RoomState

# ─── Palette — exact hex values from styles.css ───────────────────────────────

_PAPER   = colors.HexColor("#F0E6D3")
_PAPER3  = colors.HexColor("#F5EDDF")
_INK     = colors.HexColor("#1C1812")
_INK2    = colors.HexColor("#52493E")
_INK3    = colors.HexColor("#7D7367")
_TERRA   = colors.HexColor("#B8432A")
_LEAF    = colors.HexColor("#4A7C6F")
_LINE    = colors.HexColor("#D4C9B2")
_LINE2   = colors.HexColor("#C2B89F")

# ─── Page geometry ─────────────────────────────────────────────────────────────

_LM = 18 * mm
_RM = 18 * mm
_TM = 18 * mm
_BM = 18 * mm
_CW = A4[0] - _LM - _RM   # ≈ 174 mm

# ─── Font registration ─────────────────────────────────────────────────────────

_FONTS_DIR = Path(__file__).resolve().parents[3] / "data" / "fonts"

_FONT_FILES = {
    # Playfair Display — var(--fd) — for headings, vision name, amounts, tagline
    "Playfair":        "PlayfairDisplay-Regular.ttf",
    "Playfair-Bold":   "PlayfairDisplay-Bold.ttf",
    "Playfair-Italic": "PlayfairDisplay-Italic.ttf",
    "Playfair-BoldIt": "PlayfairDisplay-BoldItalic.ttf",
    # DM Sans — var(--fb) — for body copy, item names, descriptions
    "DMSans":          "DMSans-Regular.ttf",
    "DMSans-Medium":   "DMSans-Medium.ttf",
    "DMSans-SemiBold": "DMSans-SemiBold.ttf",
    "DMSans-Italic":   "DMSans-Italic.ttf",
    # JetBrains Mono — var(--fm) — for eyebrows, metadata, badges
    "JBMono":          "JetBrainsMono-Regular.ttf",
    "JBMono-SemiBold": "JetBrainsMono-SemiBold.ttf",
    # Tiro Devanagari Hindi — var(--fh)
    "TiroDev":         "TiroDevanagariHindi-Regular.ttf",
}


@lru_cache(maxsize=1)
def _ensure_fonts() -> dict[str, str]:
    """Register all custom fonts once; returns the actual registered name map."""
    registered: dict[str, str] = {}
    for alias, filename in _FONT_FILES.items():
        path = _FONTS_DIR / filename
        try:
            if path.exists():
                pdfmetrics.registerFont(TTFont(alias, str(path)))
                registered[alias] = alias
        except Exception:
            pass
    # Register font families so ReportLab knows which variant to use for bold/italic
    _f = registered
    if "Playfair" in _f and "Playfair-Bold" in _f and "Playfair-Italic" in _f and "Playfair-BoldIt" in _f:
        pdfmetrics.registerFontFamily(
            "Playfair",
            normal="Playfair",
            bold="Playfair-Bold",
            italic="Playfair-Italic",
            boldItalic="Playfair-BoldIt",
        )
    if "DMSans" in _f and "DMSans-Medium" in _f:
        pdfmetrics.registerFontFamily(
            "DMSans",
            normal="DMSans",
            bold="DMSans-SemiBold",
            italic="DMSans-Italic",
            boldItalic="DMSans-Italic",
        )
    if "JBMono" in _f and "JBMono-SemiBold" in _f:
        pdfmetrics.registerFontFamily(
            "JBMono",
            normal="JBMono",
            bold="JBMono-SemiBold",
            italic="JBMono",
            boldItalic="JBMono-SemiBold",
        )
    return registered


def _fd(r: dict) -> str:   # Playfair Display regular
    return r.get("Playfair", "Helvetica")
def _fdb(r: dict) -> str:  # Playfair Display bold
    return r.get("Playfair-Bold", "Helvetica-Bold")
def _fdi(r: dict) -> str:  # Playfair Display italic
    return r.get("Playfair-Italic", "Helvetica-Oblique")
def _fb(r: dict) -> str:   # DM Sans regular
    return r.get("DMSans", "Helvetica")
def _fbm(r: dict) -> str:  # DM Sans medium
    return r.get("DMSans-Medium", "Helvetica")
def _fbs(r: dict) -> str:  # DM Sans semibold
    return r.get("DMSans-SemiBold", "Helvetica-Bold")
def _fbi(r: dict) -> str:  # DM Sans italic
    return r.get("DMSans-Italic", "Helvetica-Oblique")
def _fm(r: dict) -> str:   # JetBrains Mono
    return r.get("JBMono", "Courier")
def _fms(r: dict) -> str:  # JetBrains Mono semibold
    return r.get("JBMono-SemiBold", "Courier-Bold")
def _fh(r: dict) -> str:   # Tiro Devanagari Hindi
    return r.get("TiroDev", "Helvetica")

# ─── Amount formatting ──────────────────────────────────────────────────────────


def _money(n: int | float) -> str:
    """₹L/k/plain — exact match for ExportRoute.tsx formatAmount."""
    if not isinstance(n, (int, float)):
        return "—"
    n = int(round(n))
    a = abs(n)
    if a >= 100_000:
        return f"₹{n / 100_000:.2f}L"
    if a >= 1_000:
        return f"₹{round(n / 1_000)}k"
    return f"₹{n}"


def _rate(n: int | float, unit: str) -> str:
    return f"{_money(n)}/{unit}"


# ─── Style factory ─────────────────────────────────────────────────────────────

_base = getSampleStyleSheet()


def _ps(name: str, **kw) -> ParagraphStyle:
    return ParagraphStyle(name, parent=_base["Normal"], **kw)


# ─── Section builders ───────────────────────────────────────────────────────────


def _header_block(
    room: RoomState,
    vision_name: str | None,
    vision_tagline: str | None,
    r: dict,
) -> list[Flowable]:
    """Header matching ExportRoute.tsx: logotype | name + tagline | drawing info."""
    rd   = room.intake.room_dimensions
    w_ft = int(round(rd.width_mm / 304.8))
    d_ft = int(round(rd.depth_mm / 304.8))

    # Logotype: "Nirmit  निर्मित  ·  ROOM QUOTATION"
    logo = Paragraph(
        f'<font name="{_fdb(r)}" size="20" color="#1C1812">Nirmit</font>'
        f' <font name="{_fh(r)}" size="13" color="#52493E"> निर्मित</font>'
        f' <font name="{_fm(r)}" size="8" color="#7D7367">  ·  ROOM QUOTATION</font>',
        _ps("logo", fontName=_fdb(r), fontSize=20, leading=22, textColor=_INK),
    )

    # Vision name
    vname = Paragraph(
        vision_name or room.intake.room_type.value.title(),
        _ps("vn", fontName=_fdb(r), fontSize=22, leading=26, textColor=_INK, spaceBefore=6),
    )

    # Tagline (italic Playfair)
    tag_str = (vision_tagline or "").strip()
    tagline = Paragraph(
        tag_str,
        _ps("tg", fontName=_fdi(r), fontSize=13, leading=17, textColor=_INK2, spaceBefore=3),
    ) if tag_str else Spacer(1, 1)

    # Right column: DRAWING NO. + room dims
    draw_no = Paragraph(
        "DRAWING NO. 0042",
        _ps("dn", fontName=_fm(r), fontSize=8, leading=10, textColor=_INK3, alignment=2),
    )
    dims = Paragraph(
        f"{w_ft}′-0″ × {d_ft}′-0″",
        _ps("dm", fontName=_fm(r), fontSize=8, leading=12, textColor=_INK3, alignment=2, spaceBefore=3),
    )

    tbl = Table(
        [[[logo, vname, tagline], [draw_no, dims]]],
        colWidths=[_CW * 0.68, _CW * 0.32],
    )
    tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN",  (1, 0), (1,  0),  "RIGHT"),
        ("TOPPADDING",    (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
    ]))

    hr = HRFlowable(width="100%", thickness=1.5, color=_INK, spaceBefore=10, spaceAfter=20)
    return [tbl, hr]


def _summary_grid(room: RoomState, boq: BOQ, philosophy: str | None, r: dict) -> list[Flowable]:
    """6-cell summary grid — Room / City / Vibe / Budget / Total / Remaining."""
    budget  = room.intake.budget_inr
    total   = boq.grand_total_inr
    rem     = budget - total
    rem_str = f"{'+'  if rem >= 0 else '−'}{_money(abs(rem))}"

    vibe_raw = philosophy or (room.intake.vibe.value if hasattr(room.intake, "vibe") else "")
    vibe_str = vibe_raw.replace("_", " ").title() if vibe_raw else "—"

    def _cell(label: str, value: str, accent: bool = False) -> Paragraph:
        vc = "#B8432A" if accent else "#1C1812"
        return Paragraph(
            f'<font name="{_fm(r)}" size="7" color="#7D7367">{label.upper()}</font>'
            f'<br/><font name="{_fdb(r)}" size="15" color="{vc}">{value}</font>',
            _ps(f"gc_{label}", fontName=_fdb(r), fontSize=15, leading=20, textColor=_INK),
        )

    grid = Table(
        [
            [_cell("Room",   room.intake.room_type.value.capitalize()),
             _cell("City",   boq.city or "—"),
             _cell("Vibe",   vibe_str)],
            [_cell("Budget", _money(budget)),
             _cell("Total",  _money(total), accent=True),
             _cell("Remaining", rem_str)],
        ],
        colWidths=[_CW / 3, _CW / 3, _CW / 3],
    )
    grid.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING",    (0, 0), (-1, -1), 13),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 13),
        ("LEFTPADDING",   (0, 0), (-1, -1), 2),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 2),
    ]))
    hr = HRFlowable(width="100%", thickness=0.5, color=_LINE, spaceBefore=0, spaceAfter=22)
    return [grid, hr]


def _eyebrow(text: str, r: dict) -> Paragraph:
    """Uppercase JetBrains Mono eyebrow — matches .eyebrow CSS class."""
    return Paragraph(
        text.upper(),
        _ps(f"ey_{text[:8]}", fontName=_fm(r), fontSize=8, leading=9, textColor=_INK3, spaceAfter=8),
    )


def _furniture_section(boq: BOQ, r: dict) -> list[Flowable]:
    """A — Furniture & Furnishings, grouped by description."""
    grouped: dict[str, dict] = {}
    for line in boq.furniture:
        key = line.description.lower().strip()
        if key in grouped:
            grouped[key]["qty"]        += 1
            grouped[key]["amount_inr"] += line.amount_inr
        else:
            grouped[key] = {
                "idx":            len(grouped) + 1,
                "description":    line.description,
                "carpenter_spec": line.carpenter_spec,
                "procurement":    line.procurement,
                "amount_inr":     line.amount_inr,
                "qty":            1,
            }

    # col widths: # + Item + Qty + HowToGet + Total = CW
    col_w = [7 * mm, 97 * mm, 11 * mm, 30 * mm, 29 * mm]

    def _th(text: str, align: int = 0) -> Paragraph:
        return Paragraph(
            text,
            _ps(f"fth_{text}", fontName=_fm(r), fontSize=7.5, leading=9, textColor=_INK3, alignment=align),
        )

    rows: list = [[_th("#"), _th("ITEM"), _th("QTY", 1), _th("HOW TO GET", 1), _th("TOTAL", 2)]]

    for it in grouped.values():
        spec = ""
        if it.get("carpenter_spec"):
            esc  = it["carpenter_spec"].replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            spec = f'<br/><font name="{_fdi(r)}" size="9" color="#7D7367">{esc}</font>'

        item_p = Paragraph(
            f'<font name="{_fbs(r)}" size="10.5">{it["description"]}</font>{spec}',
            _ps(f"fi_{it['idx']}", fontName=_fbs(r), fontSize=10.5, leading=15, textColor=_INK),
        )

        if it["procurement"] == "build":
            badge = Paragraph(
                f'<font name="{_fms(r)}" size="8" color="#4A7C6F">CARPENTER</font>',
                _ps(f"fb_{it['idx']}", fontName=_fms(r), fontSize=8, leading=10, alignment=1),
            )
        else:
            badge = Paragraph(
                f'<font name="{_fms(r)}" size="8" color="#B8432A">BUY</font>',
                _ps(f"fb2_{it['idx']}", fontName=_fms(r), fontSize=8, leading=10, alignment=1),
            )

        rows.append([
            Paragraph(str(it["idx"]).zfill(2),
                _ps(f"fsl_{it['idx']}", fontName=_fm(r), fontSize=9, leading=11, textColor=_INK3)),
            item_p,
            Paragraph(str(it["qty"]),
                _ps(f"fq_{it['idx']}", fontName=_fb(r), fontSize=10, leading=14, textColor=_INK2, alignment=1)),
            badge,
            Paragraph(_money(it["amount_inr"]),
                _ps(f"fa_{it['idx']}", fontName=_fdb(r), fontSize=11.5, leading=14, textColor=_INK, alignment=2)),
        ])

    t = Table(rows, colWidths=col_w, repeatRows=1)
    t.setStyle(TableStyle([
        ("LINEBELOW",      (0, 0), (-1, 0),  1.5, _INK),
        ("LINEBELOW",      (0, 1), (-1, -1), 0.4, _LINE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, _PAPER3]),
        ("VALIGN",         (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING",     (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING",  (0, 0), (-1, -1), 9),
        ("LEFTPADDING",    (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",   (0, 0), (-1, -1), 0),
        ("LEFTPADDING",    (1, 0), (1,  -1), 8),
        ("RIGHTPADDING",   (1, 0), (1,  -1), 8),
        ("ALIGN",          (2, 0), (2,  -1), "CENTER"),
        ("ALIGN",          (3, 0), (3,  -1), "CENTER"),
        ("ALIGN",          (4, 0), (4,  -1), "RIGHT"),
    ]))
    return [_eyebrow("A — Furniture & Furnishings", r), t, Spacer(1, 22)]


def _materials_section(boq: BOQ, r: dict) -> list[Flowable]:
    if not boq.materials:
        return []
    col_w = [7 * mm, 83 * mm, 27 * mm, 27 * mm, 30 * mm]
    rows: list = [[
        Paragraph("#",          _ps("mth0", fontName=_fm(r), fontSize=7.5, leading=9, textColor=_INK3)),
        Paragraph("DESCRIPTION", _ps("mth1", fontName=_fm(r), fontSize=7.5, leading=9, textColor=_INK3)),
        Paragraph("QTY",        _ps("mth2", fontName=_fm(r), fontSize=7.5, leading=9, textColor=_INK3, alignment=1)),
        Paragraph("RATE",       _ps("mth3", fontName=_fm(r), fontSize=7.5, leading=9, textColor=_INK3, alignment=2)),
        Paragraph("AMOUNT",     _ps("mth4", fontName=_fm(r), fontSize=7.5, leading=9, textColor=_INK3, alignment=2)),
    ]]
    for m in boq.materials:
        rows.append([
            Paragraph(str(m.sl_no).zfill(2), _ps(f"msl{m.sl_no}", fontName=_fm(r), fontSize=9, leading=11, textColor=_INK3)),
            Paragraph(m.description, _ps(f"md{m.sl_no}", fontName=_fbs(r), fontSize=10.5, leading=14, textColor=_INK)),
            Paragraph(f"{m.qty} {m.unit}", _ps(f"mq{m.sl_no}", fontName=_fb(r), fontSize=10, leading=13, textColor=_INK2, alignment=1)),
            Paragraph(_rate(m.rate_inr, m.unit), _ps(f"mr{m.sl_no}", fontName=_fb(r), fontSize=10, leading=13, textColor=_INK2, alignment=2)),
            Paragraph(_money(m.amount_inr), _ps(f"ma{m.sl_no}", fontName=_fdb(r), fontSize=11.5, leading=14, textColor=_INK, alignment=2)),
        ])
    t = Table(rows, colWidths=col_w, repeatRows=1)
    t.setStyle(_data_style())
    return [_eyebrow("B — Materials & Finishing", r), t, Spacer(1, 22)]


def _labor_section(boq: BOQ, r: dict) -> list[Flowable]:
    if not boq.labor:
        return []
    col_w = [7 * mm, 83 * mm, 27 * mm, 27 * mm, 30 * mm]
    rows: list = [[
        Paragraph("#",         _ps("lth0", fontName=_fm(r), fontSize=7.5, leading=9, textColor=_INK3)),
        Paragraph("WORK ITEM", _ps("lth1", fontName=_fm(r), fontSize=7.5, leading=9, textColor=_INK3)),
        Paragraph("QTY",       _ps("lth2", fontName=_fm(r), fontSize=7.5, leading=9, textColor=_INK3, alignment=1)),
        Paragraph("RATE",      _ps("lth3", fontName=_fm(r), fontSize=7.5, leading=9, textColor=_INK3, alignment=2)),
        Paragraph("AMOUNT",    _ps("lth4", fontName=_fm(r), fontSize=7.5, leading=9, textColor=_INK3, alignment=2)),
    ]]
    for l in boq.labor:
        rows.append([
            Paragraph(str(l.sl_no).zfill(2), _ps(f"lsl{l.sl_no}", fontName=_fm(r), fontSize=9, leading=11, textColor=_INK3)),
            Paragraph(l.description, _ps(f"ld{l.sl_no}", fontName=_fbs(r), fontSize=10.5, leading=14, textColor=_INK)),
            Paragraph(f"{l.qty} {l.unit}", _ps(f"lq{l.sl_no}", fontName=_fb(r), fontSize=10, leading=13, textColor=_INK2, alignment=1)),
            Paragraph(_rate(l.rate_inr, l.unit), _ps(f"lr{l.sl_no}", fontName=_fb(r), fontSize=10, leading=13, textColor=_INK2, alignment=2)),
            Paragraph(_money(l.amount_inr), _ps(f"la{l.sl_no}", fontName=_fdb(r), fontSize=11.5, leading=14, textColor=_INK, alignment=2)),
        ])
    t = Table(rows, colWidths=col_w, repeatRows=1)
    t.setStyle(_data_style())
    return [_eyebrow("C — Labour", r), t, Spacer(1, 22)]


def _data_style() -> TableStyle:
    return TableStyle([
        ("LINEBELOW",      (0, 0), (-1, 0),  1.5, _INK),
        ("LINEBELOW",      (0, 1), (-1, -1), 0.4, _LINE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, _PAPER3]),
        ("VALIGN",         (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING",     (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING",  (0, 0), (-1, -1), 8),
        ("LEFTPADDING",    (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",   (0, 0), (-1, -1), 0),
        ("LEFTPADDING",    (1, 0), (1,  -1), 8),
        ("RIGHTPADDING",   (1, 0), (1,  -1), 8),
        ("ALIGN",          (2, 0), (2,  -1), "CENTER"),
        ("ALIGN",          (3, 0), (3,  -1), "RIGHT"),
        ("ALIGN",          (4, 0), (4,  -1), "RIGHT"),
    ])


def _cost_summary_box(boq: BOQ, r: dict) -> list[Flowable]:
    """Boxed cost totals matching the web's paper-3 bordered section."""
    it = _ps("csi", fontName=_fdi(r), fontSize=12,  leading=15, textColor=_INK2)
    va = _ps("csv", fontName=_fb(r),  fontSize=13,  leading=16, textColor=_INK2)
    gl = _ps("cgl", fontName=_fdb(r), fontSize=15,  leading=18, textColor=_INK)
    gv = _ps("cgv", fontName=_fdb(r), fontSize=20,  leading=22, textColor=_INK)

    def _row(label, amount, label_st, val_st):
        return [Paragraph(label, label_st), Paragraph(amount, val_st)]

    rows = [
        _row("Subtotal (A + B + C)", _money(boq.subtotal_inr),    it, _ps("v1", fontName=_fb(r),  fontSize=13, leading=16, textColor=_INK2, alignment=2)),
        _row("Contingency (10%)",    _money(boq.contingency_inr), it, _ps("v2", fontName=_fb(r),  fontSize=13, leading=16, textColor=_INK2, alignment=2)),
        _row("GST",                  _money(boq.gst_inr),          it, _ps("v3", fontName=_fb(r),  fontSize=13, leading=16, textColor=_INK2, alignment=2)),
        ["", ""],   # spacer / divider row
        _row("Grand Total",          _money(boq.grand_total_inr), gl, _ps("v4", fontName=_fdb(r), fontSize=20, leading=22, textColor=_INK, alignment=2)),
    ]

    t = Table(rows, colWidths=[_CW * 0.68, _CW * 0.32])
    t.setStyle(TableStyle([
        ("BOX",           (0, 0), (-1, -1), 0.6,  _LINE),
        ("BACKGROUND",    (0, 0), (-1, -1), _PAPER3),
        ("TOPPADDING",    (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ("LEFTPADDING",   (0, 0), (-1, -1), 18),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 18),
        ("ALIGN",         (1, 0), (1,  -1), "RIGHT"),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 3), (-1, 3),   2),
        ("BOTTOMPADDING", (0, 3), (-1, 3),   2),
        ("LINEABOVE",     (0, 4), (-1, 4),  0.6, _LINE2),
    ]))
    return [t, Spacer(1, 26)]


def _execution_section(boq: BOQ, r: dict) -> list[Flowable]:
    out: list[Flowable] = [
        _eyebrow("Execution Sequence", r),
        Paragraph(
            "Give this sequence to your contractor. "
            "Each phase builds on the one before — do not reorder.",
            _ps("ei", fontName=_fdi(r), fontSize=11, leading=16, textColor=_INK2, spaceAfter=10),
        ),
    ]
    for i, phase in enumerate(boq.execution_phases):
        label   = re.sub(r"^\d+\.\s*", "", phase["label"])
        is_last = i == len(boq.execution_phases) - 1

        num_p = Paragraph(
            str(i + 1).zfill(2),
            _ps(f"en{i}", fontName=_fd(r), fontSize=20, leading=22, textColor=_INK3),
        )
        detail_p = Paragraph(
            f'<font name="{_fbs(r)}" size="13">{label}</font>'
            f'<br/><font name="{_fm(r)}" size="8.5" color="#7D7367">'
            f'~{phase["duration_days"]} DAYS  ·  {_money(phase["total_inr"]).upper()}</font>',
            _ps(f"ed{i}", fontName=_fbs(r), fontSize=13, leading=17, textColor=_INK, spaceBefore=2),
        )

        row = Table([[num_p, detail_p]], colWidths=[24 * mm, _CW - 24 * mm])
        row.setStyle(TableStyle([
            ("VALIGN",        (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING",    (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("LEFTPADDING",   (0, 0), (-1, -1), 0),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ] + ([] if is_last else [("LINEBELOW", (0, 0), (-1, 0), 0.4, _LINE)])))
        out.append(row)

    out.append(Spacer(1, 26))
    return out


def _hindi_block(boq: BOQ, r: dict) -> list[Flowable]:
    text = generate_hindi_section(boq)
    if not text:
        return []
    dev      = _fh(r)
    hi_intro = _ps("hint", fontName=_fdi(r), fontSize=11, leading=15, textColor=_INK2, spaceAfter=14)
    hi_body  = _ps("hbd",  fontName=dev,      fontSize=13, leading=24, textColor=_INK)

    out: list[Flowable] = [
        HRFlowable(width="100%", thickness=0.5, color=_LINE, spaceBefore=8, spaceAfter=14),
        _eyebrow("Hindi Specification · बजट और सामग्री", r),
        Paragraph(
            "The specification below is for your carpenter — "
            "written in Hindi so there is no ambiguity on site.",
            hi_intro,
        ),
    ]
    for line in text.splitlines():
        if not line.strip():
            out.append(Spacer(1, 4))
        else:
            esc = line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            out.append(Paragraph(esc, hi_body))
    return out


def _footer_block(r: dict) -> list[Flowable]:
    lft = _ps("ffl", fontName=_fm(r), fontSize=7.5, leading=9, textColor=_INK3)
    rgt = _ps("ffr", fontName=_fm(r), fontSize=7.5, leading=9, textColor=_INK3, alignment=2)
    tbl = Table(
        [[Paragraph("NIRMIT · BUILT FOR YOUR HOME", lft),
          Paragraph("DRAWING 0042-A · SCALE 1:48", rgt)]],
        colWidths=[_CW / 2, _CW / 2],
    )
    tbl.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ("TOPPADDING",    (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    hr = HRFlowable(width="100%", thickness=0.5, color=_LINE, spaceBefore=14, spaceAfter=0)
    return [hr, tbl]


class _PaperBackground(Flowable):
    """Draws the warm paper (#F0E6D3) background on every page."""
    def __init__(self):
        super().__init__()
        self.width = 0
        self.height = 0

    def draw(self):
        c = self.canv
        c.saveState()
        c.setFillColor(_PAPER)
        c.rect(0, 0, A4[0], A4[1], stroke=0, fill=1)
        c.restoreState()


def _on_page(canvas, doc):
    """Page background and outer card border on every page."""
    canvas.saveState()
    # Warm paper background
    canvas.setFillColor(_PAPER)
    canvas.rect(0, 0, A4[0], A4[1], stroke=0, fill=1)
    # Outer card-inset border effect (matches .card-inset CSS)
    margin = 10 * mm
    canvas.setStrokeColor(_LINE2)
    canvas.setLineWidth(0.5)
    canvas.rect(margin, margin, A4[0] - 2 * margin, A4[1] - 2 * margin, stroke=1, fill=0)
    canvas.restoreState()


# ─── Public API ────────────────────────────────────────────────────────────────


def build_quotation_pdf(
    room: RoomState,
    *,
    city: str = "Mumbai",
    vision_name: str | None = None,
    vision_tagline: str | None = None,
    philosophy: str | None = None,
) -> bytes:
    from app.domain.boq.boq import build_boq

    boq = build_boq(room, city=city)
    registered = _ensure_fonts()

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=_LM,
        rightMargin=_RM,
        topMargin=_TM,
        bottomMargin=_BM,
        title="Nirmit Quotation",
        author="Nirmit",
    )

    flow: list[Flowable] = []
    flow.extend(_header_block(room, vision_name, vision_tagline, registered))
    flow.extend(_summary_grid(room, boq, philosophy, registered))
    flow.extend(_furniture_section(boq, registered))
    flow.extend(_materials_section(boq, registered))
    flow.extend(_labor_section(boq, registered))
    flow.extend(_cost_summary_box(boq, registered))
    flow.append(PageBreak())
    flow.extend(_execution_section(boq, registered))
    if any(l.procurement == "build" for l in boq.furniture):
        flow.extend(_hindi_block(boq, registered))
    flow.extend(_footer_block(registered))

    doc.build(flow, onFirstPage=_on_page, onLaterPages=_on_page)
    return buf.getvalue()
