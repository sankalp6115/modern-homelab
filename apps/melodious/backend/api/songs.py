from fastapi import Request, APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
import os
import shutil
import re
import unicodedata
import urllib.parse
import random
from pathlib import Path

from database import get_connection
from utils.path_resolver import get_songs_dir, get_assets_dir

router = APIRouter()

SONGS_DIR = get_songs_dir()


# ---------- HELPER ----------
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


def row_to_song(row, artists: list[str]) -> dict:
    """Convert a DB row + artists list into the standard song response dict."""
    return {
        "id":       row["id"],
        "title":    row["title"],
        "album":    row["album"],
        "genre":    row["genre"],
        "year":     row["year"],
        "duration": row["duration"],
        "file":     row["file_path"],
        "albumArt": row["album_art"],
        "rating":   row["rating"],
        "isFavorite": bool(row["is_favorite"]) if "is_favorite" in row.keys() else False,
        "artists":  artists,
    }


def fetch_songs_with_artists(cursor, where_clause: str = "", params: tuple = ()) -> list[dict]:
    """
    Run a SELECT over songs + their artists via the join table.
    `where_clause` is appended after the GROUP BY if non-empty.
    """
    sql = f"""
    SELECT
        s.id, s.title, s.album, s.genre, s.year,
        s.duration, s.file_path, s.album_art, s.rating, s.is_favorite,
        GROUP_CONCAT(a.name, '|||') AS artist_list
    FROM songs s
    LEFT JOIN song_artists sa ON s.id = sa.song_id
    LEFT JOIN artists a       ON sa.artist_id = a.id
    {where_clause}
    GROUP BY s.id
    ORDER BY s.title
    """
    cursor.execute(sql, params)
    rows = cursor.fetchall()
    result = []
    for r in rows:
        artists = r["artist_list"].split("|||") if r["artist_list"] else []
        result.append(row_to_song(r, artists))
    return result


# ---------- ROUTES ----------

@router.get("")
def get_all_songs():
    conn = get_connection()
    cursor = conn.cursor()
    songs = fetch_songs_with_artists(cursor)
    conn.close()
    return songs


@router.get("/search/")
def search_songs(q: str):
    """Search by title, album, or artist name (case-insensitive)."""
    conn = get_connection()
    cursor = conn.cursor()

    q_like = f"%{q.lower()}%"

    # Use a subquery to find matching song IDs first, then pull full data
    cursor.execute("""
    SELECT DISTINCT s.id
    FROM songs s
    LEFT JOIN song_artists sa ON s.id = sa.song_id
    LEFT JOIN artists a       ON sa.artist_id = a.id
    WHERE LOWER(s.title) LIKE ?
       OR LOWER(s.album) LIKE ?
       OR LOWER(a.name)  LIKE ?
    """, (q_like, q_like, q_like))

    matching_ids = [row["id"] for row in cursor.fetchall()]

    if not matching_ids:
        conn.close()
        return []

    placeholders = ",".join("?" * len(matching_ids))
    songs = fetch_songs_with_artists(
        cursor,
        where_clause=f"WHERE s.id IN ({placeholders})",
        params=tuple(matching_ids),
    )
    conn.close()
    return songs


@router.get("/stream/{filename:path}")
def stream_song(filename: str, request: Request):
    """Stream an MP3 file with HTTP range support."""
    file_path = SONGS_DIR / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {filename}")

    file_size = os.path.getsize(file_path)
    range_header = request.headers.get("range")

    start = 0
    end = file_size - 1

    if range_header:
        bytes_range = range_header.replace("bytes=", "").split("-")
        start = int(bytes_range[0])
        if bytes_range[1]:
            end = int(bytes_range[1])

    chunk_size = end - start + 1

    def iter_file():
        with open(file_path, "rb") as f:
            f.seek(start)
            remaining = chunk_size
            while remaining > 0:
                chunk = f.read(min(1024 * 1024, remaining))
                if not chunk:
                    break
                remaining -= len(chunk)
                yield chunk

    import mimetypes
    content_type, _ = mimetypes.guess_type(file_path)
    if not content_type:
        content_type = "audio/mpeg"

    headers = {
        "Content-Range":  f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges":  "bytes",
        "Content-Length": str(chunk_size),
        "Content-Type":   content_type,
    }

    return StreamingResponse(iter_file(), status_code=206, headers=headers)


@router.get("/{song_id}")
def get_song(song_id: int):
    conn = get_connection()
    cursor = conn.cursor()

    songs = fetch_songs_with_artists(
        cursor,
        where_clause="WHERE s.id = ?",
        params=(song_id,),
    )
    conn.close()

    if not songs:
        raise HTTPException(status_code=404, detail="Song not found")

    return songs[0]


