#!/usr/bin/env bash

# ─── Paths ───────────────────────────────────────────────────────────────────

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SYSTEM_SCRIPTS="$HOME/system_scripts"
DEST_CONTROL="$SYSTEM_SCRIPTS/control-layer"

# ─── Create destination dirs ──────────────────────────────────────────────────

mkdir -p "$DEST_CONTROL"
mkdir -p "$SYSTEM_SCRIPTS/github-backup"

# ─── Add system-scripts to PATH in .bashrc (idempotent) ──────────────────────

BASHRC="$HOME/.bashrc"
PATH_LINE="export PATH=\"\$HOME/system_scripts/control-layer:\$PATH\""

if ! grep -qF "system_scripts/control-layer" "$BASHRC" 2>/dev/null; then
    echo "" >> "$BASHRC"
    echo "# homelab system scripts" >> "$BASHRC"
    echo "$PATH_LINE" >> "$BASHRC"
    echo "✓ Added system_scripts/control-layer to PATH in .bashrc"
else
    echo "· PATH already set in .bashrc, skipping"
fi

# ─── Copy control-layer scripts (strip .sh, make executable) ─────────────────

echo ""
echo "Installing control-layer commands → $DEST_CONTROL"

for script in "$REPO_DIR/control-layer/"*.sh; do
    [ -f "$script" ] || continue
    filename="$(basename "$script" .sh)"   # strip .sh extension
    dest="$DEST_CONTROL/$filename"
    cp "$script" "$dest"
    chmod +x "$dest"
    echo "  ✓ $filename"
done

# ─── Copy companion files (e.g. app-port-map.ini) ────────────────────────────

for extra in "$REPO_DIR/control-layer/"*.ini "$REPO_DIR/control-layer/"*.conf; do
    [ -f "$extra" ] || continue
    filename="$(basename "$extra")"
    cp "$extra" "$DEST_CONTROL/$filename"
    echo "  ✓ $filename  (config)"
done

# ─── Copy github-backup folder ────────────────────────────────────────────────

echo ""
echo "Syncing github-backup → $SYSTEM_SCRIPTS/github-backup"
cp -r "$REPO_DIR/github-backup/." "$SYSTEM_SCRIPTS/github-backup/"
echo "  ✓ github-backup synced"

# ─── Done ─────────────────────────────────────────────────────────────────────

echo ""
echo "Done! Run: source ~/.bashrc"
echo "Then use: homelab-status, homelab-app-up <app>, homelab-app-down <app>, homelab-battery ..."