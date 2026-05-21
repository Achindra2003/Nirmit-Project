"""Headless blueprint3d-modern engine wrapper.

Shells out to `blueprint3d-modern/scripts/place.ts` via `tsx`, passing a JSON
request and parsing a SceneResponse from stdout. Returns a Scene dataclass that
higher-level code (resolver replacement, vision service) translates into
`PlacedItem[]` + `Opening[]` matching the existing state contract.

Stage 3: room geometry + door + window only. Stage 4 extends `place_items()`
to push AnchoredItems through the engine for collision/snap validation.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

# Repo-relative paths. Resolved once at import time so subprocess startup is cheap.
_THIS_FILE = Path(__file__).resolve()
_REPO_ROOT = _THIS_FILE.parents[4]  # nirmit-project/
_ENGINE_DIR = _REPO_ROOT / "blueprint3d-modern"
_PLACE_SCRIPT = _ENGINE_DIR / "scripts" / "place.ts"
# .bin is the OS-resolved tsx launcher; on Windows it lives as tsx.CMD next to tsx.
_TSX_DIR = _ENGINE_DIR / "node_modules" / ".bin"

Direction = Literal["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
RoomType = Literal["living", "bedroom", "dining", "study", "kitchen", "pooja", "bathroom", "kids"]


@dataclass(frozen=True)
class Wall:
    side: Literal["S", "E", "N", "W"]
    start: tuple[int, int]
    end: tuple[int, int]
    length_mm: int


@dataclass(frozen=True)
class Opening:
    wall: Literal["N", "S", "E", "W"]
    center_frac: float
    width_mm: int
    height_mm: int
    kind: Literal["door", "window"]
    sill_mm: int


@dataclass(frozen=True)
class PlacedSpec:
    """Engine-validated furniture placement. Keeps anchor passthrough so the
    caller can re-attach catalog/pricing."""

    sub_category: str
    x_mm: int
    z_mm: int
    rotation_deg: int
    width_mm: int
    depth_mm: int
    passthrough: dict[str, Any]


@dataclass(frozen=True)
class Scene:
    preset_id: str
    room_w_mm: int
    room_d_mm: int
    corners: tuple[tuple[int, int], ...]
    walls: tuple[Wall, ...]
    openings: tuple[Opening, ...]
    items: tuple[PlacedSpec, ...]
    warnings: tuple[str, ...]


# ── Room-type defaults (per the 2026-05-21 decision) ────────────────────────
DEFAULT_ROOM_DIMS_MM: dict[str, tuple[int, int]] = {
    "living": (4200, 3600),
    "bedroom": (3600, 3000),
    "dining": (3300, 3000),
    "study": (2700, 2400),
    # Fallbacks for room types without 24-preset coverage but that may appear
    # in intake; conservative defaults to keep the engine valid.
    "kitchen": (3000, 2400),
    "pooja": (1800, 1800),
    "bathroom": (2400, 1800),
    "kids": (3000, 2700),
}


class EngineError(RuntimeError):
    """Raised when the place.ts subprocess fails or returns malformed output."""


def default_room_dims(room_type: str) -> tuple[int, int]:
    return DEFAULT_ROOM_DIMS_MM.get(room_type, (3600, 3000))


def place_scene(
    preset_id: str,
    room_w_mm: int,
    room_d_mm: int,
    entrance: Direction,
    items: list[dict[str, Any]] | None = None,
) -> Scene:
    """Run place.ts and return a parsed Scene.

    `items` is a list of AnchoredItemSpec dicts (sub_category, anchor_x/z,
    offset_x/z_mm, rotation_deg, width_mm, depth_mm, [passthrough]). Pass an
    empty list (or None) to get just the room shell + openings — useful for
    Stage 3 testing.
    """
    request = {
        "preset_id": preset_id,
        "room_w_mm": int(room_w_mm),
        "room_d_mm": int(room_d_mm),
        "entrance": entrance,
        "items": items or [],
    }
    tsx = _find_tsx()
    if not _PLACE_SCRIPT.exists():
        raise EngineError(f"place.ts not found at {_PLACE_SCRIPT}")

    try:
        proc = subprocess.run(
            [tsx, str(_PLACE_SCRIPT), f"--request={json.dumps(request)}"],
            cwd=str(_ENGINE_DIR),
            capture_output=True,
            timeout=30,
            check=False,
        )
    except subprocess.TimeoutExpired as e:
        raise EngineError(f"place.ts timed out after 30s for preset={preset_id}") from e

    if proc.returncode != 0:
        stderr = proc.stderr.decode("utf-8", errors="replace")
        raise EngineError(
            f"place.ts exited {proc.returncode} for preset={preset_id}: {stderr.strip()[:500]}"
        )
    stdout = proc.stdout.decode("utf-8", errors="replace").strip()
    if not stdout:
        raise EngineError(f"place.ts returned empty output for preset={preset_id}")
    try:
        payload = json.loads(stdout)
    except json.JSONDecodeError as e:
        raise EngineError(f"place.ts returned invalid JSON: {stdout[:300]}") from e
    return _parse_scene(payload)


def _find_tsx() -> str:
    """Resolve tsx launcher. Prefers blueprint3d-modern's local install; falls
    back to PATH-resolved tsx (so a globally-installed copy still works)."""
    if os.name == "nt":
        local = _TSX_DIR / "tsx.CMD"
        if local.exists():
            return str(local)
    else:
        local = _TSX_DIR / "tsx"
        if local.exists():
            return str(local)
    path_resolved = shutil.which("tsx")
    if path_resolved:
        return path_resolved
    raise EngineError(
        f"tsx not found. Run `pnpm install` in {_ENGINE_DIR} or install tsx globally."
    )


def _parse_scene(payload: dict[str, Any]) -> Scene:
    try:
        room = payload["room"]
        corners = tuple((int(x), int(y)) for x, y in room["corners"])
        walls = tuple(
            Wall(
                side=w["side"],
                start=(int(w["start"][0]), int(w["start"][1])),
                end=(int(w["end"][0]), int(w["end"][1])),
                length_mm=int(w["length_mm"]),
            )
            for w in room["walls"]
        )
        openings = tuple(
            Opening(
                wall=o["wall"],
                center_frac=float(o["center_frac"]),
                width_mm=int(o["width_mm"]),
                height_mm=int(o["height_mm"]),
                kind=o["kind"],
                sill_mm=int(o["sill_mm"]),
            )
            for o in payload["openings"]
        )
        items = tuple(
            PlacedSpec(
                sub_category=it["sub_category"],
                x_mm=int(it["x_mm"]),
                z_mm=int(it["z_mm"]),
                rotation_deg=int(it["rotation_deg"]),
                width_mm=int(it["width_mm"]),
                depth_mm=int(it["depth_mm"]),
                passthrough=it.get("passthrough") or {},
            )
            for it in payload["items"]
        )
        return Scene(
            preset_id=str(payload["preset_id"]),
            room_w_mm=int(room["width_mm"]),
            room_d_mm=int(room["depth_mm"]),
            corners=corners,
            walls=walls,
            openings=openings,
            items=items,
            warnings=tuple(str(w) for w in payload.get("warnings", [])),
        )
    except (KeyError, TypeError, ValueError) as e:
        raise EngineError(f"malformed scene payload: {e}") from e
