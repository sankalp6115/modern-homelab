#!/usr/bin/env bash
set -e

echo "Setting up configurations..."

mkdir -p ~/.config
mkdir -p ~/.ascii

cp -f config/.zshrc ~/ 2>/dev/null || echo "Warning: .zshrc not found"
cp -f config/.bashrc ~/ 2>/dev/null || echo "Warning: .bashrc not found"
cp -f config/.tmux.conf ~/ 2>/dev/null || echo "Warning: .tmux.conf not found"
cp -f config/.gitconfig ~/ 2>/dev/null || echo "Warning: .gitconfig not found"
cp -f config/.vimrc ~/ 2>/dev/null || echo "Warning: .vimrc not found"
cp -f config/.nanorc ~/ 2>/dev/null || echo "Warning: .nanorc not found"
cp -f config/aliases ~/ 2>/dev/null || echo "Warning: aliases not found"
cp -f config/ascii_art.txt ~/.ascii/ 2>/dev/null || echo "Warning: ascii_art.txt not found"
cp -f config/battery.sh ~/system_scripts/ 2>/dev/null || echo "Warning: battery.sh not found"

# Contains SSHD_CONFIG, MOTD, MOTD.SH
cp -f config/sshd_config $PREFIX/etc/ssh/ 2>/dev/null || echo "Warning: sshd_config not copied (permission issue?)"
cp -f config/motd $PREFIX/etc/ 2>/dev/null || echo "Warning: motd not copied (permission issue?)"
cp -f config/motd.sh $PREFIX/etc/ 2>/dev/null || echo "Warning: motd not copied (permission issue?)"

cp -f assets/audio/login.mp3 ~/system_scripts 2>/dev/null || echo "Warning: login.mp3 not found"
cp -f config/ssh_login.sh ~/system_scripts 2>/dev/null || echo "Warning: ssh_login.sh not found"

echo "Changing default shell to zsh..."
chsh -s zsh
