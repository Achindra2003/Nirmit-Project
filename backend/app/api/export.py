"""POST /export — RoomState → carpenter-ready quotation PDF.

Returns the PDF as a binary stream when format=pdf, or a JSON breakdown of
the BOQ (for the frontend to render inline) when format=json.
"""
from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter
from fastapi.responses import JSONResponse, Response

from app.domain.boq import build_boq, build_quotation_pdf, generate_local_section, language_info
from app.schemas.state import ExportRequest

router = APIRouter()


@router.post("/export")
async def export(req: ExportRequest):
    city = req.room_state.intake.city
    if req.format == "pdf":
        pdf_bytes = build_quotation_pdf(
            req.room_state,
            city=city,
            vision_name=req.vision_name,
            vision_tagline=req.vision_tagline,
            philosophy=req.philosophy,
            hide_prices=req.hide_prices,
        )
        # Filename varies by variant so two consecutive downloads don't overwrite.
        fname = "nirmit-contractor-spec.pdf" if req.hide_prices else "nirmit-quotation.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{fname}"',
                "Content-Length": str(len(pdf_bytes)),
            },
        )

    boq = build_boq(req.room_state, city=city)
    local_text = generate_local_section(boq, city=city) if req.include_hindi_section else ""
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
            # `hindi_section` kept for backward compatibility; `local_section`
            # is the city-aware text new clients should read.
            "hindi_section": local_text,
            "local_section": local_text,
            "language": language_info(city),
            "valid_until": (date.today() + timedelta(days=30)).isoformat(),
        }
    )
