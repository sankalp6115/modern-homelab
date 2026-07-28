#!/usr/bin/env bash
set -euo pipefail

mkdir -p \
  "$HOME/apps" \
  "$HOME/archives" \
  "$HOME/backups" \
  "$HOME/logs" \
  "$HOME/media"

CONFIG_ROOT="${XDG_CONFIG_HOME:-$HOME/.config}/termux-bootstrap"
mkdir -p "$CONFIG_ROOT/startup" "$CONFIG_ROOT/scripts" "$CONFIG_ROOT/secrets"
chmod 700 "$CONFIG_ROOT/secrets"