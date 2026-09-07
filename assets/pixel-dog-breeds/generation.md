# Pixel dog breed atlas

Generated with the built-in `image_gen` tool on 7 September 2026. No API/CLI fallback was used.

The result is saved as `public/dogs/pixel-breeds/atlas.png`. The 25 separate 256 × 256 transparent PNG assets and their breed mapping are in `public/dogs/pixel-breeds/manifest.json`. The source atlas is 1254 × 1254 pixels. `scripts/crop-dog-breeds.py` performs only deterministic cropping, padding, and nearest-neighbor scaling of the generated artwork.

## Final generation prompt

Use case: stylized-concept
Asset type: a production sprite atlas for a dog-donation interface, to be cropped into 25 individual breed avatars.
Create ONE square 5 by 5 contact sheet with EXACTLY 25 distinct small pixel-art dogs, one dog per equal square cell. Use a 2000 by 2000 canvas if possible so each cell is 400 by 400. True transparent RGBA background across the entire sheet and between all animals. No visible grid, no lettering, no labels, no cell numbers, no watermark, no floor, no cast shadow.
Style: charming collectible 16-bit game sprites, chunky deliberate square pixels, crisp stair-step edges, limited natural coat palette, dark readable pixel outlines. Full-body little animals in a consistent seated three-quarter pose facing slightly right, with expressive eyes, oversized heads, short legs and visible tails. Keep recognizable breed silhouettes, not identical generic dogs. Each animal must fit completely inside the central 65% of its cell, with generous transparent padding on all four sides. Uniform visual scale and baseline, no dogs touching or crossing cell boundaries. Not photographs, not smooth vector cartoons, no antialiasing, no gradients.
Exact breed order, left to right in each row:
Row 1: fawn French Bulldog with black muzzle and upright bat ears; black long-haired Chihuahua with upright ears; tricolor Tibetan Spaniel with floppy ears and fluffy tail; golden Golden Retriever; chocolate Labrador Retriever.
Row 2: black-and-tan German Shepherd; tricolor Beagle; white Dalmatian with black spots; reddish-brown Dachshund with long body and short legs; cream Poodle with curly coat.
Row 3: gray-and-white Siberian Husky; black-and-white Border Collie; red-and-white Pembroke Welsh Corgi with short legs; red Shiba Inu with curled tail; fawn Pug with black face.
Row 4: black-and-tan Rottweiler; black-and-tan Doberman with natural floppy ears; fawn Boxer with white chest; golden Cocker Spaniel with long floppy ears; salt-and-pepper Miniature Schnauzer with beard.
Row 5: harlequin black-and-white Great Dane; brown-and-white Saint Bernard; fluffy white Samoyed; white West Highland White Terrier; steel-gray-and-tan Yorkshire Terrier.
The output is the atlas artwork only. The regular equal-cell layout, exact ordering, 25 complete animals, pixel-art consistency, and genuine transparent background are mandatory.
