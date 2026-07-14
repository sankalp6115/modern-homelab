import subprocess
import json

redmi_result = subprocess.run(["ssh","redmi","termux-battery-status"], capture_output=True, text=True)
vivo_result = subprocess.run(["ssh","vivo","termux-battery-status"], capture_output=True, text=True)
redmi_battery = json.loads(redmi_result.stdout)
vivo_battery = json.loads(vivo_result.stdout)
print(redmi_battery)
print(vivo_battery)