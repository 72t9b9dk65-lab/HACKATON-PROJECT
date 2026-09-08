import { WORKBOOK_IMPORT_ID } from '../workbook-source.ts';
import { seedWorkspace } from './seed.ts';
import { assertBalanced } from './model.ts';
import { appendProofs } from './proofs.ts';
import type { Workspace } from './types.ts';

// Upgrade existing demo sessions without resetting donations, staff entries or photos.
export async function importUpdatedWorkbook(
  current: Workspace,
  now = new Date().toISOString(),
) {
  if (current.commands.includes(WORKBOOK_IMPORT_ID)) return current;
  const imported = await seedWorkspace(now);
  const next = structuredClone(current);
  let fundingDelta = 0;
  for (const receipt of imported.receipts.filter(
    (r) => r.source === 'workbook',
  )) {
    const existing = next.receipts.find((r) => r.id === receipt.id);
    if (
      existing &&
      existing.totalOre === receipt.totalOre &&
      existing.purchasedAt === receipt.purchasedAt &&
      existing.products[0]?.category === receipt.products[0].category
    )
      continue;
    if (existing) {
      const product = existing.products[0];
      const proof = next.proofs.find((p) => p.id === existing.proofId);
      if (
        existing.source !== 'workbook' ||
        existing.state !== 'funded' ||
        existing.products.length !== 1 ||
        !product.id.endsWith(':unitemized') ||
        product.shares.length !== 1 ||
        product.shares[0].donorId !== 'personal' ||
        proof?.anchors.length
      ) {
        throw new Error(
          `Imported record ${existing.reference} has been edited or anchored; review it before replacing its source amount.`,
        );
      }
      fundingDelta += receipt.totalOre - existing.totalOre;
      existing.totalOre = receipt.totalOre;
      existing.purchasedAt = receipt.purchasedAt;
      product.amountOre = receipt.totalOre;
      product.category = receipt.products[0].category;
      product.description = receipt.products[0].description;
      product.shares[0].amountOre = receipt.totalOre;
    } else {
      delete receipt.proofId;
      next.receipts.push(receipt);
      fundingDelta += receipt.totalOre;
    }
    next.audit.push({
      id: crypto.randomUUID(),
      at: now,
      kind: existing ? 'receipt.corrected' : 'receipt.funded',
      entityId: receipt.id,
      note: 'Updated from user-supplied fake-transactions.json; source date and amount preserved.',
    });
  }
  const opening = next.gifts.find((g) => g.id === 'workbook-opening');
  if (!opening)
    throw new Error(
      'Missing demo opening funding for the imported transactions.',
    );
  opening.amountOre += fundingDelta;
  next.audit.push({
    id: crypto.randomUUID(),
    at: now,
    kind: 'workbook.imported',
    entityId: WORKBOOK_IMPORT_ID,
    note: `Imported 102 source transactions. Demo opening funding adjusted by ${fundingDelta} öre to match the expense source; other donations preserved.`,
  });
  next.commands.push(WORKBOOK_IMPORT_ID);
  assertBalanced(next);
  await appendProofs(current, next, now);
  return next;
}
