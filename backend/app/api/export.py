"""POST /export — RoomState → carpenter-ready quotation PDF.

Returns the PDF as a binary stream when format=pdf, or a JSON breakdown of
the BOQ (for the frontend to render inline) when format=json.
"""
from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter
from fastapi.responses import JSONResponse, Response

from app.domain.boq import build_boq, build_quotation_pdf, generate_hindi_section
from app.schemas.state import ExportRequest

router = APIRouter()


@router.post("/export")
async def export(req: ExportRequest):
    city = req.room_state.intake.city
    if req.format == "pdf":
        pdf_bytes = build_quotation_pdf(req.room_state, city=city)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": 'attachment; filename="nirmit-quotation.pdf"',
                "Content-Length": str(len(pdf_bytes)),
            },
        )

    boq = build_boq(req.room_state, city=city)
    return JSONResponse(
        {
            "city": boq.city,
            "subtotal_inr": boq.subtotal_inr,
            "contingency_inr": boq.contingency_inr,
            "gst_inr": boq.gst_inr,
            "grand_total_inr": boq.grand_total_inr,
            "furniture": [
                {
                    "sl_no": l.sl_no,
                    "description": l.description,
                    "amount_inr": l.amount_inr,
                    "procurement": l.procurement,
                    "carpenter_spec": l.carpenter_spec,
                }
                for l in boq.furniture
            ],
            "materials": [
                {"sl_no": l.sl_no, "description": l.description, "qty": l.qty, "unit": l.unit, "rate_inr": l.rate_inr, "amount_inr": l.amount_inr}
                for l in boq.materials
            ],
            "labor": [
                {"sl_no": l.sl_no, "description": l.description, "qty": l.qty, "unit": l.unit, "rate_inr": l.rate_inr, "amount_inr": l.amount_inr}
                for l in boq.labor
            ],
            "execution_phases": boq.execution_phases,
            "hindi_section": generate_hindi_section(boq) if req.include_hindi_section else "",
            "valid_until": (date.today() + timedelta(days=30)).isoformat(),
        }
    )
