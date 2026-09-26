import subprocess
from fastapi import HTTPException
from config import APP_MAP
from utils.applescript import open_application, run_script

def handle_app_launch(target: str | None) -> dict:
    if not target or target.lower() not in APP_MAP:
        raise HTTPException(status_code=400, detail=f"Unauthorized app: {target}")
    app_name = APP_MAP[target.lower()]
    open_application(app_name)
    return {"status": "ok", "action": "app", "target": app_name}

def handle_url_open(url: str | None) -> dict:
    if not url or not (url.startswith("http://") or url.startswith("https://")):
        raise HTTPException(status_code=400, detail="Invalid URL protocol")
    try:
        run_script(f'tell application "Google Chrome" to open location "{url}"')
    except Exception:
        subprocess.run(["open", url])
    return {"status": "ok", "action": "url", "url": url}
