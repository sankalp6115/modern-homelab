from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from utils.path_resolver import get_assets_dir

from api import songs, playlists, artists, lyrics, debug
from database import init_db
import uvicorn

# Initialize database
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
# ---------------- Static Assets ----------------
app.mount("/assets", StaticFiles(directory=get_assets_dir()), name="assets")

# ---------------- Routes ----------------
app.include_router(songs.router, prefix="/api/songs", tags=["Songs"])
app.include_router(playlists.router, prefix="/api/playlists", tags=["Playlists"])
app.include_router(artists.router, prefix="/api/artists", tags=["Artists"])
app.include_router(lyrics.router, prefix="/api/lyrics", tags=["Lyrics"])
app.include_router(debug.router, prefix="/api/debug", tags=["Debug"])

# ---------------- Health ----------------
@app.get("/")
def root():
    return {"status": "ok", "message": "Melodious backend running"}


if __name__ == "__main__":
    uvicorn.run("main:app",port=8000,host="0.0.0.0")