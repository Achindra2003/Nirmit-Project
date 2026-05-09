"""POST /export — RoomState → quotation. Stub for Phase 1.

The real implementation produces a Suresh-standard quotation: room sketch with
mm dimensions, item-by-item carpenter specs, Hindi section, Buy-vs-Build pricing.
"""
from __future__ import annotations

from fastapi import APIRouter

from app.schemas.state import ExportRequest, ExportResponse

router = APIRouter()


@router.post("/export", response_model=ExportResponse)
async def export(req: ExportRequest) -> ExportResponse:
    # Phase 1 stub. PDF generation lives in app/domain/boq/ once the BOQ port lands.
    return ExportResponse(download_url=None, bytes_b64=None, valid_for_days=30)
