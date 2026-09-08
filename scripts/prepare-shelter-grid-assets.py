"""Cut the user-requested four-level sheets and retain true transparency.

Only technical crop/background extraction/resizing; no new artwork is drawn.
Run with the bundled Python runtime (Pillow + numpy).
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'output/imagegen/shelter-grid-v2'
PUBLIC = ROOT / 'public/care/grid-v2'
PUBLIC.mkdir(parents=True, exist_ok=True)
FAMILIES = {'kitchen':'cibo','home':'cuccia','playground':'gioco','sports':'sport','care':'cura','water':'abbeveraggio','pool':'piscina','wellbeing':'benessere'}
BRIEFS = json.loads((BASE/'briefs.json').read_text())['areas']

def extract(image):
    rgba = np.array(image.convert('RGBA'))
    # Checkerboard, if rasterized by the generator, is neutral grey and connected
    # to the outside. Flood only that exterior; preserve enclosed light furniture.
    rgb = rgba[:,:,:3].astype(np.int16)
    neutral = (rgb.max(2)-rgb.min(2)<25) & (rgb.mean(2)>75)
    eligible = neutral | (rgba[:,:,3]<128)
    mask = Image.fromarray(np.pad(eligible.astype('uint8')*255, 1, constant_values=255)).copy()
    ImageDraw.floodfill(mask, (0,0), 128, thresh=0)
    exterior = np.array(mask)[1:-1,1:-1] == 128
    rgba[exterior,3] = 0
    rgba[rgba[:,:,3]<128,3] = 0
    opaque = rgba[:,:,3]>127
    # Ignore disconnected slivers from a neighboring quadrant or generator specks.
    ys,xs=np.where(opaque)
    if not len(xs): raise ValueError('Empty tile after background extraction')
    nearest=np.argmin((xs-image.width/2)**2+(ys-image.height/2)**2)
    component=Image.fromarray(opaque.astype('uint8')*255).copy()
    ImageDraw.floodfill(component,(int(xs[nearest]),int(ys[nearest])),128,thresh=0)
    opaque=np.array(component)==128
    rgba[~opaque,3]=0
    # Ignore sparse generator pixels outside the tile, keeping a four-pixel margin.
    rows=np.where(opaque.sum(1)>max(4,opaque.sum(1).max()*.02))[0]
    cols=np.where(opaque.sum(0)>max(4,opaque.sum(0).max()*.02))[0]
    if not len(rows) or not len(cols): raise ValueError('Empty image')
    box=(max(0,int(cols[0])-4),max(0,int(rows[0])-4),min(image.width,int(cols[-1])+5),min(image.height,int(rows[-1])+5))
    return Image.fromarray(rgba).crop(box), box

manifest=[]
for brief in BRIEFS:
    name=brief['id']; family=FAMILIES[name]
    sheet_path=BASE/'originals'/f'{name}-levels-1-4.png'
    single_path=BASE/'originals'/f'{name}-level-5.png'
    if not sheet_path.exists() or not single_path.exists(): continue
    sheet=Image.open(sheet_path)
    halves=[(0,0,sheet.width//2,sheet.height//2),(sheet.width//2,0,sheet.width,sheet.height//2),(0,sheet.height//2,sheet.width//2,sheet.height),(sheet.width//2,sheet.height//2,sheet.width,sheet.height)]
    for level in range(1,6):
        crop=halves[level-1] if level<5 else None
        source=sheet.crop(crop) if crop else Image.open(single_path)
        art,bounds=extract(source)
        # Square canvas and identical padding make midpoint doors line up with routes.
        if name == 'pool':
            # Align the dry T-junction across all levels, compensating for camera depth.
            anchors=[(320,276),(934,276),(315,876),(940,893),(625,600)]
            ax,ay=anchors[level-1]
            ax-=((crop[0] if crop else 0)+bounds[0]); ay-=((crop[1] if crop else 0)+bounds[1])
            radius=max(ax,art.width-ax,ay,art.height-ay)+4
            canvas=Image.new('RGBA',(radius*2,radius*2))
            canvas.alpha_composite(art,(radius-ax,radius-ay))
        else:
            canvas=Image.new('RGBA',(max(art.size)+8,)*2)
            canvas.alpha_composite(art,((canvas.width-art.width)//2,(canvas.height-art.height)//2))
        asset=canvas.resize((768,768),Image.Resampling.NEAREST)
        filename=f'{family}-livello-{level}'
        asset.save(BASE/'assets'/f'{filename}.png')
        asset.save(PUBLIC/f'{filename}.webp',lossless=True,method=6)
        alpha=np.array(asset)[:,:,3]
        assert alpha.min()==0 and alpha.max()==255
        assert all(asset.getpixel(p)[3]==0 for p in [(0,0),(767,0),(0,767),(767,767)])
        manifest.append({'id':filename,'family':family,'level':level,'entrances':brief['gates'],'path':f'/care/grid-v2/{filename}.webp','source':f'originals/{name}-'+('levels-1-4.png' if crop else 'level-5.png'),'quadrantCrop':crop,'contentBounds':bounds,'transparentFraction':round(float((alpha==0).mean()),4)})
(BASE/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(PUBLIC/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'Prepared {len(manifest)} assets')
