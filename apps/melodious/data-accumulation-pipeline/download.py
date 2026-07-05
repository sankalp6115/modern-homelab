import os
import asyncio
from telethon import TelegramClient
from dotenv import load_dotenv
from telethon.errors import FloodWaitError
from data_loader import url

# load env
load_dotenv()

api_id = int(os.getenv("API_ID"))
api_hash = os.getenv("API_HASH")    

bot_username = "deezload2bot"  # without @
DOWNLOAD_DIR = "all_media"

async def main():
    async with TelegramClient("session", api_id, api_hash) as client:
        os.makedirs(DOWNLOAD_DIR, exist_ok=True)

        async for msg in client.iter_messages(bot_username):
            try:
                if not msg.file:
                    continue

                # skip photos if you want
                # if msg.photo:
                #     continue

                filename = msg.file.name or f"{msg.id}"
                file_path = os.path.join(DOWNLOAD_DIR, filename)

                print(f"Downloading: {file_path}")
                await msg.download_media(file=file_path)

            except Exception as e:
                print(f"Error: {e}")

asyncio.run(main())