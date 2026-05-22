import dxcam
def debug_dxcam():
    try:
        print("Listing available DXCAM devices and outputs...")
        for i in range(4):
            try:
                cam = dxcam.create(device_idx=i)
                print(f"Device {i}: SUCCESS")
            except Exception as e:
                print(f"Device {i}: FAILED - {e}")
    except Exception as e:
        print(f"General error: {e}")
if __name__ == "__main__":
    debug_dxcam()
