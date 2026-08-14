#!/usr/bin/env python3

import argparse
from gotify import Gotify
from dotenv import load_dotenv
import os

# load_dotenv()

# TOKEN = os.getenv("GOTIFY_TOKEN")
# SERVER = os.getenv("GOTIFY_SERVER")

gotify = Gotify(SERVER,TOKEN)

parser = argparse.ArgumentParser(description="Gotify CLI")

parser.add_argument("-t","--title",type=str)
parser.add_argument("-m","--message",type=str)
parser.add_argument("-p","--priority",type=int)

args = parser.parse_args()

gotify.send(args.title,args.message)