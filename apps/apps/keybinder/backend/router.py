from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from pathlib import Path
from pynput.keyboard import Controller as KeyboardController, Key
from pynput.mouse import Controller as MouseController, Button
import json
import asyncio
import numpy as np
import cv2
from aiortc import RTCPeerConnection, RTCSessionDescription, MediaStreamTrack
from av import VideoFrame
import time

try:
    import dxcam
    camera = dxcam.create(device_idx=0)
    if camera:
        camera.start(target_fps=60)
        USE_DXCAM = True
        print("Using DXCAM for high-speed capture on Device 0")
    else:
        raise Exception("DXCAM failed to create camera instance")
except Exception as e:
    print(f"DXCAM initialization error: {e}")
    try:
        import mss
        sct = mss.mss()
        USE_DXCAM = False
        print("Falling back to MSS capture")
    except Exception as mss_e:
        print(f"MSS also failed: {mss_e}")
        USE_DXCAM = None

keyboard = KeyboardController()
mouse = MouseController()

BASE_DIR = Path(__file__).resolve().parent

router = APIRouter()

@router.get("/health")
async def health():
    return {"status": "ok"}

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

def get_pynput_key(key_code):
    if key_code in key_map:
        return key_map[key_code]
    if key_code.startswith("Key"):
        char = key_code.replace("Key", "").lower()
        if len(char) == 1:
            return char
    elif len(key_code) == 1:
        return key_code.lower()
    return None

class ScreenStreamTrack(MediaStreamTrack):
    kind = "video"

    def __init__(self):
        super().__init__()
        self._timestamp = 0

    async def recv(self):
        if USE_DXCAM:
            img = camera.get_latest_frame()
            if img is None:
                img = np.zeros((1080, 1920, 3), dtype=np.uint8)
            frame = VideoFrame.from_ndarray(img, format="rgb24")
        else:
            monitor = sct.monitors[1]
            sct_img = sct.grab(monitor)
            img_np = np.array(sct_img)
            img_bgr = cv2.cvtColor(img_np, cv2.COLOR_BGRA2RGB)
            frame = VideoFrame.from_ndarray(img_bgr, format="rgb24")

        self._timestamp += 1
        frame.pts = self._timestamp
        frame.time_base = 60 # 60 FPS
        
        if self._timestamp % 60 == 0:
            print(f"Sent frame {self._timestamp}")
            
        await asyncio.sleep(1/60)
        return frame

pcs = set()
pressed_keys = set()

@router.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("Client connected via WebSocket (Signaling)")
    
    pc = RTCPeerConnection()
    pcs.add(pc)

    @pc.on("datachannel")
    def on_datachannel(channel):
        @channel.on("message")
        def on_message(message):
            # Handle high-frequency inputs via WebRTC DataChannel
            try:
                data = json.loads(message)
                handle_input_event(data)
            except Exception as e:
                print(f"DataChannel error: {e}")

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # WebRTC Signaling: SDP Offer
            if message.get("type") == "offer":
                # 1. Create session description from offer
                offer = RTCSessionDescription(sdp=message["sdp"], type=message["type"])
                
                # 2. Set remote description
                await pc.setRemoteDescription(offer)
                
                # 3. Add our screen track (AFTER remote description is set)
                track = ScreenStreamTrack()
                pc.addTrack(track) # aiortc will create a stream automatically or we can wrap it
                print("Track added to peer connection")
                
                # 4. Create answer
                answer = await pc.createAnswer()
                
                # 5. Set local description (this starts ICE gathering)
                await pc.setLocalDescription(answer)
                
                # Wait for ICE gathering to complete so candidates are in the SDP
                # (For local networks, this is usually very fast)
                while pc.iceGatheringState != "complete":
                    await asyncio.sleep(0.1)
                
                # 6. Send answer back to client (now with all candidates)
                await websocket.send_text(json.dumps({
                    "type": "answer",
                    "sdp": pc.localDescription.sdp
                }))
                print("WebRTC Handshake complete with candidates")
            
            # Fallback/Signaling: Handle input events
            else:
                handle_input_event(message)
                
    except WebSocketDisconnect:
        print("Client disconnected")
    finally:
        await pc.close()
        pcs.discard(pc)
        for k in list(pressed_keys):
            keyboard.release(k)
        pressed_keys.clear()

def handle_input_event(message):
    action = message.get("action")
    if action in ["keydown", "keyup"]:
        key_code = message.get("key")
        p_key = get_pynput_key(key_code)
        if p_key:
            if action == "keydown":
                if p_key not in pressed_keys:
                    keyboard.press(p_key)
                    pressed_keys.add(p_key)
            else:
                if p_key in pressed_keys:
                    keyboard.release(p_key)
                    pressed_keys.remove(p_key)
    
    elif action == "mousemove":
        x, y = message.get("x"), message.get("y")
        mouse.position = (x, y)
        
    elif action == "mousedown":
        btn = Button.left if message.get("button") == 0 else Button.right
        mouse.press(btn)
        
    elif action == "mouseup":
        btn = Button.left if message.get("button") == 0 else Button.right
        mouse.release(btn)
        
    elif action == "scroll":
        dy = message.get("delta")
        mouse.scroll(0, dy)