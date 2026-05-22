import mss
import numpy as np
import cv2

def test_capture():
    with mss.mss() as sct:
        print("Monitors:", sct.monitors)
        if len(sct.monitors) < 2:
            print("No monitor found at index 1")
            return
        
        monitor = sct.monitors[1]
        print(f"Capturing monitor 1: {monitor}")
        
        img = sct.grab(monitor)
        img_np = np.array(img)
        print(f"Captured image shape: {img_np.shape}")
        
        # Check if all pixels are 0
        if np.all(img_np == 0):
            print("ERROR: Captured image is completely black!")
        else:
            print("SUCCESS: Captured image has data.")
            # Save a sample to check
            cv2.imwrite("sample_capture.jpg", img_np)
            print("Sample saved to sample_capture.jpg")

if __name__ == "__main__":
    test_capture()
