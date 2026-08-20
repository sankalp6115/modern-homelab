#!/usr/bin/env bash

set -Eeuo pipefail

APP_DIR="$HOME/homelab/apps/melodious"
SONGS_DIR="$APP_DIR/assets/songs"
SYNC_SCRIPT="$APP_DIR/backend/tools/library_sync.py"

if ! command -v rclone >/dev/null 2>&1; then
    echo "ERROR: rclone not found" >&2
    exit 1
fi

if [[ ! -d "$APP_DIR" ]]; then
    echo "ERROR: Application directory not found: $APP_DIR" >&2
    exit 1
fi

echo "Checking sync changes..."
echo

if ! rclone sync --dry-run homedrive:songs "$SONGS_DIR"; then
    echo
    echo "ERROR: rclone dry-run failed." >&2
    exit 1
fi

echo
read -r -p "Apply these changes? [Y/N]: " confirmation

case "${confirmation,,}" in
    y|yes)
        echo
        echo "Starting songs sync..."

        if ! rclone sync homedrive:songs "$SONGS_DIR"; then
            echo "ERROR: rclone sync failed." >&2
            exit 1
        fi

        echo "Songs synced successfully."
        ;;
    n|no)
        echo "Sync rejected."
        exit 0
        ;;
    *)
        echo "Invalid input. Sync rejected." >&2
        exit 1
        ;;
esac

if ! python3.11 "$SYNC_SCRIPT"; then
    echo "ERROR: Library sync failed." >&2
    exit 1
fi

echo "Library sync completed successfully."

if pids=$(pgrep -f 'python3.11 main.py --port 3000'); then
    echo "Stopping process: $pids"
    kill $pids
    sleep 1
fi

tmux new-session -d -s "melodious" "python3.11 $HOME/homelab/apps/melodious/backend/main.py --port 3000"