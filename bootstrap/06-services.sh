#!/usr/bin/env bash
set -e
echo "Starting services..."

if [ -f "$PREFIX/etc/profile.d/start-services.sh" ]; then
    source "$PREFIX/etc/profile.d/start-services.sh"
fi

export SVDIR=$PREFIX/var/service
sleep 1

sv-enable sshd || echo "Warning: Failed to enable sshd"
sv up sshd || echo "Warning: Failed to start sshd"

if pgrep -x "sshd" >/dev/null; then
  echo "SSH ✓"
else
  echo "SSH ✗"
fi

echo "Health check complete."
