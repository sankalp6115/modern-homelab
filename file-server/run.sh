#!/bin/bash

# Install dependencies if needed
# pip install fastapi uvicorn cryptography jinja2 python-multipart

# Generate certificates
python3 generate_certs.py

# Run the server
echo "Starting Phone NAS server on https://0.0.0.0:8000"
echo "Note: If running on Android (Termux), use 'ip addr show' to find your IP."
uvicorn main:app --host 0.0.0.0 --port 8000 --ssl-keyfile key.pem --ssl-certfile cert.pem
