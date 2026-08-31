#!/usr/bin/env bash
HOME_DIR=$HOME
HOMELAB_DIR="$HOME_DIR/homelab/apps"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT_MAP="$SCRIPT_DIR/app-port-map.ini"

if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    echo ""
    echo "Usage: homelab app-down <app-name>"
    echo ""
    echo "Stops a running homelab app by name."
    echo "  · Looks up the app's port from app-port-map.ini"
    echo "  · Finds the running process and kills it"
    echo "  · Reports if the app was not running"
    echo ""
    echo "Example:"
    echo "  homelab app-down melodious"
    echo ""
    exit 0
fi

APP_NAME="$1"

if [[ -z "$APP_NAME" ]]; then
    echo "Usage: homelab app-down <app-name>"
    exit 1
fi

# Look up port from app-port-map.ini
PORT="$(grep "^$APP_NAME " "$PORT_MAP" | awk '{print $2}')"

if [[ -z "$PORT" ]]; then
    echo "Unknown app: $APP_NAME (not found in app-port-map.ini)"
    exit 1
fi

echo "Stopping $APP_NAME (port $PORT)..."

if command -v pgrep &>/dev/null; then
    pids="$(pgrep -f "main.py --port $PORT")"
else
    pids="$(ps aux | grep "main.py --port $PORT" | grep -v grep | awk '{print $2}')"
fi

if [[ -n "$pids" ]]; then
    echo "Killing PIDs: $pids"
    kill $pids
    sleep 1
    echo "$APP_NAME stopped."
else
    echo "$APP_NAME is not running."
fi