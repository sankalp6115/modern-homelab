#!/usr/bin/env bash
set -euo pipefail

CONFIG_ROOT="${XDG_CONFIG_HOME:-$HOME/.config}/termux-bootstrap"
mkdir -p "$CONFIG_ROOT/secrets"
touch "$CONFIG_ROOT/secrets/.env"