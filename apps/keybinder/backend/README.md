# 🎮 Keybinder - Remote Desktop via WebRTC

Control your PC from any browser on your local network. Keybinder streams your screen live and forwards your keyboard and mouse inputs back to the machine — all in real time, with low latency.

---

## What It Does

- **Live screen stream** — See your PC's screen in the browser (60 FPS target)
- **Keyboard forwarding** — Every key you press in the browser is replayed on the PC
- **Mouse forwarding** — Move, click, and scroll in the browser, it happens on the PC
- **Auto-reconnect** — If the connection drops, the browser automatically tries to reconnect

This is essentially a lightweight remote desktop, but it runs entirely in the browser using standard web technologies — no special client software needed.

---

## How It Works

### The Big Picture

```
Browser (phone/tablet)         PC (running server.py)
       |                               |
       |--- WebSocket (signaling) ---->|
       |<-- SDP Answer + ICE ---------|
       |                               |
       |<========= WebRTC Video =======| (screen stream, low latency)
       |                               |
       |--- WebRTC DataChannel ------->| (keyboard/mouse events)
       |                               |
       |              pynput replays inputs on the OS
```

### Step-by-step

1. **Browser connects** to the server via WebSocket (`/ws`)
2. **WebRTC handshake (signaling):**
   - Browser creates an SDP offer (a description of what video/audio it wants)
   - Server receives the offer, attaches a screen capture track, creates an SDP answer
   - Both sides exchange ICE candidates (network info for finding each other)
3. **Video stream begins** — the server captures the screen using `dxcam` (GPU-accelerated on Windows) or `mss` (fallback) and streams it as a video track
4. **Input channel opens** — a WebRTC DataChannel is created for sending keyboard/mouse events
5. **pynput** on the server receives events and simulates them on the OS

### Screen Capture

| Library | Platform | Method |
|---------|----------|--------|
| `dxcam` | Windows | GPU-accelerated DirectX capture (preferred, low CPU) |
| `mss` | Cross-platform | CPU-based screen capture (fallback) |

The server tries `dxcam` first. If it fails (non-Windows or no GPU), it falls back to `mss`.

### Input Handling

The browser captures:
- `keydown` / `keyup` events — translated to `pynput` key codes and pressed/released on the PC
- `mousemove` — position is scaled from video element size to actual screen resolution
- `mousedown` / `mouseup` — left and right click
- `wheel` — scroll up/down

---

## File Structure

```
keybinder/
├── server.py       # FastAPI + WebRTC backend (screen capture + input replay)
├── index.html      # Browser client (video display + input capture)
└── README.md       # This file
```

---

## Dependencies

```bash
pip install fastapi uvicorn pynput aiortc av opencv-python-headless mss
# On Windows, for GPU-accelerated capture:
pip install dxcam
```

| Package | Purpose |
|---------|---------|
| `fastapi` | Web framework for the signaling server |
| `uvicorn` | ASGI server to run FastAPI |
| `pynput` | Simulate keyboard and mouse input |
| `aiortc` | WebRTC implementation in Python |
| `av` | Video frame encoding (used by aiortc) |
| `opencv-python-headless` | Image/frame conversion |
| `mss` | Cross-platform screen capture |
| `dxcam` | Windows GPU screen capture (optional) |

---

## Running

1. **Start the server on your PC:**
   ```bash
   python server.py
   ```
   The server starts on `http://0.0.0.0:8000`

2. **Find your PC's local IP:**
   ```bash
   # On Windows
   ipconfig
   # On Mac/Linux
   ip addr   # or ifconfig
   ```

3. **Update the client IP** in `index.html`:
   ```js
   const host = "YOUR_PC_IP_HERE"; // e.g., "192.168.0.105"
   ```

4. **Open `index.html`** in any browser on your local network.

---

## Key Concepts

### WebRTC
WebRTC (Web Real-Time Communication) is a browser standard for peer-to-peer audio/video. It's the same tech that powers Google Meet, but here we use it to stream a desktop screen instead of a webcam.

### SDP (Session Description Protocol)
The "contract" exchanged between two WebRTC peers. It describes what codecs, resolutions, and directions each side supports. The browser sends an **offer**, the server replies with an **answer**.

### ICE (Interactive Connectivity Establishment)
How WebRTC figures out the best network path between two devices. It tries local IPs first, then tries relay servers (STUN/TURN) if needed.

### DataChannel
A WebRTC feature for sending arbitrary binary/text data over the same peer-to-peer connection. Used here to send keyboard and mouse events from browser → server.

### pynput
A Python library that can generate synthetic keyboard and mouse events at the OS level — as if a real person pressed a key or moved the mouse.
