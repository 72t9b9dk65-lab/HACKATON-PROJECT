import {
  context,
  cookie,
  cookieName,
  sessionCookie,
} from '@/lib/platform/auth';
import { bindings } from '@/lib/platform/storage';
import { sha256 } from '@/lib/platform/proofs';
import { requireSameOrigin, apiError } from '@/lib/platform/access-policy';
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const { site, origin } = context(request);
    await bindings()
      .CARE_DB.prepare(
        'DELETE FROM care_sessions WHERE token_hash=? AND origin=?',
      )
      .bind(await sha256(cookie(request, cookieName(site, origin))), origin)
      .run();
    return new Response(null, {
      status: 303,
      headers: {
        Location: '/signin',
        'Set-Cookie': sessionCookie(site, origin, '', 0),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
