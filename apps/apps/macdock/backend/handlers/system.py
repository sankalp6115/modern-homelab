import os
import subprocess
import time
from fastapi import HTTPException
from config import ALLOWED_SYSTEM_TARGETS
from utils.applescript import run_script, key_code

_brightness_level: int = 50

def handle_brightness(val: int | None) -> dict:
    global _brightness_level
    if val is None:
        raise HTTPException(status_code=400, detail="Missing brightness value")
    target = max(0, min(100, val))
    delta = target - _brightness_level
    presses = max(1, round(abs(delta) / 6.25))
    code = 144 if delta > 0 else 145
    for _ in range(presses):
        key_code(code)
        time.sleep(0.03)
    _brightness_level = target
    return {"status": "ok", "brightness": target}

def handle_system_action(target_raw: str | None) -> dict:
    if not target_raw or target_raw.lower() not in ALLOWED_SYSTEM_TARGETS:
        raise HTTPException(status_code=400, detail=f"Unauthorized system action: {target_raw}")
    target = target_raw.lower()
    if target == "nightshift":
        run_script('tell application "System Preferences" to reveal anchor "displaysNightShiftTab" of pane "com.apple.preference.displays"')
    elif target == "dnd":
        run_script('tell application "System Events" to tell process "Control Center" to click menu bar item "Focus" of menu bar 1')
    elif target == "screenshot":
        shot_dir = os.path.expanduser("~/Pictures/Screenshots")
        os.makedirs(shot_dir, exist_ok=True)
        shot_path = os.path.join(shot_dir, time.strftime("Screenshot %Y-%m-%d at %H.%M.%S.png"))
        subprocess.run(["screencapture", shot_path])
    return {"status": "ok", "system": target}
