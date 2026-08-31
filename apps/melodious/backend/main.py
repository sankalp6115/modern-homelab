from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from utils.path_resolver import get_assets_dir

from api import songs, playlists, artists, lyrics, debug, wallpaper
from database import init_db
import uvicorn
from pathlib import Path

FRONTEND_DIRECTORY = Path(__file__).resolve().parent.parent / "frontend" / "dist"

init_db()
app = FastAPI(title="Melodious Backend")

# ---------------- CORS ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_cors_header(request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response
# ---------------- Routes ----------------
app.include_router(songs.router, prefix="/api/songs", tags=["Songs"])
app.include_router(playlists.router, prefix="/api/playlists", tags=["Playlists"])
app.include_router(artists.router, prefix="/api/artists", tags=["Artists"])
app.include_router(lyrics.router, prefix="/api/lyrics", tags=["Lyrics"])
app.include_router(debug.router, prefix="/api/debug", tags=["Debug"])
app.include_router(wallpaper.router, prefix="/api/wallpaper", tags=["Wallpapers"])

# ---------------- Health ----------------
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    path = FRONTEND_DIRECTORY / full_path
    if path.is_file():
        return FileResponse(path)
        
    if full_path.startswith("assets/"):
        asset_path = get_assets_dir() / full_path[len("assets/"):]
        if asset_path.is_file():
            return FileResponse(asset_path)
            
    index_file = FRONTEND_DIRECTORY / "index.html"
    if index_file.is_file():
        return FileResponse(index_file)
    return {"status": "ok", "message": "Melodious backend running (Frontend not built)"}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Melodious Backend")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind the server to")
    args = parser.parse_args()
    uvicorn.run("main:app", port=args.port, host="0.0.0.0")