"""Crop the generated 5 x 5 breed atlas into transparent, padded UI sprites.

Usage: python3 scripts/crop-dog-breeds.py
Requires Pillow. Only crops and nearest-neighbor scales existing artwork.
"""
from pathlib import Path
import hashlib
import argparse
import math
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "public/dogs/pixel-breeds"
BREEDS = [
    ("french-bulldog", "French Bulldog"),
    ("long-haired-chihuahua", "Long-haired Chihuahua"),
    ("tibetan-spaniel", "Tibetan Spaniel"),
    ("golden-retriever", "Golden Retriever"),
    ("labrador-retriever", "Labrador Retriever"),
    ("german-shepherd", "German Shepherd"),
    ("beagle", "Beagle"),
    ("dalmatian", "Dalmatian"),
    ("dachshund", "Dachshund"),
    ("poodle", "Poodle"),
    ("siberian-husky", "Siberian Husky"),
    ("border-collie", "Border Collie"),
    ("pembroke-welsh-corgi", "Pembroke Welsh Corgi"),
    ("shiba-inu", "Shiba Inu"),
    ("pug", "Pug"),
    ("rottweiler", "Rottweiler"),
    ("doberman", "Doberman"),
    ("boxer", "Boxer"),
    ("cocker-spaniel", "Cocker Spaniel"),
    ("miniature-schnauzer", "Miniature Schnauzer"),
    ("great-dane", "Great Dane"),
    ("saint-bernard", "Saint Bernard"),
    ("samoyed", "Samoyed"),
    ("west-highland-white-terrier", "West Highland White Terrier"),
    ("yorkshire-terrier", "Yorkshire Terrier"),
]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--atlas', default='atlas.png')
    parser.add_argument('--manifest', default='manifest.json')
    parser.add_argument('--breeds', type=Path)
    args = parser.parse_args()
    breeds = json.loads(args.breeds.read_text()) if args.breeds else BREEDS
    grid = math.isqrt(len(breeds))
    assert grid * grid == len(breeds), 'Atlas must be a square grid'
    atlas = Image.open(DEST / args.atlas)
    assert atlas.mode == "RGBA" and atlas.getchannel("A").getextrema() == (0, 255)
    width, height = atlas.size
    mask = bytearray(atlas.getchannel("A").point(lambda a: 255 if a > 32 else 0).tobytes())
    boxes = {}
    # Detect each complete animal before cropping. Fixed cell cuts could clip
    # ears or tails because the generated image's spacing is not pixel-exact.
    for start in range(width * height):
        if not mask[start]:
            continue
        mask[start] = 0
        stack = [start]
        count = 0
        left, top, right, bottom = width, height, 0, 0
        while stack:
            pixel = stack.pop()
            y, x = divmod(pixel, width)
            count += 1
            left, right = min(left, x), max(right, x)
            top, bottom = min(top, y), max(bottom, y)
            neighbors = []
            if x: neighbors.append(pixel - 1)
            if x < width - 1: neighbors.append(pixel + 1)
            if y: neighbors.append(pixel - width)
            if y < height - 1: neighbors.append(pixel + width)
            for neighbor in neighbors:
                if mask[neighbor]:
                    mask[neighbor] = 0
                    stack.append(neighbor)
        if count < 2000:
            continue
        column = int(((left + right) / 2) / width * grid)
        row = int(((top + bottom) / 2) / height * grid)
        index = row * grid + column
        assert index not in boxes, "Multiple animals detected in one cell"
        boxes[index] = (max(0, left - 4), max(0, top - 4), min(width, right + 5), min(height, bottom + 5))
    assert len(boxes) == len(breeds), f"Expected {len(breeds)} dogs, found {len(boxes)}"
    sprites = []
    for index, (slug, breed) in enumerate(breeds):
        cut = atlas.crop(boxes[index])
        cut.thumbnail((208, 208), Image.Resampling.NEAREST)
        sprite = Image.new("RGBA", (256, 256))
        sprite.alpha_composite(cut, ((256 - cut.width) // 2, 232 - cut.height))
        output = DEST / f"{slug}.png"
        sprite.save(output, optimize=True)
        alpha = sprite.getchannel("A")
        bounds = alpha.getbbox()
        assert bounds and bounds[0] > 0 and bounds[1] > 0 and bounds[2] < 256 and bounds[3] < 256
        assert alpha.getextrema()[0] == 0 and alpha.getextrema()[1] >= 250
        sprites.append({"id": slug, "breed": breed, "src": f"/dogs/pixel-breeds/{slug}.png", "row": index // grid + 1, "column": index % grid + 1, "sourceBox": boxes[index], "size": [256, 256], "visibleBounds": bounds, "alphaRange": alpha.getextrema(), "sha256": hashlib.sha256(output.read_bytes()).hexdigest()})
    (DEST / args.manifest).write_text(json.dumps({"generatedAt": "2026-09-07", "generator": "Built-in image_gen", "atlas": f"/dogs/pixel-breeds/{args.atlas}", "atlasSize": list(atlas.size), "description": "AI-generated breed illustrations, not photographs or assertions of an individual dog's ancestry. Ove is listed as mixed breed and uses a spaniel-style avatar.", "processing": "Connected-component bounds locate each complete dog; original RGBA pixels are cropped with padding and resized using nearest-neighbor onto transparent 256 x 256 canvases.", "sprites": sprites}, indent=2) + "\n")
    print(f"Saved and alpha-validated {len(sprites)} sprites in {DEST}")


if __name__ == "__main__":
    main()
