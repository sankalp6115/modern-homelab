import json
import re
from difflib import get_close_matches

def normalize(title):
    title = title.lower().strip()
    title = re.sub(r"\(.*?\)", "", title)
    title = re.sub(r"[^a-z0-9\s]", "", title)
    title = re.sub(r"\s+", " ", title)
    return title.strip()

# Load data
with open("./data/songs.json", "r", encoding="utf-8") as f:
    songs = json.load(f)

with open("./data/lyrics.json", "r", encoding="utf-8") as f:
    lyrics = json.load(f)

# Build mapping
title_map = {}
normalized_titles = []

for song in songs:
    norm = normalize(song["title"])
    title_map[norm] = song["id"]
    normalized_titles.append(norm)

# Process lyrics
for entry in lyrics:
    raw_title = entry.get("title", "")
    norm_title = normalize(raw_title)

    song_id = None

    # Exact match
    if norm_title in title_map:
        song_id = title_map[norm_title]
    else:
        # Fuzzy match
        match = get_close_matches(norm_title, normalized_titles, n=1, cutoff=0.7)
        if match:
            song_id = title_map[match[0]]

    # Assign song_id (empty if not found)
    entry["song_id"] = song_id if song_id is not None else ""

    # Remove title field
    if "title" in entry:
        del entry["title"]

# Save result
with open("lyrics.json", "w", encoding="utf-8") as f:
    json.dump(lyrics, f, ensure_ascii=False, indent=2)