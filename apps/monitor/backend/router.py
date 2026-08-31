import argparse
import asyncio
import logging
import os
import platform
import socket
import sys
import time
from collections import deque
from typing import Dict, List, Optional
try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("homelab-monitor")

# Initialize FastAPI
router = APIRouter()

# Global variables for Central mode
RUNNING_MODE = "central"  # central or agent
PORT = 44994
DEVICES: Dict[str, Dict] = {}
METRICS_HISTORY: Dict[str, deque] = {}
IS_SCANNING = False

# Models
class DeviceInfo(BaseModel):
    hostname: str
    ip: str
    platform: str
    os_name: str
    arch: str
    role: str
    status: str = "online"

# Helper: Get Local IP
def get_local_ip() -> str:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Doesn't need to connect, just checks route to internet
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        # Fallback
        try:
            ip = socket.gethostbyname(socket.gethostname())
        except Exception:
            ip = "127.0.0.1"
    finally:
        s.close()
    return ip

# System startup time fallback
START_TIME = time.time()

# Fallback state caches
_last_cpu_times = None
_last_cores_times = {}
_last_net_bytes = None
_last_net_time_fallback = None

# Helper: Get Uptime
def get_system_uptime() -> float:
    if PSUTIL_AVAILABLE:
        try:
            return time.time() - psutil.boot_time()
        except Exception:
            pass
    # Fallback Linux/Android
    try:
        with open("/proc/uptime", "r") as f:
            uptime_seconds = float(f.readline().split()[0])
            return uptime_seconds
    except Exception:
        pass
    return time.time() - START_TIME

# Helper: Get CPU Temp
def get_cpu_temp() -> Optional[float]:
    if PSUTIL_AVAILABLE:
        try:
            temps = psutil.sensors_temperatures()
            if temps:
                # Try to find CPU core temperatures
                for name in ["coretemp", "cpu_thermal", "cpu-thermal", "soc_thermal"]:
                    if name in temps:
                        return temps[name][0].current
                # Fallback to the first temperature sensor found
                for sensor_list in temps.values():
                    if sensor_list:
                        return sensor_list[0].current
        except Exception:
            pass
            
    # Fallback Linux/Android
    try:
        for i in range(10):
            path = f"/sys/class/thermal/thermal_zone{i}/temp"
            if os.path.exists(path):
                with open(path, "r") as f:
                    temp_raw = int(f.read().strip())
                if temp_raw > 1000:
                    return temp_raw / 1000.0
                elif temp_raw > 0:
                    return float(temp_raw)
    except Exception:
        pass
    return None

# Helper: Get Fans
def get_fan_speed() -> Optional[int]:
    if PSUTIL_AVAILABLE:
        try:
            fans = psutil.sensors_fans()
            if fans:
                for fan_list in fans.values():
                    if fan_list:
                        return fan_list[0].current
        except Exception:
            pass
    return None

# Helper: Get Battery
def get_battery_info() -> Optional[Dict]:
    if PSUTIL_AVAILABLE:
        try:
            battery = psutil.sensors_battery()
            if battery is not None:
                return {
                    "percent": battery.percent,
                    "power_plugged": battery.power_plugged,
                    "secsleft": battery.secsleft if battery.secsleft != psutil.POWER_TIME_UNLIMITED else -1
                }
        except Exception:
            pass
            
    # Fallback Linux/Android
    capacity_paths = [
        "/sys/class/power_supply/battery/capacity",
        "/sys/class/power_supply/usb/capacity"
    ]
    status_paths = [
        "/sys/class/power_supply/battery/status",
        "/sys/class/power_supply/usb/status"
    ]
    
    percent = None
    plugged = False
    
    for path in capacity_paths:
        try:
            if os.path.exists(path):
                with open(path, "r") as f:
                    percent = int(f.read().strip())
                break
        except Exception:
            continue
            
    if percent is None:
        return None
        
    for path in status_paths:
        try:
            if os.path.exists(path):
                with open(path, "r") as f:
                    status = f.read().strip().lower()
                plugged = status in ["charging", "full"]
                break
        except Exception:
            continue
            
    return {
        "percent": percent,
        "power_plugged": plugged,
        "secsleft": -1
    }

# Helper: Get Network Speeds (bytes sent/received)
_last_net_io = None
_last_net_time = None

