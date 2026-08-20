
HOME_DIR=$HOME
HOMELAB_DIR="$HOME_DIR/homelab/apps"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT_MAP="$SCRIPT_DIR/app-port-map.ini"

# Plan
# app-up melodious (if down then up, else say already up)
# app-down melodious (if up then down, else say not running)
# app-up-down melodious (if up, then down then again up | if down, then up)

APP_NAME="$1"

if [[ -z "$APP_NAME" ]]; then
    echo "Usage: app-down.sh <app-name>"
    exit 1
fi

# Look up port from app-port-map.ini
PORT="$(grep "^$APP_NAME " "$PORT_MAP" | awk '{print $2}')"

if [[ -z "$PORT" ]]; then
    echo "Unknown app: $APP_NAME (not found in app-port-map.ini)"
    exit 1
fi

echo "Stopping $APP_NAME (port $PORT)..."

# pgrep may not be available; fall back to ps + grep
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