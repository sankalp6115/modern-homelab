import uvicorn
from fastapi import FastAPI
from router import router
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

FRONTEND_FOLDER = Path(__file__).parent.parent / "frontend" / "dist"

app.mount("/assets", StaticFiles(directory=FRONTEND_FOLDER / "assets"), name="assets")

@app.get("/favicon.png")
async def favicon():
    return FileResponse(FRONTEND_FOLDER / "favicon.png")

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    return FileResponse(FRONTEND_FOLDER / "index.html")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Backend Server")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind the server to")
    args = parser.parse_args()
    uvicorn.run("main:app", port=args.port, host="0.0.0.0")