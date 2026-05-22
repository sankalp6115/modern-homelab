"""
HomeLab System Monitor API
Run with: uvicorn monitor_api:app --host 0.0.0.0 --port 8000 --reload
Install deps: pip install fastapi uvicorn
"""

import socket
import platform
import time
import subprocess
from datetime import datetime
from typing import Optional
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="HomeLab Monitor API")

# Allow all origins for homelab use — tighten as needed
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── helpers ────────────────────────────────────────────────────────────────────

def safe(fn, default=None):
    """Call fn(); return default on any exception."""
    try:
        return fn()
    except Exception:
        return default


def get_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return safe(lambda: socket.gethostbyname(socket.gethostname()), "N/A")


def get_mac() -> Optional[str]:
    import uuid
    try:
        mac = uuid.getnode()
        if (mac >> 40) % 2:          # multicast / random flag → not real
            return None
        return ":".join(f"{(mac >> i) & 0xFF:02x}" for i in range(40, -1, -8))
    except Exception:
        return None


def get_uptime() -> str:
    delta = int(time.time() - get_boot_time())
    d, rem = divmod(delta, 86400)
    h, rem = divmod(rem, 3600)
    m, s   = divmod(rem, 60)
    parts = []
    if d: parts.append(f"{d}d")
    if h: parts.append(f"{h}h")
    if m: parts.append(f"{m}m")
    parts.append(f"{s}s")
    return " ".join(parts)

def get_boot_time():
    with open("/proc/stat") as f:
        for line in f:
            if line.startswith("btime"):
                return int(line.split()[1])

# def get_temperatures() -> Optional[dict]:
#     if not raw:
#         return None
#     result = {}
#     for name, entries in raw.items():
#         sensors = []
#         for e in entries:
#             sensors.append({
#                 "label": e.label or name,
#                 "current": e.current,
#                 "high": e.high,
#                 "critical": e.critical,
#             })
#         if sensors:
#             result[name] = sensors
#     return result or None


# def get_fans() -> Optional[list]:
#     if not raw:
#         return None
#     fans = []
#     for name, entries in raw.items():
#         for e in entries:
#             fans.append({
#                 "name": e.label or name,
#                 "rpm": e.current,
#             })
#     return fans or None


# def get_battery() -> Optional[dict]:
#     if bat is None:
#         return None
#     return {
#         "percent": round(bat.percent, 1),
#         "plugged_in": bat.power_plugged,
#     }


def get_cpu():
    def read_cpu():
        with open("/proc/stat") as f:
            line = f.readline()
        parts = list(map(int, line.split()[1:]))
        idle = parts[3]
        total = sum(parts)
        return idle, total

    idle1, total1 = read_cpu()
    time.sleep(0.2)
    idle2, total2 = read_cpu()

    idle_delta = idle2 - idle1
    total_delta = total2 - total1

    usage = 100 * (1 - idle_delta / total_delta) if total_delta else 0

    return {
        "percent": round(usage, 2),
        "per_core": None,
        "cores_logical": os.cpu_count(),
        "cores_physical": None,
        "freq_mhz_current": None,
        "freq_mhz_max": None,
    }


def get_memory():
    meminfo = {}
    with open("/proc/meminfo") as f:
        for line in f:
            k, v = line.split(":")
            meminfo[k] = int(v.strip().split()[0])

    total = meminfo.get("MemTotal", 0)
    free = meminfo.get("MemAvailable", 0)
    used = total - free

    return {
        "total_gb": round(total / 1e6, 2),
        "used_gb": round(used / 1e6, 2),
        "available_gb": round(free / 1e6, 2),
        "percent": round((used / total) * 100, 2) if total else 0,
        "swap_total_gb": 0,
        "swap_used_gb": 0,
        "swap_percent": 0,
    }


