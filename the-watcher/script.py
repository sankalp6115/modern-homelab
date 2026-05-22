import os
import time
import subprocess
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

WATCH_DIR = "/Users/sankalpomar/Pictures/Screenshots"
REMOTE = "redmi:~/storage/pictures/screenshots"

def wait_for_complete(file_path, timeout=5):
    last_size = -1
    for _ in range(timeout * 1):
        if not os.path.exists(file_path):
            return False
        size = os.path.getsize(file_path)
        if size == last_size:
            return True
        last_size = size
        time.sleep(0.1)
    return False

class Handler(FileSystemEventHandler):
    def process(self, file_path):
        print(f"[PROCESS] {file_path}")

        if not file_path.lower().endswith((".png", ".jpg", ".jpeg")):
            return

        if not wait_for_complete(file_path, timeout=10):
            print("[SKIP] Not stable")
            return

        print("[UPLOAD] Sending...")

        subprocess.Popen([
            "rsync", "-avz", "--ignore-existing",
            file_path,
            REMOTE
        ])

    def on_created(self, event):
        if event.is_directory:
            return

        file_path = event.src_path

        if os.path.basename(file_path).startswith("."):
            return

        self.process(file_path)

    def on_moved(self, event):
        if event.is_directory:
            return

        file_path = event.dest_path
        self.process(file_path)

observer = Observer()
observer.schedule(Handler(), path=WATCH_DIR, recursive=False)
observer.start()

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    observer.stop()

observer.join()