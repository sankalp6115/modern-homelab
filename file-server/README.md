# 📁 PhoneNAS - Personal File Server

Turn your Android phone (or any machine) into a personal cloud storage device. Upload, download, organize, and stream files from any browser on your local network — just like Google Drive, but on your own hardware.

---

## What It Does

- **Multi-user** — register and log in, each user gets their own private storage
- **Full file management** — create folders, upload, rename, move, copy, delete
- **Media streaming** — play videos and audio directly in the browser (supports seeking)
- **Bulk download** — download multiple files or entire folders as a single ZIP archive
- **HTTPS** — self-signed certificate means your connection is encrypted, even locally
- **Modern UI** — dark mode, glassmorphism design, context menu (right-click / long-press)
- **Drag & drop upload** — drag files or entire folders directly into the browser

---

## How It Works

```
Browser (any device)            Server (FastAPI on your phone/machine)
       |                               |
       |--- HTTPS GET / ------------>  | serves index.html
       |--- POST /api/login --------->| checks credentials, sets cookie
       |--- GET /api/files?path=... ->| lists files in that directory
       |--- POST /api/upload -------->| writes uploaded files to storage/
       |--- GET /api/stream ----------| streams video/audio with Range support
       |--- GET /api/download ------->| sends file or ZIP archive
```

### Authentication
- Users are stored in a `users.csv` file (username + SHA-256 hashed password)
- On login, the server sets two HTTP-only cookies: `nas_user` and `nas_session`
- Every protected endpoint verifies these cookies before processing the request
- Cookies use `SameSite=strict` to prevent CSRF

### File Safety
- All paths go through `get_safe_path()` — this ensures no request can escape the user's storage folder (no `../../etc/passwd` tricks)
- Each user's files are isolated in their own subdirectory under `storage/`

### Media Streaming
- Supports **HTTP Range Requests** — the browser can request specific byte ranges of a file
- This enables: seeking in videos, resuming interrupted downloads
- MIME types are auto-detected from file extensions

### HTTPS Setup
- `generate_certs.py` creates a self-signed certificate using OpenSSL
- `run.sh` generates certs (if not present) and starts the server with SSL

---

## File Structure

```
file-server/
├── server.py           # FastAPI backend — all routes and logic
├── utils.py            # Helpers: path safety, zip, user management, file types
├── generate_certs.py   # Creates SSL certificate for HTTPS
├── run.sh              # One-command setup and start script
├── users.csv           # User database (auto-created)
├── static/
│   ├── index.html      # Full-featured frontend UI
│   └── favicon.ico     # Browser tab icon
├── storage/            # All uploaded files live here (auto-created)
└── README.md           # This file
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Serve the frontend HTML |
| `POST` | `/api/register` | Create a new user account |
| `POST` | `/api/login` | Log in, set session cookies |
| `POST` | `/api/logout` | Clear session cookies |
| `GET` | `/api/check-auth` | Check if the current session is valid |
| `GET` | `/api/files` | List files/folders at a path |
| `POST` | `/api/upload` | Upload one or more files |
| `POST` | `/api/mkdir` | Create a new folder |
| `POST` | `/api/delete` | Delete files/folders |
| `POST` | `/api/move` | Move files/folders |
| `POST` | `/api/copy` | Copy files/folders |
| `POST` | `/api/rename` | Rename a file or folder |
| `GET` | `/api/download` | Download file(s) or folder as ZIP |
| `GET` | `/api/stream` | Stream a file (with Range support) |

---

## Running

### On any machine (Linux/Mac/Windows)

```bash
pip install fastapi uvicorn python-multipart
chmod +x run.sh
./run.sh
```

Open `https://localhost:8000` in your browser. Accept the self-signed certificate warning.

### On Android (Termux)

```bash
pkg update && pkg upgrade
pkg install python openssl
pip install fastapi uvicorn python-multipart
chmod +x run.sh
./run.sh
```

Find your phone's IP with `ifconfig`, then open `https://YOUR_PHONE_IP:8000` on any other device on the same Wi-Fi.

---

## Key Concepts

### HTTPS & Self-Signed Certificates
HTTPS encrypts traffic between the browser and server. On the internet, certificates are issued by trusted authorities (like Let's Encrypt). Locally, we generate our own — this is called a **self-signed certificate**. Browsers will show a warning, but the connection is still encrypted.

### Cookie-based Auth
When you log in, the server sets cookies in your browser. Every subsequent request automatically sends those cookies back — the server verifies them before allowing access. This is how most websites handle login sessions.

### HTTP Range Requests
When streaming a video, the browser doesn't download the whole file — it requests chunks using `Range: bytes=0-1048576`. This allows seeking (jumping to any point) and resuming downloads. The server responds with `206 Partial Content`.

### Path Traversal Protection
A path traversal attack is when a malicious request uses `../` to escape the intended directory. The `get_safe_path()` function resolves the full absolute path and checks that it's still inside the user's allowed folder before doing anything.

### ZIP Streaming
When downloading multiple files, the server creates a ZIP archive on the fly and streams it to the browser chunk by chunk — without writing the full ZIP to disk first. This saves disk space and starts the download faster.
