WIFI_IP=$(ip -4 addr show wlan0 2>/dev/null | grep -oP 'inet \K[\d.]+')
TUN_IP=$(ip -4 addr show tun0 2>/dev/null | grep -oP 'inet \K[\d.]+')

echo "Wifi IPv4: $WIFI_IP"
echo "Tailscale IPv4: $TUN_IP"