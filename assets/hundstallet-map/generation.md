# Shelter map assets

Generated with the built-in image_gen tool on 7 September 2026. No fallback CLI or API model was used.

## Shelter

Saved asset: `public/shelters/pixel-shelter.png`. A generic illustrated shelter marker, not a depiction of any particular Hundstallet building. Real facility coordinates are separate data.

Prompt:

Use case: stylized-concept
Asset type: a single pixel-art dog shelter map marker for a gamified dog-donation app.
Draw one charming Swedish dog shelter building in the same visual language as collectible 16-bit pixel dog sprites: deliberate chunky square pixels, crisp stepped silhouette, dark pixel outlines, limited natural colors, readable at 80 pixels.
A modest red timber Scandinavian shelter, white trim, dark charcoal pitched roof, one main door with a small paw emblem, a few lit windows and a short attached fenced outdoor dog run. Small bone-shaped sign with NO letters. Three-quarter isometric view, entrance facing the viewer. Welcoming and clearly recognizable as an animal shelter, not a single small doghouse.
Single isolated compact sprite, full structure entirely visible and centered, generous transparent padding on every side, true transparent RGBA background. No base tile, no scenery, no people, no dogs, no ground plane, no cast shadow, no gradients, no text, no map, no UI, no labels, no border. The shelter is a reusable generic illustration, not a literal rendering of a specific real building. Square canvas.

## Additional dog avatar atlas

The original 25 breed sprites are retained. Additional breeds and generic mixed-breed avatars are listed in `additional-breeds.json`.

Initial prompt:

Use case: stylized-concept. Create ONE supplementary dog sprite-sheet atlas for the existing pixel-art dog atlas (attached style reference). Exactly 16 separate full-body sitting dog sprites arranged in a precise 4-column by 4-row evenly spaced square grid. True transparent RGBA background, NO checkerboard, NO background, NO text, NO labels, NO frames, NO shadows, no scenery. Match reference's adorable expressive 16-bit game pixel art, hard pixel edges, dark outlines, cute natural anatomy and three-quarter front seated pose, consistent light from upper left. Each dog wholly contained in its own equally sized square cell with generous 15% clear transparent padding, no tails/ears touching cell boundaries or neighboring sprites. All dogs the same icon scale, paws along the same cell baseline. Breeds row-major, left-to-right:
Row 1: Belgian Malinois (fawn black mask); Smooth Collie (sable and white, slender pointed muzzle, smooth short coat); German Shorthaired Pointer (liver and white spotted, floppy ears); Miniature American Shepherd (blue merle fluffy coat).
Row 2: American Staffordshire Terrier (blue-gray with white chest, natural floppy ears); Jämthund Swedish elkhound (wolf-gray upright ears curled tail); German Spaniel Wachtelhund (brown roan floppy ears); Pomeranian (small orange fluffy spitz).
Row 3: Shih Tzu (long white and brown coat, flat muzzle); German Spitz (white medium spitz, pointed muzzle); Old English Bulldog (brown and white broad muscular stocky, natural ears); Standard Schnauzer (salt-and-pepper gray, beard and eyebrows).
Row 4: Small mixed-breed dog (tan wiry coat and floppy ears); Medium mixed-breed dog (black and tan short coat, one ear folded); Large mixed-breed dog (brown shaggy coat and floppy ears); Short-haired Chihuahua (cream, small upright ears).
The first 12 provide missing breeds in the Hundstallet directory; final row provides generic mixed-breed and short-haired Chihuahua avatars. These are illustrated avatars, not portraits. Match existing atlas style closely; silhouettes must read at 80 pixels. Output one transparent square 4x4 sprite sheet with 16 dogs only.

The initial atlas and its extraction attempt had a baked checkerboard and were rejected during alpha verification.

Final generation prompt:

undefined


## Accepted output and processing

- Shelter source: `exec-5fe96555-849e-4179-b835-26ce382b41bb.png` in the built-in generated-image directory for this task. The transparent cutout is padded and reduced with nearest-neighbor sampling to `public/shelters/pixel-shelter.png` (512 × 512 RGBA).
- Accepted extra atlas: `exec-8270b01d-3a57-456f-9960-75ee949bd72b.png`, copied unchanged to `public/dogs/pixel-breeds/atlas-extra.png` (1254 × 1254 RGBA).
- All 16 full animal silhouettes were located by connected-component bounds, then cropped with padding and scaled using nearest-neighbor sampling to 256 × 256 transparent PNGs.
- `public/dogs/pixel-breeds/manifest-extra.json` records every output path, crop, alpha range, bounds, and SHA-256. Every output has genuine zero-alpha pixels and an intact silhouette within its margins.
- The original 25 sprites remain unchanged. The combined library has 41 avatars; it is not a list of 41 actual animals.

Repeat the crop with Pillow installed:

```sh
python3 scripts/crop-dog-breeds.py --atlas atlas-extra.png --manifest manifest-extra.json --breeds assets/hundstallet-map/additional-breeds.json
```

## Validation

- All 24 automated tests passed, including full-directory coverage, shared-gift migration, local photo attribution, camera positioning, and map geometry.
- TypeScript checking and production build passed. All 72 active page/data/asset URLs returned HTTP 200 with the expected content types.
- The cropped sprites were inspected at display scale against a dark background; their alpha channels were checked directly.
- Browser clicking, gestures, and screenshots were not performed. The existing local preview serves the updated application.
- Scoped lint is not green: it reports the existing shell's effect/dependency conventions and framework rules about native images, plus accessibility rules that flag the custom focusable SVG map and scroll region. These are not passing lint results.
