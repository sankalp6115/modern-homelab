from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles
import asyncio
import uvicorn
import json

app = FastAPI()


connected_players = []

async def broadcast_player_count():
    data = json.dumps({
        "type": "stats",
        "players": len(connected_players)
    })

    for player in connected_players:
        await player.send_text(data)

@app.websocket("/ws/player")
async def player_ws(websocket: WebSocket):
    await websocket.accept()
    connected_players.append(websocket)
    await broadcast_player_count()
    
    try: 
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except json.JSONDecodeError:
                pass 
    except Exception:
        if websocket in connected_players:
            connected_players.remove(websocket)
        await broadcast_player_count()


@app.websocket("/ws/controller")
async def controller_ws(websocket: WebSocket):
    await websocket.accept()
    async for message in websocket.iter_text():
        try:
            data = json.loads(message)
        except json.JSONDecodeError:
            data = {
                "type": "switch_video",
                "video": message,
            }

        for player in connected_players:
            try:
                await player.send_text(json.dumps(data))
            except Exception:
                pass

import os

@app.get("/api/assets")
def get_assets():
    assets = {
        "video": [],
        "image": [],
        "audio": [],
        "overlay": []
    }
    
    exts = {
        "video": {".mp4", ".webm", ".ogg", ".mov"},
        "image": {".png", ".jpg", ".jpeg", ".webp", ".gif"},
        "audio": {".mp3", ".wav", ".ogg", ".m4a", ".aac"},
        "overlay": {".gif", ".png", ".webm"}
    }
    
    for category in assets.keys():
        dir_path = os.path.join("static","assets",category)
        if not os.path.exists(dir_path):
            continue
            
        for file in os.listdir(dir_path):
            ext = os.path.splitext(file)[1].lower()
            if ext in exts[category]:
                if category in ["video", "image"]:
                    assets[category].append(file)
                else:
                    name = os.path.splitext(file)[0].replace("-", " ").replace("_", " ").title()
                    assets[category].append({
                        "name": name,
                        "file": file
                    })
                    
    # Sort for consistent UI rendering
    assets["video"].sort()
    assets["image"].sort()
    assets["audio"].sort(key=lambda x: x["name"])
    assets["overlay"].sort(key=lambda x: x["name"])
    
    return assets

from pathlib import Path
FRONTEND_DIR = Path(__file__).parent.parent / "frontend"
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Backend Server")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind the server to")
    args = parser.parse_args()
    uvicorn.run("main:app", port=args.port, host="0.0.0.0")