def get_network_rates() -> Dict[str, float]:
    global _last_net_io, _last_net_time, _last_net_bytes, _last_net_time_fallback
    current_time = time.time()
    
    # 1. Try psutil
    if PSUTIL_AVAILABLE:
        try:
            current_io = psutil.net_io_counters()
            rx_speed = 0.0
            tx_speed = 0.0

            if _last_net_io is not None and _last_net_time is not None:
                time_diff = current_time - _last_net_time
                if time_diff > 0:
                    rx_speed = (current_io.bytes_recv - _last_net_io.bytes_recv) / time_diff
                    tx_speed = (current_io.bytes_sent - _last_net_io.bytes_sent) / time_diff

            _last_net_io = current_io
            _last_net_time = current_time

            return {
                "rx_bytes_sec": max(0.0, rx_speed),
                "tx_bytes_sec": max(0.0, tx_speed)
            }
        except Exception:
            pass
            
    # 2. Fallback Linux/Android /proc/net/dev
    rx_sum = 0
    tx_sum = 0
    try:
        if os.path.exists("/proc/net/dev"):
            with open("/proc/net/dev", "r") as f:
                lines = f.readlines()
            for line in lines[2:]:
                parts = line.split()
                if len(parts) >= 9:
                    if ":" in parts[0]:
                        rx_bytes = int(parts[1])
                        tx_bytes = int(parts[8])
                    else:
                        rx_bytes = int(parts[2])
                        tx_bytes = int(parts[9])
                    
                    if "lo" not in parts[0]:
                        rx_sum += rx_bytes
                        tx_sum += tx_bytes
    except Exception:
        pass

    rx_speed = 0.0
    tx_speed = 0.0

    if _last_net_bytes is not None and _last_net_time_fallback is not None:
        time_diff = current_time - _last_net_time_fallback
        if time_diff > 0:
            prev_rx, prev_tx = _last_net_bytes
            rx_speed = (rx_sum - prev_rx) / time_diff
            tx_speed = (tx_sum - prev_tx) / time_diff

    _last_net_bytes = (rx_sum, tx_sum)
    _last_net_time_fallback = current_time

    return {
        "rx_bytes_sec": max(0.0, rx_speed),
        "tx_bytes_sec": max(0.0, tx_speed)
    }

# Fallback CPU metrics parser
def get_cpu_percent_fallback() -> float:
    global _last_cpu_times
    try:
        with open("/proc/stat", "r") as f:
            line = f.readline()
        if line.startswith("cpu"):
            parts = line.split()
            fields = [float(x) for x in parts[1:]]
            idle = fields[3] + (fields[4] if len(fields) > 4 else 0.0)
            total = sum(fields)
            
            current_time = time.time()
            if _last_cpu_times is None:
                _last_cpu_times = (current_time, total, idle)
                return 0.0
                
            prev_time, prev_total, prev_idle = _last_cpu_times
            total_diff = total - prev_total
            idle_diff = idle - prev_idle
            _last_cpu_times = (current_time, total, idle)
            
            if total_diff > 0:
                return round((1.0 - (idle_diff / total_diff)) * 100, 1)
    except Exception:
        pass
    return 0.0

def get_cpu_cores_fallback() -> List[float]:
    global _last_cores_times
    cores = os.cpu_count() or 1
    cpu_list = []
    try:
        with open("/proc/stat", "r") as f:
            lines = f.readlines()
        core_stats = []
        for line in lines:
            if line.startswith("cpu") and line[3].isdigit():
                parts = line.split()
                name = parts[0]
                fields = [float(x) for x in parts[1:]]
                idle = fields[3] + (fields[4] if len(fields) > 4 else 0.0)
                total = sum(fields)
                core_stats.append((name, total, idle))
                
        for name, total, idle in core_stats:
            if name in _last_cores_times:
                prev_total, prev_idle = _last_cores_times[name]
                total_diff = total - prev_total
                idle_diff = idle - prev_idle
                if total_diff > 0:
                    cpu_list.append(round((1.0 - (idle_diff / total_diff)) * 100, 1))
                else:
                    cpu_list.append(0.0)
            else:
                cpu_list.append(0.0)
            _last_cores_times[name] = (total, idle)
            
        if not cpu_list:
            cpu_list = [0.0] * cores
    except Exception:
        cpu_list = [0.0] * cores
    return cpu_list

