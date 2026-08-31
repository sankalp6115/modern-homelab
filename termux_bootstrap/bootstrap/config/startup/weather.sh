result=$(curl -s "https://api.open-meteo.com/v1/forecast?latitude=26.52&longitude=80.33&forecast_days=1&timezone=auto&current=temperature_2m,weather_code")

weather_code=$(echo "$result" | jq -r '.current.weather_code')

case "$weather_code" in
    0)
        weather_status="Clear Sky"
        ;;
    1)
        weather_status="Mainly Clear"
        ;;
    2)
        weather_status="Partly Cloudy"
        ;;
    3)
        weather_status="Overcast"
        ;;
    45|48)
        weather_status="Fog"
        ;;
    51)
        weather_status="Light Drizzle"
        ;;
    53)
        weather_status="Moderate Drizzle"
        ;;
    55)
        weather_status="Heavy Drizzle"
        ;;
    56|57)
        weather_status="Freezing Drizzle"
        ;;
    61)
        weather_status="Light Rain"
        ;;
    63)
        weather_status="Moderate Rain"
        ;;
    65)
        weather_status="Heavy Rain"
        ;;
    66|67)
        weather_status="Freezing Rain"
        ;;
    71)
        weather_status="Light Snow"
        ;;
    73)
        weather_status="Moderate Snow"
        ;;
    75)
        weather_status="Heavy Snow"
        ;;
    77)
        weather_status="Snow Grains"
        ;;
    80)
        weather_status="Light Rain Showers"
        ;;
    81)
        weather_status="Moderate Rain Showers"
        ;;
    82)
        weather_status="Violent Rain Showers"
        ;;
    85)
        weather_status="Light Snow Showers"
        ;;
    86)
        weather_status="Heavy Snow Showers"
        ;;
    95)
        weather_status="Thunderstorm"
        ;;
    96|99)
        weather_status="Thunderstorm with Hail"
        ;;
    *)
        weather_status="Unknown"
        ;;
esac

temperature=$(echo "$result" | jq -r '.current.temperature_2m')

echo "$temperature°C - $weather_status"
echo "May you enjoy your day."