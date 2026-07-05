import os
from utils.path_resolver import get_songs_dir

def scan_songs():
    songs_dir = get_songs_dir()

    files = []
    supported_extensions = (".mp3", ".flac", ".ogg", ".wav", ".m4a", ".mp4", ".opus")
    for root, _, filenames in os.walk(songs_dir):
        for f in filenames:
            if f.lower().endswith(supported_extensions):
                files.append(f)

    return files