# Fallback Memory metrics parser
def get_ram_fallback() -> Dict:
    try:
        meminfo = {}
        with open("/proc/meminfo", "r") as f:
            for line in f:
                parts = line.split()
                if len(parts) >= 2:
                    key = parts[0].replace(":", "")
                    val = int(parts[1]) * 1024
                    meminfo[key] = val
                    
        total = meminfo.get("MemTotal", 0)
        free = meminfo.get("MemFree", 0)
        buffers = meminfo.get("Buffers", 0)
        cached = meminfo.get("Cached", 0)
        available = meminfo.get("MemAvailable", free + buffers + cached)
        used = total - available
        
        percent = (used / total * 100) if total > 0 else 0.0
        return {
            "total": total,
            "available": available,
            "used": used,
            "free": free,
            "percent": round(percent, 1)
        }
    except Exception:
        pass
    return {
        "total": 0,
        "available": 0,
        "used": 0,
        "free": 0,
        "percent": 0.0
    }

# Fallback Disk metrics parser
def get_disk_fallback() -> List[Dict]:
    disks = []
    paths_to_check = ["/", "/data/data/com.termux/files/home", os.environ.get("HOME", "")]
    seen_paths = set()
    for path in paths_to_check:
        if not path or not os.path.exists(path):
            continue
        real_path = os.path.realpath(path)
        if real_path in seen_paths:
            continue
        seen_paths.add(real_path)
        
        try:
            stat = os.statvfs(real_path)
            total = stat.f_blocks * stat.f_frsize
            free = stat.f_bavail * stat.f_frsize
            used = total - free
            percent = (used / total * 100) if total > 0 else 0.0
            disks.append({
                "device": "root" if real_path == "/" else "storage",
                "mountpoint": real_path,
                "fstype": "ext4",
                "total": total,
                "used": used,
                "free": free,
                "percent": round(percent, 1)
            })
        except Exception:
            continue
    return disks

# Fallback Processes parser
def get_processes_fallback() -> List[Dict]:
    processes = []
    import subprocess
    
    # Try 1: ps Ao
    try:
        res = subprocess.run(["ps", "-A", "-o", "pid,user,%cpu,%mem,comm"], capture_output=True, text=True, timeout=1.0)
        if res.returncode == 0:
            lines = res.stdout.strip().split("\n")
            for line in lines[1:]:
                parts = line.split()
                if len(parts) >= 5:
                    try:
                        pid = int(parts[0])
                        user = parts[1]
                        cpu = float(parts[2])
                        mem = float(parts[3])
                        name = " ".join(parts[4:])
                        processes.append({
                            "pid": pid,
                            "name": name,
                            "username": user,
                            "cpu_percent": cpu,
                            "memory_percent": mem
                        })
                    except ValueError:
                        continue
            if processes:
                return sorted(processes, key=lambda x: x['cpu_percent'], reverse=True)[:10]
    except Exception:
        pass

    # Try 2: top -n 1
    try:
        res = subprocess.run(["top", "-n", "1"], capture_output=True, text=True, timeout=1.0)
        if res.returncode == 0:
            lines = res.stdout.split("\n")
            header_idx = -1
            for idx, line in enumerate(lines):
                if "PID" in line and ("CPU" in line or "%CPU" in line or "Name" in line or "COMMAND" in line):
                    header_idx = idx
                    break
            
            if header_idx != -1:
                cols = lines[header_idx].split()
                pid_col = cols.index("PID") if "PID" in cols else 0
                user_col = cols.index("USER") if "USER" in cols else 1
                
                cpu_col = -1
                for c in ["CPU%", "%CPU", "CPU"]:
                    if c in cols:
                        cpu_col = cols.index(c)
                        break
                
                mem_col = -1
                for c in ["%MEM", "MEM", "RSS"]:
                    if c in cols:
                        mem_col = cols.index(c)
                        break
                        
                name_col = -1
                for c in ["Name", "COMMAND", "ARGS"]:
                    if c in cols:
                        name_col = cols.index(c)
                        break
                
                if cpu_col == -1: cpu_col = 4
                if mem_col == -1: mem_col = 9
                if name_col == -1: name_col = len(cols) - 1
                
                for line in lines[header_idx+1:]:
                    parts = line.split()
                    if len(parts) >= max(pid_col, user_col, cpu_col, mem_col, name_col) + 1:
                        try:
                            pid = int(parts[pid_col])
                            user = parts[user_col]
                            cpu = float(parts[cpu_col].replace("%", ""))
                            mem_str = parts[mem_col].replace("%", "")
                            
                            if "m" in mem_str.lower():
                                mem = float(mem_str.lower().replace("m", "")) / 100.0
                            elif "g" in mem_str.lower():
                                mem = float(mem_str.lower().replace("g", "")) * 10.0
                            else:
                                try:
                                    mem = float(mem_str)
                                    if mem > 100:
                                        mem = (mem * 1024 / 8e9) * 100.0
                                except ValueError:
                                    mem = 0.0
                            
                            name = " ".join(parts[name_col:])
                            processes.append({
                                "pid": pid,
                                "name": name,
                                "username": user,
                                "cpu_percent": cpu,
                                "memory_percent": round(min(mem, 100.0), 1)
                            })
                        except Exception:
                            continue
            if processes:
                return sorted(processes, key=lambda x: x['cpu_percent'], reverse=True)[:10]
    except Exception:
        pass

    # Option 3: Fallback process (Self process info)
    return [
        {"pid": os.getpid(), "name": "python3 (homelab-monitor)", "username": "termux", "cpu_percent": 1.0, "memory_percent": 0.5}
    ]

