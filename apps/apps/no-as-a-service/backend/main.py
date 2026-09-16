import os
import argparse
import random
import json
import uvicorn
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

try:
    from gotify import Gotify
    GOTIFY_TOKEN = os.getenv("GOTIFY_TOKEN")
    GOTIFY_SERVER = os.getenv("GOTIFY_SERVER")
    gotify = Gotify(GOTIFY_SERVER, GOTIFY_TOKEN) if (GOTIFY_SERVER and GOTIFY_TOKEN) else None
except Exception:
    gotify = None

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_headers=["*"],
    allow_methods=["*"],
    allow_credentials=True
)

EXCUSES_FILE = Path(__file__).parent / "reasons.json"
excuses = []

if EXCUSES_FILE.exists():
    with open(EXCUSES_FILE, "r") as f:
        excuses = json.load(f)

@app.get("/no")
def root():
    choice = random.choice(excuses) if excuses else "No"
    return {
        "reason": choice
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Backend Server")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind the server to")
    args = parser.parse_args()

    if gotify:
        try:
            gotify.info("No-as-a-Service Up", f"No-as-a-Service started on port {args.port}")
        except Exception:
            pass

    uvicorn.run("main:app", port=args.port, host="0.0.0.0")