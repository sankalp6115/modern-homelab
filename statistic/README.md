# HomeLab System Monitor

A lightweight FastAPI backend + pure-HTML dashboard to monitor any Linux/macOS/Windows machine in your homelab.

## Files

| File | Purpose |
|------|---------|
| `monitor_api.py` | FastAPI server — exposes `/stats` and sub-endpoints |
| `dashboard.html` | Frontend — open in any browser, no build step needed |
| `requirements.txt` | Python dependencies |

---

## Quick Start

### 1. Install dependencies

```bash
pip install -r requirements.txt
# or with --break-system-packages on newer Debian/Ubuntu
pip install -r requirements.txt --break-system-packages
```

### 2. Run the API

```bash
uvicorn monitor_api:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://<device-ip>:8000`.

### 3. Open the dashboard

Just open `dashboard.html` in any browser (double-click, or `python3 -m http.server 9000`).

Set the API URL field in the top-right to your device's IP, e.g. `http://192.168.1.42:8000`.

The dashboard **auto-refreshes every 5 seconds**.

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /stats` | All stats in one response |
| `GET /stats/cpu` | CPU load, per-core, frequency |
| `GET /stats/memory` | RAM + swap |
| `GET /stats/disks` | All mounted disks |
| `GET /stats/network` | Bandwidth rates + totals |
| `GET /stats/temperatures` | Thermal sensors (if available) |
| `GET /stats/fans` | Fan RPM (if available) |
| `GET /stats/battery` | Battery % and status (if available) |
| `GET /stats/processes` | Top 10 CPU-consuming processes |
| `GET /health` | Health check |

---

## "NIL" values

When a sensor isn't available (e.g. no battery on a desktop, no fans on a Raspberry Pi), the API returns `null` for that field and the dashboard shows a **NIL** card with an explanation — nothing breaks.

---

## Multi-device monitoring

Run `monitor_api.py` on each device. Open one `dashboard.html` per device, or modify the frontend to cycle through multiple API URLs.

---

## Systemd service (optional)

```ini
# /etc/systemd/system/homelab-monitor.service
[Unit]
Description=HomeLab Monitor API
After=network.target

[Service]
ExecStart=/usr/local/bin/uvicorn monitor_api:app --host 0.0.0.0 --port 8000
WorkingDirectory=/opt/homelab-monitor
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now homelab-monitor
```