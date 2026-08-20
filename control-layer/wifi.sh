#!/data/data/com.termux/files/usr/bin/bash

WIFI_INFO="$(termux-wifi-connectioninfo)"

FREQUENCY="$(echo $WIFI_INFO | jq -r '.frequency_mhz')"
IP_ADDR="$(echo $WIFI_INFO | jq -r '.ip')"
LINK_SPEED="$(echo $WIFI_INFO | jq -r '.link_speed_mbps')"
SSID="$(echo $WIFI_INFO | jq -r '.ssid')"

GATEWAY="$(ip route | awk '/default/ {print $3; exit}')"

echo "SSID:        $SSID"
echo "Gateway:     $GATEWAY"
echo "IP Address:  $IP_ADDR"
echo "Link Speed:  $LINK_SPEED"
echo "Frequency:   ${FREQUENCY} MHz"