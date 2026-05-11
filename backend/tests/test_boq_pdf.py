"""BOQ math + PDF generation. PDF is asserted on shape (size, header bytes)."""
from __future__ import annotations

import asyncio

from app.domain.boq import build_boq, build_quotation_pdf, generate_hindi_section
from app.graph.generate_graph import build_generate_graph
from app.schemas.state import (
    Dimensions,
    Direction,
    Intake,
    RoomType,
    Vibe,
)


def _seed_room():
    intake = Intake(
        room_type=RoomType.LIVING,
        room_dimensions=Dimensions(width_mm=4200, depth_mm=3600, height_mm=3000),
        entrance_direction=Direction.S,
        who_lives_here="family with kids",
        vibe=Vibe.WARM_TRADITIONAL,
        budget_inr=300_000,
        vastu_matters=True,
    )
    g = build_generate_graph()
    res = asyncio.run(g.ainvoke({"intake": intake}))
    return res["visions"][0].room_state


def test_boq_has_all_three_sections_and_totals_match():
    room = _seed_room()
    boq = build_boq(room, city="Mumbai")
    assert boq.furniture and boq.materials and boq.labor
    expected_subtotal = sum(l.amount_inr for l in boq.all_lines)
    assert boq.subtotal_inr == expected_subtotal
    assert boq.contingency_inr == round(boq.subtotal_inr * 0.10)
    assert boq.grand_total_inr == boq.subtotal_inr + boq.contingency_inr + boq.gst_inr


def test_boq_execution_phases_are_ordered_correctly():
    room = _seed_room()
    boq = build_boq(room, city="Mumbai")
    labels = [p["label"] for p in boq.execution_phases]
    # Each label is "<order>. ..." — must be monotonically increasing
    orders = [int(l.split(".")[0]) for l in labels]
    assert orders == sorted(orders)


def test_hindi_section_lists_each_build_item():
    room = _seed_room()
    boq = build_boq(room, city="Mumbai")
    text = generate_hindi_section(boq)
    build_count = sum(1 for l in boq.furniture if l.procurement == "build")
    if build_count > 0:
        assert "मरीन प्लाई" in text
        # One numbered Hindi line per build item
        for n in range(1, build_count + 1):
            assert f"{n}. " in text


def test_pdf_renders_to_a_real_pdf_file():
    room = _seed_room()
    pdf_bytes = build_quotation_pdf(room, city="Mumbai")
    # Standard PDF header
    assert pdf_bytes[:4] == b"%PDF"
    # And has trailer (loosely — at least 1KB)
    assert len(pdf_bytes) > 1024
