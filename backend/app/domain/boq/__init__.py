"""Bill of Quantities + Suresh-standard quotation.

Re-authored from `_legacy_poc/src/lib/quotation/`. The output is a PDF that
travels — Suresh prints it, Priya WhatsApps it, Rohan's mother asks to see
it. It must work as a standalone document (VISION.md "The Quotation Is a
Product in Itself").
"""
from app.domain.boq.boq import BOQ, BOQLine, build_boq
from app.domain.boq.hindi import generate_hindi_section
from app.domain.boq.pdf import build_quotation_pdf

__all__ = ["BOQ", "BOQLine", "build_boq", "build_quotation_pdf", "generate_hindi_section"]
