import { env } from 'cloudflare:workers';
import { seedWorkspace } from './seed.ts';
import { importUpdatedWorkbook } from './workbook-import.ts';
import type { Workspace } from './types.ts';
type Bindings = { CARE_DB: D1Database; CARE_FILES: R2Bucket };
export function bindings() {
  return env as unknown as Bindings;
}
export async function readWorkspace(): Promise<Workspace> {
  const db = bindings().CARE_DB;
  let row = await db
    .prepare('SELECT snapshot FROM care_workspace WHERE id = ?')
    .bind('local')
    .first<{ snapshot: string }>();
  if (!row) {
    const seed = await seedWorkspace();
    await db
      .prepare(
        'INSERT OR IGNORE INTO care_workspace (id, revision, snapshot) VALUES (?, ?, ?)',
      )
      .bind('local', 0, JSON.stringify(seed))
      .run();
    row = await db
      .prepare('SELECT snapshot FROM care_workspace WHERE id = ?')
      .bind('local')
      .first<{ snapshot: string }>();
  }
  if (!row) throw new Error('Could not open the care workspace.');
  const current = JSON.parse(row.snapshot) as Workspace;
  const updated = await importUpdatedWorkbook(current);
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
      'local',
      expectedRevision,
    )
    .run();
  if (result.meta.changes !== 1) throw new Error('CONFLICT');
  return { ...state, revision: expectedRevision + 1 };
}
export function localOnly(request: Request) {
  const url = new URL(request.url);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    throw new Error('This independent demo is local-only.');
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin)
    throw new Error('Request origin does not match this workspace.');
}
