#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT_MAP="$SCRIPT_DIR/app-port-map.ini"

# ─── Help ─────────────────────────────────────────────────────────────────────

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    echo ""
    echo "Usage: homelab app-status <app-name>"
    echo ""
    echo "Checks if a specific homelab app is currently running."
    echo "  · Looks up the app's port from app-port-map.ini"
    echo "  · Shows running status, PIDs, and port"
    echo ""
    echo "Example:"
    echo "  homelab app-status melodious"
    echo ""
    exit 0
fi

# ─── Args ─────────────────────────────────────────────────────────────────────

APP_NAME="$1"

if [[ -z "$APP_NAME" ]]; then
    echo "Usage: homelab app-status <app-name>"
    exit 1
fi

# ─── Port lookup ──────────────────────────────────────────────────────────────

PORT="$(grep "^$APP_NAME " "$PORT_MAP" | awk '{print $2}')"

if [[ -z "$PORT" ]]; then
    echo "Unknown app: $APP_NAME (not found in app-port-map.ini)"
    exit 1
fi

# ─── Status check ─────────────────────────────────────────────────────────────

BOLD="\033[1m"
GREEN="\033[1;32m"
RED="\033[1;31m"
DIM="\033[2m"
RESET="\033[0m"

if command -v pgrep &>/dev/null; then
    pids="$(pgrep -f "main.py --port $PORT")"
else
    pids="$(ps aux | grep "main.py --port $PORT" | grep -v grep | awk '{print $2}')"
fi

echo ""
if [[ -n "$pids" ]]; then
    echo -e "  ${GREEN}● ${BOLD}$APP_NAME${RESET} is running"
    echo -e "  ${DIM}Port:${RESET} $PORT"
    echo -e "  ${DIM}PIDs:${RESET} $pids"
else
    echo -e "  ${RED}○ ${BOLD}$APP_NAME${RESET} is not running"
    echo -e "  ${DIM}Port:${RESET} $PORT (not listening)"
fi
echo ""
