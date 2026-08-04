#!/data/data/com.termux/files/usr/bin/bash

BATTERY_INFO="$(termux-battery-status)"

PRESENT="$(echo "$BATTERY_INFO" | jq -r '.present')"
TECHNOLOGY="$(echo "$BATTERY_INFO" | jq -r '.technology')"
HEALTH="$(echo "$BATTERY_INFO" | jq -r '.health')"
PLUGGED="$(echo "$BATTERY_INFO" | jq -r '.plugged')"
STATUS="$(echo "$BATTERY_INFO" | jq -r '.status')"
TEMPERATURE="$(echo "$BATTERY_INFO" | jq -r '.temperature')"
VOLTAGE="$(echo "$BATTERY_INFO" | jq -r '.voltage')"
CURRENT="$(echo "$BATTERY_INFO" | jq -r '.current')"
PERCENTAGE="$(echo "$BATTERY_INFO" | jq -r '.percentage')"

echo "Present:            $PRESENT"
echo "Technology:         $TECHNOLOGY"
echo "Health:             $HEALTH"
echo "Plugged:            $PLUGGED"
echo "Status:             $STATUS"
echo "Temperature:        ${TEMPERATURE}°C"
echo "Voltage:            ${VOLTAGE} mV"
echo "Current:            ${CURRENT} µA"
echo "Battery Level:      ${PERCENTAGE}%"