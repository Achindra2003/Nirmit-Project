"""Print resolved positions for a preset so we can see what's actually happening
after the engine snap + compose pass. Usage:
    python scripts/inspect_preset.py living_keeper_0
"""
from __future__ import annotations
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.domain.presets.engine import default_room_dims
from app.domain.presets.layouts import ALL_PRESETS
from app.domain.presets.resolver import resolve_preset_via_engine
from app.schemas.state import Dimensions, Direction, Intake, RoomType, Vibe, VisionPhilosophy


def go(preset_id: str) -> None:
    layout = None
    for p in ALL_PRESETS.values():
        if p.id == preset_id:
            layout = p
            break
    if layout is None:
        print(f"unknown preset {preset_id}")
        return
    w, d = default_room_dims(layout.room_type)
    intake = Intake(
        room_type=RoomType(layout.room_type),
        vibe=Vibe.WARM_TRADITIONAL,
        room_dimensions=Dimensions(width_mm=w, height_mm=2700, depth_mm=d),
        budget_inr=300_000,
        entrance_direction=Direction.S,
        who_lives_here="family with kids",
    )
    # Direct engine call to see raw output + warnings
    from app.domain.presets.engine import place_scene
    from app.domain.catalog.presets import get_preset_catalog
    preset_catalog = get_preset_catalog(preset_id)
    spec_items = []
    for ai in layout.items:
        ci = preset_catalog.get(ai.sub_category)
        if not ci:
            continue
        spec_items.append({
            "sub_category": ai.sub_category,
            "anchor_x": ai.anchor_x, "offset_x_mm": ai.offset_x_mm,
            "anchor_z": ai.anchor_z, "offset_z_mm": ai.offset_z_mm,
            "rotation_deg": ai.rotation_deg,
            "width_mm": ci.dimensions.width_mm, "depth_mm": ci.dimensions.depth_mm,
        })
    scene = place_scene(preset_id, w, d, intake.entrance_direction, spec_items)
    if scene.warnings:
        print("WARNINGS:")
        for w_msg in scene.warnings:
            print(f"  {w_msg}")
    result = resolve_preset_via_engine(intake, VisionPhilosophy(layout.philosophy), layout.variant)
    if result is None:
        print("no result")
        return
    items, openings = result
    print(f"\n{preset_id}  room {w}x{d}")
    print(f"  intent items: {len(layout.items)}  -> placed: {len(items)}")
    print("-" * 80)
    print(f"{'sub_cat':16s} {'name':22s} {'x':>6s} {'z':>6s} {'rot':>4s}  {'w':>5s}x{'d':>5s}")
    for it in items:
        eff_w = it.dimensions.width_mm if int(it.position.rotation_deg) % 180 == 0 else it.dimensions.depth_mm
        eff_d = it.dimensions.depth_mm if int(it.position.rotation_deg) % 180 == 0 else it.dimensions.width_mm
        sub = it.category
        print(f"  {sub:16s} {it.name_en[:22]:22s} {it.position.x_mm:6d} {it.position.z_mm:6d} {int(it.position.rotation_deg):4d}  {eff_w:5d}x{eff_d:5d}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: inspect_preset.py <preset_id>")
        sys.exit(1)
    for pid in sys.argv[1:]:
        go(pid)
