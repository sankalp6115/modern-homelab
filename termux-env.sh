# install git in termux and clone repo and run this script

pkg update && pkg upgrade -y
termux-setup-storage

pkg install -y git curl wget nano vim openssh python nodejs-lts openssl zip unzip tar
pkg install -y python3.11 iproute2 zsh tmux rsync termux-tools termux-services termux-api

termux-battery-status

alias python=python3.11
alias pip='python3.11 -m pip'

sv-enable sshd
sv up sshd

echo "\nSet SSH Password\n"
passwd

termux-open "tailscale1.62.0.apk"

mkdir -p ~/apps ~/logs ~/config ~/scripts ~/backups ~/archives ~/temp
