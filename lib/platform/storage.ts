import { env } from 'cloudflare:workers';
import { seedWorkspace } from './seed.ts';
import { importUpdatedWorkbook } from './workbook-import.ts';
import type { Workspace } from './types.ts';
type Bindings = {
  CARE_DB: D1Database;
  CARE_FILES: R2Bucket;
  CARE_MODE?: string;
  CARE_PUBLIC_ORIGIN?: string;
  CARE_STAFF_ORIGIN?: string;
  CARE_STAFF_EMAILS?: string;
};
export const workspaceKey = () =>
  bindings().CARE_MODE === 'demo' ? 'local' : 'live';
export const emptyWorkspace = (): Workspace => ({
  version: 1,
  revision: 0,
  createdAt: new Date().toISOString(),
  donors: [],
  gifts: [],
  receipts: [],
  posts: [],
  proofs: [],
  audit: [],
  commands: [],
});
export function bindings() {
  return env as unknown as Bindings;
}
export async function readWorkspace(): Promise<Workspace> {
  const db = bindings().CARE_DB;
  let row = await db
    .prepare('SELECT snapshot FROM care_workspace WHERE id = ?')
    .bind(workspaceKey())
    .first<{ snapshot: string }>();
  if (!row) {
    const seed =
      bindings().CARE_MODE === 'demo'
        ? await seedWorkspace()
        : emptyWorkspace();
    await db
      .prepare(
        'INSERT OR IGNORE INTO care_workspace (id, revision, snapshot) VALUES (?, ?, ?)',
      )
      .bind(workspaceKey(), 0, JSON.stringify(seed))
      .run();
    row = await db
      .prepare('SELECT snapshot FROM care_workspace WHERE id = ?')
      .bind(workspaceKey())
      .first<{ snapshot: string }>();
  }
  if (!row) throw new Error('Could not open the care workspace.');
  const current = JSON.parse(row.snapshot) as Workspace;
  const updated =
    bindings().CARE_MODE === 'demo'
      ? await importUpdatedWorkbook(current)
      : current;
  if (updated === current) return current;
  try {
    return await saveWorkspace(updated, current.revision);
  } catch (error) {
    if (error instanceof Error && error.message === 'CONFLICT')
      return readWorkspace();
    throw error;
  }
}
export async function saveWorkspace(
  state: Workspace,
  expectedRevision: number,
) {
  const result = await bindings()
    .CARE_DB.prepare(
      'UPDATE care_workspace SET revision = ?, snapshot = ? WHERE id = ? AND revision = ?',
    )
    .bind(
      expectedRevision + 1,
      JSON.stringify({ ...state, revision: expectedRevision + 1 }),
      workspaceKey(),
      expectedRevision,
    )
    .run();
  if (result.meta.changes !== 1) throw new Error('CONFLICT');
  return { ...state, revision: expectedRevision + 1 };
}
export function localOnly(request: Request) {
  const url = new URL(request.url);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    throw new Error('This workspace is available locally.');
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin)
    throw new Error('Request origin does not match this workspace.');
}

export async function ensureDonor(user: {
  id: string;
  email: string;
  name: string;
  provider: string;
  createdAt: string;
}) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const state = await readWorkspace();
    const existing = state.donors.find((d) => d.id === user.id);
    if (
      existing &&
      existing.email === user.email &&
      existing.provider === user.provider
    )
      return state;
    if (existing) {
      existing.email = user.email;
      existing.provider = user.provider;
      existing.registeredAt ||= user.createdAt;
    } else
      state.donors.push({
        id: user.id,
        name: user.name,
        shelterName: user.name + '’s shelter',
        email: user.email,
        provider: user.provider,
        registeredAt: user.createdAt,
        following: [],
        seenUpdates: [],
        monthly: null,
      });
    try {
      return await saveWorkspace(state, state.revision);
    } catch (e) {
      if (!(e instanceof Error) || e.message !== 'CONFLICT') throw e;
    }
  }
  throw new Error('CONFLICT');
}
