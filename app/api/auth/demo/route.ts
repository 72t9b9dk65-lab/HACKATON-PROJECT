import {
  context,
  demoEnabled,
  registerIdentity,
  createSession,
} from '@/lib/platform/auth';
import { ensureDonor } from '@/lib/platform/storage';
import {
  AccessError,
  requireSameOrigin,
  apiError,
} from '@/lib/platform/access-policy';
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    if (!demoEnabled(request))
      throw new AccessError('Demo sign-in is disabled.', 404);
    const { site, origin } = context(request);
    const form = await request.formData();
    const rawEmail = form.get('email'),
      rawName = form.get('name');
    const email = (
        typeof rawEmail === 'string' ? rawEmail : 'staff@example.test'
      )
        .trim()
        .toLowerCase(),
      name = (typeof rawName === 'string' ? rawName : 'Demo employee').trim();
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 200 ||
      name.length < 1 ||
      name.length > 60
    )
      throw new Error('Enter a name and a valid demo email.');
    const user = await registerIdentity(`demo:${site}:${email}`, {
      email,
      name,
      provider: 'demo',
    });
    if (site === 'donor') await ensureDonor(user);
    return new Response(null, {
      status: 303,
      headers: {
        Location: '/',
        'Set-Cookie': await createSession(user, origin, site),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