# Endpoint: Info (All Modes)
@router.get("/api/info", response_model=DeviceInfo)
def get_info():
    return DeviceInfo(
        hostname=socket.gethostname(),
        ip=get_local_ip(),
        platform=platform.system(),
        os_name=f"{platform.system()} {platform.release()}",
        arch=platform.machine(),
        role=RUNNING_MODE,
        status="online"
    )

# Endpoint: Metrics (All Modes)
@router.get("/api/metrics")
def get_metrics():
    # 1. CPU Metrics
    cpu_percent = 0.0
    cpu_cores = [0.0]
    if PSUTIL_AVAILABLE:
        try:
            cpu_percent = psutil.cpu_percent(interval=None)
            cpu_cores = psutil.cpu_percent(interval=None, percpu=True)
        except Exception:
            cpu_percent = get_cpu_percent_fallback()
            cpu_cores = get_cpu_cores_fallback()
    else:
        cpu_percent = get_cpu_percent_fallback()
        cpu_cores = get_cpu_cores_fallback()

    try:
        load_avg = os.getloadavg()
    except Exception:
        try:
            if PSUTIL_AVAILABLE:
                load_avg = psutil.getloadavg()
            else:
                load_avg = (0.0, 0.0, 0.0)
        except Exception:
            load_avg = (0.0, 0.0, 0.0)

    # 2. RAM Metrics
    ram = None
    if PSUTIL_AVAILABLE:
        try:
            vm = psutil.virtual_memory()
            ram = {
                "total": vm.total,
                "available": vm.available,
                "used": vm.used,
                "free": vm.free,
                "percent": vm.percent
            }
        except Exception:
            ram = get_ram_fallback()
    else:
        ram = get_ram_fallback()

    # 3. Disk Metrics
    disks = []
    if PSUTIL_AVAILABLE:
        try:
            for part in psutil.disk_partitions(all=False):
                if part.mountpoint:
                    try:
                        usage = psutil.disk_usage(part.mountpoint)
                        disks.append({
                            "device": part.device,
                            "mountpoint": part.mountpoint,
                            "fstype": part.fstype,
                            "total": usage.total,
                            "used": usage.used,
                            "free": usage.free,
                            "percent": usage.percent
                        })
                    except (PermissionError, FileNotFoundError):
                        continue
        except Exception:
            disks = get_disk_fallback()
    else:
        disks = get_disk_fallback()

    # 4. Top Processes
    processes = []
    if PSUTIL_AVAILABLE:
        try:
            for proc in psutil.process_iter(attrs=['pid', 'name', 'username', 'cpu_percent', 'memory_percent']):
                try:
                    processes.append({
                        "pid": proc.info['pid'],
                        "name": proc.info['name'] or "Unknown",
                        "username": proc.info['username'] or "root",
                        "cpu_percent": proc.info['cpu_percent'] or 0.0,
                        "memory_percent": proc.info['memory_percent'] or 0.0
                    })
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    continue
            processes = sorted(processes, key=lambda x: x['cpu_percent'], reverse=True)[:10]
        except Exception:
            processes = get_processes_fallback()
    else:
        processes = get_processes_fallback()

    # 5. Network Stats
    net_rates = get_network_rates()

    # Create response
    return {
        "timestamp": time.time(),
        "uptime": get_system_uptime(),
        "cpu": {
            "percent": cpu_percent,
            "cores": cpu_cores,
            "load_avg": load_avg
        },
        "ram": ram,
        "disks": disks,
        "network": net_rates,
        "battery": get_battery_info(),
        "fan": get_fan_speed(),
        "temperature": get_cpu_temp(),
        "processes": processes
    }

