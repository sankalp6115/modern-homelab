import os
import random
import shutil
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from database import get_connection
from utils.path_resolver import get_assets_dir
from .songs import sanitize_filename

router = APIRouter()


@router.get("")
def get_playlists():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, poster FROM playlists ORDER BY name")
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r["id"], "name": r["name"], "poster": r["poster"]} for r in rows]


@router.get("/{playlist_id}")
def get_playlist(playlist_id: int):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id, name, poster FROM playlists WHERE id = ?", (playlist_id,))
    playlist = cursor.fetchone()

    if not playlist:
        conn.close()
        raise HTTPException(status_code=404, detail="Playlist not found")

    cursor.execute("""
    SELECT
        s.id, s.title, s.album, s.genre, s.year,
        s.duration, s.file_path, s.album_art, s.rating,
        GROUP_CONCAT(a.name, '|||') AS artist_list
    FROM playlist_songs ps
    JOIN songs s          ON ps.song_id = s.id
    LEFT JOIN song_artists sa ON s.id = sa.song_id
    LEFT JOIN artists a       ON sa.artist_id = a.id
    WHERE ps.playlist_id = ?
    GROUP BY s.id
    ORDER BY ps.position
    """, (playlist_id,))

    songs = cursor.fetchall()
    conn.close()

    return {
        "id":     playlist["id"],
        "name":   playlist["name"],
        "poster": playlist["poster"],
        "songs": [
            {
                "id":       s["id"],
                "title":    s["title"],
                "album":    s["album"],
                "genre":    s["genre"],
                "year":     s["year"],
                "duration": s["duration"],
                "file":     s["file_path"],
                "albumArt": s["album_art"],
                "rating":   s["rating"],
                "artists":  s["artist_list"].split("|||") if s["artist_list"] else [],
            }
            for s in songs
        ],
    }


@router.post("/")
async def create_playlist(
    name: str = Form(...),
    poster: UploadFile = File(None)
):
    assets_dir = get_assets_dir()
    poster_dir = assets_dir / "playlist-posters"
    poster_dir.mkdir(parents=True, exist_ok=True)
    
    if poster and poster.filename:
        original_filename = Path(poster.filename).name
        clean_filename = sanitize_filename(original_filename)
        target_path = poster_dir / clean_filename
        
        counter = 1
        while target_path.exists():
            stem = Path(clean_filename).stem
            suffix = Path(clean_filename).suffix
            target_path = poster_dir / f"{stem}_{counter}{suffix}"
            counter += 1
            
        try:
            with open(target_path, "wb") as buffer:
                shutil.copyfileobj(poster.file, buffer)
            poster_path_db = f"playlist-posters/{target_path.name}"
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save poster: {str(e)}")
    else:
        # Pick a random image from the playlist-posters/fallback directory
        fallback_dir = poster_dir / "fallback"
        if fallback_dir.exists() and fallback_dir.is_dir():
            files = [f for f in os.listdir(fallback_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]
            if files:
                random_file = random.choice(files)
                poster_path_db = f"playlist-posters/fallback/{random_file}"
            else:
                poster_path_db = "playlist-posters/fallback/playlist-poster1.jpg"
        else:
            poster_path_db = "playlist-posters/fallback/playlist-poster1.jpg"
            
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO playlists (name, poster) VALUES (?, ?)", (name, poster_path_db))
        playlist_id = cursor.lastrowid
        conn.commit()
    except Exception as db_err:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database insertion failed: {str(db_err)}")
    finally:
        conn.close()
        
    return {
        "status": "success",
        "id": playlist_id,
        "name": name,
        "poster": poster_path_db
    }


@router.delete("/{playlist_id}")
def delete_playlist(playlist_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    
    # Check if playlist exists
    cursor.execute("SELECT id, name, poster FROM playlists WHERE id = ?", (playlist_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Playlist not found")
        
    poster = row["poster"]
    
    # Check if default poster
    is_default = False
    if poster:
        filename = Path(poster).name
        if filename.startswith("playlist-poster") or filename == "images.jpeg" or filename == "default.jpg":
            is_default = True
            
    # Delete from database
    cursor.execute("PRAGMA foreign_keys = ON")
    cursor.execute("DELETE FROM playlists WHERE id = ?", (playlist_id,))
    conn.commit()
    conn.close()
    
    if poster and not is_default:
        poster_file = get_assets_dir() / poster
        if poster_file.exists() and poster_file.is_file():
            try:
                poster_file.unlink()
            except Exception as e:
                print(f"Error deleting playlist poster: {e}")
                
    return {"status": "success", "message": "Playlist deleted successfully"}


@router.post("/{playlist_id}/songs")
def add_song_to_playlist(playlist_id: int, song_id: int = Form(...)):
    conn = get_connection()
    cursor = conn.cursor()
    
    # Check if playlist exists
    cursor.execute("SELECT id FROM playlists WHERE id = ?", (playlist_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Playlist not found")
        
    # Check if song exists
    cursor.execute("SELECT id FROM songs WHERE id = ?", (song_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Song not found")
        
    # Check if song is already in playlist
    cursor.execute("SELECT 1 FROM playlist_songs WHERE playlist_id = ? AND song_id = ?", (playlist_id, song_id))
    if cursor.fetchone():
        conn.close()
        return {"status": "already_exists", "message": "Song already in playlist"}
        
    # Get max position to append
    cursor.execute("SELECT IFNULL(MAX(position), -1) AS max_pos FROM playlist_songs WHERE playlist_id = ?", (playlist_id,))
    row = cursor.fetchone()
    next_pos = row["max_pos"] + 1
    
    cursor.execute("INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)", (playlist_id, song_id, next_pos))
    conn.commit()
    conn.close()
    
    return {"status": "success", "message": "Song added to playlist"}


@router.delete("/{playlist_id}/songs/{song_id}")
def remove_song_from_playlist(playlist_id: int, song_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?", (playlist_id, song_id))
    conn.commit()
    conn.close()
    
    return {"status": "success", "message": "Song removed from playlist"}