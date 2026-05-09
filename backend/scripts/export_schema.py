"""Export the State Contract as JSON Schema. Run from backend/:

    python -m scripts.export_schema

Writes to ../shared/contracts/state.schema.json. Frontend re-generates its TS
types from this file (see shared/contracts/README.md).
"""
from __future__ import annotations

import json
from pathlib import Path

from app.schemas.state import (
    ApplyRequest,
    ApplyResponse,
    ChatRequest,
    ChatResponse,
    CostBreakdown,
    CostRequest,
    ExportRequest,
    ExportResponse,
    GenerateRequest,
    GenerateResponse,
)

OUT = Path(__file__).resolve().parents[2] / "shared" / "contracts" / "state.schema.json"


def main() -> None:
    bundle = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": "Nirmit State Contract",
        "version": "0.1.0",
        "endpoints": {
            "generate": {
                "request": GenerateRequest.model_json_schema(),
                "response": GenerateResponse.model_json_schema(),
            },
            "chat": {
                "request": ChatRequest.model_json_schema(),
                "response": ChatResponse.model_json_schema(),
            },
            "apply": {
                "request": ApplyRequest.model_json_schema(),
                "response": ApplyResponse.model_json_schema(),
            },
            "cost": {
                "request": CostRequest.model_json_schema(),
                "response": CostBreakdown.model_json_schema(),
            },
            "export": {
                "request": ExportRequest.model_json_schema(),
                "response": ExportResponse.model_json_schema(),
            },
        },
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(bundle, indent=2), encoding="utf-8")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
