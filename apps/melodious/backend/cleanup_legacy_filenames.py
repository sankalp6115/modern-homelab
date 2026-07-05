import re
import os
import shutil
import sqlite3
import unicodedata
import urllib.parse
from pathlib import Path

from database import get_connection
from utils.path_resolver import get_songs_dir, get_assets_dir

def sanitize_filename(filename: str) -> str:
    """Sanitize the filename to be safe for URLs and the filesystem."""
    # Decode URL encoding if any
    filename = urllib.parse.unquote(filename)
    # Extract only the base filename to prevent path traversal
    filename = Path(filename).name
    path = Path(filename)
    stem = path.stem
    suffix = path.suffix.lower()
    
    # Normalize unicode to ASCII, ignoring non-ASCII characters
    stem = unicodedata.normalize('NFKD', stem).encode('ascii', 'ignore').decode('ascii')
    
    # Replace spaces, hyphens and other delimiters with underscores
    stem = re.sub(r'[\s\-]+', '_', stem)
    # Strip any characters that are not alphanumeric, dot, underscore, or hyphen
    stem = re.sub(r'[^a-zA-Z0-9._-]', '', stem)
    # Collapse multiple underscores
    stem = re.sub(r'_+', '_', stem)
    # Trim leading/trailing underscores, dots, or dashes
    stem = stem.strip('_.-')
    
    if not stem:
        stem = "file"
        
    return f"{stem}{suffix}"

def main():
    songs_dir = get_songs_dir()
    assets_dir = get_assets_dir()
    art_dir = assets_dir / "album-arts"

    print(f"Songs directory: {songs_dir}")
    print(f"Album arts directory: {art_dir}")

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id, title, file_path, album_art FROM songs")
    songs = cursor.fetchall()

    updated_count = 0

    for song in songs:
        song_id = song["id"]
        title = song["title"]
        old_file_path = song["file_path"]
        old_album_art = song["album_art"]

        new_file_path = old_file_path
        new_album_art = old_album_art
        needs_db_update = False

        # 1. Sanitize song audio file
        if old_file_path:
            # Unquote in case there's %20, %22, etc. in the DB path
            unquoted_old_file = urllib.parse.unquote(old_file_path)
            sanitized_file = sanitize_filename(unquoted_old_file)
            
            if old_file_path != sanitized_file:
                # Check on disk
                old_disk_path = songs_dir / old_file_path
                unquoted_disk_path = songs_dir / unquoted_old_file
                new_disk_path = songs_dir / sanitized_file

                # Try renaming
                renamed = False
                for source_path in [old_disk_path, unquoted_disk_path]:
                    if source_path.exists() and source_path != new_disk_path:
                        try:
                            # If target already exists, let's not overwrite unless it's the same file
                            if new_disk_path.exists():
                                print(f"  [Song File] Target already exists: {new_disk_path.name}, removing duplicate old file.")
                                source_path.unlink()
                            else:
                                source_path.rename(new_disk_path)
                                print(f"  [Song File] Renamed on disk: {source_path.name} -> {new_disk_path.name}")
                            renamed = True
                            break
                        except Exception as e:
                            print(f"  [Error] Failed to rename song file {source_path.name} to {new_disk_path.name}: {e}")
                
                new_file_path = sanitized_file
                needs_db_update = True

        # 2. Sanitize cover art file
        if old_album_art:
            # album_art path in DB is typically 'assets/album-arts/filename.jpg'
            # Let's extract the actual filename
            old_art_filename = Path(old_album_art).name
            unquoted_old_art = urllib.parse.unquote(old_art_filename)
            sanitized_art = sanitize_filename(unquoted_old_art)

            if old_art_filename != sanitized_art:
                old_disk_path = art_dir / old_art_filename
                unquoted_disk_path = art_dir / unquoted_old_art
                new_disk_path = art_dir / sanitized_art

                # Try renaming
                for source_path in [old_disk_path, unquoted_disk_path]:
                    if source_path.exists() and source_path != new_disk_path:
                        try:
                            if new_disk_path.exists():
                                print(f"  [Cover Art] Target already exists: {new_disk_path.name}, removing duplicate old art.")
                                source_path.unlink()
                            else:
                                source_path.rename(new_disk_path)
                                print(f"  [Cover Art] Renamed on disk: {source_path.name} -> {new_disk_path.name}")
                            break
                        except Exception as e:
                            print(f"  [Error] Failed to rename cover art {source_path.name} to {new_disk_path.name}: {e}")

                new_album_art = f"assets/album-arts/{sanitized_art}"
                needs_db_update = True

        if needs_db_update:
            try:
                cursor.execute("""
                    UPDATE songs 
                    SET file_path = ?, album_art = ? 
                    WHERE id = ?
                """, (new_file_path, new_album_art, song_id))
                print(f"Updated DB song ID {song_id} ('{title}'):")
                print(f"  File: {old_file_path} -> {new_file_path}")
                print(f"  Art:  {old_album_art} -> {new_album_art}")
                updated_count += 1
            except Exception as e:
                print(f"  [Error] Failed to update DB for song ID {song_id}: {e}")

    conn.commit()
    conn.close()
    print(f"\nMigration finished. Updated {updated_count} rows in database.")

if __name__ == "__main__":
    main()
