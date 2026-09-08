import { headers } from 'next/headers';
import { context, session, demoEnabled } from './auth';
export async function pageAccess() {
  const h = await headers();
  const host = h.get('host') || '127.0.0.1:3001';
  const protocol = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)
    ? 'http'
    : 'https';
  const request = new Request(`${protocol}://${host}/`, { headers: h });
  const ctx = context(request);
  const principal = await session(request);
  return { ...ctx, principal, demo: demoEnabled(request) };
}
