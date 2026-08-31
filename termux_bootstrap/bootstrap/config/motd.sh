#!/usr/bin/env bash
set -euo pipefail

CONFIG_ROOT="${XDG_CONFIG_HOME:-$HOME/.config}/termux-bootstrap"
ASCII_ART_FILE="$CONFIG_ROOT/startup/ascii_art.txt"

if [[ -f "$ASCII_ART_FILE" ]]; then
    cat "$ASCII_ART_FILE"
else
    echo "ASCII art unavailable"
fi

echo
echo

run_script() {
    local script_path="$1"
    if [[ -f "$script_path" ]]; then
        bash "$script_path" 2>/dev/null || true
    else
        echo "Unavailable"
    fi
}

echo "$(run_script "$CONFIG_ROOT/startup/battery.sh")"
echo
echo "$(run_script "$CONFIG_ROOT/startup/interface.sh")"
echo
echo "$(run_script "$CONFIG_ROOT/startup/storage_management.sh")"
# echo
# echo "$(run_script "$CONFIG_ROOT/startup/weather.sh")"
echo
echo "$(date)"