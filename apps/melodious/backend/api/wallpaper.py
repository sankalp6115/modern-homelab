from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path

from utils.path_resolver import get_wallpaper_dir

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent.parent.parent
WALLPAPER_DIR = BASE_DIR / "assets" / "wallpaper"

VALID_IMAGE_FORMATS = {".jpg",".png",".jpeg",".webp"}

@router.get("")
def get_wallpaper():
    wallpapers = [item.name for item in WALLPAPER_DIR.iterdir() if item.is_file() and item.suffix.lower() in VALID_IMAGE_FORMATS]
    return wallpapers

@router.get("/{filename}")
def get_wallpaper_by_name(filename):
    return FileResponse(f"{WALLPAPER_DIR}/{filename}")