# 🏠 My Homelab

A personal homelab built around running small servers and tools on everyday devices - including Android phones running **Termux** and local Linux/Windows machines.

This is where I learn, break things, and build stuff that actually runs on my own hardware.

---

## What is a Homelab?

A **homelab** is a personal computing setup where you run your own servers and services at home - instead of relying on cloud providers like AWS or Google. People use homelabs to:

- Learn how servers, networking, and operating systems work
- Host their own apps and files privately
- Experiment with technologies without paying for cloud resources

Think of it like having your own mini data center at home - except it's just a phone, a laptop, and a bunch of Python scripts.

---

## How I'm Doing It

My homelab is built around a simple idea: **run useful services on devices I already own**, accessible from anywhere on my local network (and sometimes beyond).

Here's the setup:

- **Android phone running Termux** - A Linux-like terminal emulator for Android. This acts as a small always-on server (file storage, stats monitor, API server).
- **Windows/Mac machine** - Used for heavier tasks like screen streaming and remote control.
- **Local network** - All devices communicate over Wi-Fi using their local IP addresses (e.g., `192.168.x.x`).

---

## Concepts I'm Learning

Here are some real networking and system concepts I'm applying while building these apps:

### 🖥️ Host

A **host** is any device on a network that can send or receive data. My phone, my laptop - each is a "host." When I run a server on one of them, it becomes a host that other devices can connect to.

### 🌐 IP Address & Ports

Every device on a network has an **IP address** (like `192.168.0.105`). A **port** is like a door on that IP - different apps listen on different ports. For example, my file server runs on port `8000`, while another app might use port `3000`.

### 🔁 Reverse Proxy

A **reverse proxy** sits in front of your servers and routes incoming requests to the right one. Instead of accessing `192.168.0.105:8000` and `192.168.0.105:3000` separately, a reverse proxy lets you use one address (like `myphone.local`) and routes traffic behind the scenes. Tools like **Nginx** or **Caddy** do this. (Planned for future use in this homelab.)

### ⚖️ Load Balancer

A **load balancer** distributes incoming traffic across multiple server instances so no single one gets overwhelmed. Think of it as a traffic cop for your servers. Useful when you want high availability or need to scale.

### 🖧 Virtual Machines (VMs)

A **virtual machine** is a simulated computer running inside your real one. You can run a full Linux OS inside Windows, for example. Tools like VirtualBox or VMware make this possible. VMs are great for testing and isolation.

### 🔒 HTTPS & SSL/TLS

**HTTPS** means your connection is encrypted. On the internet, this uses certificates from trusted authorities. In a homelab, you generate your own **self-signed certificates** - your browser will warn you, but the connection is still encrypted. My file server does this.

### 🔌 WebSocket

**WebSockets** allow a persistent, two-way connection between a browser and a server - unlike regular HTTP which is one-shot request/response. I use WebSockets in my remote keybinder to send keyboard/mouse events in real time.

### 📡 WebRTC

**WebRTC** is a browser technology for peer-to-peer video, audio, and data transfer. It's what powers video calls (like Google Meet). I use it to stream my PC screen to a browser with very low latency.

### 🐍 FastAPI & Uvicorn

**FastAPI** is a Python web framework for building APIs quickly. **Uvicorn** is the server that runs FastAPI apps. Most of my homelab apps use this stack.

### 🟩 Node.js & Express

**Node.js** lets you run JavaScript on the server. **Express** is a minimal web framework for Node. I use this for my idea inbox app.

---

## Apps in This Homelab

