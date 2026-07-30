import json
import argparse
from pathlib import Path
from mutagen.mp3 import MP3
from mutagen.id3 import ID3, APIC, TIT2, TPE1, TALB, TYER, TCON, USLT
import random
import sys

BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(BASE_DIR / "backend"))

from utils.path_resolver import get_data_dir, get_assets_dir, get_songs_dir
from database import get_connection, init_db

# -------------------- CONFIGURATION --------------------

SONGS_DIR = get_songs_dir()
ASSETS_DIR = get_assets_dir()
DATA_DIR = get_data_dir()
LYRICS_DIR = ASSETS_DIR / "lyrics"
ALBUM_ARTS_DIR = ASSETS_DIR / "album-arts"
FALLBACK_ARTS_DIR = ALBUM_ARTS_DIR / "fallback"
ARTIST_IMAGES_DIR = ASSETS_DIR / "artist-images"

global fallback_art_arr
fallback_art_arr = [f.name for f in FALLBACK_ARTS_DIR.iterdir() if f.suffix.lower()==".png"]

def split_artists(artist_string):
    """Split joint artist strings into a list of unique names."""
    if not artist_string:
        return ["Unknown"]
    for sep in ["/", ",", " feat. ", " ft. ", "&", ";"]:
        artist_string = artist_string.replace(sep, "|")
    return [a.strip() for a in artist_string.split("|") if a.strip()]

def fallback_album_art():
    if not fallback_art_arr:
        return f"{FALLBACK_ARTS_DIR}/song-icon4.png"
    filename = random.choice(fallback_art_arr)
    return f"{FALLBACK_ARTS_DIR}/{filename}"

def extract_metadata(file_path):
    """Extract metadata and album art from various audio formats (MP3, FLAC, OGG, WAV, M4A)."""
    file_path = Path(file_path)
    suffix = file_path.suffix.lower()
    
    title = file_path.stem
    artist_raw = "Unknown Artist"
    album = "Unknown Album"
    genre = "Unknown Genre"
    year = 0
    duration = 0
    art_data = None
    
    try:
        if suffix == ".mp3":
            audio = MP3(file_path, ID3=ID3)
            title = str(audio.get("TIT2", title))
            artist_raw = str(audio.get("TPE1", artist_raw))
            album = str(audio.get("TALB", album))
            genre = str(audio.get("TCON", genre))
            year_raw = audio.get("TYER") or audio.get("TDRC")
            year = int(str(year_raw)[:4]) if year_raw and str(year_raw)[:4].isdigit() else 0
            duration = int(audio.info.length)
            
            if audio.tags:
                for tag in audio.tags.values():
                    if isinstance(tag, APIC):
                        art_data = tag.data
                        break
                        
        elif suffix == ".flac":
            from mutagen.flac import FLAC
            audio = FLAC(file_path)
            title = audio.get("title", [title])[0]
            artist_raw = audio.get("artist", [artist_raw])[0]
            album = audio.get("album", [album])[0]
            genre = audio.get("genre", [genre])[0]
            year_raw = audio.get("date", [""])[0] or audio.get("year", [""])[0]
            year = int(str(year_raw)[:4]) if year_raw and str(year_raw)[:4].isdigit() else 0
            duration = int(audio.info.length)
            
            if audio.pictures:
                art_data = audio.pictures[0].data
                
        elif suffix == ".ogg":
            from mutagen.oggvorbis import OggVorbis
            audio = OggVorbis(file_path)
            title = audio.get("title", [title])[0]
            artist_raw = audio.get("artist", [artist_raw])[0]
            album = audio.get("album", [album])[0]
            genre = audio.get("genre", [genre])[0]
            year_raw = audio.get("date", [""])[0] or audio.get("year", [""])[0]
            year = int(str(year_raw)[:4]) if year_raw and str(year_raw)[:4].isdigit() else 0
            duration = int(audio.info.length)
            
            if "metadata_block_picture" in audio:
                import base64
                from mutagen.flac import Picture
                for tag in audio["metadata_block_picture"]:
                    try:
                        pic = Picture(base64.b64decode(tag))
                        art_data = pic.data
                        break
                    except Exception:
                        pass
                        
        elif suffix == ".wav":
            from mutagen.wave import WAVE
            audio = WAVE(file_path)
            duration = int(audio.info.length)
            if audio.tags:
                title = str(audio.tags.get("TIT2", title))
                artist_raw = str(audio.tags.get("TPE1", artist_raw))
                album = str(audio.tags.get("TALB", album))
                genre = str(audio.tags.get("TCON", genre))
                year_raw = audio.tags.get("TYER") or audio.tags.get("TDRC")
                year = int(str(year_raw)[:4]) if year_raw and str(year_raw)[:4].isdigit() else 0
                
                for tag in audio.tags.values():
                    if isinstance(tag, APIC):
                        art_data = tag.data
                        break
                        
        elif suffix in (".m4a", ".mp4"):
            from mutagen.mp4 import MP4, MP4Cover
            audio = MP4(file_path)
            title = audio.get("\xa9nam", [title])[0]
            artist_raw = audio.get("\xa9ART", [artist_raw])[0]
            album = audio.get("\xa9alb", [album])[0]
            genre = audio.get("\xa9gen", [genre])[0]
            year_raw = audio.get("\xa9day", [""])[0]
            year = int(str(year_raw)[:4]) if year_raw and str(year_raw)[:4].isdigit() else 0
            duration = int(audio.info.length)
            
            if "covr" in audio:
                cover = audio["covr"][0]
                if isinstance(cover, MP4Cover):
                    art_data = bytes(cover)
                else:
                    art_data = cover
                    
        else:
            import mutagen
            audio = mutagen.File(file_path)
            if audio is not None:
                duration = int(audio.info.length)
                if hasattr(audio, "get"):
                    title = audio.get("title", [title])[0]
                    artist_raw = audio.get("artist", [artist_raw])[0]
                    album = audio.get("album", [album])[0]
                    genre = audio.get("genre", [genre])[0]
            else:
                return None
        
        art_filename = f"{Path(file_path).stem}.jpg"
        art_path = ALBUM_ARTS_DIR / art_filename
        
        if art_data and not art_path.exists():
            with open(art_path, "wb") as img:
                img.write(art_data)
        
        rel_path = file_path.relative_to(SONGS_DIR).as_posix()
        
        return {
            "title": title,
            "artist": split_artists(artist_raw),
            "album": album,
            "genre": genre,
            "year": year,
            "length": duration,
            "file": rel_path,
            "albumArt": f"assets/album-arts/{art_filename}" if art_path.exists() else fallback_album_art()
        }
    except Exception as e:
        print(f"Error extracting {file_path.name}: {e}")
        return None

