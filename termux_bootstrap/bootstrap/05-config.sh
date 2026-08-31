#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_ROOT="${XDG_CONFIG_HOME:-$HOME/.config}/termux-bootstrap"

echo "Setting up configurations..."

mkdir -p "$CONFIG_ROOT/scripts" "$CONFIG_ROOT/startup" "$CONFIG_ROOT/secrets"
mkdir -p "$PREFIX/etc/ssh"

cp -f "$SCRIPT_DIR/config/.zshrc" "$HOME/.zshrc" 2>/dev/null || echo "Warning: .zshrc not found"
cp -f "$SCRIPT_DIR/config/.bashrc" "$HOME/.bashrc" 2>/dev/null || echo "Warning: .bashrc not found"
cp -f "$SCRIPT_DIR/config/.tmux.conf" "$HOME/.tmux.conf" 2>/dev/null || echo "Warning: .tmux.conf not found"
cp -f "$SCRIPT_DIR/config/.nanorc" "$HOME/.nanorc" 2>/dev/null || echo "Warning: .nanorc not found"
cp -f "$SCRIPT_DIR/config/.aliases" "$HOME/.aliases" 2>/dev/null || echo "Warning: .aliases not found"
cp -f "$SCRIPT_DIR/config/.vimrc" "$HOME/.vimrc" 2>/dev/null || echo "Warning: .vimrc not found"

cp -f "$SCRIPT_DIR/assets/audio/login.mp3" "$CONFIG_ROOT/scripts/login.mp3" 2>/dev/null || echo "Warning: login.mp3 not found"
cp -f "$SCRIPT_DIR/config/ssh_login.sh" "$CONFIG_ROOT/scripts/ssh_login.sh" 2>/dev/null || echo "Warning: ssh_login.sh not found"

cp -f "$SCRIPT_DIR/config/startup/ascii_art.txt" "$CONFIG_ROOT/startup/ascii_art.txt" 2>/dev/null || echo "Warning: ascii_art not found"
cp -f "$SCRIPT_DIR/config/startup/battery.sh" "$CONFIG_ROOT/startup/battery.sh" 2>/dev/null || echo "Warning: battery.sh not found"
cp -f "$SCRIPT_DIR/config/startup/interface.sh" "$CONFIG_ROOT/startup/interface.sh" 2>/dev/null || echo "Warning: interface.sh not found"
cp -f "$SCRIPT_DIR/config/startup/storage_management.sh" "$CONFIG_ROOT/startup/storage_management.sh" 2>/dev/null || echo "Warning: storage_management.sh not found"
cp -f "$SCRIPT_DIR/config/startup/weather.sh" "$CONFIG_ROOT/startup/weather.sh" 2>/dev/null || echo "Warning: weather.sh not found"

cp -f "$SCRIPT_DIR/config/sshd_config" "$PREFIX/etc/ssh/sshd_config" 2>/dev/null || echo "Warning: sshd_config not copied (permission issue?)"
cp -f "$SCRIPT_DIR/config/motd" "$PREFIX/etc/motd" 2>/dev/null || echo "Warning: motd not copied (permission issue?)"
cp -f "$SCRIPT_DIR/config/motd.sh" "$PREFIX/etc/motd.sh" 2>/dev/null || echo "Warning: motd not copied (permission issue?)"

echo "Changing default shell to zsh..."
chsh -s zsh
