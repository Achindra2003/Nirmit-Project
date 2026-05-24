"""Auto-generated catalog menu index.

Twelve curated menus (one per room_type × philosophy) shared across the
24 presets. `get_preset_catalog(preset_id)` routes a preset to its
philosophy menu — variant 0 and variant 1 of the same philosophy share."""
from __future__ import annotations

from app.domain.catalog.model import CatalogItem

from app.domain.catalog.presets.bedroom_breath import CATALOG as _bedroom_breath_catalog
from app.domain.catalog.presets.bedroom_gathering import CATALOG as _bedroom_gathering_catalog
from app.domain.catalog.presets.bedroom_keeper import CATALOG as _bedroom_keeper_catalog
from app.domain.catalog.presets.dining_breath import CATALOG as _dining_breath_catalog
from app.domain.catalog.presets.dining_gathering import CATALOG as _dining_gathering_catalog
from app.domain.catalog.presets.dining_keeper import CATALOG as _dining_keeper_catalog
from app.domain.catalog.presets.living_breath import CATALOG as _living_breath_catalog
from app.domain.catalog.presets.living_gathering import CATALOG as _living_gathering_catalog
from app.domain.catalog.presets.living_keeper import CATALOG as _living_keeper_catalog
from app.domain.catalog.presets.study_breath import CATALOG as _study_breath_catalog
from app.domain.catalog.presets.study_gathering import CATALOG as _study_gathering_catalog
from app.domain.catalog.presets.study_keeper import CATALOG as _study_keeper_catalog

_MENUS: dict[str, dict[str, CatalogItem]] = {
    "bedroom_breath": _bedroom_breath_catalog,
    "bedroom_gathering": _bedroom_gathering_catalog,
    "bedroom_keeper": _bedroom_keeper_catalog,
    "dining_breath": _dining_breath_catalog,
    "dining_gathering": _dining_gathering_catalog,
    "dining_keeper": _dining_keeper_catalog,
    "living_breath": _living_breath_catalog,
    "living_gathering": _living_gathering_catalog,
    "living_keeper": _living_keeper_catalog,
    "study_breath": _study_breath_catalog,
    "study_gathering": _study_gathering_catalog,
    "study_keeper": _study_keeper_catalog,
}

# preset_id (e.g. 'living_gathering_0') -> menu_id ('living_gathering')
_PRESET_TO_MENU: dict[str, str] = {
    "bedroom_breath_0": "bedroom_breath",
    "bedroom_breath_1": "bedroom_breath",
    "bedroom_gathering_0": "bedroom_gathering",
    "bedroom_gathering_1": "bedroom_gathering",
    "bedroom_keeper_0": "bedroom_keeper",
    "bedroom_keeper_1": "bedroom_keeper",
    "dining_breath_0": "dining_breath",
    "dining_breath_1": "dining_breath",
    "dining_gathering_0": "dining_gathering",
    "dining_gathering_1": "dining_gathering",
    "dining_keeper_0": "dining_keeper",
    "dining_keeper_1": "dining_keeper",
    "living_breath_0": "living_breath",
    "living_breath_1": "living_breath",
    "living_gathering_0": "living_gathering",
    "living_gathering_1": "living_gathering",
    "living_keeper_0": "living_keeper",
    "living_keeper_1": "living_keeper",
    "study_breath_0": "study_breath",
    "study_breath_1": "study_breath",
    "study_gathering_0": "study_gathering",
    "study_gathering_1": "study_gathering",
    "study_keeper_0": "study_keeper",
    "study_keeper_1": "study_keeper",
}


def get_preset_catalog(preset_id: str) -> dict[str, CatalogItem]:
    """Return the curated menu for the given preset_id.
    Variant 0 and variant 1 of the same philosophy return the same menu.
    Returns an empty dict if preset_id is unknown."""
    mid = _PRESET_TO_MENU.get(preset_id)
    if mid is None:
        return {}
    return _MENUS.get(mid, {})


def get_menu(room_type: str, philosophy: str) -> dict[str, CatalogItem]:
    """Return the curated menu for a (room_type, philosophy) pair.
    Returns an empty dict if the pair has no curated menu."""
    return _MENUS.get(f"{room_type}_{philosophy}", {})


ALL_MENU_IDS = tuple(sorted(_MENUS.keys()))
ALL_PRESET_IDS = tuple(sorted(_PRESET_TO_MENU.keys()))
