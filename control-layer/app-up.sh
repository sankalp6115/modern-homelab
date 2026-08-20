#!/usr/bin/env bash
HOME_DIR="$HOME"
HOMELAB_DIR="$HOME_DIR/homelab/apps"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT_MAP="$SCRIPT_DIR/app-port-map.ini"

# Plan
# app-up melodious   → if down then up, else say already up
# app-down melodious → if up then down, else say not running

APP_NAME="$1"

if [[ -z "$APP_NAME" ]]; then
    echo "Usage: app-up.sh <app-name>"
    exit 1
fi

# Look up port from app-port-map.ini
PORT="$(grep "^$APP_NAME " "$PORT_MAP" | awk '{print $2}')"

if [[ -z "$PORT" ]]; then
    echo "Unknown app: $APP_NAME (not found in app-port-map.ini)"
    exit 1
fi

# Check if already running
if command -v pgrep &>/dev/null; then
    pids="$(pgrep -f "main.py --port $PORT")"
else
    pids="$(ps aux | grep "main.py --port $PORT" | grep -v grep | awk '{print $2}')"
fi

if [[ -n "$pids" ]]; then
    echo "$APP_NAME is already running (PIDs: $pids)"
    exit 0
fi

# Start the app
APP_DIR="$HOMELAB_DIR/$APP_NAME"
START_SCRIPT="$APP_DIR/start.sh"

if [[ ! -f "$START_SCRIPT" ]]; then
    echo "No start.sh found for $APP_NAME at $START_SCRIPT"
    exit 1
fi

echo "Starting $APP_NAME (port $PORT)..."
bash "$START_SCRIPT"