def reset_database():
    """Wipe and recreate the database schema."""
    print("🗑 Dropping old tables and recreating schema...")
    conn = get_connection()
    cursor = conn.cursor()
    cursor.executescript("""
        PRAGMA foreign_keys = OFF;
        DROP TABLE IF EXISTS lyrics;
        DROP TABLE IF EXISTS playlist_songs;
        DROP TABLE IF EXISTS playlists;
        DROP TABLE IF EXISTS song_artists;
        DROP TABLE IF EXISTS artists;
        DROP TABLE IF EXISTS songs;
        PRAGMA foreign_keys = ON;
    """)
    conn.commit()
    conn.close()
    init_db()
    print("Database schema initialized.")


def sync(reset=False, cleanup=False):
    print(f"Starting Advanced Library Sync...")
    print(f"Songs Dir: {SONGS_DIR}")
    
    if reset:
        reset_database()
    
    songs_json_path = DATA_DIR / "songs.json"
    artists_json_path = DATA_DIR / "artists.json"
    lyrics_json_path = DATA_DIR / "lyrics.json"
    playlists_json_path = DATA_DIR / "playlists.json"
    
    existing_songs = []
    if songs_json_path.exists():
        with open(songs_json_path, "r", encoding="utf-8") as f:
            existing_songs = json.load(f)
            
    existing_artists = []
    if artists_json_path.exists():
        with open(artists_json_path, "r", encoding="utf-8") as f:
            existing_artists = json.load(f)

    existing_lyrics = []
    if lyrics_json_path.exists():
        with open(lyrics_json_path, "r", encoding="utf-8") as f:
            existing_lyrics = json.load(f)

    song_lookup = {s["file"]: s for s in existing_songs}
    max_id = max([s["id"] for s in existing_songs], default=0)
    
    new_songs = []
    all_artists = set()
    
    supported_extensions = {".mp3", ".flac", ".ogg", ".wav", ".m4a", ".mp4"}
    files = [p for p in SONGS_DIR.rglob("*") if p.is_file() and p.suffix.lower() in supported_extensions]
    files.sort(key=lambda x: x.name.lower())
    print(f"Found {len(files)} audio files recursively.")
    
    valid_files = set()
    for i, file_path in enumerate(files):
        if "lyrics" in file_path.parts:
            continue
            
        rel_path = file_path.relative_to(SONGS_DIR).as_posix()
        valid_files.add(rel_path)
        
        print(f"[{i+1}/{len(files)}] Processing {rel_path}...", end="\r")
        
        metadata = extract_metadata(file_path)
        if not metadata:
            continue
            
        if rel_path in song_lookup:
            metadata["id"] = song_lookup[rel_path]["id"]
            metadata["rating"] = song_lookup[rel_path].get("rating", 0)
        else:
            max_id += 1
            metadata["id"] = max_id
            metadata["rating"] = 0
            print(f"\nNew song detected: {metadata['title']} ({rel_path})")
            
        new_songs.append(metadata)
        for a in metadata["artist"]:
            all_artists.add(a)

    if cleanup:
        original_count = len(new_songs)
        new_songs = [s for s in new_songs if s["file"] in valid_files]
        if len(new_songs) < original_count:
            print(f"\nCleaned up {original_count - len(new_songs)} stale entries.")

    print(f"\nFinal Count: {len(new_songs)} songs.")

    artist_lookup = {a["name"]: a for a in existing_artists}
    final_artists = []
    
    for artist_name in sorted(all_artists):
        artist_obj = artist_lookup.get(artist_name, {"name": artist_name, "image": None})
        
        has_valid_image = False
        
        if artist_obj.get("image"):
            # Extract just the filename to find it in ARTIST_IMAGES_DIR
            img_filename = Path(artist_obj["image"]).name
            if (ARTIST_IMAGES_DIR / img_filename).exists():
                artist_obj["image"] = f"/artist-images/{img_filename}"
                has_valid_image = True
        
        if not has_valid_image:
            found_image = False
            for ext in [".jpg", ".png", ".webp", ".jpeg"]:
                img_name = f"{artist_name.lower()}{ext}"
                if (ARTIST_IMAGES_DIR / img_name).exists():
                    artist_obj["image"] = f"/artist-images/{img_name}"
                    found_image = True
                    break
            
            if not found_image:
                artist_obj["image"] = None
        
        final_artists.append(artist_obj)
        
    lyrics_lookup = {l["song_id"]: l for l in existing_lyrics}
    final_lyrics = []
    lrc_files = {f.stem: f for f in LYRICS_DIR.rglob("*.lrc")}
    
    for s in new_songs:
        song_id = s["id"]
        song_stem = Path(s["file"]).stem
        
        lrc_path = lrc_files.get(song_stem)
        if lrc_path:
            try:
                with open(lrc_path, "r", encoding="utf-8") as f:
                    content = f.read()
                    final_lyrics.append({"song_id": song_id, "lyrics": content.strip()})
            except Exception as e:
                print(f"Error reading lyrics for {song_stem}: {e}")
        elif song_id in lyrics_lookup:
            final_lyrics.append(lyrics_lookup[song_id])

    with open(songs_json_path, "w", encoding="utf-8") as f:
        json.dump(new_songs, f, indent=2, ensure_ascii=False)
    with open(artists_json_path, "w", encoding="utf-8") as f:
        json.dump(final_artists, f, indent=2, ensure_ascii=False)
    with open(lyrics_json_path, "w", encoding="utf-8") as f:
        json.dump(final_lyrics, f, indent=2, ensure_ascii=False)
        
    print(f"JSON files updated.")

    print(f"Syncing with Database...")
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        if not reset:
             pass
        for s in new_songs:
            cursor.execute("""
                INSERT OR REPLACE INTO songs (id, title, album, genre, year, duration, file_path, album_art, rating)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                s["id"], s["title"], s["album"], s["genre"], s["year"], s["length"], s["file"], s["albumArt"], s.get("rating", 0)
            ))
            
        artist_id_map = {}
        for a in final_artists:
            cursor.execute("""
                INSERT OR REPLACE INTO artists (name, image)
                VALUES (?, ?)
            """, (a["name"], a.get("image")))
            cursor.execute("SELECT id FROM artists WHERE name = ?", (a["name"],))
            artist_id_map[a["name"]] = cursor.fetchone()[0]
            
        for s in new_songs:
            cursor.execute("DELETE FROM song_artists WHERE song_id = ?", (s["id"],))
            for artist_name in s["artist"]:
                artist_id = artist_id_map.get(artist_name)
                if artist_id:
                    cursor.execute("INSERT OR IGNORE INTO song_artists (song_id, artist_id) VALUES (?, ?)", (s["id"], artist_id))

        for l in final_lyrics:
            cursor.execute("""
                INSERT OR REPLACE INTO lyrics (song_id, content)
                VALUES (?, ?)
            """, (l["song_id"], l["lyrics"]))
            
        if playlists_json_path.exists():
            print("Syncing Playlists...")
            with open(playlists_json_path, "r", encoding="utf-8") as f:
                playlists = json.load(f)
            
            for p in playlists:
                cursor.execute("INSERT OR IGNORE INTO playlists (name, poster) VALUES (?, ?)", (p["name"], p.get("poster")))
                cursor.execute("UPDATE playlists SET poster = ? WHERE name = ?", (p.get("poster"), p["name"]))
                
                cursor.execute("SELECT id FROM playlists WHERE name = ?", (p["name"],))
                playlist_id = cursor.fetchone()[0]
                
                # Clear and rebuild song links
                cursor.execute("DELETE FROM playlist_songs WHERE playlist_id = ?", (playlist_id,))
                for pos, song_id in enumerate(p.get("ids", [])):
                    cursor.execute("""
                        INSERT OR IGNORE INTO playlist_songs (playlist_id, song_id, position)
                        VALUES (?, ?, ?)
                    """, (playlist_id, song_id, pos))
                    
        conn.commit()
        print(f"Database synchronized successfully.")
        
    except Exception as e:
        print(f"Database error: {e}")
        conn.rollback()
    finally:
        conn.close()

    print(f"\n Sync Complete!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Synchronize Melodious Library")
    parser.add_argument("--reset", action="store_true", help="Drop and recreate database from scratch")
    parser.add_argument("--cleanup", action="store_true", help="Remove stale entries for missing files")
    
    args = parser.parse_args()
    sync(reset=args.reset, cleanup=args.cleanup)
