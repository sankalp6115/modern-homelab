#!/usr/bin/env bash
echo "Battery: $(termux-battery-status | jq -r '.percentage')%"