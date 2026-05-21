"""Selective download of huanngzh/3D-Front from HuggingFace.

The dataset is packaged as monolithic tar archives (test split = 12.6 GB,
full split = 484 GB) — there's no per-file API. To avoid pulling the full
tarball, we stream the `.tar.gz` over HTTP and stop as soon as we've
extracted enough rooms. The first ~1 GB of stream typically yields dozens
of complete rooms.

LICENSE WARNING: 3D-FRONT is cc-by-nc-4.0 (non-commercial). The downloaded
GLBs are for prototyping the resolver / layout priors / internal demos only.
They MUST NOT ship in Nirmit's production catalog.

Usage (run from backend/):

    # Step 1 — pull the manifests (tiny):
    python -m scripts.fetch_3dfront manifests

    # Step 2 — stream the test-split tarball, stop after N rooms:
    python -m scripts.fetch_3dfront stream --rooms 20

    # Or stop after M MB of payload:
    python -m scripts.fetch_3dfront stream --max-mb 1500

    # Filter to specific room types as we stream:
    python -m scripts.fetch_3dfront stream --rooms 15 \\
        --types LivingRoom,MasterBedroom,KidsRoom
"""
from __future__ import annotations

import argparse
import gzip
import json
import re
import sys
import tarfile
import urllib.request
from pathlib import Path

from huggingface_hub import snapshot_download

REPO_ID = "huanngzh/3D-Front"
REPO_TYPE = "dataset"
DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "3d-front"
EXTRACT_DIR = DATA_DIR / "extracted"
MANIFEST_FILES = [
    "valid_room_ids.json",
    "valid_furniture_ids.json",
    "midi_room_ids.json",
    "midi_furniture_ids.json",
    "midi_test_room_ids.json",
    "midi_test_furniture_ids.json",
]

TARBALL_URL = "https://huggingface.co/datasets/huanngzh/3D-Front/resolve/main/3D-FRONT-TEST-SCENE.tar.gz"


def _room_type(entry: str) -> str:
    room = entry.split("/", 1)[1] if "/" in entry else entry
    m = re.match(r"([A-Za-z]+)", room)
    return m.group(1) if m else ""


def cmd_manifests(_args: argparse.Namespace) -> None:
    print(f"[fetch_3dfront] pulling manifests into {DATA_DIR}")
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    snapshot_download(
        repo_id=REPO_ID,
        repo_type=REPO_TYPE,
        local_dir=str(DATA_DIR),
        allow_patterns=MANIFEST_FILES,
    )
    for name in MANIFEST_FILES:
        p = DATA_DIR / name
        if p.exists():
            print(f"  ok  {name}  ({p.stat().st_size / 1024:,.1f} KB)")
        else:
            print(f"  MISSING  {name}")


class _CountingReader:
    """Wraps an HTTP response so we can report bytes-read and abort."""

    def __init__(self, response: "urllib.request.addinfourl"):
        self._r = response
        self.bytes_read = 0

    def read(self, n: int = -1) -> bytes:
        chunk = self._r.read(n)
        self.bytes_read += len(chunk)
        return chunk


def cmd_stream(args: argparse.Namespace) -> None:
    type_filter: set[str] | None = None
    if args.types:
        type_filter = {t.strip() for t in args.types.split(",") if t.strip()}

    EXTRACT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"[fetch_3dfront] streaming {TARBALL_URL}")
    print(f"  target: {args.rooms} room(s)" + (f", types={sorted(type_filter)}" if type_filter else ""))
    print(f"  hard cap: {args.max_mb} MB downloaded")
    print(f"  extract dir: {EXTRACT_DIR}")

    req = urllib.request.Request(TARBALL_URL, headers={"User-Agent": "nirmit-fetch/1.0"})
    response = urllib.request.urlopen(req, timeout=60)
    counter = _CountingReader(response)
    gz = gzip.GzipFile(fileobj=counter)  # type: ignore[arg-type]

    rooms_seen: set[str] = set()
    rooms_completed: set[str] = set()
    glbs_written = 0
    skipped_other_type = 0
    max_bytes = args.max_mb * 1024 * 1024
    progress_step = 100 * 1024 * 1024  # log every 100 MB
    next_progress = progress_step

    try:
        with tarfile.open(fileobj=gz, mode="r|") as tar:
            for member in tar:
                if not member.isfile():
                    continue
                # Members look like: '3D-FRONT-SCENE/<house>/<room>/<obj>.glb'
                parts = member.name.replace("\\", "/").split("/")
                if len(parts) < 4:
                    continue
                house, room, fname = parts[1], parts[2], parts[3]
                if not fname.endswith(".glb"):
                    continue

                room_key = f"{house}/{room}"
                if type_filter and _room_type(room_key) not in type_filter:
                    skipped_other_type += 1
                    continue

                # New room? Check if we've already hit our target.
                if room_key not in rooms_seen:
                    if len(rooms_completed) >= args.rooms:
                        # Got enough rooms; bail out of the stream.
                        break
                    rooms_seen.add(room_key)

                # Extract this glb.
                out_path = EXTRACT_DIR / parts[1] / parts[2] / fname
                out_path.parent.mkdir(parents=True, exist_ok=True)
                f = tar.extractfile(member)
                if f is not None:
                    out_path.write_bytes(f.read())
                    glbs_written += 1

                # Mark the *previous* room as completed when we see a new one.
                # (Simplification: once we've moved past a room in the tar, it's done.)
                rooms_completed.add(room_key)

                if counter.bytes_read >= next_progress:
                    mb = counter.bytes_read / (1024 * 1024)
                    print(
                        f"  ... {mb:,.0f} MB downloaded | "
                        f"{len(rooms_completed)} room(s), {glbs_written} GLB(s)"
                    )
                    next_progress += progress_step

                if counter.bytes_read >= max_bytes:
                    print(f"[fetch_3dfront] hit --max-mb {args.max_mb}, stopping")
                    break
    except Exception as e:
        # Closing the gzip stream mid-way raises EOFError — that's fine, we have what we wanted.
        if not isinstance(e, EOFError):
            print(f"[fetch_3dfront] stream ended: {type(e).__name__}: {e}")
    finally:
        try:
            response.close()
        except Exception:
            pass

    mb = counter.bytes_read / (1024 * 1024)
    print(
        f"[fetch_3dfront] done: {len(rooms_completed)} rooms, "
        f"{glbs_written} GLBs, {mb:,.1f} MB downloaded, "
        f"{skipped_other_type} GLBs skipped by type filter"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("manifests", help="Download only the JSON manifests").set_defaults(
        func=cmd_manifests
    )

    stream = sub.add_parser(
        "stream", help="Stream the test-split tarball and stop after N rooms"
    )
    stream.add_argument("--rooms", type=int, default=20, help="Stop after this many rooms")
    stream.add_argument(
        "--max-mb", type=int, default=3000, help="Hard cap on downloaded bytes (MB)"
    )
    stream.add_argument(
        "--types",
        type=str,
        default=None,
        help="Comma-separated room-type filter, e.g. LivingRoom,MasterBedroom",
    )
    stream.set_defaults(func=cmd_stream)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
