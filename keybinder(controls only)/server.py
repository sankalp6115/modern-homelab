from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pynput.keyboard import Controller, Key
import json

keyboard = Controller()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Comprehensive key mapping
key_map = {
    "Space": Key.space,
    "Enter": Key.enter,
    "ArrowUp": Key.up,
    "ArrowDown": Key.down,
    "ArrowLeft": Key.left,
    "ArrowRight": Key.right,
    "ShiftLeft": Key.shift,
    "ShiftRight": Key.shift_r,
    "ControlLeft": Key.ctrl,
    "ControlRight": Key.ctrl_r,
    "AltLeft": Key.alt,
    "AltRight": Key.alt_r,
    "Tab": Key.tab,
    "Escape": Key.esc,
    "Backspace": Key.backspace,
    "CapsLock": Key.caps_lock,
}

def get_pynput_key(key_str):
    if key_str in key_map:
        return key_map[key_str]
    if key_str.startswith("Key"):
        # KeyW -> w
        char = key_str.replace("Key", "").lower()
        if len(char) == 1:
            return char
    elif len(key_str) == 1:
        return key_str.lower()
    return None

pressed_keys = set()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("Client connected via WebSocket")
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            action = message.get("action")
            key_code = message.get("key")
            
            p_key = get_pynput_key(key_code)
            if not p_key:
                continue

            if action == "keydown":
                if p_key not in pressed_keys:
                    keyboard.press(p_key)
                    pressed_keys.add(p_key)
                    print(f"Pressed: {key_code}")
            elif action == "keyup":
                if p_key in pressed_keys:
                    keyboard.release(p_key)
                    pressed_keys.remove(p_key)
                    print(f"Released: {key_code}")
                    
    except WebSocketDisconnect:
        print("Client disconnected")
        # Release all keys on disconnect to prevent stuck keys
        for k in list(pressed_keys):
            keyboard.release(k)
        pressed_keys.clear()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
