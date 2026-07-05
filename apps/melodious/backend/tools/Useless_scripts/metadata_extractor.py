"""
metadata_extractor.py  (dev tool — not part of the runtime server)
-------------------------------------------------------------------
Scans a folder of MP3 files, extracts ID3 metadata, saves album art
to assets/album-arts/, and outputs a songs.json compatible with the
Melodious schema.

Usage (from project root):
    python backend/tools/metadata_extractor.py

Output: data/songs.json  (overwrites existing)
"""

import os
import json
from pathlib import Path
from mutagen.easyid3 import EasyID3
from mutagen.mp3 import MP3
from mutagen.id3 import ID3, APIC

# -------- PATHS --------
BASE_DIR        = Path(__file__).resolve().parent.parent.parent
SONGS_DIR       = BASE_DIR / "songs"
ALBUM_ART_DIR   = BASE_DIR / "assets" / "album-arts"
OUTPUT_JSON     = BASE_DIR / "data" / "songs.json"

ALBUM_ART_DIR.mkdir(parents=True, exist_ok=True)


# -------- HELPERS --------

def extract_metadata(file_path: Path):
    try:
        audio = MP3(str(file_path), ID3=EasyID3)
        title  = audio.get("title",["Unknown"])[0]
        artist = audio.get("artist",["Unknown"])[0]
        album  = audio.get("album",["Unknown"])[0]
        year   = audio.get("date",["0"])[0]
        genre  = audio.get("genre",[""])[0]
        length = int(audio.info.length)
        return title, artist, album, year, genre, length
    except Exception as e:
        print(f"  ⚠ Error reading {file_path.name}: {e}")
        return "Unknown", "Unknown", "Unknown", "0", "", 0


def extract_album_art(file_path: Path, stem: str) -> str | None:
    """Save embedded album art to assets/album-arts/<stem>.jpg and return relative path."""
    try:
        audio = ID3(str(file_path))
        for tag in audio.values():
            if isinstance(tag, APIC):
                out_path = ALBUM_ART_DIR / f"{stem}.jpg"
                with open(out_path, "wb") as img:
                    img.write(tag.data)
                # Return path relative to project root
                return str(out_path.relative_to(BASE_DIR))
    except Exception:
        pass
    return None


# -------- MAIN --------

mp3_files = sorted(SONGS_DIR.glob("*.mp3"))
songs = []

for idx, file_path in enumerate(mp3_files, start=1):
    stem = file_path.stem
    title, artist, album, year, genre, length = extract_metadata(file_path)
    album_art = extract_album_art(file_path, stem)

    songs.append({
        "id":       idx,
        "title":    title,
        "artist":   [a.strip() for a in artist.split(",")],
        "album":    album,
        "genre":    genre,
        "year":     int(year) if year.isdigit() else 0,
        "length":   length,
        "file":     file_path.name,
        "albumArt": album_art or f"assets/album-arts/{stem}.jpg",
    })
    print(f"  [{idx}] {title}")

with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
    json.dump(songs, f, indent=2, ensure_ascii=False)

print(f"\n Extracted {len(songs)} songs → {OUTPUT_JSON}")
