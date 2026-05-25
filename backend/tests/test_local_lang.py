"""City → carpenter-language dispatch.

Asserts that each supported city resolves to the right script, that vocabulary
swaps run on real items, and that unknown cities fall back to Hindi (the most
widely-understood trade language across India).
"""
from __future__ import annotations

import asyncio

from app.domain.boq import build_boq
from app.domain.boq.local_lang import (
    generate_local_section,
    lang_for_city,
    language_info,
    to_local_name,
)
from app.graph.generate_graph import build_generate_graph
from app.schemas.state import (
    Dimensions,
    Direction,
    Intake,
    RoomType,
    Vibe,
)


def _seed_room(city: str = "Mumbai"):
    intake = Intake(
        room_type=RoomType.LIVING,
        room_dimensions=Dimensions(width_mm=4200, depth_mm=3600, height_mm=3000),
        entrance_direction=Direction.S,
        who_lives_here="family with kids",
        vibe=Vibe.WARM_TRADITIONAL,
        budget_inr=300_000,
        vastu_matters=True,
        city=city,
    )
    g = build_generate_graph()
    res = asyncio.run(g.ainvoke({"intake": intake}))
    return res["visions"][0].room_state


# (city, ISO code, must-appear native marker — a script-unique character so the
# assertion can't accidentally pass on a different language's output)
_CITY_CASES = [
    ("Delhi",     "hi", "हिंदी"),
    ("Mumbai",    "mr", "मराठी"),
    ("Pune",      "mr", "मराठी"),
    ("Kolkata",   "bn", "বাংলা"),
    ("Chennai",   "ta", "தமிழ்"),
    ("Hyderabad", "te", "తెలుగు"),
    ("Bangalore", "kn", "ಕನ್ನಡ"),
]


def test_city_dispatch_returns_expected_language():
    for city, expected_code, expected_native in _CITY_CASES:
        pack = lang_for_city(city)
        assert pack.code == expected_code, f"{city} expected {expected_code}, got {pack.code}"
        assert expected_native == pack.name_native


def test_unknown_city_falls_back_to_hindi():
    assert lang_for_city("Patnitop").code == "hi"
    assert lang_for_city("").code == "hi"
    assert lang_for_city(None).code == "hi"


# Each Indian script lives in a contiguous Unicode block. Mapping language
# code → expected block lets us assert "this string is written in the right
# script" rather than "this string is unique" — Hindi and Marathi legitimately
# share Devanagari vocabulary (पलंग, सोफा, etc.) so uniqueness-per-language is
# the wrong invariant.
_SCRIPT_BLOCKS = {
    "hi": (0x0900, 0x097F),   # Devanagari
    "mr": (0x0900, 0x097F),   # Devanagari (shared with Hindi)
    "bn": (0x0980, 0x09FF),   # Bengali
    "ta": (0x0B80, 0x0BFF),   # Tamil
    "te": (0x0C00, 0x0C7F),   # Telugu
    "kn": (0x0C80, 0x0CFF),   # Kannada
}


def test_furniture_vocabulary_is_in_the_correct_script_per_language():
    for city, code, _ in _CITY_CASES:
        translated = to_local_name("Solid Wood Bed", lang_for_city(city))
        assert translated != "Solid Wood Bed", f"{city}: vocabulary lookup did not translate"
        lo, hi = _SCRIPT_BLOCKS[code]
        # At least one character in the local-script's Unicode block — proves
        # we didn't accidentally return a different pack's translation.
        assert any(lo <= ord(ch) <= hi for ch in translated), (
            f"{city} ({code}): '{translated}' has no characters in expected script range"
        )


def test_generated_section_uses_city_script():
    room = _seed_room("Bangalore")
    boq = build_boq(room, city="Bangalore")
    text = generate_local_section(boq, city="Bangalore")
    if any(l.procurement == "build" for l in boq.furniture):
        # Kannada-only character must appear somewhere in the body
        assert any(0x0C80 <= ord(ch) <= 0x0CFF for ch in text)


def test_language_info_payload_shape():
    info = language_info("Chennai")
    assert info["code"] == "ta"
    assert info["name_en"] == "Tamil"
    assert "heading_en" in info and "heading_native" in info
