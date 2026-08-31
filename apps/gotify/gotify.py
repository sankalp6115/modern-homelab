import requests
import os
from dotenv import load_dotenv
load_dotenv()

token = os.getenv("GOTIFY_TOKEN")
class Gotify:
    def __init__(self, server, token):
        self.url = f"{server.rstrip('/')}/message?token={token}"
    
    
    def send(self,title: str, message: str):
        requests.post(
            self.url,
            headers={
                "X-Gotify-Key": token
            },
            data={
                "title": title,
                "message": message,
                "priority": 5
            }
        )

