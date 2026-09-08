import sharp from 'sharp';
import { mkdir, readdir, stat } from 'node:fs/promises';
const input = new URL('../../public/dogs/hundstallet/', import.meta.url);
const output = new URL('../../public/dogs/previews/', import.meta.url);
await mkdir(output, { recursive: true });
let sourceBytes = 0,
  previewBytes = 0,
  count = 0;
for (const file of await readdir(input)) {
  if (!/\.(jpg|png|webp)$/i.test(file)) continue;
  sourceBytes += (await stat(new URL(file, input))).size;
  for (const width of [320, 960]) {
    const destination = new URL(
      `${file.replace(/\.[^.]+$/, '')}-${width}.webp`,
      output,
    );
    await sharp(new URL(file, input).pathname)
      .rotate()
      .resize({ width, height: width, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 84 })
      .toFile(destination.pathname);
    previewBytes += (await stat(destination)).size;
    count++;
  }
}
console.log(
  JSON.stringify(
    {
      files: count,
      originalBytes: sourceBytes,
      previewBytes,
      ratio: Math.round((previewBytes / sourceBytes) * 100) + '%',
    },
    null,
    2,
  ),
);
