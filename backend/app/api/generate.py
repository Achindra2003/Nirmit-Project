"""POST /generate — intake → up to 3 visions."""
from __future__ import annotations

from fastapi import APIRouter

from app.graph.generate_graph import build_generate_graph
from app.schemas.state import GenerateRequest, GenerateResponse

router = APIRouter()
_graph = build_generate_graph()


@router.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest) -> GenerateResponse:
    result = await _graph.ainvoke({"intake": req.intake})
    return GenerateResponse(visions=result["visions"])
