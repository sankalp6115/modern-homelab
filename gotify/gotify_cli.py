#!/usr/bin/env python3

import os
import sys
import argparse
from pathlib import Path
from dotenv import load_dotenv

ROOT_PATH = Path(__file__).resolve().parent.parent
if str(ROOT_PATH) not in sys.path:
    sys.path.insert(0, str(ROOT_PATH))

from gotify import Gotify

load_dotenv()

def main():
    TOKEN = os.getenv("GOTIFY_TOKEN")
    SERVER = os.getenv("GOTIFY_SERVER")

    parser = argparse.ArgumentParser(description="Gotify CLI")
    parser.add_argument("-t", "--title", type=str, required=True)
    parser.add_argument("-m", "--message", type=str, required=True)
    parser.add_argument("-p", "--priority", type=int, default=5)

    args = parser.parse_args()

    if SERVER and TOKEN:
        gotify = Gotify(SERVER, TOKEN)
        gotify.send(args.title, args.message, priority=args.priority)
    else:
        print("Error: GOTIFY_SERVER and GOTIFY_TOKEN environment variables must be set.")
        sys.exit(1)

if __name__ == "__main__":
    main()