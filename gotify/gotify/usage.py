import os
from dotenv import load_dotenv
from gotify import Gotify

load_dotenv()

gotify = Gotify(
    server=os.getenv("GOTIFY_SERVER"),
    token=os.getenv("GOTIFY_TOKEN"),
)

gotify.success("Backup", "Completed")
gotify.info("Sync", "Started")
gotify.warning("Storage", "90% full")
gotify.error("OCR", "Model crashed")
gotify.custom("Server", "Custom message", priority=1)
