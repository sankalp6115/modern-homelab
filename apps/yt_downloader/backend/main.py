import os
import argparse
import uvicorn
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

try:
    from gotify import Gotify
    GOTIFY_TOKEN = os.getenv("GOTIFY_TOKEN")
    GOTIFY_SERVER = os.getenv("GOTIFY_SERVER")
    gotify = Gotify(GOTIFY_SERVER, GOTIFY_TOKEN) if (GOTIFY_SERVER and GOTIFY_TOKEN) else None
except Exception:
    gotify = None

from router import router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],   
    allow_headers=["*"],   
)

app.include_router(router)

FRONTEND_FOLDER = Path(__file__).parent.parent / "frontend" / "dist"

app.mount("/assets", StaticFiles(directory=FRONTEND_FOLDER / "assets"), name="assets")

@app.get("/favicon.png")
async def favicon():
    return FileResponse(FRONTEND_FOLDER / "favicon.png")

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    return FileResponse(FRONTEND_FOLDER / "index.html")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Backend Server")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind the server to")
    args = parser.parse_args()

    if gotify:
        try:
            gotify.info("YT Downloader Up", f"YT Downloader started on port {args.port}")
        except Exception:
            pass

    uvicorn.run("main:app", port=args.port, host="0.0.0.0")
