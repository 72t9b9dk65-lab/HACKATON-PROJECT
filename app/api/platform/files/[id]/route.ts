import { bindings, localOnly } from '@/lib/platform/storage';
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    localOnly(request);
    const { id } = await params;
    if (!/^[a-f0-9-]{36}$/.test(id))
      return new Response('Not found', { status: 404 });
    const object = await bindings().CARE_FILES.get(id);
    if (!object) return new Response('Not found', { status: 404 });
    return new Response(object.body, {
      headers: {
        'Content-Type':
          object.httpMetadata?.contentType ?? 'application/octet-stream',
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  } catch {
    return new Response('Unavailable', { status: 404 });
  }
}
