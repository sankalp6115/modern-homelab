#!/usr/bin/env bash

# ─── Colours ─────────────────────────────────────────────────────────────────

BOLD="\033[1m"
DIM="\033[2m"
CYAN="\033[1;36m"
GREEN="\033[1;32m"
YELLOW="\033[1;33m"
RESET="\033[0m"

# ─── Help ─────────────────────────────────────────────────────────────────────

show_help() {
    echo ""
    echo -e "${BOLD}${CYAN}homelab${RESET} — Termux homelab control CLI"
    echo ""
    echo -e "${BOLD}Usage:${RESET}"
    echo "  homelab <subcommand> [args]"
    echo "  homelab -h | --help"
    echo ""
    echo -e "${BOLD}Subcommands:${RESET}"
    echo ""
    printf "  ${GREEN}%-22s${RESET} %s\n" "status"         "Full system overview: CPU, RAM, battery, storage, services, network, open ports"
    printf "  ${GREEN}%-22s${RESET} %s\n" "battery"        "Detailed battery info: level, health, temperature, voltage, current"
    printf "  ${GREEN}%-22s${RESET} %s\n" "wifi"           "WiFi connection info: SSID, IP, gateway, link speed, frequency"
    printf "  ${GREEN}%-22s${RESET} %s\n" "storage"        "Internal storage usage: total, used, available"
    printf "  ${GREEN}%-22s${RESET} %s\n" "ports"          "List all currently open/listening TCP ports"
    echo ""
    printf "  ${GREEN}%-22s${RESET} %s\n" "app-list"       "Table of all apps with running/stopped status and ports"
    printf "  ${GREEN}%-22s${RESET} %s\n" "app-status <app>" "Check if a specific app is running, show its PID and port"
    printf "  ${GREEN}%-22s${RESET} %s\n" "app-up <app>"   "Start a homelab app (skips if already running)"
    printf "  ${GREEN}%-22s${RESET} %s\n" "app-down <app>" "Stop a running homelab app"
    printf "  ${GREEN}%-22s${RESET} %s\n" "app-restart <app>" "Stop then start a homelab app in one shot"
    printf "  ${GREEN}%-22s${RESET} %s\n" "app-logs <app>" "Attach to the tmux session for an app (Ctrl+B D to detach)"
    echo ""
    printf "  ${GREEN}%-22s${RESET} %s\n" "music-sync"     "Sync songs from rclone remote → melodious, then restart the app"
    printf "  ${GREEN}%-22s${RESET} %s\n" "update"         "Pull latest changes for the homelab repo"
    echo ""
    echo -e "${DIM}Run 'homelab <subcommand> --help' for details on any command.${RESET}"
    echo ""
}

# ─── Dispatcher ───────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

subcommand="$1"

case "$subcommand" in
    -h|--help|"")
        show_help
        ;;
    status|battery|wifi|storage|ports|app-up|app-down|app-restart|app-status|app-list|app-logs|music-sync|update)
        shift
        exec "$SCRIPT_DIR/homelab-$subcommand" "$@"
        ;;
    *)
        echo -e "${BOLD}homelab:${RESET} unknown subcommand '${subcommand}'"
        echo "Run 'homelab --help' to see available commands."
        exit 1
        ;;
esac
