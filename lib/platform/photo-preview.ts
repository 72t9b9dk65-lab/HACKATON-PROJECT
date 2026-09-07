export function profilePreview(src: string, width: 320 | 960 = 960) {
  const match = src.match(
    /^\/dogs\/hundstallet\/([a-zA-Z0-9_-]+)\.(?:jpg|png|webp)$/,
  );
  return match ? `/dogs/previews/${match[1]}-${width}.webp` : src;
}
// This applies only to care photos, never to invoices or receipt evidence.
// Canvas export removes embedded camera metadata and keeps uploads lightweight.
export async function prepareCarePhoto(file: File): Promise<File> {
  if (file.size > 12_000_000)
    throw new Error('Choose a photo smaller than 12 MB.');
  const bitmap = await createImageBitmap(file);
  try {
    const ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext('2d');
    if (!context)
      throw new Error('Could not prepare the photo. Try another image.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) =>
          result
            ? resolve(result)
            : reject(new Error('Could not prepare this photo.')),
        'image/webp',
        0.86,
      ),
    );
    return new File(
      [blob],
      `${file.name.replace(/\.[^.]+$/, '')}.${blob.type === 'image/webp' ? 'webp' : 'png'}`,
      { type: blob.type },
    );
  } finally {
    bitmap.close();
  }
}
