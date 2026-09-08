import { requirePrincipal } from '@/lib/platform/auth';
import {
  authorizeAction,
  workspaceFor,
  requireSameOrigin,
  apiError,
} from '@/lib/platform/access-policy';
import {
  readWorkspace,
  saveWorkspace,
  ensureDonor,
  bindings,
} from '@/lib/platform/storage';
import { applyAction } from '@/lib/platform/model';
import { appendProofs, verifyReceipt } from '@/lib/platform/proofs';
import { profileDogs } from '@/lib/donation-shell';
import type { Command, FileRecord } from '@/lib/platform/types';
export async function GET(request: Request) {
  try {
    const principal = await requirePrincipal(request);
    const state =
      principal.site === 'donor'
        ? await ensureDonor(principal.user)
        : await readWorkspace();
    return Response.json(await workspaceFor(state, principal), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return apiError(error);
  }
}
async function validFile(file: FileRecord | null | undefined) {
  if (!file) return null;
  const row = await bindings()
    .CARE_DB.prepare('SELECT metadata FROM care_files WHERE id = ?')
    .bind(file.id)
    .first<{ metadata: string }>();
  if (!row) throw new Error('Upload the file before saving this entry.');
  const saved = JSON.parse(row.metadata) as FileRecord;
  if (saved.hash !== file.hash) throw new Error('The uploaded file changed.');
  return saved;
}
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const principal = await requirePrincipal(request);
    if (Number(request.headers.get('content-length') ?? 0) > 200_000)
      throw new Error('This entry is too large.');
    const raw = await request.text();
    if (raw.length > 200_000) throw new Error('This entry is too large.');
    const command = JSON.parse(raw) as Command;
    if (
      !command ||
      typeof command.id !== 'string' ||
      !/^[a-zA-Z0-9_-]{8,100}$/.test(command.id) ||
      !Number.isSafeInteger(command.revision) ||
      !command.action
    )
      throw new Error('Invalid request.');
    authorizeAction(principal, command.action);
    const current = await readWorkspace();
    if (current.commands.includes(command.id))
      return Response.json(await workspaceFor(current, principal));
    if (current.revision !== command.revision)
      return Response.json(
        {
          error:
            'Someone updated this workspace. The latest records have been loaded; please review and try again.',
        },
        { status: 409 },
      );
    if (
      command.action.type === 'receipt' ||
      command.action.type === 'edit-receipt'
    )
      command.action.draft.file = await validFile(command.action.draft.file);
    if (command.action.type === 'itemize') {
      const file = await validFile(command.action.file);
      if (!file) throw new Error('Attach the original receipt.');
      command.action.file = file;
    }
    if (command.action.type === 'publish')
      command.action.post.photo = await validFile(command.action.post.photo);
    // An anchor is accepted only after server verification of the transaction.
    if (command.action.type === 'anchor')
      return Response.json(
        { error: 'Use the confirmed testnet verification endpoint.' },
        { status: 400 },
      );
    if (command.action.type === 'seal-record') {
      const receipt = current.receipts.find(
        (r) => r.id === (command.action as { receiptId: string }).receiptId,
      );
      const proof = current.proofs.find((p) => p.id === receipt?.proofId);
      if (receipt && proof && (await verifyReceipt(proof, receipt)) === 'match')
        return Response.json(await workspaceFor(current, principal));
    }
    const now = new Date().toISOString();
    const next = applyAction(
      current,
      command.action,
      now,
      profileDogs.filter((d) => !d.group).map((d) => d.id),
    );
    for (const event of next.audit.slice(current.audit.length))
      event.actorId = principal.user.id;
    next.commands = [...current.commands, command.id];
    await appendProofs(current, next, now);
    return Response.json(
      await workspaceFor(
        await saveWorkspace(next, current.revision),
        principal,
      ),
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return apiError(error);
  }
}
