import subprocess
from concurrent.futures import ThreadPoolExecutor

def ping(ip):
    result = subprocess.run(
        ["ping", "-c", "1", "-W", "1", ip],
        stdout=subprocess.DEVNULL
    )
    return ip if result.returncode == 0 else None

ips = [f"192.168.0.{i}" for i in range(1, 255)]

with ThreadPoolExecutor(max_workers=50) as executor:
    results = list(executor.map(ping, ips))

active = [ip for ip in results if ip]
print(active)