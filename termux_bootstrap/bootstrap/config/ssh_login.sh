#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

CONFIG_ROOT="${XDG_CONFIG_HOME:-$HOME/.config}/termux-bootstrap"
AUDIO_FILE="$CONFIG_ROOT/scripts/login.mp3"

if [ -t 0 ] && [ -z "$SSH_ORIGINAL_COMMAND" ]; then
    if [ -n "$SSH_CLIENT" ]; then
        read -r client_ip client_port _ <<< "$SSH_CLIENT"

        if [ -f "$AUDIO_FILE" ]; then
            termux-media-player play "$AUDIO_FILE" >/dev/null 2>&1 || true
        fi

        termux-toast "SSH Login Detected" >/dev/null 2>&1 || true

        termux-notification \
            --title "SSH Login" \
            --content "${client_ip}:${client_port} SSHed to server" >/dev/null 2>&1 || true

        mkdir -p "$HOME/logs"

        printf '[%s] %s:%s logged in\n' \
            "$(date '+%Y-%m-%d %H:%M:%S')" \
            "$client_ip" \
            "$client_port" >> "$HOME/logs/ssh_login.log"
    fi
fi
