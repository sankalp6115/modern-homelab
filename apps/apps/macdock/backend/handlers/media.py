from fastapi import HTTPException
from config import ALLOWED_MEDIA_CMDS, MEDIA_APPS
from utils.applescript import run_script, key_code

def active_media_app() -> str | None:
    for name in MEDIA_APPS:
        if run_script(f'application "{name}" is running') == "true":
            return name
    return None

def handle_media_cmd(cmd_raw: str | None) -> dict:
    if not cmd_raw or cmd_raw.lower() not in ALLOWED_MEDIA_CMDS:
        raise HTTPException(status_code=400, detail=f"Invalid media command: {cmd_raw}")
    cmd = cmd_raw.lower()
    app_name = active_media_app()

    if cmd in ("play", "pause", "play_pause"):
        if app_name == "Spotify":
            run_script('tell application "Spotify" to playpause')
        elif app_name == "Music":
            run_script('tell application "Music" to playpause')
        else:
            key_code(100)  # F8 Play/Pause
    elif cmd == "next":
        if app_name in ("Spotify", "Music"):
            run_script(f'tell application "{app_name}" to next track')
        else:
            key_code(101)  # F9 Next
    elif cmd == "previous":
        if app_name in ("Spotify", "Music"):
            run_script(f'tell application "{app_name}" to previous track')
        else:
            key_code(98)   # F7 Prev
    elif cmd == "shuffle":
        if app_name == "Spotify":
            run_script('tell application "Spotify" to set shuffling to not shuffling')
        elif app_name == "Music":
            run_script('tell application "Music" to set shuffle enabled to not (shuffle enabled)')
    elif cmd == "repeat":
        if app_name == "Spotify":
            run_script('tell application "Spotify" to set repeating to not repeating')

    return {"status": "ok", "action": "media", "cmd": cmd}

def handle_system_volume(val: int | None) -> dict:
    if val is None:
        raise HTTPException(status_code=400, detail="Missing volume value")
    vol = max(0, min(100, val))
    run_script(f"set volume output volume {vol}")
    return {"status": "ok", "volume": vol}

def handle_app_volume(val: int | None) -> dict:
    if val is None:
        raise HTTPException(status_code=400, detail="Missing app volume value")
    vol = max(0, min(100, val))
    app_name = active_media_app()
    if app_name == "Spotify":
        run_script(f'tell application "Spotify" to set sound volume to {vol}')
    elif app_name == "Music":
        run_script(f'tell application "Music" to set sound volume to {vol}')
    return {"status": "ok", "spotify_volume": vol}
