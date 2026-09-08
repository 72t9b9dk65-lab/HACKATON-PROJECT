import { createSession, finishSignIn } from '@/lib/platform/auth';
import { ensureDonor } from '@/lib/platform/storage';
import { apiError } from '@/lib/platform/access-policy';
async function callback(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const result = await finishSignIn(request, (await params).provider);
    if (result.site === 'donor') await ensureDonor(result.user);
    const headers = new Headers({
      Location: result.origin + '/',
      'Cache-Control': 'no-store',
    });
    headers.append(
      'Set-Cookie',
      await createSession(result.user, result.origin, result.site),
    );
    headers.append('Set-Cookie', result.clearFlow);
    return new Response(null, { status: 303, headers });
  } catch (error) {
    return apiError(error);
  }
}
export const GET = callback;
export const POST = callback;
