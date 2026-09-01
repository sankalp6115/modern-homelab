import os
from fastapi import FastAPI
import uvicorn
from gotify import Gotify
from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv())

GOTIFY_TOKEN = os.getenv("GOTIFY_TOKEN")
GOTIFY_SERVER = os.getenv("GOTIFY_SERVER")

gotify = Gotify(GOTIFY_SERVER, GOTIFY_TOKEN)
app = FastAPI()

@app.get("/")
def root():
    return {
        "status": "Hi i am healthy, and i send notifications"
    }

@app.post("/")
def send(title:str,body:str):
    gotify.send(title,body)
    return {
        "status": f"I have sent a notification with title: {title} and body: {body}"
    }

if __name__ == "__main__":
    gotify.send("App up", "Notifiya upped on port 3010")
    uvicorn.run("main:app", host="0.0.0.0", port=3010)