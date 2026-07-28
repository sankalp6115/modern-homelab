# Termux Bootstrap

A simple bootstrap setup for turning a fresh Termux installation into a more usable development environment.

## What this project does

This repository automates the boring setup work for a new Termux environment:

- updates Termux and prepares storage access
- installs core packages for development and shell usage
- configures SSH access and enables the SSH service
- creates a cleaner home-directory layout for apps, logs, scripts, and secrets
- installs and applies shell customization files such as zsh, tmux, aliases, and startup scripts
- sets up an SSH login notification flow with sound, toast, and logging

## Quick start

On a fresh Termux installation, run:

```bash
pkg update && pkg upgrade -y
pkg install -y git

git clone https://github.com/your-username/termux-bootstrap.git
cd termux-bootstrap/bootstrap
bash bootstrap.sh
```

If you are using a fork or a local copy, replace the clone URL with your own repository URL.

## What to expect

The bootstrap process will:

1. ask you to continue after the initial system update
2. prompt you to grant storage permissions if needed
3. ask you to set an SSH password
4. install the requested packages and services
5. copy shell configuration files into your home directory

## Repository layout

- bootstrap/bootstrap.sh: main entry point that runs the setup steps in order
- bootstrap/01-system.sh: system update and storage setup
- bootstrap/02-packages.sh: installs essential packages
- bootstrap/03-ssh.sh: sets SSH password
- bootstrap/04-directories.sh: creates project directories
- bootstrap/05-config.sh: copies configuration files and startup scripts
- bootstrap/06-services.sh: enables and starts services
- bootstrap/07-env.sh: creates an environment file location
- bootstrap/08-opt-packages.sh: installs optional packages
- bootstrap/config/: source config files and startup helpers
- bootstrap/assets/: bundled assets such as audio files

## Configuration locations

The setup uses a project-specific config folder under your home directory:

```text
$HOME/.config/termux-bootstrap/
```

This keeps startup scripts, helper scripts, and secrets separated from the rest of your home directory.

## Notes

- Some steps require network access and Termux storage permission.
- The bootstrap is designed to be run from inside Termux, not from a regular desktop shell.
- If you want to customize the behavior, edit the files in the bootstrap folder before running the setup.

## Contributing

If you want to improve the project, feel free to fork it and submit changes. The scripts are intentionally simple and easy to read, so they are a good place to learn and experiment with shell automation.