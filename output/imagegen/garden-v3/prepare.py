"""Technical background extraction and alignment of generated garden artwork."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[2]
PUBLIC = ROOT / 'public/care/garden-v3'
PUBLIC.mkdir(parents=True, exist_ok=True)
manifest = []
for level in range(1, 6):
    name = f'giardino-livello-{level}'
    source = Image.open(BASE / 'originals' / f'{name}.png').convert('RGBA')
    rgba = np.array(source)
    rgb = rgba[:, :, :3].astype(np.int16)
    # Remove only neutral pixels connected to the exterior: preserve the art.
    spread = rgb.max(2) - rgb.min(2)
    mean = rgb.mean(2)
    eligible = (rgba[:, :, 3] < 128) | ((spread < 25) & (mean > 75))
    if level == 5:
        eligible = (rgba[:, :, 3] < 128) | ((spread < 18) & (mean < 45))
    mask = Image.fromarray(np.pad(eligible.astype('uint8') * 255, 1, constant_values=255)).copy()
    ImageDraw.floodfill(mask, (0, 0), 128, thresh=0)
    rgba[np.array(mask)[1:-1, 1:-1] == 128, 3] = 0
    # Discard detached background fragments; the complete plot is connected.
    component = Image.fromarray((rgba[:, :, 3] > 127).astype('uint8') * 255).copy()
    ImageDraw.floodfill(component, (627, 613), 128, thresh=0)
    rgba[np.array(component) != 128, 3] = 0
    art = Image.fromarray(rgba)
    bounds = art.getbbox()
    # The cross junction is slightly above canvas centre due to the tilted view.
    anchor = (627, [612, 610, 613, 618, 612][level - 1])
    radius = max(anchor[0] - bounds[0], bounds[2] - anchor[0], anchor[1] - bounds[1], bounds[3] - anchor[1]) + 8
    canvas = Image.new('RGBA', (radius * 2, radius * 2))
    canvas.alpha_composite(art.crop(bounds), (radius + bounds[0] - anchor[0], radius + bounds[1] - anchor[1]))
    asset = canvas.resize((768, 768), Image.Resampling.NEAREST)
    asset.save(BASE / 'assets' / f'{name}.png')
    asset.save(PUBLIC / f'{name}.webp', lossless=True, method=6)
    alpha = np.array(asset)[:, :, 3]
    assert alpha.min() == 0 and alpha.max() == 255
    assert all(asset.getpixel(p)[3] == 0 for p in [(0, 0), (767, 0), (0, 767), (767, 767)])
    assert asset.getpixel((384, 384))[3] == 255
    entry = {'id': name, 'family': 'giardino', 'level': level, 'entrances': ['top', 'right', 'bottom', 'left'], 'path': f'/care/garden-v3/{name}.webp', 'source': f'originals/{name}.png', 'sourceBounds': bounds, 'crossAnchor': anchor, 'transparentFraction': round(float((alpha == 0).mean()), 4)}
    manifest.append(entry)
    print(name, 'RGBA', asset.size, entry['transparentFraction'])

for destination in [BASE, PUBLIC]:
    (destination / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')

# Contact sheet shows all five stages at their actual relative game sizes.
sheet = Image.new('RGB', (2000, 500), '#e0ebd2')
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 23)
for level in range(1, 6):
    size = 255 + level * 24
    art = Image.open(BASE / 'assets' / f'giardino-livello-{level}.png').resize((size, size), Image.Resampling.NEAREST)
    center = 200 + (level - 1) * 400
    sheet.paste(art, (center - size // 2, 230 - size // 2), art)
    draw.text((center, 452), f'Level {level}', fill='#35432c', anchor='mm', font=font)
sheet.save(BASE / 'overview.png')
