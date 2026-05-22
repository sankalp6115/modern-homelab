"""
HomeLab System Monitor API
Run with: uvicorn monitor_api:app --host 0.0.0.0 --port 8000 --reload
Install deps: pip install fastapi uvicorn psutil
"""

import socket
import platform
import psutil
import time
import subprocess
from datetime import datetime
from typing import Optional

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
    boot = psutil.boot_time()
    delta = int(time.time() - boot)
    d, rem = divmod(delta, 86400)
    h, rem = divmod(rem, 3600)
    m, s   = divmod(rem, 60)
    parts = []
    if d: parts.append(f"{d}d")
    if h: parts.append(f"{h}h")
    if m: parts.append(f"{m}m")
    parts.append(f"{s}s")
    return " ".join(parts)


def get_temperatures() -> Optional[dict]:
    raw = safe(lambda: psutil.sensors_temperatures())
    if not raw:
        return None
    result = {}
    for name, entries in raw.items():
        sensors = []
        for e in entries:
            sensors.append({
                "label": e.label or name,
                "current": e.current,
                "high": e.high,
                "critical": e.critical,
            })
        if sensors:
            result[name] = sensors
    return result or None


def get_fans() -> Optional[list]:
    raw = safe(lambda: psutil.sensors_fans())
    if not raw:
        return None
    fans = []
    for name, entries in raw.items():
        for e in entries:
            fans.append({
                "name": e.label or name,
                "rpm": e.current,
            })
    return fans or None


def get_battery() -> Optional[dict]:
    bat = safe(lambda: psutil.sensors_battery())
    if bat is None:
        return None
    return {
        "percent": round(bat.percent, 1),
        "plugged_in": bat.power_plugged,
        "time_left_secs": bat.secsleft if bat.secsleft not in (psutil.POWER_TIME_UNKNOWN,
                                                                 psutil.POWER_TIME_UNLIMITED) else None,
    }


def get_cpu() -> dict:
    freq = safe(lambda: psutil.cpu_freq())
    return {
        "percent": psutil.cpu_percent(interval=0.2),
        "per_core": psutil.cpu_percent(interval=0.2, percpu=True),
        "cores_logical": psutil.cpu_count(logical=True),
        "cores_physical": psutil.cpu_count(logical=False),
        "freq_mhz_current": round(freq.current, 1) if freq else None,
        "freq_mhz_max": round(freq.max, 1) if freq else None,
    }


def get_memory() -> dict:
    vm = psutil.virtual_memory()
    sw = psutil.swap_memory()
    return {
        "total_gb": round(vm.total / 1e9, 2),
        "used_gb": round(vm.used / 1e9, 2),
        "available_gb": round(vm.available / 1e9, 2),
        "percent": vm.percent,
        "swap_total_gb": round(sw.total / 1e9, 2),
        "swap_used_gb": round(sw.used / 1e9, 2),
        "swap_percent": sw.percent,
    }


def get_disks() -> list:
    disks = []
    for part in psutil.disk_partitions(all=False):
        try:
            usage = psutil.disk_usage(part.mountpoint)
            disks.append({
                "device": part.device,
                "mountpoint": part.mountpoint,
                "fstype": part.fstype,
                "total_gb": round(usage.total / 1e9, 2),
                "used_gb": round(usage.used / 1e9, 2),
                "free_gb": round(usage.free / 1e9, 2),
                "percent": usage.percent,
            })
        except PermissionError:
            pass
    return disks


def get_network() -> dict:
    counters_a = psutil.net_io_counters()
    time.sleep(0.5)
    counters_b = psutil.net_io_counters()
    dt = 0.5

    rx_rate = (counters_b.bytes_recv - counters_a.bytes_recv) / dt
    tx_rate = (counters_b.bytes_sent - counters_a.bytes_sent) / dt

    ifaces = {}
    for name, addrs in psutil.net_if_addrs().items():
        for a in addrs:
            if a.family == socket.AF_INET:
                ifaces[name] = a.address

    return {
        "bytes_sent_total": counters_b.bytes_sent,
        "bytes_recv_total": counters_b.bytes_recv,
        "packets_sent": counters_b.packets_sent,
        "packets_recv": counters_b.packets_recv,
        "rx_rate_kbps": round(rx_rate / 1024, 2),
        "tx_rate_kbps": round(tx_rate / 1024, 2),
        "interfaces": ifaces,
    }


def get_processes(top_n: int = 10) -> list:
    procs = []
    for p in psutil.process_iter(["pid", "name", "cpu_percent", "memory_percent", "status"]):
        try:
            procs.append(p.info)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    procs.sort(key=lambda x: x.get("cpu_percent") or 0, reverse=True)
    return procs[:top_n]


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
            "boot_time": datetime.fromtimestamp(psutil.boot_time()).isoformat(),
        },
        "cpu": get_cpu(),
        "memory": get_memory(),
        "disks": get_disks(),
        "network": get_network(),
        "temperatures": get_temperatures(),   # None on unsupported platforms
        "fans": get_fans(),                   # None on unsupported platforms
        "battery": get_battery(),             # None on desktops
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


@app.get("/stats/temperatures")
def temperature_stats():
    return {"timestamp": datetime.utcnow().isoformat() + "Z", "temperatures": get_temperatures()}


@app.get("/stats/fans")
def fan_stats():
    return {"timestamp": datetime.utcnow().isoformat() + "Z", "fans": get_fans()}


@app.get("/stats/battery")
def battery_stats():
    return {"timestamp": datetime.utcnow().isoformat() + "Z", "battery": get_battery()}


@app.get("/stats/processes")
def process_stats(top: int = 10):
    return {"timestamp": datetime.utcnow().isoformat() + "Z", "processes": get_processes(top)}


@app.get("/health")
def health():
    return {"status": "ok"}