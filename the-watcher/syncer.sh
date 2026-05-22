#!/bin/bash

#Syncs ss folder of mac to ss folder of redmi (basically sends all ss to redmi obv) 

# Exit immediately if a command exits with a non-zero status
set -e

# Define source and destination directories from script.py
SRC_DIR="/Users/sankalpomar/Pictures/Screenshots/"
DEST_DIR="~/storage/pictures/screenshots"

# Colors for pretty terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Mobile Sync Script ===${NC}"
echo -e "Source:      ${YELLOW}${SRC_DIR}${NC}"
echo -e "Destination: ${YELLOW}${DEST_DIR}${NC}"
echo

# Ask for the IP Address
while [ -z "$IP" ]; do
    read -p "Enter mobile IP address: " IP
    if [ -z "$IP" ]; then
        echo -e "${RED}Error: IP address cannot be empty.${NC}"
    fi
done

# Ask for SSH Port (Termux default is 8022)
read -p "Enter SSH port [default: 8022]: " PORT
PORT=${PORT:-8022}

# Ask for SSH Username (optional)
read -p "Enter SSH username [default: none]: " SSH_USER

# Construct remote destination
if [ -n "$SSH_USER" ]; then
    REMOTE_DEST="${SSH_USER}@${IP}:${DEST_DIR}"
else
    REMOTE_DEST="${IP}:${DEST_DIR}"
fi

echo -e "\n${BLUE}Starting sync...${NC}"
echo -e "Running: ${YELLOW}rsync -avz --progress -e \"ssh -p ${PORT}\" \"${SRC_DIR%/}/\" \"${REMOTE_DEST}\"${NC}\n"

# Execute rsync
if rsync -avz --progress -e "ssh -p ${PORT}" "${SRC_DIR%/}/" "${REMOTE_DEST}"; then
    echo -e "\n${GREEN}Sync completed successfully!${NC}"
else
    echo -e "\n${RED}Sync failed. Please check your IP, port, and connection.${NC}"
    exit 1
fi
