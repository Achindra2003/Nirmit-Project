"""Vastu zone math + rule selection. Pure-python, fast."""
from __future__ import annotations

from app.domain.vastu import (
    VastuZone,
    apply_rules,
    point_zone,
    preferred_zone_for_category,
    zone_center_mm,
)
from app.schemas.state import Direction


def test_zone_center_for_south_entrance_room():
    """Entrance facing south: NE corner is at (max_x, max_z) in local coords."""
    x, z = zone_center_mm(VastuZone.NE, width_mm=4000, depth_mm=3000, entrance=Direction.S)
    assert x == 4000 and z == 3000


def test_zone_center_for_north_entrance_room():
    """Entrance facing north: NE in compass becomes SW in local coords (origin at entrance)."""
    x, z = zone_center_mm(VastuZone.NE, width_mm=4000, depth_mm=3000, entrance=Direction.N)
    assert x == 0 and z == 0


def test_point_zone_round_trip_south_entrance():
    z = point_zone(x_mm=3800, z_mm=2800, width_mm=4000, depth_mm=3000, entrance=Direction.S)
    assert z is VastuZone.NE


def test_mandir_prefers_northeast_for_living_room():
    zones = preferred_zone_for_category(
        category="mandir", room_type="living", vastu_enabled=True
    )
    assert VastuZone.NE in zones


def test_no_rules_when_vastu_disabled():
    zones = preferred_zone_for_category(
        category="mandir", room_type="living", vastu_enabled=False
    )
    assert zones == ()


def test_apply_rules_surfaces_mandir_bullet():
    # Mandir at NE corner of a south-entrance living room
    applied = apply_rules(
        items=[("mandir-1", "mandir", 3800, 2800)],
        width_mm=4000,
        depth_mm=3000,
        entrance=Direction.S,
        room_type="living",
        vastu_enabled=True,
    )
    assert len(applied) == 1
    assert applied[0].rule_name == "Mandir Northeast"
    assert "northeast" in applied[0].bullet.lower()
