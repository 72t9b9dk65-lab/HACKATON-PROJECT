import test from 'node:test';
import assert from 'node:assert/strict';
import { seedWorkspace } from '../lib/platform/seed.ts';
import { importUpdatedWorkbook } from '../lib/platform/workbook-import.ts';
import { WORKBOOK_IMPORT_ID } from '../lib/workbook-source.ts';
import { balances, assertBalanced } from '../lib/platform/model.ts';
import { verifyChain, verifyReceipt } from '../lib/platform/proofs.ts';

test('updated fake transactions migrate existing sessions once, preserving staff data and old proofs', async () => {
  const before = await seedWorkspace('2026-09-08T07:00:00Z');
  before.commands = before.commands.filter((id) => id !== WORKBOOK_IMPORT_ID);
  before.receipts = before.receipts.filter(
    (r) => !['workbook-5-2', 'workbook-5-3'].includes(r.id),
  );
  const food = before.receipts.find((r) => r.id === 'workbook-4');
  food.totalOre =
    food.products[0].amountOre =
    food.products[0].shares[0].amountOre =
      9900;
  before.gifts.find((g) => g.id === 'workbook-opening').amountOre = 478300;
  const original = structuredClone(before);
  const after = await importUpdatedWorkbook(before, '2026-09-08T07:10:00Z');
  assert.deepEqual(before, original);
  const rows = after.receipts.filter((r) => r.source === 'workbook');
  assert.equal(rows.length, 102);
  assert.equal(new Set(rows.map((r) => r.id)).size, 102);
  assert.equal(
    rows.reduce((n, r) => n + r.totalOre, 0),
    479500,
  );
  assert.deepEqual(
    rows.filter((r) => r.sourceRow === 5).map((r) => r.totalOre),
    [8000, 1200, 1000],
  );
  assert.deepEqual(after.posts, before.posts);
  assert.deepEqual(
    after.receipts.filter((r) => r.source !== 'workbook'),
    before.receipts.filter((r) => r.source !== 'workbook'),
  );
  assert.deepEqual(
    after.gifts.filter((g) => g.source !== 'workbook'),
    before.gifts.filter((g) => g.source !== 'workbook'),
  );
  assert.deepEqual(
    balances(after).map((d) => d.pending),
    balances(before).map((d) => d.pending),
  );
  assert.deepEqual(after.proofs.slice(0, before.proofs.length), before.proofs);
  assert.equal(await verifyChain(after.proofs), true);
  for (const id of ['workbook-4', 'workbook-5-2', 'workbook-5-3']) {
    const receipt = after.receipts.find((r) => r.id === id);
    assert.equal(
      await verifyReceipt(
        after.proofs.find((p) => p.id === receipt.proofId),
        receipt,
      ),
      'match',
    );
  }
  assertBalanced(after);
  assert.equal(await importUpdatedWorkbook(after), after);
});

test('source updates cannot overwrite itemized or anchored spending', async () => {
  const state = await seedWorkspace();
  state.commands = state.commands.filter((id) => id !== WORKBOOK_IMPORT_ID);
  const receipt = state.receipts.find((r) => r.id === 'workbook-4');
  receipt.totalOre = 9900;
  receipt.products[0].id = 'staff-item';
  await assert.rejects(importUpdatedWorkbook(state), /edited or anchored/);
});
