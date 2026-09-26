from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

from config import FRONTEND_DIR, ICONS_DIR, INDEX_FILE, load_deck_config
from models import ActionPayload
from handlers.apps import handle_app_launch, handle_url_open
from handlers.media import handle_media_cmd, handle_system_volume, handle_app_volume
from handlers.system import handle_brightness, handle_system_action

app = FastAPI(title="macOS Stream Deck Controller")

app.add_middleware(
    CORSMiddleware,
    allow_origins="*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────
# Health & Config Endpoints
# ─────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/config")
def get_config():
    return load_deck_config()


# ─────────────────────────────────────────
# Main Action Dispatcher
# ─────────────────────────────────────────

@app.post("/action")
def execute_action(action: ActionPayload):
    t = action.type.lower()

    if t == "app":
        return handle_app_launch(action.target)
    elif t == "url":
        return handle_url_open(action.url)
    elif t == "media":
        return handle_media_cmd(action.cmd)
    elif t == "volume":
        return handle_system_volume(action.value)
    elif t == "spotify_volume":
        return handle_app_volume(action.value)
    elif t == "brightness":
        return handle_brightness(action.value)
    elif t == "system":
        return handle_system_action(action.target)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action type: {t}")


# ─────────────────────────────────────────
# Legacy Backwards Compatibility Routes
# ─────────────────────────────────────────

@app.post("/play")
def legacy_play():
    return execute_action(ActionPayload(type="media", cmd="play_pause"))

@app.post("/pause")
def legacy_pause():
    return execute_action(ActionPayload(type="media", cmd="play_pause"))

@app.post("/next")
def legacy_next():
    return execute_action(ActionPayload(type="media", cmd="next"))

@app.post("/previous")
def legacy_prev():
    return execute_action(ActionPayload(type="media", cmd="previous"))

@app.post("/volume")
def legacy_vol(body: dict):
    return execute_action(ActionPayload(type="volume", value=body.get("value", 50)))

@app.post("/spotify/volume")
def legacy_spot_vol(body: dict):
    return execute_action(ActionPayload(type="spotify_volume", value=body.get("value", 80)))

@app.post("/brightness")
def legacy_bright(body: dict):
    return execute_action(ActionPayload(type="brightness", value=body.get("value", 50)))

@app.post("/app/{key}")
def legacy_app(key: str):
    return execute_action(ActionPayload(type="app", target=key))


# Static frontend mounting (serves index.html, style.css, app.js, and icons)
app.mount("/icons", StaticFiles(directory=ICONS_DIR), name="icons")
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
