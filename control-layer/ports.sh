#!/data/data/com.termux/files/usr/bin/bash

OPEN_PORTS=$(netstat -tln 2>/dev/null | awk '/LISTEN/ {split($4, a, ":"); print a[length(a)]}' | sort -un)w

echo $OPEN_PORTS