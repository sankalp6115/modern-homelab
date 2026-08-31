from pathlib import Path
from fastapi import APIRouter, Request
import json ,random

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent

with open(BASE_DIR / "quotes.json", "r") as file:
    quotes_list = json.load(file)

@router.get("/quote")
def get_quote():
    q = random.choice(quotes_list)
    return {
        "quote": q["quote"],
        "author": q["author"]
    }

@router.get("/health")
async def health():
    return {"status": "ok"}