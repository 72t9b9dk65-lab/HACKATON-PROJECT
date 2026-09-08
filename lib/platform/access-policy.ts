import type { Action, Workspace } from './types.ts';
import { sha256 } from './proofs.ts';
export type Site = 'donor' | 'staff';
export type Identity = {
  id: string;
  email: string;
  name: string;
  provider: 'google' | 'apple' | 'demo';
  createdAt: string;
};
export type Principal = {
  site: Site;
  user: Identity;
  demo: boolean;
  origin: string;
};
export class AccessError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.status = status;
  }
}
export function trustedSite(
  url: string,
  config: Record<string, unknown>,
): { site: Site; origin: string } {
  const parsed = new URL(url);
  const publicOrigin =
    typeof config.CARE_PUBLIC_ORIGIN === 'string'
      ? config.CARE_PUBLIC_ORIGIN
      : 'http://127.0.0.1:3001';
  const staffOrigin =
    typeof config.CARE_STAFF_ORIGIN === 'string'
      ? config.CARE_STAFF_ORIGIN
      : 'http://127.0.0.1:3002';
  if (publicOrigin === staffOrigin)
    throw new AccessError('The staff portal needs a separate origin.', 503);
  const site =
    parsed.origin === staffOrigin
      ? 'staff'
      : parsed.origin === publicOrigin
        ? 'donor'
        : null;
  if (!site)
    throw new AccessError(
      'This address is not configured for the shelter.',
      404,
    );
  if (
    parsed.protocol !== 'https:' &&
    !['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname)
  )
    throw new AccessError('Secure HTTPS is required.', 503);
  return { site, origin: parsed.origin };
}
export function requireSameOrigin(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    throw new AccessError('Request origin does not match this portal.');
}
export function isStaffEmail(email: string, configured: unknown) {
  return (typeof configured === 'string' ? configured : '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}
export function authorizeAction(principal: Principal, action: Action) {
  if (principal.site === 'staff') {
    if (action.type === 'donate' && !principal.demo)
      throw new AccessError('Record a confirmed donation instead.');
    return;
  }
  const allowed = [
    'profile',
    'follow',
    'seen',
    'cancel-plan',
    ...(principal.demo ? ['donate'] : []),
  ];
  if (
    !allowed.includes(action.type) ||
    !('donorId' in action) ||
    action.donorId !== principal.user.id
  )
    throw new AccessError(
      'You cannot change another account or staff records.',
    );
}
export async function workspaceFor(
  state: Workspace,
  principal: Principal,
): Promise<Workspace> {
  const viewer = {
    ...principal.user,
    role: principal.site,
    demo: principal.demo,
  };
  if (principal.site === 'staff') return { ...state, viewer };
  const id = principal.user.id;
  const receipts = await Promise.all(
    state.receipts
      .filter((r) =>
        r.products.some((p) => p.shares.some((s) => s.donorId === id)),
      )
      .map(async (r) => ({
        ...r,
        file: r.file
          ? {
              ...r.file,
              id: '',
              name: 'Original receipt held by staff',
              url: '',
              size: 0,
              restricted: true,
            }
          : null,
        products: await Promise.all(
          r.products.map(async (p) => ({
            ...p,
            shares: await Promise.all(
              p.shares.map(async (s) =>
                s.donorId === id
                  ? s
                  : {
                      donorId: 'private',
                      amountOre: s.amountOre,
                      supporterHash: await sha256('supporter:' + s.donorId),
                    },
              ),
            ),
          })),
        ),
      })),
  );
  const productIds = new Set(
    receipts.flatMap((r) =>
      r.products
        .filter((p) => p.shares.some((s) => s.donorId === id))
        .map((p) => p.id),
    ),
  );
  const proofIds = new Set(receipts.map((r) => r.proofId));
  const now = new Date().toISOString();
  return {
    ...state,
    viewer,
    donors: state.donors.filter((d) => d.id === id),
    gifts: state.gifts.filter((g) => g.donorId === id),
    receipts,
    posts: state.posts
      .filter(
        (p) =>
          !p.withdrawnAt &&
          p.publishAt <= now &&
          p.productIds.some((id) => productIds.has(id)),
      )
      .map((p) => ({
        ...p,
        productIds: p.productIds.filter((id) => productIds.has(id)),
      })),
    proofs: state.proofs.filter((p) => proofIds.has(p.id)),
    audit: [],
    commands: [],
  };
}
export function apiError(error: unknown) {
  const conflict = error instanceof Error && error.message === 'CONFLICT';
  return Response.json(
    {
      error: conflict
        ? 'The records changed. Refresh and review again.'
        : error instanceof Error
          ? error.message
          : 'Request failed.',
    },
    {
      status:
        error instanceof AccessError ? error.status : conflict ? 409 : 400,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
