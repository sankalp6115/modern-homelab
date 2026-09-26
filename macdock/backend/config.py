import json
import os

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(BACKEND_DIR)
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
CONFIG_FILE = os.path.join(BACKEND_DIR, "config.json")
ICONS_DIR = os.path.join(FRONTEND_DIR, "icons")
INDEX_FILE = os.path.join(FRONTEND_DIR, "index.html")

APP_MAP = {
    "vscode":          "Visual Studio Code",
    "antigravity":     "Antigravity IDE",
    "terminal":        "Terminal",
    "obsidian":        "Obsidian",
    "androidstudio":   "Android Studio",
    "docker":          "Docker",
    "chrome":          "Google Chrome",
    "spotify":         "Spotify",
    "calendar":        "Calendar",
    "whatsapp":        "WhatsApp",
    "finder":          "Finder",
    "tailscale":       "Tailscale",
    "activitymonitor": "Activity Monitor",
}

ALLOWED_SYSTEM_TARGETS = {"nightshift", "dnd", "screenshot"}
ALLOWED_MEDIA_CMDS = {"play", "pause", "play_pause", "next", "previous", "shuffle", "repeat"}
MEDIA_APPS = ["Spotify", "Music", "Google Chrome"]

ALLOWED_SCRIPTS = {
    "deploy": "~/scripts/deploy.sh"
}

def load_deck_config() -> dict:
    """Load configuration from config.json."""
    if not os.path.exists(CONFIG_FILE):
        return {"pages": []}
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        return json.load(f)
