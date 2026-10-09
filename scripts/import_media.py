#!/usr/bin/env python3
"""Import the media originals listed in gallery-data.js into their stable website paths."""
from __future__ import annotations
import json
import shutil
import sys
import zipfile
from pathlib import Path, PurePosixPath

ROOT = Path.cwd()
ARCHIVE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/royal-hall-media.zip")
MANIFEST_PATH = ROOT / "assets/js/gallery-data.js"

def load_manifest() -> dict:
    raw = MANIFEST_PATH.read_text(encoding="utf-8")
    prefix = "window.ROYAL_HALL_MEDIA ="
    if not raw.lstrip().startswith(prefix):
        raise SystemExit("Expected JavaScript gallery manifest assignment.")
    payload = raw.lstrip()[len(prefix):].strip()
    if payload.endswith(";"):
        payload = payload[:-1]
    return json.loads(payload)

def safe_target(relative: str) -> Path:
    target = (ROOT / relative).resolve()
    if ROOT.resolve() not in target.parents:
        raise SystemExit(f"Unsafe media destination: {relative}")
    return target

def main() -> None:
    manifest = load_manifest()
    photos = manifest.get("photos", [])
    videos = manifest.get("videos", [])
    if len(photos) != 35 or len(videos) != 7:
        raise SystemExit(f"Expected 35 photos and 7 videos, got {len(photos)} and {len(videos)}.")

    with zipfile.ZipFile(ARCHIVE) as archive:
        members = {PurePosixPath(name).name: name for name in archive.namelist() if not name.endswith("/")}
        required = [(item, "photo") for item in photos] + [(item, "video") for item in videos]
        missing = [item.get("original", "(no original filename)") for item, _ in required if item.get("original") not in members]
        if missing:
            raise SystemExit("Original files not found in source archive: " + ", ".join(missing))

        for item, _kind in required:
            original = item["original"]
            dest = safe_target(item["src"])
            dest.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(members[original]) as src, dest.open("wb") as out:
                shutil.copyfileobj(src, out)

    # Small descriptive aliases used by the homepage and event cards.
    image_dir = ROOT / "assets/images"
    aliases = {
        "hero-venue.jpg": "photo-06.jpeg",
        "venue-entrance.jpg": "photo-24.jpeg",
        "hall-interior.jpg": "photo-06.jpeg",
        "stage-celebration.jpg": "photo-02.jpeg",
        "cake-display.jpg": "photo-07.jpeg",
    }
    for alias, source in aliases.items():
        shutil.copy2(image_dir / source, image_dir / alias)

    all_photo_paths = [safe_target(item["src"]) for item in photos]
    all_video_paths = [safe_target(item["src"]) for item in videos]
    if any(not path.is_file() for path in all_photo_paths + all_video_paths):
        raise SystemExit("Media import finished but at least one destination is missing.")
    print(f"Imported {len(photos)} photos, {len(videos)} videos and {len(aliases)} page image aliases.")

if __name__ == "__main__":
    main()
