from fastapi import APIRouter, HTTPException
from database import get_connection

router = APIRouter()

@router.get("")
def get_all_lyrics():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT song_id, content FROM lyrics")
    rows = cursor.fetchall()
    conn.close()
    return [{"song_id": r["song_id"], "lyrics": r["content"]} for r in rows]


@router.get("/{song_id}")
def get_lyrics(song_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT song_id, content FROM lyrics WHERE song_id = ?", (song_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Lyrics not found for this song")

    return {"song_id": row["song_id"], "lyrics": row["content"]}