eval "$(starship init zsh)"
eval "$(zoxide init zsh --cmd cd)"

alias python='python3.11'
alias pip='pip3.11'

CONFIG_ROOT="${XDG_CONFIG_HOME:-$HOME/.config}/termux-bootstrap"

if [[ -f "$HOME/.aliases" ]]; then
    . "$HOME/.aliases"
fi

if [[ -o interactive && -n "$SSH_CLIENT" ]]; then
    SSH_SCRIPT="$CONFIG_ROOT/scripts/ssh_login.sh"
    if [[ -f "$SSH_SCRIPT" ]]; then
        bash "$SSH_SCRIPT"
    fi
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

if [[ -f "$PREFIX/etc/motd.sh" ]]; then
    bash "$PREFIX/etc/motd.sh"
fi