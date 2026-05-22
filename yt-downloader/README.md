# 📺 YT Downloader

A clean browser UI for downloading YouTube videos and playlists. Paste a URL, pick a quality, and download — the server handles everything using `yt-dlp`.

Works on any machine in your homelab (including Android via Termux).

---

## What It Does

- Download single videos or entire playlists
- Choose video quality (1080p, 720p, 480p, etc.) — only shows what's actually available
- Download audio only (MP3) if you just want the music
- See video info (title, thumbnail, duration) before downloading
- Simple, responsive UI that works on mobile too

---

## How It Works

```
Browser                          Server (Flask)
   |                                  |
   |-- POST /api/info (URL) --------> | yt-dlp fetches video metadata
   |<- { title, thumbnail, formats } -|
   |                                  |
   |-- POST /api/download (URL + fmt)>| yt-dlp downloads the video
   |<- file download starts ----------|
```

### Backend (`server.py`)
A **Flask** app with three routes:

| Route | Method | What it does |
|-------|--------|-------------|
| `/` | GET | Serves the frontend HTML page |
| `/api/info` | POST | Fetches video metadata using yt-dlp (no download) |
| `/api/download` | POST | Downloads the video/audio in the selected format |

`/api/info` uses yt-dlp's `extract_info` with `download=False` to get metadata quickly without downloading anything. The available quality options shown in the UI come directly from this metadata.

`/api/download` runs yt-dlp with your selected format code and saves the file to the `downloads/` folder.

### Frontend (`templates/index.html`)
- Single page, no framework
- Paste a URL → click "Fetch Info" → quality selector appears → click "Download"
- Uses the browser's `fetch` API to talk to the Flask backend
- Shows loading states and errors

---

## File Structure

```
yt-downloader/
├── server.py           # Flask backend
├── requirements.txt    # Python dependencies
├── templates/
│   └── index.html      # Frontend (HTML + CSS + JS)
├── downloads/          # Downloaded files saved here
└── README.md           # This file
```

---

## Setup

```bash
pip install flask yt-dlp
```

Or from the requirements file:
```bash
pip install -r requirements.txt
```

---

## Running

```bash
python3 server.py
```

Open `http://localhost:5000` in your browser.

From another device on your network:
```
http://YOUR_MACHINE_IP:5000
```

---

## Usage

1. Paste a YouTube URL (video or playlist link)
2. Click **Fetch Video Info** — wait a moment while metadata loads
3. Choose **Video + Audio** or **Audio Only**
4. If downloading video, pick your preferred quality
5. Click **Download** — the file saves to the `downloads/` folder on the server

---

## On Android (Termux)

```bash
pkg update && pkg install python
pip install flask yt-dlp --break-system-packages
python3 server.py
```

Access from your phone's browser at `http://localhost:5000`, or from another device using your phone's IP.

> **Note:** yt-dlp also requires `ffmpeg` for merging video+audio streams. Install it with:
> ```bash
> pkg install ffmpeg        # Termux
> apt install ffmpeg        # Debian/Ubuntu
> brew install ffmpeg       # macOS
> ```

---

## Key Concepts

### yt-dlp
A fork of youtube-dl — a command-line tool that can download from YouTube and hundreds of other video sites. It handles format selection, playlist expansion, subtitle download, and more. Used here as a Python library.

### Flask
A lightweight Python web framework. Simpler than FastAPI — great for small apps where you don't need async or automatic API docs. Uses Jinja2 for HTML templating.

### Format selection
YouTube serves video and audio as separate streams for quality above 360p (called DASH). yt-dlp downloads both and uses `ffmpeg` to merge them into one file. That's why ffmpeg is needed.

### Jinja2 templates
Flask's built-in templating system. Lets you write HTML files that can have Python variables inside them (`{{ variable }}`). Used here to serve the main page.
