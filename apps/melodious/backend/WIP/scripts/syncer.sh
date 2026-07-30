#!/bin/bash

read -p "Enter target IP: " IP

if [[ -z "$IP" ]]; then
  echo "IP cannot be empty"
  exit 1
fi

rsync -avz -e "ssh -p 8022" \
  --exclude-from='.rsyncignore' \
  /Users/sankalpomar/Documents/Coding/Projects/Melodious \
  root@"$IP":~/storage/apps/Melodious