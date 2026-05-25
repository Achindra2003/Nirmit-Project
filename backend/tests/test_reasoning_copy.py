from app.domain.reasoning_copy import humanize_reasoning, humanize_reasoning_line
from app.schemas.state import Reasoning


def test_strips_mm_from_bullet():
    raw = "Sofa anchors the long wall (2400mm wide) so the family fits."
    out = humanize_reasoning_line(raw)
    assert "mm" not in out.lower()
    assert "2400" not in out


def test_strips_coordinates():
    raw = "Bed at x=2450mm z=4293mm near the window."
    out = humanize_reasoning_line(raw)
    assert "x=" not in out
    assert "z=" not in out


def test_humanize_reasoning_model():
    r = humanize_reasoning(
        Reasoning(
            headline="Built for evenings at 850mm seat height.",
            bullets=["TV at x=1200 z=800 on the south wall."],
            vastu_notes=[],
            accessibility_notes=[],
        )
    )
    assert "850" not in r.headline
    assert "x=" not in r.bullets[0]
