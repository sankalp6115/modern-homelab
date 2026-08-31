# homelab_scripting

A collection of shell scripts for managing a self-hosted homelab running on **Termux** (Android). Provides a unified `homelab` CLI to monitor system health, manage Python-based apps, sync music, and back up GitHub repositories — all from the terminal.

---

## Table of Contents

- [Overview](#overview)
- [Requirements](#requirements)
- [Installation](#installation)
- [CLI Reference](#cli-reference)
  - [System](#system)
  - [App Management](#app-management)
  - [Utilities](#utilities)
- [App Port Map](#app-port-map)
- [GitHub Backup](#github-backup)
- [Project Structure](#project-structure)
- [Extending](#extending)

---

## Overview

```
homelab status          → full system dashboard
homelab app-list        → see all apps and their running state
homelab app-up <app>    → start an app
homelab app-down <app>  → stop an app
homelab app-restart <app> → restart an app in one shot
homelab app-logs <app>  → attach to the app's tmux session
```

All commands are available globally after running `orchestrator.sh` once. The scripts live in `~/system_scripts/control-layer/` which is added to `$PATH`.

---

## Requirements

| Tool | Purpose |
|---|---|
| `bash` | Shell runtime |
| `termux-api` | Battery, WiFi info (`termux-battery-status`, `termux-wifi-connectioninfo`) |
| `jq` | JSON parsing for termux-api output |
| `tmux` | App process management (apps run in named sessions) |
| `rclone` | Music sync from remote storage |
| `python3.11` | Running homelab apps |
| `git` | Repo update command |

Install on Termux:
```bash
pkg install termux-api jq tmux rclone git python
```

---

## Installation

Clone the repo anywhere and run the orchestrator once:

```bash
git clone https://github.com/sankalp6115/homelab_scripting.git
cd homelab_scripting
bash orchestrator.sh
source ~/.bashrc
```

What `orchestrator.sh` does:
- Creates `~/system_scripts/control-layer/`
- Copies every script from `control-layer/` as `homelab-<name>` (no `.sh` extension)
- Installs `homelab.sh` as the bare `homelab` command
- Copies `app-port-map.ini` and other config files alongside
- Syncs the `github-backup/` folder to `~/system_scripts/github-backup/`
- Adds `~/system_scripts/control-layer` to `$PATH` in `~/.bashrc` (idempotent)
- Cleans up any stale unprefixed copies from previous installs

Re-run anytime after pulling changes:
```bash
git pull && bash orchestrator.sh
```

---

## CLI Reference

Run `homelab --help` for a quick overview. Run `homelab <command> --help` for details on any specific command.

### System

#### `homelab status`
Full system dashboard. Shows:
- Hostname, uptime, CPU usage, RAM usage
- Battery level and charging state
- Storage usage (`/data` partition)
- CPU temperature
- Status of key services: `sshd`, `tailscaled`, `syncthing`, `tmux`
- Network: WiFi IP and Tailscale IP
- Ports used by running Python apps

```bash
homelab status
```

---

#### `homelab battery`
Detailed battery information from `termux-battery-status`:
- Present, technology, health
- Plugged/charging status
- Temperature, voltage, current draw
- Battery percentage

```bash
homelab battery
```

---

#### `homelab wifi`
Current WiFi connection details from `termux-wifi-connectioninfo`:
- SSID, local IP, default gateway
- Link speed (Mbps) and frequency (MHz)

```bash
homelab wifi
```

---

#### `homelab storage`
Disk usage for the `/data` partition:
- Total capacity, used space (with %), available space

```bash
homelab storage
```

---

#### `homelab ports`
Lists ports currently in use by Python processes (searches for `--port <N>` in process args):

```bash
homelab ports
# Output:
#   3000     melodious
#   3002     paper_boy
```

> Uses `ps aux` + `grep` — works on modern Android where `netstat`/`ss` are unavailable.

---

### App Management

Apps are Python processes started via a `start.sh` script in `~/homelab/apps/<app-name>/`. Each app's port is registered in [`app-port-map.ini`](#app-port-map).

#### `homelab app-list`
Shows all registered apps with their port and live running status:

```bash
homelab app-list
# Output:
#   NAME                   PORT     STATUS
#   ----                   ----     ------
#   melodious              3000     ● running
#   no-as-a-service        3001     ○ stopped
#   paper_boy              3002     ○ stopped
```

---

#### `homelab app-status <app>`
Checks if a specific app is running. Shows port and PID(s):

```bash
homelab app-status melodious
# Output:
#   ● melodious is running
#   Port: 3000
#   PIDs: 12345
```

---

#### `homelab app-up <app>`
Starts an app. Skips silently if it's already running:

```bash
homelab app-up melodious
```

- Looks up the port from `app-port-map.ini`
- Checks for an existing process on that port
- Runs `~/homelab/apps/<app>/start.sh`

---

#### `homelab app-down <app>`
Stops a running app by killing its process:

```bash
homelab app-down melodious
```

---

#### `homelab app-restart <app>`
Stops the app (if running) then immediately starts it again. Useful after config changes:

```bash
homelab app-restart melodious
```

---

#### `homelab app-logs <app>`
Attaches to the app's `tmux` session to view live output. Detach with `Ctrl+B D`:

```bash
homelab app-logs melodious
```

Falls back to `ps` info if no tmux session is found for the app.

> Apps need to be started inside a tmux session named after the app for this to work. See [`music-sync.sh`](control-layer/music-sync.sh) for an example pattern.

---

### Utilities

#### `homelab music-sync`
Syncs songs from an rclone remote into the melodious app and restarts it:

1. Runs `rclone sync --dry-run` and shows what would change
2. Asks for confirmation before applying
3. Syncs `homedrive:songs` → `~/homelab/apps/melodious/assets/songs/`
4. Runs `library_sync.py` to update the music database
5. Restarts the melodious backend in a new tmux session

```bash
homelab music-sync
```

Requires: `rclone` (configured with a remote named `homedrive`), `python3.11`, `tmux`

---

#### `homelab update`
Pulls the latest changes for the homelab apps repo:

```bash
homelab update
# Equivalent to: cd ~/homelab && git pull
```

---

## App Port Map

Defined in [`control-layer/app-port-map.ini`](control-layer/app-port-map.ini). Format: `<app-name> <port>`.

| App | Port |
|---|---|
| melodious | 3000 |
| file_server | 3000 |
| no-as-a-service | 3001 |
| paper_boy | 3002 |
| quote | 3003 |
| yt_downloader | 3004 |
| monitor | 3005 |
| keybinder | 3006 |
| idea_inbox | 3007 |
| home | 3008 |

All `app-*` commands resolve the app name against this file to find the process port. To register a new app, add a line here and re-run `orchestrator.sh`.

---

## GitHub Backup

Located in [`github-backup/`](github-backup/). A Python script that mirrors all your GitHub repositories locally using the GitHub API.

**What it does:**
- Fetches all repos (public + private) via the GitHub API
- `git clone --mirror` for new repos
- `git remote update --prune` for existing ones
- Archives (moves to `archive/`) any repos deleted from GitHub

**Setup:**
```bash
cd ~/system_scripts/github-backup
pip install requests python-dotenv
# Edit .env and set your token:
echo 'GITHUB_PAT="your_token_here"' > .env
python3 github-backup.py
```

## Project Structure

```
homelab_scripting/
├── orchestrator.sh              # Install script — run this to set everything up
├── github-backup/
│   ├── github-backup.py         # GitHub mirror backup script
│   └── .env                     # GitHub PAT (never commit this)
└── control-layer/
    ├── homelab.sh               # Root CLI dispatcher
    ├── app-port-map.ini         # App name → port registry
    ├── status.sh                # Full system dashboard
    ├── battery.sh               # Battery detail
    ├── wifi.sh                  # WiFi info
    ├── storage.sh               # Disk usage
    ├── ports.sh                 # Active Python app ports
    ├── app-list.sh              # All apps with live status
    ├── app-status.sh            # Status of a single app
    ├── app-up.sh                # Start an app
    ├── app-down.sh              # Stop an app
    ├── app-restart.sh           # Restart an app
    ├── app-logs.sh              # Attach to app tmux session
    ├── music-sync.sh            # Sync music and restart melodious
    └── update.sh                # Pull homelab repo updates
```

---

## Extending

Planned / ideas for future commands (tracked in [`Tasks.md`](Tasks.md)):

| Command | Description |
|---|---|
| `homelab self-update` | Pull this scripting repo and re-run orchestrator automatically |
| `homelab alerts` | Health check: warn on low battery, full storage, stopped services |
| `homelab monitor` | Live-refreshing dashboard (watch-style) |
| `homelab backup` | Trigger github-backup and optionally songs backup |
| `homelab tmux` | List all active tmux sessions |
| `homelab tailscale` | Tailscale status and connected peers |

To add a new command:
1. Create `control-layer/<name>.sh` with a shebang, `--help` block, and your logic
2. Register it in `homelab.sh`'s dispatcher `case` statement
3. Re-run `orchestrator.sh`
