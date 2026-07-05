import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "songs.db"

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # -------- SONGS --------
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS songs (
        id        INTEGER PRIMARY KEY,
        title     TEXT NOT NULL,
        album     TEXT,
        genre     TEXT,
        year      INTEGER,
        duration  INTEGER,
        file_path TEXT,
        album_art TEXT,
        rating    INTEGER DEFAULT 0,
        is_favorite INTEGER DEFAULT 0
    )
    """)

    # Migration: add column is_favorite to existing databases
    try:
        cursor.execute("ALTER TABLE songs ADD COLUMN is_favorite INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass  # Already exists

    # -------- ARTISTS --------
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS artists (
        id    INTEGER PRIMARY KEY AUTOINCREMENT,
        name  TEXT UNIQUE NOT NULL,
        image TEXT
    )
    """)

    # -------- SONG ↔ ARTISTS (many-to-many) --------
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS song_artists (
        song_id   INTEGER,
        artist_id INTEGER,
        PRIMARY KEY (song_id, artist_id),
        FOREIGN KEY (song_id)   REFERENCES songs(id)   ON DELETE CASCADE,
        FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE
    )
    """)

    # -------- PLAYLISTS --------
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS playlists (
        id     INTEGER PRIMARY KEY AUTOINCREMENT,
        name   TEXT NOT NULL,
        poster TEXT
    )
    """)

    # -------- PLAYLIST ↔ SONGS --------
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS playlist_songs (
        playlist_id INTEGER,
        song_id     INTEGER,
        position    INTEGER,
        PRIMARY KEY (playlist_id, song_id),
        FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
        FOREIGN KEY (song_id)     REFERENCES songs(id)     ON DELETE CASCADE
    )
    """)

    # -------- LYRICS --------
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS lyrics (
        song_id INTEGER PRIMARY KEY,
        content TEXT,
        FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
    )
    """)

    conn.commit()
    conn.close()