"""Deterministic cross-sell / up-sell suggestions.

No LLM in the selection. first-look fires on every room open and must never
hang on a rate limit, so the *what* is decided by rules over three things:

  1. the room — what's already in it (only suggest what's missing / smaller);
  2. the household profile (from who_lives_here) — what suits this family;
  3. the all-in budget headroom — never suggest something that breaks budget.

The third and the profile are the guardrails the brief asked for: a suggestion
that would push past the carpenter-inclusive budget, or a glass-topped table in
a toddler home, or an extra seat a couple doesn't need, is simply never made.
The LLM (if available) only phrases these later; it never picks them.
"""
from __future__ import annotations

from dataclasses import dataclass

from app.domain.catalog.presets import get_menu
from app.domain.costing.engine import build_cost_breakdown
from app.schemas.state import Intent, IntentKind, RoomState


@dataclass(frozen=True)
class Suggestion:
    intent: Intent
    reason: str
    kind: str          # "cross_sell" | "up_sell"
    price_inr: int     # add: item price; up_sell: the delta


# Complements that lift a room from "furnished" to "finished". Suggested only
# when the sub_category is missing from the room. (sub_category, why).
_COMPLEMENTS: dict[str, list[tuple[str, str]]] = {
    "living": [
        ("rug",        "A rug under the seating pulls the whole conversation together."),
        ("lamp",       "A floor lamp warms up the corner for the evenings."),
        ("plant",      "A potted plant softens an empty corner."),
        ("wall_art",   "Framed art finishes the main wall."),
        ("side_table", "A side table gives the sofa a spot for chai and a book."),
    ],
    "bedroom": [
        ("rug",      "A rug by the bed — the first soft thing underfoot in the morning."),
        ("lamp",     "A bedside lamp for reading without the harsh ceiling light."),
        ("wall_art", "A piece above the bed settles the wall."),
        ("bench",    "A bench at the foot of the bed for laying out clothes."),
        ("plant",    "A little green to soften the room."),
    ],
    "dining": [
        ("rug",       "A rug under the table marks out the dining zone."),
        ("sideboard", "A sideboard for serving and stowing the good crockery."),
        ("wall_art",  "Art gives the table a backdrop."),
        ("plant",     "A plant keeps the corner from feeling bare."),
    ],
    "study": [
        ("lamp",       "A focused task lamp to save your eyes in the evening."),
        ("plant",      "A plant on the desk softens the work."),
        ("wall_art",   "Something on the wall to rest your eyes on."),
        ("side_table", "A side table for the coffee and the stack of books."),
    ],
}

# Up-sells: (smaller_sub, bigger_sub, suits(profile) -> bool, why). Offered only
# when the smaller piece is in the room, the bigger one is in the menu, the
# household suits it, and the price DELTA fits the remaining budget.
_UPSELLS: dict[str, list[tuple[str, str, str, str]]] = {
    # condition is a profile key that must be truthy.
    "living": [
        ("sofa_2seat", "sofa_l", "hosts", "Step up from the two-seater to the L-sectional — room for the whole family when everyone's over."),
        ("sofa",       "sofa_l", "joint", "Swap the three-seater for an L-sectional — it seats everyone when the family gathers."),
    ],
    "dining": [
        ("dining_table", "dining_table", "joint", ""),  # placeholder; no larger variant in menu yet
    ],
}


def _sub_of(item) -> str:
    return item.id.split("-")[0]


def _profile(room: RoomState) -> dict[str, bool]:
    t = (room.intake.who_lives_here or "").lower()
    has = lambda *ks: any(k in t for k in ks)  # noqa: E731
    kids = has("young child", "child", "kid", "toddler", "baby", "son", "daughter")
    elderly = has("elderly", "elder", "grand", "mother-in-law", "mother in law", "in-law", "parent")
    guests = has("guest", "host", "entertain")
    joint = has("joint family", "joint", "large family")
    couple = has("just the two", "couple", "two of us")
    return {
        "kids": kids, "elderly": elderly, "guests": guests, "joint": joint,
        "couple": couple, "hosts": guests or joint,
    }


def _allowed(sub: str, item, prof: dict[str, bool]) -> bool:
    """The 'what NOT to suggest' filter."""
    materials = [m.lower() for m in (getattr(item, "materials", None) or [])]
    # No glass-topped pieces in a home with young children.
    if prof["kids"] and "glass" in materials:
        return False
    # A couple living alone doesn't need an extra seat.
    if prof["couple"] and not prof["hosts"] and sub in ("bench", "pouffe"):
        return False
    return True


def suggest_for_room(room: RoomState, limit: int = 3) -> list[Suggestion]:
    if not room.philosophy:
        return []
    menu = get_menu(room.intake.room_type.value, room.philosophy)
    if not menu:
        return []

    present = {_sub_of(i) for i in room.items}
    prof = _profile(room)
    remaining = build_cost_breakdown(room).story.remaining_inr

    out: list[Suggestion] = []

    # ── Cross-sell — complete the look with what's missing and affordable ──
    for sub, reason in _COMPLEMENTS.get(room.intake.room_type.value, []):
        if sub in present:
            continue
        item = menu.get(sub)
        if item is None or not _allowed(sub, item, prof):
            continue
        if item.price_inr > max(0, remaining):   # never break the all-in budget
            continue
        out.append(Suggestion(
            intent=Intent(kind=IntentKind.ADD, target_item_id=None,
                          parameters={"sub_category": sub, "sku": item.sku, "note": reason}),
            reason=reason, kind="cross_sell", price_inr=item.price_inr,
        ))

    # ── Up-sell — upgrade a piece when it suits the family and fits budget ──
    for from_sub, to_sub, cond_key, reason in _UPSELLS.get(room.intake.room_type.value, []):
        if from_sub == to_sub or not reason:
            continue
        if not prof.get(cond_key):
            continue
        current = next((i for i in room.items if _sub_of(i) == from_sub), None)
        bigger = menu.get(to_sub)
        if current is None or bigger is None or to_sub in present:
            continue
        delta = bigger.price_inr - current.price_inr
        if delta <= 0 or delta > max(0, remaining):
            continue
        out.append(Suggestion(
            intent=Intent(kind=IntentKind.REPLACE, target_item_id=current.id,
                          parameters={"sub_category": to_sub, "sku": bigger.sku, "note": reason}),
            reason=reason, kind="up_sell", price_inr=delta,
        ))

    # Cross-sell first, then up-sell. Within each, keep authored priority order
    # (the _COMPLEMENTS lists are ranked by impact — the rug matters more than a
    # side table even though it costs more), so a stable sort on kind alone.
    out.sort(key=lambda s: s.kind != "cross_sell")
    return out[:limit]
