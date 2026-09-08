import { createRemoteJWKSet, jwtVerify, SignJWT, importPKCS8 } from 'jose';
import { bindings } from './storage.ts';
import { sha256 } from './proofs.ts';
import {
  AccessError,
  isStaffEmail,
  trustedSite,
  type Principal,
  type Identity,
  type Site,
} from './access-policy.ts';
export const authConfig = () =>
  bindings() as unknown as Record<string, unknown>;
export function demoEnabled(request: Request) {
  return (
    authConfig().CARE_MODE === 'demo' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname)
  );
}
export function context(request: Request) {
  return trustedSite(request.url, authConfig());
}
const random = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
    n.toString(16).padStart(2, '0'),
  ).join('');
const secure = (origin: string) => origin.startsWith('https:');
export function cookieName(site: Site, origin: string) {
  return `${secure(origin) ? '__Host-' : ''}care_${site}`;
}
export function cookie(request: Request, name: string) {
  return (
    request.headers
      .get('cookie')
      ?.split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith(name + '='))
      ?.slice(name.length + 1) || ''
  );
}
export function sessionCookie(
  site: Site,
  origin: string,
  token: string,
  maxAge = 28800,
) {
  return `${cookieName(site, origin)}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure(origin) ? '; Secure' : ''}`;
}
export async function session(request: Request): Promise<Principal | null> {
  const { site, origin } = context(request);
  const token = cookie(request, cookieName(site, origin));
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const row = await bindings()
    .CARE_DB.prepare(
      'SELECT u.id, u.email, u.name, u.provider, u.created_at AS createdAt FROM care_sessions s JOIN care_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.origin=? AND s.expires_at>? AND u.disabled=0',
    )
    .bind(await sha256(token), origin, Date.now())
    .first<Identity>();
  if (!row) return null;
  const demo = demoEnabled(request);
  if (row.provider === 'demo' && !demo) return null;
  if (
    site === 'staff' &&
    !demo &&
    !isStaffEmail(row.email, authConfig().CARE_STAFF_EMAILS)
  )
    return null;
  return { site, origin, user: row, demo };
}
export async function requirePrincipal(
  request: Request,
  staff = false,
): Promise<Principal> {
  const ctx = context(request);
  if (staff && ctx.site !== 'staff')
    throw new AccessError(
      'Staff operations are available only on the staff portal.',
    );
  const principal = await session(request);
  if (principal) return principal;
  if (demoEnabled(request) && ctx.site === 'donor')
    return {
      ...ctx,
      demo: true,
      user: {
        id: 'personal',
        email: '',
        name: 'Dog friend',
        provider: 'demo',
        createdAt: '',
      },
    };
  throw new AccessError('Sign in to open this workspace.', 401);
}
export async function createSession(
  user: Identity,
  origin: string,
  site: Site,
) {
  const token = random();
  await bindings()
    .CARE_DB.prepare(
      'INSERT INTO care_sessions (token_hash,user_id,origin,expires_at) VALUES (?,?,?,?)',
    )
    .bind(await sha256(token), user.id, origin, Date.now() + 28800000)
    .run();
  return sessionCookie(site, origin, token);
}
export async function registerIdentity(
  identityKey: string,
  values: Omit<Identity, 'id' | 'createdAt'>,
) {
  const db = bindings().CARE_DB;
  await db
    .prepare(
      'INSERT OR IGNORE INTO care_users (id,identity_key,email,name,provider,created_at,disabled) VALUES (?,?,?,?,?,?,0)',
    )
    .bind(
      crypto.randomUUID(),
      identityKey,
      values.email,
      values.name,
      values.provider,
      new Date().toISOString(),
    )
    .run();
  const user = await db
    .prepare(
      'SELECT id,email,name,provider,created_at AS createdAt FROM care_users WHERE identity_key=? AND disabled=0',
    )
    .bind(identityKey)
    .first<Identity>();
  if (!user) throw new AccessError('This account is unavailable.');
  // The provider subject is the identity key. Never silently merge by email.
  await db
    .prepare('UPDATE care_users SET email=? WHERE id=?')
    .bind(values.email, user.id)
    .run();
  return { ...user, email: values.email };
}
const providers = {
  google: {
    authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    jwks: 'https://www.googleapis.com/oauth2/v3/certs',
  },
  apple: {
    authorize: 'https://appleid.apple.com/auth/authorize',
    token: 'https://appleid.apple.com/auth/token',
    issuer: 'https://appleid.apple.com',
    jwks: 'https://appleid.apple.com/auth/keys',
  },
};
export type Provider = keyof typeof providers;
const keys = {
  google: createRemoteJWKSet(new URL(providers.google.jwks)),
  apple: createRemoteJWKSet(new URL(providers.apple.jwks)),
};
export function enabledProviders() {
  const c = authConfig();
  return {
    google: !!(c.GOOGLE_CLIENT_ID && c.GOOGLE_CLIENT_SECRET),
    apple: !!(
      c.APPLE_CLIENT_ID &&
      c.APPLE_TEAM_ID &&
      c.APPLE_KEY_ID &&
      c.APPLE_PRIVATE_KEY
    ),
  };
}
function configFor(provider: string) {
  if (provider !== 'google' && provider !== 'apple')
    throw new AccessError('Unknown sign-in provider.', 404);
  if (!enabledProviders()[provider])
    throw new AccessError(
      'This sign-in provider has not been connected yet.',
      503,
    );
  const c = authConfig();
  return {
    provider: provider as Provider,
    ...providers[provider],
    clientId: String(
      c[provider === 'google' ? 'GOOGLE_CLIENT_ID' : 'APPLE_CLIENT_ID'],
    ),
  };
}
function flowName(provider: Provider, origin: string) {
  return `${secure(origin) ? '__Host-' : ''}care_flow_${provider}`;
}
function flowCookie(
  provider: Provider,
  origin: string,
  token: string,
  maxAge = 600,
) {
  return `${flowName(provider, origin)}=${token}; Path=/; HttpOnly; Max-Age=${maxAge}; SameSite=${provider === 'apple' ? 'None' : 'Lax'}${secure(origin) ? '; Secure' : ''}`;
}
export async function startSignIn(request: Request, name: string) {
  const { origin } = context(request),
    p = configFor(name);
  if (p.provider === 'apple' && !secure(origin))
    throw new AccessError(
      'Apple sign-in requires a configured HTTPS domain.',
      503,
    );
  const state = random(),
    browser = random(),
    nonce = random(),
    verifier = random();
  const db = bindings().CARE_DB;
  await db.batch([
    db
      .prepare('DELETE FROM care_oauth_flows WHERE expires_at<?')
      .bind(Date.now()),
    db.prepare('DELETE FROM care_sessions WHERE expires_at<?').bind(Date.now()),
    db
      .prepare(
        'INSERT INTO care_oauth_flows (state_hash,browser_hash,provider,origin,nonce,verifier,expires_at) VALUES (?,?,?,?,?,?,?)',
      )
      .bind(
        await sha256(state),
        await sha256(browser),
        p.provider,
        origin,
        nonce,
        verifier,
        Date.now() + 600000,
      ),
  ]);
  const url = new URL(p.authorize);
  url.search = new URLSearchParams({
    client_id: p.clientId,
    redirect_uri: origin + `/api/auth/${p.provider}/callback`,
    response_type: 'code',
    scope: p.provider === 'google' ? 'openid email profile' : 'name email',
    state,
    nonce,
  }).toString();
  if (p.provider === 'apple')
    url.searchParams.set('response_mode', 'form_post');
  else {
    const digest = new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)),
    );
    url.searchParams.set(
      'code_challenge',
      btoa(String.fromCharCode(...digest))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, ''),
    );
    url.searchParams.set('code_challenge_method', 'S256');
  }
  return new Response(null, {
    status: 302,
    headers: {
      Location: url.href,
      'Set-Cookie': flowCookie(p.provider, origin, browser),
      'Cache-Control': 'no-store',
    },
  });
}
export async function finishSignIn(request: Request, name: string) {
  const { origin, site } = context(request),
    p = configFor(name);
  const body =
    request.method === 'POST'
      ? new URLSearchParams(await request.text())
      : new URL(request.url).searchParams;
  const state = body.get('state') || '',
    browser = cookie(request, flowName(p.provider, origin));
  if (!/^[a-f0-9]{64}$/.test(state) || !/^[a-f0-9]{64}$/.test(browser))
    throw new AccessError('Sign-in expired. Please start again.', 401);
  const flow = await bindings()
    .CARE_DB.prepare(
      'DELETE FROM care_oauth_flows WHERE state_hash=? AND browser_hash=? AND provider=? AND origin=? AND expires_at>? RETURNING nonce,verifier',
    )
    .bind(
      await sha256(state),
      await sha256(browser),
      p.provider,
      origin,
      Date.now(),
    )
    .first<{ nonce: string; verifier: string }>();
  if (!flow || !body.get('code') || body.has('error'))
    throw new AccessError(
      'Sign-in was cancelled or expired. Please start again.',
      401,
    );
  const c = authConfig();
  const secret =
    p.provider === 'google'
      ? String(c.GOOGLE_CLIENT_SECRET)
      : await new SignJWT({})
          .setProtectedHeader({ alg: 'ES256', kid: String(c.APPLE_KEY_ID) })
          .setIssuer(String(c.APPLE_TEAM_ID))
          .setSubject(p.clientId)
          .setAudience('https://appleid.apple.com')
          .setIssuedAt()
          .setExpirationTime('5m')
          .sign(
            await importPKCS8(
              String(c.APPLE_PRIVATE_KEY).replace(/\\n/g, '\n'),
              'ES256',
            ),
          );
  const fields = new URLSearchParams({
    grant_type: 'authorization_code',
    code: body.get('code')!,
    client_id: p.clientId,
    client_secret: secret,
    redirect_uri: origin + `/api/auth/${p.provider}/callback`,
  });
  if (p.provider === 'google') fields.set('code_verifier', flow.verifier);
  const response = await fetch(p.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: fields,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new AccessError(
      'The provider could not complete sign-in. Please try again.',
      401,
    );
  const result = (await response.json()) as { id_token?: string };
  if (!result.id_token)
    throw new AccessError('No verified identity was returned.', 401);
  const { payload } = await jwtVerify(result.id_token, keys[p.provider], {
    issuer: p.issuer,
    audience: p.clientId,
    algorithms: ['RS256'],
    requiredClaims: ['sub', 'exp', 'iat'],
    maxTokenAge: '10m',
  });
  if (
    payload.nonce !== flow.nonce ||
    !payload.sub ||
    typeof payload.email !== 'string' ||
    ![true, 'true'].includes(payload.email_verified as boolean) ||
    (payload.azp && payload.azp !== p.clientId)
  )
    throw new AccessError(
      'A verified email and matching sign-in session are required.',
      401,
    );
  const email = payload.email.toLowerCase();
  if (site === 'staff' && !isStaffEmail(email, c.CARE_STAFF_EMAILS))
    throw new AccessError(
      'This account is not authorized for the staff portal.',
    );
  const user = await registerIdentity(`${p.provider}:${payload.sub}`, {
    email,
    name:
      typeof payload.name === 'string'
        ? payload.name.slice(0, 100)
        : email.split('@')[0],
    provider: p.provider,
  });
  return {
    user,
    site,
    origin,
    clearFlow: flowCookie(p.provider, origin, '', 0),
  };
}
