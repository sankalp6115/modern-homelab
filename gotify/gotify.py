import requests

class Gotify:
    def __init__(self, server, token):
        self.token = token
        self.url = f"{server.rstrip('/')}/message"
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json"
        } 
    
    def send(self, title: str, message: str, priority: int = 5) -> None: 
        response = requests.post(
            self.url,
            data={
                "title": title,
                "message": message,
                "priority": priority
            },
            timeout=5,
            headers=self.headers
        )
        response.raise_for_status()

    def success(self, title: str, message: str):
        self.send(title, f"[SUCCESS]: {message}", 4)

    def info(self, title: str, message: str):
        self.send(title, f"[INFO]: {message}", 3)

    def warning(self, title: str, message: str):
        self.send(title, f"[WARNING]: {message}", 7)

    def error(self, title: str, message: str):
        self.send(title, f"[ERROR]: {message}", 10)