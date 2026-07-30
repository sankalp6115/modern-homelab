from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import random
import json
from pathlib import Path
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_headers=["*"],
    allow_methods=["*"],
    allow_credentials=True
)

EXCUSES_FILE = Path(__file__).parent / "reasons.json"

if EXCUSES_FILE:
    with open(EXCUSES_FILE,"r") as f:
        excuses = json.load(f)

print(excuses)

@app.get("/no")
def root():
    choice = random.choice(excuses)
    return {
        "reason" : choice
    }


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Backend Server")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind the server to")
    args = parser.parse_args()
    uvicorn.run("main:app", port=args.port, host="0.0.0.0")