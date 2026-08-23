#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT_MAP="$SCRIPT_DIR/app-port-map.ini"

# ─── Help ─────────────────────────────────────────────────────────────────────

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    echo ""
    echo "Usage: homelab app-logs <app-name>"
    echo ""
    echo "Attaches to the tmux session for a running homelab app."
    echo "  · Session name matches the app name (e.g. 'melodious')"
    echo "  · If no tmux session found, falls back to showing recent ps output"
    echo "  · Detach from tmux with: Ctrl+B then D"
    echo ""
    echo "Example:"
    echo "  homelab app-logs melodious"
    echo ""
    exit 0
fi

# ─── Args ─────────────────────────────────────────────────────────────────────

APP_NAME="$1"

if [[ -z "$APP_NAME" ]]; then
    echo "Usage: homelab app-logs <app-name>"
    exit 1
fi

# ─── Verify app is known ──────────────────────────────────────────────────────

PORT="$(grep "^$APP_NAME " "$PORT_MAP" | awk '{print $2}')"

if [[ -z "$PORT" ]]; then
    echo "Unknown app: $APP_NAME (not found in app-port-map.ini)"
    exit 1
fi

# ─── Try tmux session ────────────────────────────────────────────────────────

if command -v tmux &>/dev/null; then
    if tmux has-session -t "$APP_NAME" 2>/dev/null; then
        echo "Attaching to tmux session '$APP_NAME'  (Ctrl+B D to detach)"
        echo ""
        tmux attach-session -t "$APP_NAME"
        exit 0
    else
        echo "No tmux session named '$APP_NAME' found."
        echo ""
    fi
fi

# ─── Fallback: show ps output for the process ────────────────────────────────

echo "Falling back to process info for $APP_NAME (port $PORT):"
echo ""

if command -v pgrep &>/dev/null; then
    pids="$(pgrep -f "main.py --port $PORT")"
else
    pids="$(ps aux | grep "main.py --port $PORT" | grep -v grep | awk '{print $2}')"
fi

if [[ -n "$pids" ]]; then
    ps -p $pids -o pid,etime,cmd 2>/dev/null || ps aux | grep "main.py --port $PORT" | grep -v grep
else
    echo "  $APP_NAME does not appear to be running."
fi
echo ""
