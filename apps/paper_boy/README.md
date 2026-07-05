# Paper-boy Display Engine

Paper-boy is a lightweight, remote-controlled ambient display engine and digital signage solution. It allows you to run a beautiful, fullscreen media player on one device (like a TV, tablet, or monitor) and seamlessly control it in real-time from a sleek controller web app on your phone or laptop.

It supports video backgrounds, image slideshows, lo-fi audio tracks, transparent GIF overlays, a live clock, and real-time weather data.

---

![Usage image](https://i.ibb.co/8hHQSRC/sample.jpg)

---

## 🛠 Architecture

The system is split into two main components, communicating via **WebSockets**:
1. **The Display (`index.html`)**: A fullscreen, un-interactive client that visually renders the media and widgets (Clock, Weather). It connects to the Python server via WebSocket and listens for state changes.
2. **The Controller (`controller.html`)**: A remote-control dashboard that dynamically fetches all available media assets. When you click a button or drag a slider, it pushes the command over WebSockets to instantly update the Display.

**Backend**: Powered by Python, `FastAPI`, and `uvicorn`, it serves the static files and routes real-time WebSocket traffic between the Controller and the Display(s).

---

## 🚀 Setup & Installation

### 1. Prerequisites
You will need Python 3.8+ installed on your machine.
Install the required dependencies:
```bash
pip install fastapi uvicorn
```

### 2. Organizing Your Assets
The backend dynamically scans your file system for media. You **must** organize your own media files into the following directory structure inside the `static/assets/` folder:

```text
paper_boy/
├── server/
│   └── main.py             # Python backend
└── static/
    ├── index.html          # The Display UI
    ├── controller.html     # The Controller UI
    └── assets/
        ├── video/          # Put .mp4, .webm, .mov files here
        ├── image/          # Put .jpg, .png, .webp files here
        ├── audio/          # Put .mp3, .wav files here (e.g., Lofi, Rain sounds)
        └── overlay/        # Put transparent .gif files here (e.g., Raindrops, Confetti)
```

*Note: The server reads these directories automatically. You can drop new files into these folders while the server is running, and simply refresh the controller page to see them!*

### 3. Start the Server
Navigate to the root directory of the project and run the server:
```bash
python server/main.py
```
The server will start on port `3002`.

---

## 🎮 How to Use

### Step 1: Open the Display
On the device you want to act as your screen (e.g., a TV or a Raspberry Pi hooked to a monitor), open a modern web browser and navigate to:
```
http://<your-server-ip>:3002/
```
*(If running locally, use `http://localhost:3002/`)*

> **Tip for Kiosk Mode**: For the best experience, run the browser in full-screen/kiosk mode so the UI takes up the whole screen. 
> * **Chrome/Edge**: Press `F11` or start with `chrome --kiosk http://localhost:3002/`
> * **Important**: Modern browsers block audio from playing automatically. **You must click or tap anywhere on the Display screen once** to unlock the audio permissions!

### Step 2: Open the Controller
On your phone or laptop, open your browser and navigate to:
```
http://<your-server-ip>:3002/controller.html
```

You will see the control dashboard. From here you can:
- Adjust Brightness, Blur, and Volume sliders in real-time.
- Tap a Video or Image to instantly change the Display's background.
- Toggle Audio tracks or visual Overlays (and stop them using the red Stop buttons).

---

## ✨ Features
- **Dynamic Asset Loading**: The server automatically reads your asset directories. No need to hardcode file names or restart the server when you add new media.
- **Live Weather**: Automatically fetches real-time weather conditions for Kanpur using the free *Open-Meteo* API, refreshing gracefully in the background every 2 hours.
- **Butter-Smooth WebSockets**: UI slider inputs (like blur and brightness) are throttled and transmitted via WebSockets to ensure the display updates flawlessly without lagging the server.
- **Responsive Controller**: The control dashboard uses CSS Grid/Flexbox and glass-morphic UI styling to look and feel like a premium native mobile app.
