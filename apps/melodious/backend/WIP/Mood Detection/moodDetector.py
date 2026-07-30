import cv2
import numpy as np
import mediapipe as mp
from collections import deque

from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# -----------------------------
# MediaPipe Face Landmarker
# -----------------------------
BaseOptions = python.BaseOptions
FaceLandmarker = vision.FaceLandmarker
FaceLandmarkerOptions = vision.FaceLandmarkerOptions
VisionRunningMode = vision.RunningMode

options = FaceLandmarkerOptions(
    base_options=BaseOptions(model_asset_path="face_landmarker.task"),
    running_mode=VisionRunningMode.VIDEO,
    num_faces=1
)

landmarker = FaceLandmarker.create_from_options(options)

# -----------------------------
# Webcam
# -----------------------------
cap = cv2.VideoCapture(0)
timestamp = 0

# Smooth mood output
mood_buffer = deque(maxlen=15)

# -----------------------------
# Geometry helpers
# -----------------------------
def dist(a, b):
    return np.linalg.norm(
        np.array([a.x - b.x, a.y - b.y, a.z - b.z])
    )

def detect_mood(landmarks):
    def lm(i):
        return landmarks[i]

    # Mouth
    mouth_width = dist(lm(61), lm(291))
    mouth_open = dist(lm(13), lm(14))

    # Eyes
    left_eye = dist(lm(159), lm(145))
    right_eye = dist(lm(386), lm(374))
    eye_open = (left_eye + right_eye) / 2

    # Brows
    brow_raise = dist(lm(65), lm(159))

    # Heuristic mood logic
    if mouth_open > 0.03 and brow_raise > 0.04:
        return "Surprised 😲"
    elif mouth_width > 0.08 and mouth_open < 0.02:
        return "Happy 😊"
    elif mouth_width < 0.06 and eye_open < 0.02:
        return "Sad 😔"
    elif brow_raise < 0.015 and eye_open < 0.02:
        return "Angry 😠"
    else:
        return "Neutral 😐"

# -----------------------------
# Main loop
# -----------------------------
while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    mp_image = mp.Image(
        image_format=mp.ImageFormat.SRGB,
        data=rgb
    )

    result = landmarker.detect_for_video(mp_image, timestamp)
    timestamp += 1

    if result.face_landmarks:
        landmarks = result.face_landmarks[0]
        mood = detect_mood(landmarks)
        mood_buffer.append(mood)

        final_mood = max(set(mood_buffer), key=mood_buffer.count)

        cv2.putText(
            frame,
            f"Mood: {final_mood}",
            (30, 50),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (0, 255, 0),
            2
        )

    cv2.imshow("Mood Detector (MediaPipe Tasks API)", frame)

    if cv2.waitKey(1) & 0xFF == 27:
        break

# -----------------------------
# Cleanup
# -----------------------------
cap.release()
cv2.destroyAllWindows()
landmarker.close()
