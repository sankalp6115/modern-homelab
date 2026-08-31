from fastapi import APIRouter
from database import get_connection

router = APIRouter()

# ---------- GENERIC TABLE VIEW ----------
def fetch_all(table):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM {table}")
    rows = cursor.fetchall()
    conn.close()
    return rows


# ---------- SONGS ----------
@router.get("/songs")
def debug_songs():
    rows = fetch_all("songs")
    return {"count": len(rows), "data": rows}


# ---------- ARTISTS ----------
@router.get("/artists")
def debug_artists():
    rows = fetch_all("artists")
    return {"count": len(rows), "data": rows}


# ---------- SONG_ARTISTS ----------
@router.get("/song-artists")
def debug_song_artists():
    rows = fetch_all("song_artists")
    return {"count": len(rows), "data": rows}


# ---------- PLAYLISTS ----------
@router.get("/playlists")
def debug_playlists():
    rows = fetch_all("playlists")
    return {"count": len(rows), "data": rows}


# ---------- PLAYLIST_SONGS ----------
@router.get("/playlist-songs")
def debug_playlist_songs():
    rows = fetch_all("playlist_songs")
    return {"count": len(rows), "data": rows}


# ---------- LYRICS ----------
@router.get("/lyrics")
def debug_lyrics():
    rows = fetch_all("lyrics")
    return {"count": len(rows), "data": rows}