@router.post("/upload")
async def upload_song(
    file: UploadFile = File(...),
    art: UploadFile = File(None),
    title: str = Form(...),
    artists: str = Form(...),
    album: str = Form(""),
    genre: str = Form(""),
    year: int = Form(None),
    duration: int = Form(0)
):
    songs_dir = get_songs_dir()
    songs_dir.mkdir(parents=True, exist_ok=True)
    
    # Save the audio file
    original_filename = Path(file.filename).name
    clean_filename = sanitize_filename(original_filename)
    target_song_path = songs_dir / clean_filename
    
    counter = 1
    while target_song_path.exists():
        stem = Path(clean_filename).stem
        suffix = Path(clean_filename).suffix
        target_song_path = songs_dir / f"{stem}_{counter}{suffix}"
        counter += 1
        
    try:
        with open(target_song_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save audio file: {str(e)}")
        
    song_filename = target_song_path.name
    
    # Save cover art if provided
    album_art_path_db = None
    target_art_path = None
    
    if art:
        assets_dir = get_assets_dir()
        art_dir = assets_dir / "album-arts"
        art_dir.mkdir(parents=True, exist_ok=True)
        
        original_art_name = Path(art.filename).name
        clean_art_name = sanitize_filename(original_art_name)
        target_art_path = art_dir / clean_art_name
        
        counter = 1
        while target_art_path.exists():
            stem = Path(clean_art_name).stem
            suffix = Path(clean_art_name).suffix
            target_art_path = art_dir / f"{stem}_{counter}{suffix}"
            counter += 1
            
        try:
            with open(target_art_path, "wb") as buffer:
                shutil.copyfileobj(art.file, buffer)
            album_art_path_db = f"assets/album-arts/{target_art_path.name}"
        except Exception as e:
            # Clean up the audio file if art saving fails
            if target_song_path.exists():
                target_song_path.unlink()
            raise HTTPException(status_code=500, detail=f"Failed to save cover art: {str(e)}")
    else:
        # Pick a random image from the album-arts/fallback directory
        assets_dir = get_assets_dir()
        fallback_dir = assets_dir / "album-arts" / "fallback"
        if fallback_dir.exists() and fallback_dir.is_dir():
            files = [f for f in os.listdir(fallback_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]
            if files:
                random_file = random.choice(files)
                album_art_path_db = f"assets/album-arts/fallback/{random_file}"
            else:
                album_art_path_db = "assets/album-arts/fallback/song-icon4.png"
        else:
            album_art_path_db = "assets/album-arts/fallback/song-icon4.png"
            
    # Insert metadata into SQLite database
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
        INSERT INTO songs (title, album, genre, year, duration, file_path, album_art, rating)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
        """, (
            title,
            album if album else None,
            genre if genre else None,
            year if year is not None else None,
            duration,
            song_filename,
            album_art_path_db
        ))
        song_id = cursor.lastrowid
        
        # Link song to artists
        artist_names = [a.strip() for a in re.split(r'[,/;|]', artists) if a.strip()]
        for name in artist_names:
            # Check if artist has a profile image in assets/artist-images/
            artist_image_db = None
            assets_dir = get_assets_dir()
            artist_images_dir = assets_dir / "artist-images"
            if artist_images_dir.exists():
                for ext in [".jpg", ".jpeg", ".png", ".webp"]:
                    img_filename = f"{name.lower()}{ext}"
                    if (artist_images_dir / img_filename).exists():
                        artist_image_db = f"/artist-images/{img_filename}"
                        break

            cursor.execute("SELECT id, image FROM artists WHERE LOWER(name) = LOWER(?)", (name,))
            artist_row = cursor.fetchone()
            if artist_row:
                artist_id = artist_row["id"]
                # Update existing artist image if it is currently NULL/empty and we found a valid image
                if (not artist_row["image"] or not artist_row["image"].strip()) and artist_image_db:
                    cursor.execute("UPDATE artists SET image = ? WHERE id = ?", (artist_image_db, artist_id))
            else:
                cursor.execute("INSERT INTO artists (name, image) VALUES (?, ?)", (name, artist_image_db))
                artist_id = cursor.lastrowid
                
            cursor.execute("""
            INSERT OR IGNORE INTO song_artists (song_id, artist_id)
            VALUES (?, ?)
            """, (song_id, artist_id))
            
        conn.commit()
    except Exception as db_err:
        conn.rollback()
        # Clean up files if DB insertion fails
        if target_song_path.exists():
            target_song_path.unlink()
        if target_art_path and target_art_path.exists():
            target_art_path.unlink()
        raise HTTPException(status_code=500, detail=f"Database insertion failed: {str(db_err)}")
    finally:
        conn.close()
        
    return {
        "status": "success",
        "song_id": song_id,
        "file_path": song_filename,
        "album_art": album_art_path_db
    }


@router.post("/{song_id}/favorite")
def toggle_favorite(song_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT is_favorite FROM songs WHERE id = ?", (song_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Song not found")
    new_fav = 1 if not row["is_favorite"] else 0
    cursor.execute("UPDATE songs SET is_favorite = ? WHERE id = ?", (new_fav, song_id))
    conn.commit()
    conn.close()
    return {"status": "success", "isFavorite": bool(new_fav)}


@router.delete("/{song_id}")
def delete_song(song_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    
    # Get file_path and album_art so we can delete them from disk
    cursor.execute("SELECT file_path, album_art FROM songs WHERE id = ?", (song_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Song not found")
        
    file_path = row["file_path"]
    album_art = row["album_art"]
    
    # Delete from database
    cursor.execute("PRAGMA foreign_keys = ON")
    cursor.execute("DELETE FROM songs WHERE id = ?", (song_id,))
    conn.commit()
    conn.close()
    
    # Delete audio file from disk
    if file_path:
        audio_file = get_songs_dir() / file_path
        if audio_file.exists() and audio_file.is_file():
            try:
                audio_file.unlink()
            except Exception as e:
                print(f"Error deleting audio file: {e}")
                
    # Delete album art from disk if it's not a shared/default art
    if album_art and "assets/album-arts/" in album_art:
        art_filename = album_art.split("assets/album-arts/")[-1]
        # Avoid deleting default.jpg or empty
        if art_filename and art_filename != "default.jpg" and art_filename != "song-icon5.png":
            art_file = get_assets_dir() / "album-arts" / art_filename
            if art_file.exists() and art_file.is_file():
                try:
                    art_file.unlink()
                except Exception as e:
                    print(f"Error deleting album art: {e}")
                    
    return {"status": "success", "message": "Song deleted from library"}