# ================= CENTRAL MODE ONLY ENDPOINTS =================

@router.get("/api/devices")
def get_devices():
    if RUNNING_MODE != "central":
        raise HTTPException(status_code=403, detail="Not a central node")
    return list(DEVICES.values())

@router.get("/api/devices/{device_ip}/metrics")
def get_device_metrics(device_ip: str):
    if RUNNING_MODE != "central":
        raise HTTPException(status_code=403, detail="Not a central node")

    # If it is the central server itself
    local_ip = get_local_ip()
    if device_ip == local_ip:
        current_m = get_metrics()
        history = list(METRICS_HISTORY.get(local_ip, []))
        return {"current": current_m, "history": history}

    # If it is a registered device
    if device_ip not in DEVICES:
        raise HTTPException(status_code=404, detail="Device not found")

    device = DEVICES[device_ip]
    if device["status"] == "offline":
        return {"current": None, "history": list(METRICS_HISTORY.get(device_ip, []))}

    # Fetch current metrics or return cached if offline
    history = list(METRICS_HISTORY.get(device_ip, []))
    current_m = history[-1] if history else None
    return {"current": current_m, "history": history}

@router.post("/api/scan")
def trigger_scan(background_tasks: BackgroundTasks):
    global IS_SCANNING
    if RUNNING_MODE != "central":
        raise HTTPException(status_code=403, detail="Not a central node")

    if IS_SCANNING:
        return {"status": "scanning", "message": "Scan already in progress"}

    IS_SCANNING = True
    background_tasks.add_task(scan_subnet_task)
    return {"status": "ok", "message": "Subnet scan triggered"}

@router.get("/health")
async def health():
    return {"status": "ok"}

# ================= BACKGROUND TASKS (CENTRAL MODE) =================

async def probe_ip(client, ip: str) -> Optional[Dict]:
    if not HTTPX_AVAILABLE:
        return None
    url = f"http://{ip}:{PORT}/api/info"
    try:
        response = await client.get(url, timeout=0.8)
        if response.status_code == 200:
            data = response.json()
            if data.get("role") in ["agent", "central"]:
                data["status"] = "online"
                return data
    except Exception:
        pass
    return None

async def scan_subnet_task():
    global IS_SCANNING, DEVICES
    if not HTTPX_AVAILABLE:
        logger.error("httpx is not installed. Subnet scanning disabled.")
        IS_SCANNING = False
        return

    logger.info("Starting subnet scanning...")
    local_ip = get_local_ip()
    parts = local_ip.split(".")
    if len(parts) != 4:
        IS_SCANNING = False
        return

    subnet_prefix = ".".join(parts[:3])  # E.g. 192.168.1

    # Keep central device registered
    if local_ip not in DEVICES:
        try:
            my_info = get_info()
            DEVICES[local_ip] = my_info.dict()
            if local_ip not in METRICS_HISTORY:
                METRICS_HISTORY[local_ip] = deque(maxlen=30)
        except Exception as e:
            logger.error(f"Error registering central device: {e}")

    # Scan the /24 subnet (1 to 254) in chunks of 50 to avoid file descriptor limits
    chunk_size = 50
    ips_to_scan = [f"{subnet_prefix}.{i}" for i in range(1, 255) if f"{subnet_prefix}.{i}" != local_ip]

    discovered = {}
    async with httpx.AsyncClient() as client:
        for i in range(0, len(ips_to_scan), chunk_size):
            chunk = ips_to_scan[i:i+chunk_size]
            tasks = [probe_ip(client, ip) for ip in chunk]
            results = await asyncio.gather(*tasks)

            for ip, result in zip(chunk, results):
                if result:
                    discovered[ip] = result

    # Update global devices list
    # Anything previously discovered that isn't online anymore gets marked offline
    for ip, dev in list(DEVICES.items()):
        if ip == local_ip:
            continue
        if ip in discovered:
            DEVICES[ip] = discovered[ip]
        else:
            DEVICES[ip]["status"] = "offline"

    # Add newly discovered ones
    for ip, dev in discovered.items():
        if ip not in DEVICES:
            DEVICES[ip] = dev
        if ip not in METRICS_HISTORY:
            METRICS_HISTORY[ip] = deque(maxlen=30)

    logger.info(f"Subnet scanning complete. Discovered: {list(discovered.keys())}")
    IS_SCANNING = False

