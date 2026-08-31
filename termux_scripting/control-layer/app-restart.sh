#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT_MAP="$SCRIPT_DIR/app-port-map.ini"

# ─── Help ─────────────────────────────────────────────────────────────────────

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    echo ""
    echo "Usage: homelab app-restart <app-name>"
    echo ""
    echo "Restarts a homelab app: stops it if running, then starts it fresh."
    echo "  · If the app is running, kills it first (like app-down)"
    echo "  · Then starts it via its start.sh (like app-up)"
    echo "  · Useful after config changes or crashes"
    echo ""
    echo "Example:"
    echo "  homelab app-restart melodious"
    echo ""
    exit 0
fi

# ─── Args ─────────────────────────────────────────────────────────────────────

APP_NAME="$1"

if [[ -z "$APP_NAME" ]]; then
    echo "Usage: homelab app-restart <app-name>"
    exit 1
fi

# ─── Port lookup ──────────────────────────────────────────────────────────────

PORT="$(grep "^$APP_NAME " "$PORT_MAP" | awk '{print $2}')"

if [[ -z "$PORT" ]]; then
    echo "Unknown app: $APP_NAME (not found in app-port-map.ini)"
    exit 1
fi

HOMELAB_DIR="$HOME/homelab/apps"
APP_DIR="$HOMELAB_DIR/$APP_NAME"
START_SCRIPT="$APP_DIR/start.sh"

# ─── Stop ─────────────────────────────────────────────────────────────────────

if command -v pgrep &>/dev/null; then
    pids="$(pgrep -f "main.py --port $PORT")"
else
    pids="$(ps aux | grep "main.py --port $PORT" | grep -v grep | awk '{print $2}')"
fi

if [[ -n "$pids" ]]; then
    echo "Stopping $APP_NAME (PIDs: $pids)..."
    kill $pids
    sleep 1
    echo "$APP_NAME stopped."
else
    echo "$APP_NAME was not running, starting fresh."
fi

# ─── Start ────────────────────────────────────────────────────────────────────

if [[ ! -f "$START_SCRIPT" ]]; then
    echo "No start.sh found for $APP_NAME at $START_SCRIPT"
    exit 1
fi

echo "Starting $APP_NAME (port $PORT)..."
bash "$START_SCRIPT"
