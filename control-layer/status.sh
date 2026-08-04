#!/data/data/com.termux/files/usr/bin/bash

# ─── Collect Data ────────────────────────────────────────────────────────────

HOSTNAME="$(hostname)"

UPTIME_RAW="$(uptime -p 2>/dev/null | sed 's/up //')"

NORMAL_IP=$(ifconfig 2>/dev/null | awk '
/^wlan0:/ { found=1; next }
/^[^[:space:]]/ { found=0 }
found && /^\s*inet / {
    print $2
    exit
}')

TAILSCALE_IP=$(ifconfig 2>/dev/null | awk '
/^tun0:/ { found=1; next }
/^[^[:space:]]/ { found=0 }
found && /^\s*inet / {
    print $2
    exit
}')

CPU_LEVEL=$(top -n1 2>/dev/null | grep -oP "System \K\d+" || echo "?")

OPEN_PORTS=$(netstat -tln 2>/dev/null | awk '/LISTEN/ {split($4, a, ":"); print a[length(a)]}' | sort -un)

BATTERY_JSON="$(termux-battery-status 2>/dev/null)"
BAT_PCT=$(echo "$BATTERY_JSON" | jq -r '.percentage // "?"')
BAT_STATUS=$(echo "$BATTERY_JSON" | jq -r '.status // "?"')
if echo "$BAT_STATUS" | grep -qi "charging"; then
    BAT_LABEL=" (Charging)"
else
    BAT_LABEL=""
fi

TOTAL=$(df -h /data 2>/dev/null | awk 'NR==2 {print $2}')
USED=$(df -h /data 2>/dev/null  | awk 'NR==2 {print $3}')
PERCENT=$(df -h /data 2>/dev/null | awk 'NR==2 {gsub(/%/,"",$5); print $5}')

RAM_USED=$(free -h 2>/dev/null | awk '/^Mem:/ {print $3}')
RAM_TOTAL=$(free -h 2>/dev/null | awk '/^Mem:/ {print $2}')

TEMP=$(cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null | awk '{printf "%.0f", $1/1000}')

# ─── Services to check ───────────────────────────────────────────────────────

SERVICES=(sshd tailscaled syncthing tmux)

# ─── Colours ─────────────────────────────────────────────────────────────────

BOLD="\033[1m"
DIM="\033[2m"
GREEN="\033[1;32m"
RED="\033[1;31m"
CYAN="\033[1;36m"
RESET="\033[0m"

label() { printf "${DIM}%-14s${RESET}" "$1:"; }

# ─── Header ──────────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}${CYAN}\$ homelab-status${RESET}"
echo ""

# ─── System Info ─────────────────────────────────────────────────────────────

printf "$(label Hostname) %s\n"       "${HOSTNAME:-localhost}"
printf "$(label Uptime) %s\n"         "${UPTIME_RAW:-unknown}"
printf "$(label CPU) %s%%\n"          "${CPU_LEVEL:-?}"
printf "$(label RAM) %s / %s\n"       "${RAM_USED:-?}" "${RAM_TOTAL:-?}"
printf "$(label Storage) %s%%\n"      "${PERCENT:-?}"
printf "$(label Battery) %s%%%s\n"    "${BAT_PCT}" "${BAT_LABEL}"
printf "$(label Temperature) %s\xc2\xb0C\n"  "${TEMP:-?}"

# ─── Services ────────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}Services${RESET}"

for svc in "${SERVICES[@]}"; do
    if pgrep -x "$svc" > /dev/null 2>&1; then
        echo -e "  ${GREEN}\xe2\x9c\x93${RESET} $svc"
    else
        echo -e "  ${RED}\xe2\x9c\x97${RESET} $svc"
    fi
done

# ─── Network ─────────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}Network${RESET}"

printf "  $(label Tailscale) %s\n"  "${TAILSCALE_IP:-N/A}"
printf "  $(label WiFi) %s\n"       "${NORMAL_IP:-N/A}"

# ─── Open Ports ──────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}Ports${RESET}"

if [ -z "$OPEN_PORTS" ]; then
    echo "  (none)"
else
    while IFS= read -r port; do
        echo "  $port"
    done <<< "$OPEN_PORTS"
fi

echo ""
