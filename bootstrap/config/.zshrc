eval "$(starship init zsh)"
eval "$(zoxide init zsh)"

alias python='python3.11'
alias pip='pip3.11'

if [[ -o interactive && -n "$SSH_CLIENT" ]]; then
    read -r client_ip client_port server_port <<< "$SSH_CLIENT"

    termux-media-player play "$HOME/system_scripts/login.mp3" >/dev/null 2>&1
    termux-notification \
        --title "SSH Login" \
        --content "${client_ip}:${client_port} SSHed to server" \
        >/dev/null 2>&1

    mkdir -p "$HOME/log"

    printf '[%s] %s:%s logged in\n' \
        "$(date '+%Y-%m-%d %H:%M:%S')" \
        "$client_ip" \
        "$client_port" >> "$HOME/logs/ssh_login.log"
fi

# Trash function
trash() {
    local TRASH_DIR="$HOME/.local/trash"
    mkdir -p "$TRASH_DIR"
    if [ $# -eq 0 ]; then
        echo "Usage: trash <file_or_directory>"
        return 1
    fi
    mv -f "$@" "$TRASH_DIR/"
    echo "Moved to trash: $@"
}

empty-trash() {
    local TRASH_DIR="$HOME/.local/trash"
    if [ -d "$TRASH_DIR" ]; then
        rm -rf "$TRASH_DIR"/*
        echo "Trash emptied."
    else
        echo "Trash is already empty."
    fi
}

alias rm='trash'

bash $PREFIX/etc/motd.sh