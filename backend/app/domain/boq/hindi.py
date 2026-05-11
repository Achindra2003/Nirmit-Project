"""Hindi specification section — the part of the quotation Suresh actually
reads. Re-authored from `_legacy_poc/src/lib/quotation/billOfQuantities.ts`.

Format is plain text (carpenter-friendly: prints clean, photographs clean,
forwards on WhatsApp clean). No tables.
"""
from __future__ import annotations

from app.domain.boq.boq import BOQ, BOQLine

HINDI_FURNITURE: dict[str, str] = {
    "wardrobe": "अलमारी",
    "almirah": "अलमारी",
    "bed": "पलंग",
    "tv unit": "टीवी यूनिट",
    "entertainment unit": "टीवी यूनिट",
    "shoe rack": "जूता रैक",
    "puja unit": "पूजा घर / मंदिर",
    "pooja unit": "पूजा घर / मंदिर",
    "puja mandir": "पूजा मंदिर",
    "wall shelf": "दीवार पर शेल्फ",
    "storage unit": "स्टोरेज यूनिट",
    "loft": "लॉफ्ट / मचान",
    "cabinet": "कैबिनेट",
    "false ceiling": "फॉल्स सीलिंग",
    "partition": "पार्टीशन",
    "panel": "पैनल",
    "breakfast counter": "ब्रेकफास्ट काउंटर",
    "bar unit": "बार यूनिट",
    "dining table": "डाइनिंग टेबल",
    "sofa": "सोफा",
    "chair": "कुर्सी",
    "desk": "डेस्क / मेज़",
    "table": "टेबल",
    "nightstand": "साइड टेबल",
    "dresser": "ड्रेसर",
    "dressing table": "ड्रेसिंग टेबल",
    "bookshelf": "किताबों की अलमारी",
    "drawer": "दराज़",
}


def to_hindi_name(english: str) -> str:
    name = english.lower()
    for k, v in HINDI_FURNITURE.items():
        if k in name:
            return v
    return english  # contractor will read the English term


def generate_hindi_section(boq: BOQ) -> str:
    """Return a plain-text Hindi spec section for build items."""
    build_lines = [l for l in boq.furniture if l.procurement == "build"]
    if not build_lines:
        return ""
    out: list[str] = []
    out.append("===========================================")
    out.append("  कारपेंटर के लिए स्पेसिफ़िकेशन")
    out.append("  (Carpenter Specification — Hindi)")
    out.append("===========================================")
    out.append("")
    for idx, line in enumerate(build_lines, start=1):
        h_name = to_hindi_name(line.description)
        out.append(f"{idx}. {h_name}  ({line.description})")
        if line.carpenter_spec:
            # Spec is already English; we provide the standard Hindi addendum.
            out.append("   मटेरियल: 18mm BWP मरीन प्लाई, लैमिनेट फ़िनिश")
            out.append("   जॉइनरी: डॉवेल + कन्फ़र्मेट स्क्रू, कंसील्ड हिंज (छुपे हुए कब्ज़े)")
            out.append("   किनारे: 2mm PVC एज बैंडिंग, मैचिंग कलर")
            out.append("   हार्डवेयर: SS304 स्टेनलेस स्टील — जंग न लगे")
        out.append(f"   कीमत: रुपये {line.amount_inr:,}")
        out.append("")
    out.append("===========================================")
    out.append("  सामान्य निर्देश (General Instructions)")
    out.append("===========================================")
    out.append("")
    out.append("1. साइट पर माप (measurement) लेकर ही कटिंग करें।")
    out.append("2. सभी प्लाई 18mm BWP मरीन ग्रेड — ISI मार्क वाली हो।")
    out.append("3. लैमिनेट: 1mm मोटाई, मैचिंग एज बैंड के साथ।")
    out.append("4. सभी स्क्रू स्टेनलेस स्टील (SS304) — जंग न लगे।")
    out.append("5. काम ख़त्म होने पर सफ़ाई करके जमा करें।")
    out.append("6. कोई भी बदलाव करने से पहले मालिक से पूछें।")
    out.append("")
    return "\n".join(out)
