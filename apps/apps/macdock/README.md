# macOS Stream Deck Controller (`macdock`)

A lightweight, highly extensible, and secure web-based Stream Deck controller for macOS. Built with FastAPI, AppleScript, Vanilla HTML5, CSS3, and JavaScript.

---

## Project Structure

```
macdock/
├── frontend/             # Frontend Assets & Client Logic
│   ├── index.html        # Clean HTML5 structure
│   ├── style.css         # Stream Deck OLED dark UI styles
│   ├── app.js            # Dynamic deck loader & touch interaction logic
│   └── icons/            # Full-color brand vector SVG & image icons
│
└── backend/              # Fast-API Modular Backend
    ├── main.py           # Directly executable FastAPI application & static mount
    ├── config.json       # Declarative deck pages, button grids & actions
    ├── config.py         # Directory paths, security whitelists & config loader
    ├── models.py         # Pydantic ActionPayload request models
    ├── utils/
    │   └── applescript.py# AppleScript execution & system event helpers
    └── handlers/
        ├── apps.py       # App launch & URL opening handlers
        ├── media.py      # Playback & volume control handlers
        └── system.py     # Display brightness & screenshot handlers
```

---

## Running the Project

Navigate to the `backend/` directory and run `main.py` directly:

```bash
cd macdock/backend
python main.py
# or: uv run main.py
```

The server starts at `http://0.0.0.0:8000`.

Open `http://localhost:8000` (or your Mac's IP on your local network) on any mobile phone, tablet, or browser screen.
