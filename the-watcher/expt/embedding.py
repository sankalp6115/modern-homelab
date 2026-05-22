import torch
import open_clip
from PIL import Image

device = "mps" if torch.backends.mps.is_available() else "cpu"

model, _, preprocess = open_clip.create_model_and_transforms(
    'ViT-B-32', pretrained='laion2b_s34b_b79k'
)

image_path = "/Users/sankalpomar/Documents/warehouse/ss-classifier/Screenshot_20250329-193756.Instagram.png"

model = model.to(device)
model.eval()

with torch.no_grad():
    with Image.open(image_path) as im:
        img_tensor = preprocess(im).unsqueeze(0)

        embedding = model.encode_image(img_tensor)
        embedding = embedding / embedding.norm(dim=-1, keepdim=True)
        embedding = embedding.cpu()

print(embedding)
print(embedding.shape)