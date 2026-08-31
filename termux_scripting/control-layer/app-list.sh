#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT_MAP="$SCRIPT_DIR/app-port-map.ini"

# ─── Help ─────────────────────────────────────────────────────────────────────

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    echo ""
    echo "Usage: homelab app-list"
    echo ""
    echo "Lists all apps defined in app-port-map.ini with their running status."
    echo "  · Green ● = running   Red ○ = stopped"
    echo "  · Shows app name and port for each entry"
    echo ""
    exit 0
fi

# ─── Colours ──────────────────────────────────────────────────────────────────

BOLD="\033[1m"
GREEN="\033[1;32m"
RED="\033[1;31m"
DIM="\033[2m"
RESET="\033[0m"

# ─── Header ───────────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}Apps${RESET}"
echo ""
printf "  ${DIM}%-22s %-8s %s${RESET}\n" "NAME" "PORT" "STATUS"
printf "  ${DIM}%-22s %-8s %s${RESET}\n" "----" "----" "------"

# ─── List ─────────────────────────────────────────────────────────────────────

while IFS= read -r line || [[ -n "$line" ]]; do
    # Skip empty or comment lines
    [[ -z "$line" || "$line" == \#* ]] && continue

    APP_NAME="$(echo "$line" | awk '{print $1}')"
    PORT="$(echo "$line" | awk '{print $2}')"

    [[ -z "$APP_NAME" || -z "$PORT" ]] && continue

    # Check if running
    if command -v pgrep &>/dev/null; then
        pids="$(pgrep -f "main.py --port $PORT" 2>/dev/null)"
    else
        pids="$(ps aux | grep "main.py --port $PORT" | grep -v grep | awk '{print $2}')"
    fi

    if [[ -n "$pids" ]]; then
        STATUS="${GREEN}● running${RESET}"
    else
        STATUS="${RED}○ stopped${RESET}"
    fi

    printf "  %-22s ${DIM}%-8s${RESET} %b\n" "$APP_NAME" "$PORT" "$STATUS"

done < "$PORT_MAP"

echo ""
