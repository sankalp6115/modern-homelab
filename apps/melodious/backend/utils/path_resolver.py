from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

def get_data_dir():
    return BASE_DIR / "data"

def get_assets_dir():
    return BASE_DIR / "assets"

def get_songs_dir():
    return BASE_DIR / "songs"