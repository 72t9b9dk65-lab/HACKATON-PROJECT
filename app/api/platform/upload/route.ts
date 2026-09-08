import { requirePrincipal } from '@/lib/platform/auth';
import { requireSameOrigin, apiError } from '@/lib/platform/access-policy';
import { bindings } from '@/lib/platform/storage';
import { sha256 } from '@/lib/platform/proofs';
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await requirePrincipal(request, true);
    if (Number(request.headers.get('content-length') ?? 0) > 12_600_000)
      throw new Error('Choose a file smaller than 12 MB.');
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size < 1 || file.size > 12_000_000)
      throw new Error('Choose a file smaller than 12 MB.');
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'text/plain',
    ];
    if (!allowed.includes(file.type))
      throw new Error('Choose a JPG, PNG, WebP, PDF or text receipt.');
    const bytes = await file.arrayBuffer();
    const head = new Uint8Array(bytes).slice(0, 16);
    const ascii = new TextDecoder().decode(head);
    const matches =
      file.type === 'image/jpeg'
        ? head[0] === 255 && head[1] === 216
        : file.type === 'image/png'
          ? head[0] === 137 && ascii.slice(1, 4) === 'PNG'
          : file.type === 'image/webp'
            ? ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP'
            : file.type === 'application/pdf'
              ? ascii.startsWith('%PDF-')
              : !new Uint8Array(bytes).some((b) => b === 0);
    if (!matches) throw new Error('The file contents do not match its format.');
    const id = crypto.randomUUID();
    const metadata = {
      id,
      name: Array.from(file.name)
        .map((c) => (c.charCodeAt(0) < 32 || c === '/' || c === '\\' ? '_' : c))
        .join('')
        .slice(0, 180),
      type: file.type,
      size: file.size,
      hash: await sha256(bytes),
      url: `/api/platform/files/${id}`,
    };
    await bindings().CARE_FILES.put(id, bytes, {
      httpMetadata: { contentType: file.type },
    });
    await bindings()
      .CARE_DB.prepare(
        'INSERT INTO care_files (id, metadata, created_at) VALUES (?, ?, ?)',
      )
      .bind(id, JSON.stringify(metadata), new Date().toISOString())
      .run();
    return Response.json(metadata);
  } catch (error) {
    return apiError(error);
  }
}