async def poll_devices_task():
    while True:
        if RUNNING_MODE != "central":
            await asyncio.sleep(5)
            continue

        # Poll central device
        local_ip = get_local_ip()
        try:
            metrics = get_metrics()
            if local_ip not in METRICS_HISTORY:
                METRICS_HISTORY[local_ip] = deque(maxlen=30)
            METRICS_HISTORY[local_ip].append(metrics)
        except Exception as e:
            logger.error(f"Error polling local metrics: {e}")

        # Poll online agents
        if not HTTPX_AVAILABLE:
            await asyncio.sleep(10)
            continue

        online_ips = [ip for ip, dev in DEVICES.items() if ip != local_ip and dev["status"] == "online"]
        if online_ips:
            async with httpx.AsyncClient() as client:
                tasks = []
                for ip in online_ips:
                    tasks.append(client.get(f"http://{ip}:{PORT}/api/metrics", timeout=1.5))

                results = await asyncio.gather(*tasks, return_exceptions=True)

                for ip, res in zip(online_ips, results):
                    if isinstance(res, Exception):
                        logger.warning(f"Failed to poll device {ip}: {res}")
                        DEVICES[ip]["status"] = "offline"
                    elif res.status_code == 200:
                        try:
                            m_data = res.json()
                            if ip not in METRICS_HISTORY:
                                                    METRICS_HISTORY[ip] = deque(maxlen=30)
                            METRICS_HISTORY[ip].append(m_data)
                        except Exception as e:
                            logger.error(f"Error parsing metrics for {ip}: {e}")
                    else:
                        logger.warning(f"Device {ip} returned code {res.status_code}")
                        DEVICES[ip]["status"] = "offline"

        await asyncio.sleep(10)

async def auto_scan_loop():
    while True:
        if RUNNING_MODE == "central" and not IS_SCANNING:
            try:
                await scan_subnet_task()
            except Exception as e:
                logger.error(f"Error in automatic background scan: {e}")
        # Scan subnet every 60 seconds
        await asyncio.sleep(60)

# ================= APP LIFECYCLE =================

@router.on_event("startup")
async def startup_event():
    # Warm up first net metric
    get_network_rates()

    if RUNNING_MODE == "central":
        logger.info("Initializing background tasks for central monitoring...")
        # Trigger initial scan
        asyncio.create_task(scan_subnet_task())
        # Start background poll task
        asyncio.create_task(poll_devices_task())
        # Start automatic background subnet scan loop
        asyncio.create_task(auto_scan_loop())
    else:
        logger.info("Running in Agent Mode. Subnet scanning disabled.")

# def main():
#     global RUNNING_MODE, PORT
#     parser = argparse.ArgumentParser(description="Homelab System Monitor Agent & Central Dashboard Server")
#     parser.add_argument("--mode", type=str, choices=["agent", "central"], default="central",
#                         help="Run mode: 'agent' to just expose API metrics, 'central' to run dashboard server & scanner")
#     parser.add_argument("--port", type=int, default=18000,
#                         help="Port to run the service on (default: 18000)")
#     parser.add_argument("--host", type=str, default="0.0.0.0",
#                         help="Host IP to bind the service (default: 0.0.0.0)")
#     args = parser.parse_args()

#     RUNNING_MODE = args.mode
#     PORT = args.port

#     logger.info(f"Starting homelab-monitor in {RUNNING_MODE} mode on port {PORT}...")
#     uvicorn.run(app, host=args.host, port=args.port)

