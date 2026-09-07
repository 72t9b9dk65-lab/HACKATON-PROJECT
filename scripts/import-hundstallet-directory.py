"""Import a downloaded public directory; --download also saves its thumbnails."""
import json,re,html,hashlib,subprocess
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import argparse
parser=argparse.ArgumentParser(description='Import the complete public Hundstallet directory from its HTML catalogData snapshot.')
parser.add_argument('html',type=Path)
parser.add_argument('--download',action='store_true')
args=parser.parse_args()
ROOT=Path(__file__).resolve().parents[1]
page=args.html.read_text()
def extract(name):
 match=re.search(r'<script[^>]*class="'+name+r'"[^>]*>(.*?)</script>',page,re.S)
 if not match: raise ValueError('Missing official directory block: '+name)
 return json.loads(match.group(1))
conf=extract('filterConf')
raw=extract('catalogData')
breeds={122:('American Staffordshire Terrier','american-staffordshire-terrier'),133:('Mixed breed','mixed-medium'),158:('Border Collie','border-collie'),187:('Chihuahua','long-haired-chihuahua'),197:('Smooth Collie','smooth-collie'),207:('Doberman','doberman'),235:('French Bulldog','french-bulldog'),238:('Golden Retriever','golden-retriever'),280:('Jämthund','jamthund'),292:('German Shorthaired Pointer','german-shorthaired-pointer'),296:('Labrador Retriever','labrador-retriever'),556:('Belgian Malinois','belgian-malinois'),313:('Miniature American Shepherd','miniature-american-shepherd'),315:('Pug','pug'),592:('Old English Bulldog','old-english-bulldog'),352:('Pomeranian','pomeranian'),383:('Schnauzer','standard-schnauzer'),389:('Shih Tzu','shih-tzu'),391:('Siberian Husky','siberian-husky'),425:('German Shepherd','german-shepherd'),426:('German Spitz','german-spitz'),434:('German Spaniel','german-spaniel')}
city={43:('alingsas','Alingsås'),27:('stockholm','Stockholm'),30:('orkelljunga','Örkelljunga'),80:(None,'Rehoming team')}
rows=[]
for r in raw:
 slug=r['path'].strip('/').split('/')[-1];ids=[int(i) for i in r['breed']];known=[i for i in ids if i!=133]
 names=[breeds[i][0] for i in known];breed=' / '.join(names)+(' mix' if 133 in ids else '') if known else 'Mixed breed'
 sprite=breeds[known[0] if known else 133][1]
 # Generic avatars do not assign undocumented ancestry. Existing Ove avatar stays familiar.
 if not known: sprite='tibetan-spaniel' if slug=='ove' else ['mixed-small','mixed-medium','mixed-large'][len(rows)%3]
 original=html.unescape(r['name']);name={'shih-tzu-hanar':'Shih Tzu boys','shih-tzu-tjejer':'Shih Tzu girls'}.get(slug,original)
 shelter,location=city[int(r['city'][0])]
 ages=[conf['age']['items'][str(i)]['label'].replace('under 6 månader','Under 6 months').replace('1 år','1 year').replace(' år',' years') for i in r['age']]
 prefix=re.search('data-prefix="([^"]+)"',r['image']).group(1);file=re.search('data-file="([^"]+)"',r['image']).group(1)
 photo=f'https://hundstallet.se/wp-content/uploads/se/ir_cache{prefix}{file}/355_355_75_{file}.webp'
 rows.append(dict(id=slug,sourceId=r['id'],name=name,originalName=original,shelterId=shelter,location=location,age=', '.join(ages),breed=breed,publishedBreeds=[conf['breed']['items'][str(i)]['label'] for i in ids],sprite=f'/dogs/pixel-breeds/{sprite}.png',spriteDescription=f'{breed} illustrated pixel avatar',status={'none':'Seeking a home','trial':'Trial adoption','long':'Long stay'}[r['label']],group=slug.startswith('shih-tzu-'),source='https://hundstallet.se'+r['path'],photo=photo,localPhoto=f'/dogs/hundstallet/{slug}-directory.webp'))
assert 1 <= len(rows) <= 250 and len({r['id'] for r in rows})==len(rows)
out={'retrievedAt':'2026-09-07','source':'https://hundstallet.se/hundar/','profileCount':len(rows),'note':'Complete public catalogData snapshot, including group profiles and trial adoptions. Not every dog in the organization has a published profile. Location is the shelter named in the directory, not live animal tracking. Rehoming-team listings have no assigned shelter. Avatars illustrate listed breeds; mixed ancestry and individual appearance are not verified.','profiles':rows}
(ROOT/'public/data/hundstallet/directory.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
# The typed module is generated from the same source, so Node tests need no JSON loader.
(ROOT/'lib/hundstallet-directory.ts').write_text('// Generated from Hundstallet public catalogData on 7 September 2026.\n// Source and original breed labels: public/data/hundstallet/directory.json\nexport const directoryProfiles = '+json.dumps(rows,ensure_ascii=False,indent=2)+';\n')
print('Prepared',len(rows),'profiles')
if args.download:
 def get(r):
  dest=ROOT/'public'/r['localPhoto'].lstrip('/')
  if not dest.exists(): subprocess.run(['curl','-fsSL','--retry','2','--max-time','35','-A','Mozilla/5.0',r['photo'],'-o',str(dest)],check=True)
  assert dest.read_bytes()[:4]==b'RIFF',r['id']
  return {'dog':r['id'],'profile':r['source'],'image':r['photo'],'local':r['localPhoto'],'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()}
 with ThreadPoolExecutor(max_workers=4) as pool: images=list(pool.map(get,rows))
 manifestpath=ROOT/'public/dogs/hundstallet/sources.json';manifest=json.loads(manifestpath.read_text());old={x['local']:x for x in manifest['images']};old.update({x['local']:x for x in images});manifest['images']=list(old.values());manifestpath.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 print('Downloaded',len(images),'attributed thumbnails')
