from fastapi import FastAPI
import uvicorn 
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve()
GOTIFY_DIR = BASE_DIR.parents[2] / "gotify"
sys.path.append(str(GOTIFY_DIR))
from gotify import Gotify

from fastapi import FastAPI
import uvicorn 


TOKEN = "gtfya.EORuBTaKdqC-_LmEdJc4jsVXIff3twRsRytoVnbrnhw"
SERVER_IP = "http://100.64.0.5:8080"

app = FastAPI()
gotify = Gotify(SERVER_IP,TOKEN)

@app.get("/")
def root():
    return {
        "status": "Hey i am good , how are you"
    }

@app.get("/message")
def send(title,message):
    gotify.send(title,message)

if __name__ == "__main__":
    uvicorn.run("main:app",host="0.0.0.0",port=5000,reload=True)
