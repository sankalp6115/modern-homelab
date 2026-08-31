<!-- HEADER BANNER -->

[![Banner](/banner.png)](SDFSD)

<p align="center">
  <b>A professional-grade, local-first music streaming ecosystem designed for music lovers who value ownership and immersive UI.</b><br>
  <i>Built with React, FastAPI, and a passion for perfect shuffle.</i>
</p>

---

## What is Melodious?

Melodious is more than just a music player; it's a **personal music cloud** designed to run 24/7 on your own hardware (even an old Android phone via Termux). Born out of frustration with biased streaming algorithms and restrictive "shuffles," Melodious gives you 100% control over your library with a premium, high-fidelity interface.

### Key Philosophy: The "Drop and Play" Workflow

Most local music players require tedious metadata editing. Melodious simplifies this:

1. **Drop** your MP3s into the `music/` folder.
2. **Run** the `library_sync.py` script.
3. **Enjoy** a fully-mapped library with album art, synced lyrics, and dynamic artist pages.

---

## Features

- **High-Performance Backend** — Powered by **FastAPI** for ultra-fast metadata serving and seekable audio streaming.
- **Premium Neumorphic UI** — A visually stunning interface featuring glassmorphism, smooth CSS transitions, and a custom metallic volume knob.
- **Interactive Visualizer** — A responsive LED-bar visualizer that reacts in real-time to your music using `audiomotion-analyzer`.
- **Advanced Fuzzy Search** — Powered by `Fuse.js`, finding your music even with typos or partial names.
- **Voice Commands** — Control playback (Play, Pause, Skip, Search) using just your voice.
- **Synced Lyrics** — Support for `.lrc` files to display real-time, time-synced lyrics that move with the music.
- **True Shuffle** — A custom shuffle algorithm that ensures every track in your library gets its fair share of playtime.
- **Easter Eggs** — Hidden surprises like the **Konami Code** retro visualizer and a secret **Drum Mode**.
- **Mobile-First Hosting** — Optimized to run as a 24/7 server on low-power devices like old smartphones using Termux.

---

## Tech Stack

- **Frontend**:
  - **React (Vite)** for a reactive, component-based UI.
  - **Vanilla CSS** with a custom design system (Layout vs. Global segregation).
  - **Context API** for global player state management.
- **Backend**:
  - **FastAPI (Python)** for asynchronous API handling.
  - **SQLite** for a lightweight, persistent, and portable database.
  - **Mutagen** for professional-grade audio metadata extraction.
- **Libraries**:
  - `Fuse.js` (Fuzzy Search)
  - `AudioMotion-Analyzer` (Visualizations)
  - `Color Thief` (Dynamic UI color extraction)
  - `Oneko.js` (Playful animated interactions)

---

## UI/UX Highlights

### The Metallic Volume Knob

A custom-engineered Neumorphic knob featuring:

- **Photorealistic Metallic Finish**: Created using complex CSS `conic-gradients`.
- **Dynamic LED Ring**: 40+ active LED dots that glow cyan as you scroll to adjust volume.
- **Scroll & Click Interaction**: Mouse wheel for precise volume stepping and click-to-mute with haptic-like visual feedback.

### Glassmorphic Player Bar

A sleek, transparent control bar that sits at the bottom, featuring dynamic album art rotation and time-synced lyric overlays.

---

## Getting Started

### 1. Prerequisites

- Python 3.10+
- Node.js & npm

### 2. Installation

```bash
# Clone the repository
git clone https://github.com/sankalp6115/melodious.git
cd melodious

# Install Frontend dependencies
cd frontend
npm install

# Install Backend dependencies
cd ../backend
pip install -r requirements.txt
```

### 3. Synchronize Your Library

Place your MP3 files in the `music/` directory (created automatically in the root).

```bash
cd backend
python tools/library_sync.py --reset
```

_This script will scan your files, extract metadata, generate album arts, and populate the SQLite database._

### 4. Run the Application

**Start the Backend:**

```bash
cd backend
uvicorn server:app --host 0.0.0.0 --port 8000
```

**Start the Frontend:**

```bash
cd frontend
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## Easter Eggs

Want to explore the secrets?

- **Konami Code**: Type `up up down down left right left right b a` on your keyboard to unlock the Retro Visualizer.
- **Drum Pad**: Try to find the secret interaction that activates the on-screen Drum Kit!

---

## Contribution & Usage

Melodious is open for personal use and modification.

- **Personal Use**: Feel free to host this on your local network or a private server.
- **Contributing**: If you have ideas for new features (mood-based playlists, AI recommendations, etc.), feel free to fork and submit a PR!

---

## Author

**Sankalp Omar**

- [GitHub](https://github.com/sankalp6115)
- [sankalpomar6115@gmail.com](mailto:sankalpomar6115@gmail.com)

**If you like this project, please consider starring the repo!**
