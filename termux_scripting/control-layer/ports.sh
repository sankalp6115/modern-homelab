#!/usr/bin/bash

if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    echo ""
    echo "Usage: homelab ports"
    echo ""
    echo "Lists ports used by running Python processes."
    echo "Finds all python processes with --port <N> in their args."
    echo ""
    exit 0
fi

PORTS=$(ps aux | grep -E "[p]ython.*--port" | grep -oP '\-\-port\s+\K[0-9]+' | sort -un)

if [[ -z "$PORTS" ]]; then
    echo "No Python processes listening on any port."
else
    echo ""
    while IFS= read -r port; do
        app=$(ps aux | grep -E "[p]ython.*--port $port" | grep -oP '[\w_-]+/main\.py' | cut -d'/' -f1)
        if [[ -n "$app" ]]; then
            printf "  %-8s %s\n" "$port" "$app"
        else
            printf "  %-8s %s\n" "$port" "(unknown)"
        fi
    done <<< "$PORTS"
    echo ""
fi