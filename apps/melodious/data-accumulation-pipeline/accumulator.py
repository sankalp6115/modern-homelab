import os
import asyncio
import datetime
from dotenv import load_dotenv
from telethon import TelegramClient
from telethon.errors import FloodWaitError
from data_loader import url

# load env
load_dotenv()

api_id = int(os.getenv("API_ID"))
api_hash = os.getenv("API_HASH")

bot_username = "deezload2bot"  # without @

inputs = url()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TRACK_FILE = "downloaded.txt"
DOWNLOAD_DIR = os.path.join(BASE_DIR, "..", "songs")

def extract_id(link):
    return link.split("/")[-1].split("?")[0]

def load_downloaded():
    if not os.path.exists(TRACK_FILE):
        return set()
    with open(TRACK_FILE, "r") as f:
        return set(line.strip() for line in f)


def save_downloaded(track_id):
    with open(TRACK_FILE, "a") as f:
        f.write(track_id + "\n")


async def main():
    downloaded = load_downloaded()

    async with TelegramClient("session", api_id, api_hash) as client:
        os.makedirs(DOWNLOAD_DIR, exist_ok=True)

        # await client.send_message(bot_username, "/start")

        for inp in inputs:
            track_id = extract_id(inp)

            if track_id in downloaded:
                print(f"Skipping already downloaded: {track_id}")
                continue

            try:
                print(f"Processing: {track_id}")
                await client.send_message(bot_username, inp)

                start_time = datetime.datetime.now(datetime.timezone.utc)
                downloaded_flag = False

                while not downloaded_flag:
                    await asyncio.sleep(2)

                    messages = await client.get_messages(bot_username, limit=10)

                    for msg in messages:
                        if msg.date <= start_time:
                            continue

                        # skip album art
                        if msg.photo:
                            continue

                        # download only audio
                        if msg.audio or (
                            msg.document
                            and msg.file
                            and msg.file.mime_type
                            and msg.file.mime_type.startswith("audio")
                        ):
                            filename = msg.file.name or f"{track_id}.mp3"
                            file_path = os.path.join(DOWNLOAD_DIR, filename)

                            await msg.download_media(file=file_path)

                            print(f"Downloaded: {filename}")
                            save_downloaded(track_id)

                            downloaded_flag = True
                            break

                        # debug (optional)
                        if msg.text:
                            print(f"Bot: {msg.text}")

                await asyncio.sleep(3)

            except FloodWaitError as e:
                print(f"Rate limited. Sleeping {e.seconds}s")
                await asyncio.sleep(e.seconds)

            except Exception as e:
                print(f"Error with {track_id}: {e}")

asyncio.run(main())