#!/usr/bin/env python3
"""Import the media originals listed in gallery-data.js into their stable website paths."""
from __future__ import annotations
import csv
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

    # Generate auditable media indexes directly from the same source of truth.
    docs = ROOT / "docs"
    docs.mkdir(parents=True, exist_ok=True)
    photo_headers = ["Photo No.", "Original Filename", "Primary Category", "Specific Type", "Visual Description", "Tags", "Related-shot Notes", "Website Asset Path"]
    photo_rows = []
    category_names = {"venue": "Entrance Exterior Signage", "interior": "Hall Interior Seating", "stage": "Stage Theme Decor", "details": "Cake Dessert Display Tables"}
    related = {
        7: "Related display setup also appears in Photos 13 and 25.",
        13: "Related display setup also appears in Photos 7 and 25.",
        20: "Similar setup/alternate angle appears in Photo 22.",
        22: "Similar setup/alternate angle appears in Photo 20.",
        25: "Related display setup also appears in Photos 7 and 13.",
        30: "Same venue frontage/arch family as Photos 31 and 35; angle differs.",
        31: "Same venue frontage/arch family as Photos 30 and 35; angle differs.",
        35: "Same venue frontage/arch family as Photos 30 and 31; angle differs.",
    }
    for idx, photo in enumerate(photos, start=1):
        primary = "Buffet Catering" if "buffet" in photo.get("tags", "").lower() else category_names.get(photo.get("category"), "Other")
        photo_rows.append([idx, photo["original"], primary, photo.get("title", ""), photo.get("alt", ""), photo.get("tags", ""), related.get(idx, ""), photo["src"]])
    with (docs / "PHOTO-MEDIA-INDEX.csv").open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(photo_headers)
        writer.writerows(photo_rows)

    video_headers = ["Video No.", "Original Filename", "Duration (seconds)", "Observed Content", "Tentative Category", "Review Notes", "Website Asset Path"]
    video_rows = []
    for idx, video in enumerate(videos, start=1):
        category = video.get("title", "Venue video")
        notes = "Based on sampled frames; review the full clip before using specific claims in marketing."
        video_rows.append([idx, video.get("original", ""), video.get("durationSeconds", ""), video.get("description", ""), category, notes, video["src"]])
    with (docs / "VIDEO-MEDIA-INDEX.csv").open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(video_headers)
        writer.writerows(video_rows)

    print(f"Imported {len(photos)} photos, {len(videos)} videos, {len(aliases)} page image aliases and refreshed both media indexes.")

if __name__ == "__main__":
    main()
