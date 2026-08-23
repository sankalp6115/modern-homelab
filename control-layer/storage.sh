#!/bin/bash

if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    echo ""
    echo "Usage: homelab storage"
    echo ""
    echo "Shows internal storage usage for /data partition:"
    echo "  · Total capacity"
    echo "  · Used space (with percentage)"
    echo "  · Available space"
    echo ""
    exit 0
fi

TOTAL=$(df -h /data | awk 'NR==2 {print $2}')
USED=$(df -h /data | awk 'NR==2 {print $3}')
AVAILABLE=$(df -h /data | awk 'NR==2 {print $4}')
PERCENT=$(df -h /data | awk 'NR==2 {print $5}')

echo -e "Total Capacity: \033[1;34m$TOTAL\033[0m"
echo -e "Storage Used:   \033[1;31m$USED ($PERCENT)\033[0m"
echo -e "Storage Left:   \033[1;32m$AVAILABLE\033[0m"