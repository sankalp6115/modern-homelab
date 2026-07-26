#!/usr/bin/env bash
cat ~/.ascii/ascii_art.txt
echo
echo
echo "Battery: $(termux-battery-status | jq -r '.percentage')%"
echo
echo $(date)
echo
result=$(curl "https://api.openweathermap.org/data/2.5/weather?lat=26.4499&lon=80.3319&units=metric&appid=f497f8e907c5e772d7a8dee8c14b79f6") 2>/dev/null
echo $result | jq -r '(.main.temp) as $t | "\($t)°C - \(.weather[0].description)"'

