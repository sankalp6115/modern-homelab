import os
import json
import platform
from pathlib import Path
from mutagen.easyid3 import EasyID3
from mutagen.mp3 import MP3
from mutagen.id3 import ID3, APIC
from argparse import ArgumentParser

# -------------------- CONFIGURATION --------------------

def get_default_music_dir():
    return "/Users/sankalpomar/Documents/TermuxExpts/Melodious/Songs"

DEFAULT_MUSIC_DIR = Path(os.environ.get("MUSIC_DIR", get_default_music_dir()))
DEFAULT_BASE_URL = os.environ.get("BASE_URL", "Songs")
DEFAULT_OUTPUT_FILE = "/Users/sankalpomar/Documents/TermuxExpts/Melodious/Global Scripts/songs.js"

# -------------------- CORE FUNCTIONS --------------------

def get_track_length(file_path):
    try:
        audio = MP3(file_path)
        return int(audio.info.length)
    except Exception as e:
        print(f"[ERROR] Failed to get track length for: {file_path} -> {e}")
        return 0

def extract_album_art(mp3_path, art_output_dir):
    """Extract album art from MP3 and save as .jpg file"""
    try:
        id3 = ID3(mp3_path)
        for tag in id3.values():
            if isinstance(tag, APIC):
                art_path = art_output_dir / f"{Path(mp3_path).stem}.jpg"
                art_output_dir.mkdir(parents=True, exist_ok=True)
                with open(art_path, "wb") as img:
                    img.write(tag.data)
                return art_path.name  # return filename only
    except Exception as e:
        print(f"[WARNING] No album art found in: {mp3_path} -> {e}")
    return None

def read_metadata(mp3_path, album_art_dir_url, album_art_save_dir):
    try:
        audio = MP3(mp3_path, ID3=EasyID3)
        id3 = ID3(mp3_path)

        title = audio.get("title", [Path(mp3_path).stem])[0]
        # Split artist string into a list if it contains "/"
        artist = audio.get("artist", ["Unknown Artist"])[0].split("/")
        album = audio.get("album", [""])[0]
        genre = audio.get("genre", [""])[0]
        full_date = audio.get("date", [""])[0]
        year = int(full_date[:4]) if full_date[:4].isdigit() else None
        
        # Album art
        album_art_filename = extract_album_art(mp3_path, album_art_save_dir)
        album_art_url = f"{album_art_dir_url}/{album_art_filename}" if album_art_filename else f"{album_art_dir_url}/default.jpg"

        return {
            "title": title,
            "artist": artist,
            "album": album,
            "genre": genre,
            "year": year,
            "length": get_track_length(mp3_path),
            "album_art": album_art_url,
        }
    except Exception as e:
        print(f"[ERROR] Metadata read failed for: {mp3_path} -> {e}")
        return None

# -------------------- MAIN FUNCTION --------------------

def generate_song_list(music_dir, base_url, output_file):
    music_dir = Path(music_dir)
    album_art_dir_url = f"{base_url}/AlbumArt"
    song_url_dir = base_url

    album_art_save_dir = music_dir / "AlbumArt"
    entries = []

    if not music_dir.exists():
        print(f"[FATAL] Music directory not found: {music_dir}")
        return

    print(f"[INFO] Scanning: {music_dir}")

    for root, _, files in os.walk(music_dir):
        for file in files:
            if file.lower().endswith(".mp3"):
                mp3_path = Path(root) / file
                rel_path = mp3_path.relative_to(music_dir).as_posix()
                metadata = read_metadata(mp3_path, album_art_dir_url, album_art_save_dir)
                
                if metadata:
                    entry = {
                        "id": 0,  # Placeholder ID, will be assigned later
                        "title": metadata["title"],
                        "artist": metadata["artist"],
                        "album": metadata["album"],
                        "genre": metadata["genre"],
                        "year": metadata["year"],
                        "length": metadata["length"],
                        "albumArt": metadata["album_art"],
                        "file": f"{song_url_dir}/{rel_path}",
                        "rating": 5
                    }
                    entries.append(entry)

    # Sort entries by title (case-insensitive)
    entries.sort(key=lambda x: x["title"].lower())

    # Assign unique IDs (starting from 1)
    for index, entry in enumerate(entries, 1):
        entry["id"] = index

    # Write to JS file
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("const songs = ")
        json.dump(entries, f, ensure_ascii=False, indent=2)
        f.write(";")

    print(f"[SUCCESS] {len(entries)} songs exported to: {output_file}")

# -------------------- CLI ENTRY --------------------

if __name__ == "__main__":
    parser = ArgumentParser(description="Generate songs.js from local MP3 metadata")
    parser.add_argument("--music-dir", type=str, default=DEFAULT_MUSIC_DIR, help="Path to music directory")
    parser.add_argument("--base-url", type=str, default=DEFAULT_BASE_URL, help="Base URL where files will be served")
    parser.add_argument("--output", type=str, default=DEFAULT_OUTPUT_FILE, help="Output JS file path")

    args = parser.parse_args()
    generate_song_list(args.music_dir, args.base_url, args.output)