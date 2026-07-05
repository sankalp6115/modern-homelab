from fastapi import APIRouter, HTTPException, UploadFile, File
import os
import shutil
from pathlib import Path
from database import get_connection
from utils.path_resolver import get_assets_dir

router = APIRouter()

@router.get("/")
def get_artists():
    """List all artists in the system."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, image FROM artists ORDER BY name")
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r["id"], "name": r["name"], "image": r["image"]} for r in rows]

@router.get("/{artist_id}")
def get_artist_by_id(artist_id: int):
    """Get artist details and their catalog of songs."""
    conn = get_connection()
    cursor = conn.cursor()

    # Get artist basic info
    cursor.execute("SELECT id, name, image FROM artists WHERE id = ?", (artist_id,))
    artist = cursor.fetchone()

    if not artist:
        conn.close()
        raise HTTPException(status_code=404, detail="Artist not found")

    # Get songs for this artist
    cursor.execute("""
    SELECT 
        s.id, s.title, s.album, s.genre, s.year,
        s.duration, s.file_path, s.album_art, s.rating,
        GROUP_CONCAT(a2.name, '|||') AS artist_list
    FROM song_artists sa
    JOIN songs s          ON sa.song_id = s.id
    LEFT JOIN song_artists sa2 ON s.id = sa2.song_id
    LEFT JOIN artists a2       ON sa2.artist_id = a2.id
    WHERE sa.artist_id = ?
    GROUP BY s.id
    ORDER BY s.title
    """, (artist_id,))
    
    songs = cursor.fetchall()
    conn.close()

    return {
        "id": artist["id"],
        "name": artist["name"],
        "image": artist["image"],
        "songs": [
            {
                "id": s["id"],
                "title": s["title"],
                "album": s["album"],
                "genre": s["genre"],
                "year": s["year"],
                "duration": s["duration"],
                "file": s["file_path"],
                "albumArt": s["album_art"],
                "rating": s["rating"],
                "artists": s["artist_list"].split("|||") if s["artist_list"] else []
            }
            for s in songs
        ]
    }

@router.get("/name/{artist_name}")
def get_artist_by_name(artist_name: str):
    """Get artist details and their catalog by artist name (useful for URL slugs)."""
    conn = get_connection()
    cursor = conn.cursor()

    # Get artist basic info
    cursor.execute("SELECT id FROM artists WHERE LOWER(name) = LOWER(?)", (artist_name,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Artist not found")

    conn.close()
    return get_artist_by_id(row["id"])

@router.post("/{artist_id}/image")
async def upload_artist_image(artist_id: int, file: UploadFile = File(...)):
    """Upload a new image for an artist and update the database."""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Check if artist exists
    cursor.execute("SELECT name FROM artists WHERE id = ?", (artist_id,))
    artist = cursor.fetchone()
    if not artist:
        conn.close()
        raise HTTPException(status_code=404, detail="Artist not found")
        
    artist_name = artist["name"]
    
    # Setup paths
    assets_dir = get_assets_dir()
    artist_images_dir = assets_dir / "artist-images"
    artist_images_dir.mkdir(parents=True, exist_ok=True)
    
    # Keep the original file extension
    ext = Path(file.filename).suffix.lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid image format. Only JPG, PNG, and WEBP are supported.")
        
    # Save the file with a clean name (lowercase artist name)
    # Using lowercase name to match library_sync logic and avoid duplicates
    img_filename = f"{artist_name.lower().replace(' ', '_')}{ext}"
    img_path = artist_images_dir / img_filename
    
    try:
        with open(img_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Failed to save image: {e}")
        
    # Update database
    image_db_path = f"/artist-images/{img_filename}"
    cursor.execute("UPDATE artists SET image = ? WHERE id = ?", (image_db_path, artist_id))
    
    # Update artists.json so it doesn't get overwritten on sync
    import json
    data_dir = get_assets_dir().parent / "data"
    artists_json_path = data_dir / "artists.json"
    
    if artists_json_path.exists():
        try:
            with open(artists_json_path, "r", encoding="utf-8") as f:
                artists_data = json.load(f)
                
            for a in artists_data:
                if a["name"] == artist_name:
                    a["image"] = image_db_path
                    break
                    
            with open(artists_json_path, "w", encoding="utf-8") as f:
                json.dump(artists_data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Warning: Failed to update artists.json: {e}")
            
    conn.commit()
    conn.close()
    
    return {"message": "Artist image updated successfully", "image": image_db_path}
