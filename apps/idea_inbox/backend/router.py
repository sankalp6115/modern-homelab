import os
from pathlib import Path
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR.parent / "data"
DATA_FILE = DATA_DIR / "data.txt"

DATA_DIR.mkdir(parents=True, exist_ok=True)

class TextPayload(BaseModel):
    text: str

@router.get("/text")
async def read_text():
    try:
        if DATA_FILE.exists():
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                content = f.read()
            return {"text": content}
        return {"text": ""}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/text")
async def write_text(payload: TextPayload):
    try:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            f.write(payload.text)
        return {"message": "Saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def health():
    return {"status": "ok"}