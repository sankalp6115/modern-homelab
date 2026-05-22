import torch
import open_clip
import numpy as np
from PIL import Image
from data_exchange import image_iterator

def load_image(path):
    with Image.open(path) as img:
        return img.convert("RGB")

# ---- config ----
BATCH_SIZE = 32
image_path = "/Users/sankalpomar/Documents/warehouse/ss-classifier"

# ---- device ----
device = "mps" if torch.backends.mps.is_available() else "cpu"

# ---- model ----
model, _, preprocess = open_clip.create_model_and_transforms(
    "ViT-L-14", pretrained='laion2b_s34b_b79k'
)
model = model.to(device)
model.eval()

# ---- load image paths and setup tracking ----
image_paths = list(image_iterator(image_path))
print(f"Found {len(image_paths)} images to process.")

embeddings = []
all_valid_paths = []

def load_batch(paths, preprocess):
    images = []
    valid_paths = []
    for p in paths:
        try:
            img = load_image(p)
            images.append(preprocess(img))
            valid_paths.append(str(p))  # Store as string
        except Exception as e:
            print(f"Warning: Failed to load image {p}: {e}")
            continue
    if not images:
        return None, None
    return torch.stack(images), valid_paths

# ---- inference ----
print(f"Starting embedding extraction on {device}...")
with torch.no_grad():
    for i in range(0, len(image_paths), BATCH_SIZE):
        batch_paths = image_paths[i:i + BATCH_SIZE]
        batch_tensor, batch_valid_paths = load_batch(batch_paths, preprocess)

        if batch_tensor is None:
            continue

        batch_tensor = batch_tensor.to(device)

        emb = model.encode_image(batch_tensor)
        emb = emb / emb.norm(dim=-1, keepdim=True)

        embeddings.append(emb.cpu().numpy())
        all_valid_paths.extend(batch_valid_paths)

        # Print progress
        processed = min(i + BATCH_SIZE, len(image_paths))
        print(f"Processed [{processed}/{len(image_paths)}] images...")

# ---- save ----
if embeddings:
    embeddings = np.concatenate(embeddings, axis=0)
    np.save("embeddings.npy", embeddings)
    np.save("image_paths.npy", np.array(all_valid_paths))
    print(f"\nSuccess! Extracted and saved {len(embeddings)} embeddings to embeddings.npy")
    print(f"Saved {len(all_valid_paths)} corresponding image paths to image_paths.npy")
else:
    print("\nNo embeddings extracted. Check if the source directory contains valid images.")