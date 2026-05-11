"""The Vastu rules database + zoning helpers.

A room is divided into nine zones by the eight cardinal/inter-cardinal
directions plus the centre (Brahmasthana). Each rule maps a furniture
category to one or more preferred zones. The solver uses this when scoring
candidate placements.

Origin is the entrance corner (the same convention used by the State
Contract `Position`). The intake includes `entrance_direction` — the
direction the entrance wall faces — so a "northeast corner" computation has
to translate the user's compass into the room's local x/z frame. We keep
that translation here and have it tested.
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from app.schemas.state import Direction


class VastuZone(str, Enum):
    N = "N"
    NE = "NE"
    E = "E"
    SE = "SE"
    S = "S"
    SW = "SW"
    W = "W"
    NW = "NW"
    CENTER = "CENTER"


@dataclass(frozen=True)
class VastuRule:
    """A single rule. `categories` are matched against PlacedItem.category;
    `preferred_zones` are the zones where the rule wants the item."""

    name: str
    description: str
    categories: tuple[str, ...]
    rooms: tuple[str, ...]  # RoomType.value strings
    preferred_zones: tuple[VastuZone, ...]
    weight: float  # 0..1 — used by the solver as a score multiplier
    facing: Direction | None = None  # if set, item's `facing` should match


@dataclass(frozen=True)
class VastuApplied:
    """An applied rule paired with a human-readable reasoning bullet."""

    rule_name: str
    item_id: str
    bullet: str
    weight: float = 0.0


# ---------- Rule database ----------
# Sourced from _legacy_poc/src/lib/cultural/culturalContext.ts (VASTU_RULES);
# re-authored as data so the solver can read directly without needing copy.

RULES: tuple[VastuRule, ...] = (
    VastuRule(
        name="Mandir Northeast",
        description="The mandir / pooja unit belongs in the northeast (Ishaan kona) — receives morning light, considered the holiest direction.",
        categories=("mandir",),
        rooms=("living", "bedroom", "kitchen", "pooja"),
        preferred_zones=(VastuZone.NE,),
        weight=0.95,
        facing=Direction.E,
    ),
    VastuRule(
        name="Bed Head South",
        description="The head of the bed faces south — aligns with the earth's magnetic field.",
        categories=("sleeping",),
        rooms=("bedroom", "kids"),
        preferred_zones=(VastuZone.SW, VastuZone.S, VastuZone.W),
        weight=0.85,
    ),
    VastuRule(
        name="Kitchen Southeast",
        description="Cooking / kitchen activity belongs in the southeast (Agni kona) — fire-element direction.",
        categories=("kitchen",),
        rooms=("kitchen", "living"),
        preferred_zones=(VastuZone.SE,),
        weight=0.7,
    ),
    VastuRule(
        name="Study Northeast",
        description="Study desks face east or northeast for concentration.",
        categories=("work",),
        rooms=("study", "bedroom"),
        preferred_zones=(VastuZone.NE, VastuZone.E),
        weight=0.6,
        facing=Direction.E,
    ),
    VastuRule(
        name="Northeast Stays Light",
        description="The northeast zone stays uncluttered — no heavy storage in this corner.",
        categories=("storage", "wardrobe"),
        rooms=("living", "bedroom"),
        preferred_zones=(VastuZone.SW, VastuZone.S, VastuZone.W),  # heavy storage goes to SW
        weight=0.55,
    ),
    VastuRule(
        name="TV Faces North",
        description="The television unit sits along the south wall and faces north — viewer faces north while watching.",
        categories=("tv_unit",),
        rooms=("living",),
        preferred_zones=(VastuZone.S, VastuZone.SE),
        weight=0.5,
        facing=Direction.N,
    ),
    VastuRule(
        name="Sofa West/South",
        description="Heavy seating against west or south walls — keeps the lighter quadrant open.",
        categories=("seating",),
        rooms=("living",),
        preferred_zones=(VastuZone.W, VastuZone.S, VastuZone.SW),
        weight=0.45,
    ),
)


# ---------- Zone geometry ----------


def _local_zone_for_compass(zone: VastuZone, entrance: Direction) -> VastuZone:
    """Translate a compass-zone into the room's local (entrance-anchored) frame.

    Origin (0, 0) is the entrance corner — i.e. the corner on the wall that
    faces the user when they walk in. The room extends along +x to the right
    of the entrance and +z away from the entrance into the depth of the room.

    `entrance` is the direction the entrance wall faces (where the user is
    coming from). To convert "northeast in compass terms" to the room's local
    frame we rotate the compass so `entrance` aligns with the local "south"
    (the wall closest to the viewer is the entrance).
    """
    if zone is VastuZone.CENTER:
        return zone

    compass_order = [
        VastuZone.N,
        VastuZone.NE,
        VastuZone.E,
        VastuZone.SE,
        VastuZone.S,
        VastuZone.SW,
        VastuZone.W,
        VastuZone.NW,
    ]
    direction_order = [
        Direction.N,
        Direction.NE,
        Direction.E,
        Direction.SE,
        Direction.S,
        Direction.SW,
        Direction.W,
        Direction.NW,
    ]
    # We define "local south" as the entrance wall's outward-facing direction.
    # If entrance faces S, local south = compass S — no rotation.
    # If entrance faces N, local south = compass N — rotate 180 deg.
    rotation_steps = (direction_order.index(Direction.S) - direction_order.index(entrance)) % 8
    src_idx = compass_order.index(zone)
    return compass_order[(src_idx + rotation_steps) % 8]


_LOCAL_ZONE_CENTERS = {
    # (x_frac, z_frac) inside a unit room (0..1) for the room-local zone.
    # Origin at entrance corner; +x is right, +z is into the room.
    VastuZone.S: (0.5, 0.0),
    VastuZone.SE: (1.0, 0.0),
    VastuZone.E: (1.0, 0.5),
    VastuZone.NE: (1.0, 1.0),
    VastuZone.N: (0.5, 1.0),
    VastuZone.NW: (0.0, 1.0),
    VastuZone.W: (0.0, 0.5),
    VastuZone.SW: (0.0, 0.0),
    VastuZone.CENTER: (0.5, 0.5),
}


def zone_center_mm(
    zone: VastuZone,
    *,
    width_mm: int,
    depth_mm: int,
    entrance: Direction,
) -> tuple[int, int]:
    """Return (x_mm, z_mm) of the centroid of the named zone in room-local coords."""
    local = _local_zone_for_compass(zone, entrance)
    fx, fz = _LOCAL_ZONE_CENTERS[local]
    return int(round(width_mm * fx)), int(round(depth_mm * fz))


def point_zone(
    x_mm: int,
    z_mm: int,
    *,
    width_mm: int,
    depth_mm: int,
    entrance: Direction,
    center_threshold: float = 0.18,
) -> VastuZone:
    """Return the (compass) zone a point falls in. Inverse of zone_center_mm."""
    fx = x_mm / max(width_mm, 1)
    fz = z_mm / max(depth_mm, 1)
    # Centre band
    if abs(fx - 0.5) < center_threshold and abs(fz - 0.5) < center_threshold:
        return VastuZone.CENTER

    # Snap to local zone, then translate back to compass.
    if fx < 1 / 3:
        col = "W"
    elif fx > 2 / 3:
        col = "E"
    else:
        col = ""
    if fz < 1 / 3:
        row = "S"
    elif fz > 2 / 3:
        row = "N"
    else:
        row = ""
    label = (row + col) or "CENTER"
    local = VastuZone(label)

    # Reverse rotation: entrance back to compass
    compass_order = [
        VastuZone.N,
        VastuZone.NE,
        VastuZone.E,
        VastuZone.SE,
        VastuZone.S,
        VastuZone.SW,
        VastuZone.W,
        VastuZone.NW,
    ]
    direction_order = [
        Direction.N,
        Direction.NE,
        Direction.E,
        Direction.SE,
        Direction.S,
        Direction.SW,
        Direction.W,
        Direction.NW,
    ]
    rotation_steps = (direction_order.index(Direction.S) - direction_order.index(entrance)) % 8
    if local is VastuZone.CENTER:
        return local
    src_idx = compass_order.index(local)
    return compass_order[(src_idx - rotation_steps) % 8]


# ---------- Public API ----------


def applicable_rules(*, room_type: str, vastu_enabled: bool) -> list[VastuRule]:
    """Rules that apply to the given room and Vastu opt-in stance."""
    if not vastu_enabled:
        return []
    return [r for r in RULES if room_type in r.rooms]


def preferred_zone_for_category(
    *, category: str, room_type: str, vastu_enabled: bool
) -> tuple[VastuZone, ...]:
    """Return the preferred zones for placing an item of `category` in `room_type`."""
    if not vastu_enabled:
        return ()
    for rule in RULES:
        if room_type in rule.rooms and category in rule.categories:
            return rule.preferred_zones
    # No matching rule — caller should fall through to default scoring.
    return ()


def apply_rules(
    *,
    items: list[tuple[str, str, int, int]],  # (item_id, category, x_mm, z_mm)
    width_mm: int,
    depth_mm: int,
    entrance: Direction,
    room_type: str,
    vastu_enabled: bool,
) -> list[VastuApplied]:
    """Identify which rules each item has satisfied — used for reasoning text."""
    if not vastu_enabled:
        return []
    out: list[VastuApplied] = []
    for item_id, category, x_mm, z_mm in items:
        zone = point_zone(
            x_mm=x_mm + 0,
            z_mm=z_mm + 0,
            width_mm=width_mm,
            depth_mm=depth_mm,
            entrance=entrance,
        )
        for rule in RULES:
            if room_type not in rule.rooms or category not in rule.categories:
                continue
            if zone in rule.preferred_zones:
                bullet = _bullet_for_rule(rule, item_id, zone)
                out.append(
                    VastuApplied(
                        rule_name=rule.name,
                        item_id=item_id,
                        bullet=bullet,
                        weight=rule.weight,
                    )
                )
                break
    # Order by rule weight (highest priority first) so the headline rules
    # (Mandir Northeast, Bed Head South) always surface before tertiary ones.
    out.sort(key=lambda a: a.weight, reverse=True)
    return out


def _bullet_for_rule(rule: VastuRule, item_id: str, zone: VastuZone) -> str:
    """Authored, opinionated reasoning text — never generic."""
    if rule.name == "Mandir Northeast":
        return "Mandir placed in the northeast — Ishaan kona, the direction of morning light, where prayer traditionally belongs."
    if rule.name == "Bed Head South":
        return "Bed sits along the south wall so the head points south while sleeping — the magnetic alignment Vastu calls for."
    if rule.name == "Kitchen Southeast":
        return "Kitchen sits in the southeast — the Agni kona, where the fire element belongs."
    if rule.name == "Study Northeast":
        return "Study desk faces east — clearer thinking with morning light at the back."
    if rule.name == "Northeast Stays Light":
        return "Heavy storage stays out of the northeast — that corner is left open and light per Vastu."
    if rule.name == "TV Faces North":
        return "TV unit on the south wall so viewers face north — the screen-facing direction Vastu prefers."
    if rule.name == "Sofa West/South":
        return "Heavy seating along the west / south walls — keeps the lighter quadrant of the room open."
    return f"{rule.name}: {rule.description}"
