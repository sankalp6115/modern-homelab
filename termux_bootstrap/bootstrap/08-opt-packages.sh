#!/usr/bin/env bash
set -e

echo "Installing optional packages..."

pkg update && pkg upgrade -y
pkg install -y python3.11
pkg install -y termux-api

echo "Optional packages installed."