def get_disks():
    import shutil

    total, used, free = shutil.disk_usage("/")

    return [{
        "device": "root",
        "mountpoint": "/",
        "fstype": "unknown",
        "total_gb": round(total / 1e9, 2),
        "used_gb": round(used / 1e9, 2),
        "free_gb": round(free / 1e9, 2),
        "percent": round((used / total) * 100, 2),
    }]


def get_network():
    def read_net():
        with open("/proc/net/dev") as f:
            lines = f.readlines()[2:]

        rx, tx = 0, 0
        for line in lines:
            parts = line.split()
            rx += int(parts[1])
            tx += int(parts[9])
        return rx, tx

    rx1, tx1 = read_net()
    time.sleep(0.5)
    rx2, tx2 = read_net()

    return {
        "bytes_sent_total": tx2,
        "bytes_recv_total": rx2,
        "rx_rate_kbps": round((rx2 - rx1) / 0.5 / 1024, 2),
        "tx_rate_kbps": round((tx2 - tx1) / 0.5 / 1024, 2),
        "interfaces": {},  # optional to implement
    }


def get_processes(top_n=10):
    try:
        output = subprocess.check_output("ps -A -o pid,comm,%cpu,%mem", shell=True).decode()
        lines = output.strip().split("\n")[1:]

        procs = []
        for line in lines:
            parts = line.split(None, 3)
            if len(parts) >= 4:
                procs.append({
                    "pid": int(parts[0]),
                    "name": parts[1],
                    "cpu_percent": float(parts[2]),
                    "memory_percent": float(parts[3]),
                })

        procs.sort(key=lambda x: x["cpu_percent"], reverse=True)
        return procs[:top_n]

    except Exception:
        return []   

# ── routes ─────────────────────────────────────────────────────────────────────

@app.get("/stats")
def all_stats():
    """Return every available stat in one shot."""
    return {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "system": {
            "hostname": socket.gethostname(),
            "os": platform.system(),
            "os_version": platform.version(),
            "os_release": platform.release(),
            "architecture": platform.machine(),
            "processor": platform.processor() or platform.machine(),
            "python_version": platform.python_version(),
            "ip": get_ip(),
            "mac": get_mac(),
            "uptime": get_uptime(),
            "boot_time": datetime.fromtimestamp(get_boot_time()).isoformat(),
        },
        "cpu": get_cpu(),
        "memory": get_memory(),
        "disks": get_disks(),
        "network": get_network(),
        # "temperatures": get_temperatures(),   # None on unsupported platforms
        # "fans": get_fans(),                   # None on unsupported platforms
        # "battery": get_battery(),             # None on desktops
        "processes": get_processes(),
    }


@app.get("/stats/cpu")
def cpu_stats():
    return {"timestamp": datetime.utcnow().isoformat() + "Z", **get_cpu()}


@app.get("/stats/memory")
def memory_stats():
    return {"timestamp": datetime.utcnow().isoformat() + "Z", **get_memory()}


@app.get("/stats/disks")
def disk_stats():
    return {"timestamp": datetime.utcnow().isoformat() + "Z", "disks": get_disks()}


@app.get("/stats/network")
def network_stats():
    return {"timestamp": datetime.utcnow().isoformat() + "Z", **get_network()}


# @app.get("/stats/temperatures")
# def temperature_stats():
#     return {"timestamp": datetime.utcnow().isoformat() + "Z", "temperatures": get_temperatures()}


# @app.get("/stats/fans")
# def fan_stats():
#     return {"timestamp": datetime.utcnow().isoformat() + "Z", "fans": get_fans()}


@app.get("/stats/battery")
def battery_stats():
    return {"timestamp": datetime.utcnow().isoformat() + "Z", "battery": get_battery()}


@app.get("/stats/processes")
def process_stats(top: int = 10):
    return {"timestamp": datetime.utcnow().isoformat() + "Z", "processes": get_processes(top)}


@app.get("/health")
def health():
    return {"status": "ok"}