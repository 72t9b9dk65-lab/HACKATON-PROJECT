import { requirePrincipal } from '@/lib/platform/auth';
import { bindings, readWorkspace } from '@/lib/platform/storage';
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const principal = await requirePrincipal(request);
    const { id } = await params;
    if (!/^[a-f0-9-]{36}$/.test(id))
      return new Response('Not found', { status: 404 });
    if (principal.site === 'donor') {
      const state = await readWorkspace();
      const owned = new Set(
        state.receipts
          .filter((r) => r.state === 'funded')
          .flatMap((r) => r.products)
          .filter((p) => p.shares.some((s) => s.donorId === principal.user.id))
          .map((p) => p.id),
      );
      if (
        !state.posts.some(
          (p) =>
            p.photo?.id === id &&
            !p.withdrawnAt &&
            p.publishAt <= new Date().toISOString() &&
            p.productIds.some((id) => owned.has(id)),
        )
      )
        return new Response('Not found', { status: 404 });
    }
    const object = await bindings().CARE_FILES.get(id);
    if (!object) return new Response('Not found', { status: 404 });
    return new Response(object.body, {
      headers: {
        'Content-Type':
          object.httpMetadata?.contentType ?? 'application/octet-stream',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  } catch {
    return new Response('Unavailable', { status: 404 });
  }
}