| App | What it does | Stack |
|-----|-------------|-------|
| [📁 PhoneNAS (File Server)](#-phonenas---file-server) | Cloud-style file storage on your phone | Python, FastAPI |
| [📊 Statistic (System Monitor)](#-statistic---system-monitor) | Live dashboard of CPU, RAM, disk, network | Python, FastAPI |
| [🎮 Keybinder (Remote Desktop)](#-keybinder---remote-desktop) | Control your PC from any browser | Python, WebRTC |
| [📥 Idea Inbox](#-idea-inbox) | Cross-device sticky note / scratchpad | Node.js, Express |
| [💬 Quotes API](#-quotes-api) | Serve random quotes over HTTP | Python, FastAPI |
| [📺 YT Downloader](#-yt-downloader---youtube-downloader) | Download YouTube videos from a browser UI | Python, Flask |
| [📡 Ping Tester](#-ping-tester) | Scan your network for active devices | Python script |

---

## 📁 PhoneNAS - File Server

> **Folder:** `file-server/`

### What it does

PhoneNAS turns your Android phone (or any machine) into a personal cloud storage device - like a mini Google Drive on your local network. You can upload, download, organize, and stream files from any browser on the same Wi-Fi.

### How it works

- A **FastAPI** backend handles all file operations (upload, download, move, copy, delete, rename).
- Files are stored in a `storage/` folder, organized per user.
- A modern HTML/CSS frontend (served by the same server) provides the UI.
- **HTTPS** is enabled using a self-signed SSL certificate so your connection is encrypted, even locally.
- **Multi-user auth** - each user logs in and gets their own isolated storage space.
- **Streaming support** - media files (video, audio) support HTTP Range requests, so they can be played/seeked in the browser without downloading fully.

### Key concepts used

- **FastAPI** for routing and API design
- **Cookie-based session auth** (hashed passwords stored in a CSV)
- **SSL/TLS** via a self-generated certificate (`generate_certs.py`)
- **HTTP Range Requests** for media streaming
- **ZIP streaming** for bulk downloads

### How to run

```bash
chmod +x run.sh
./run.sh
# Open https://localhost:8000 in your browser
```

[→ Full README](file-server/README.md)

---

## 📊 Statistic - System Monitor

> **Folder:** `statistic/`

### What it does

A lightweight dashboard that shows live system stats for any machine running the agent - CPU load, RAM usage, disk space, network speed, temperatures, and running processes. Think of it as a personal Grafana, but simpler.

### How it works

- **Backend (`server.py`)** - A FastAPI app that uses the `psutil` Python library to read hardware metrics. It exposes clean JSON endpoints like `/stats/cpu`, `/stats/memory`, etc.
- **Frontend (`index.html`)** - A pure HTML/CSS/JS dashboard that polls the API every 5 seconds and updates the UI without a page refresh.
- You can run the agent on multiple machines (your phone, your laptop, your Raspberry Pi) and open separate dashboards for each.

### Key concepts used

- **psutil** - Python library for reading system hardware info cross-platform
- **REST API design** - separate endpoint per resource type
- **Auto-refresh polling** - frontend fetches fresh data every 5s
- **CORS** - enabled so the dashboard can talk to an API on a different IP
- **Systemd service** - can be configured to run on boot automatically

### How to run

```bash
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8000
# Open index.html in your browser, set the API URL to your device's IP
```

[→ Full README](statistic/README.md)

---

## 🎮 Keybinder - Remote Desktop

> **Folder:** `keybinder/`

### What it does

Keybinder turns any browser into a remote desktop client. Open the webpage on your phone or tablet, and you get a live video stream of your PC screen. Your keyboard and mouse inputs are sent back to the PC in real time - letting you control it remotely.

### How it works

- **Screen capture** - The server captures the PC screen using `dxcam` (GPU-accelerated, Windows) or `mss` (fallback, cross-platform).
- **WebRTC** - The video stream is sent to the browser using WebRTC, a peer-to-peer protocol designed for low-latency video. This is the same technology used in video calls.
- **WebSocket signaling** - Before the WebRTC video call starts, the browser and server exchange connection information (called an SDP offer/answer) over a WebSocket.
- **Input forwarding** - Keyboard and mouse events captured in the browser are sent back to the server via a WebRTC DataChannel (or WebSocket fallback), and `pynput` replays them on the PC.

### Key concepts used

- **WebRTC** - peer-to-peer low-latency video streaming
- **WebSocket** - used for signaling (setting up the WebRTC connection)
- **SDP (Session Description Protocol)** - the "handshake" data exchanged to establish a WebRTC connection
- **ICE (Interactive Connectivity Establishment)** - how WebRTC finds the best network path
- **pynput** - Python library to simulate keyboard and mouse input
- **dxcam / mss** - screen capture libraries

### How to run

```bash
pip install fastapi uvicorn pynput aiortc av opencv-python mss
python server.py
# Open index.html in a browser on any device on the same network
```

---

## 📥 Idea Inbox

> **Folder:** `idea-inbox/`

### What it does

A dead-simple cross-device scratchpad. Whatever you type in the browser is saved to a file on the server. Open it on another device, and your text is right there. Think of it as a persistent sticky note that lives on your homelab.

### How it works

- **Backend (Node.js + Express)** - A tiny Express server with two endpoints: `GET /api/text` reads the current text from a file, and `POST /api/text` writes new text to it.
- **Frontend** - A plain HTML page with a text area. It loads the current text on page load, and saves on every change automatically.
- The text is persisted in a flat `data.txt` file on the server - no database needed.

### Key concepts used

- **Node.js** - running JavaScript on the server side
- **Express** - minimal web framework for routing
- **REST API** - GET to read, POST to write
- **File I/O** - reading and writing text files as persistent storage

### How to run

```bash
cd idea-inbox
npm install
node server/index.js
# Open client/index.html in your browser
```

---

## 💬 Quotes API

> **Folder:** `quotes/`

### What it does

A minimal API server that serves a random quote every time you hit the `/quote` endpoint. Simple, but great for learning API design and integrating with other services or dashboards.

### How it works

- A FastAPI app loads a large `quotes.json` file into memory on startup.
- Every request to `GET /quote` picks a random quote and returns it as JSON with `quote` and `author` fields.
- No database - just a JSON file read once at boot.

### Key concepts used

- **FastAPI startup events** - loading data once when the server starts
- **In-memory state** - storing the quotes list in `app.state` to avoid re-reading the file every request
- **Random selection** - `random.choice()` over a list

### How to run

```bash
pip install fastapi uvicorn
uvicorn server:app --host 0.0.0.0 --port 8001
# Visit http://localhost:8001/quote in your browser
```

---

## 📺 YT Downloader - YouTube Downloader

> **Folder:** `yt-downloader/`

### What it does

A clean browser UI for downloading YouTube videos and playlists. You paste a URL, pick a quality (or audio-only), and hit download - the server does the rest using `yt-dlp`.

### How it works

- **Backend (Flask)** - A Python Flask server with three endpoints:
  - `GET /` - serves the frontend HTML page
  - `POST /api/info` - fetches video metadata (title, thumbnail, available formats) without downloading
  - `POST /api/download` - triggers the actual download using `yt-dlp` with your selected format/quality
- **Frontend** - A single HTML page with embedded CSS and JS. It shows video info dynamically after you paste a URL, lets you choose quality, and initiates the download.
- Downloaded files are saved to a `downloads/` folder on the server.

### Key concepts used

- **yt-dlp** - a powerful command-line tool (used as a Python library) for downloading from YouTube and hundreds of other sites
- **Flask** - lightweight Python web framework
- **Jinja2 templates** - Flask's built-in HTML templating
- **Format selection** - yt-dlp supports choosing specific video resolutions and codecs

### How to run

```bash
pip install flask yt-dlp
python3 server.py
# Open http://localhost:5000 in your browser
```

[→ Full README](yt-downloader/README.md)

---

## 📡 Ping Tester

> **File:** `ping-tester.py`

### What it does

A quick utility script that scans your entire local network (`192.168.0.1` to `192.168.0.254`) and prints the IP addresses of all devices that are currently online.

### How it works

- Runs `ping -c 1` (one ping) against each IP address in the subnet.
- Uses a **ThreadPoolExecutor** with 50 workers to run all 254 pings in parallel instead of one by one (which would take forever).
- Collects results and prints only the IPs that responded.

### Key concepts used

- **ICMP ping** - a network diagnostic tool that checks if a host is reachable
- **Subnet scanning** - checking all addresses in a network range
- **Concurrency with ThreadPoolExecutor** - running many tasks in parallel to save time
- **Process spawning** - using Python's `subprocess` module to run shell commands

### How to run

```bash
python3 ping-tester.py
# Output: list of active IPs on your local network
```

---

## Project Structure

```
TermuxExpts/
├── file-server/        # PhoneNAS - multi-user HTTPS file server
├── statistic/          # System monitor dashboard
├── keybinder/          # WebRTC remote desktop
├── idea-inbox/         # Cross-device scratchpad
├── quotes/             # Random quotes API
├── yt-downloader/      # YouTube video downloader
├── ping-tester.py      # Network scanner utility
├── melodious           # Smart music player  
└── README.md           # This file
```

---

## What's Next

Some things I want to add to this homelab:

- [ ] **Nginx reverse proxy** - one URL to rule all apps
- [ ] **Systemd services** - make every app start on boot automatically
- [ ] **Tailscale / VPN** - access the homelab from outside my home network
- [ ] **Monitoring dashboard** - combine the statistic app with alerts
- [ ] **Docker** - containerize each app for cleaner deployment
