import test from 'node:test';
import assert from 'node:assert/strict';
import {
  allocate,
  amountInOre,
  createReceipt,
  verifyReceipts,
  loadSupporter,
  emptySupporter,
  badges,
} from '../lib/hundstallet-model.ts';
import { dogs, shelters, sweden } from '../lib/hundstallet-data.ts';

test('Care allocation reconciles exactly, including fractional kronor', () => {
  for (const amount of [10, 10.01, 49.99, 100, 25000]) {
    const ore = amountInOre(amount);
    const parts = allocate(ore);
    assert.equal(
      parts.reduce((s, p) => s + p.amountOre, 0),
      ore,
    );
    assert.ok(
      parts.every((p) => Number.isSafeInteger(p.amountOre) && p.amountOre >= 0),
    );
  }
  for (const amount of [0, 9.99, 25000.01, -100, NaN, Infinity, 10.005])
    assert.throws(() => amountInOre(amount));
});
test('Receipts detect modified amounts, ordering, broken links, and duplicate IDs', async () => {
  const a = await createReceipt('luna', 100, 'GENESIS');
  const b = await createReceipt('milo', 50, a.hash);
  assert.equal(await verifyReceipts([a, b]), true);
  assert.equal(await verifyReceipts([{ ...a, amountOre: 20000 }, b]), false);
  assert.equal(await verifyReceipts([b, a]), false);
  assert.equal(
    await verifyReceipts([a, { ...b, previousHash: 'GENESIS' }]),
    false,
  );
  assert.equal(await verifyReceipts([a, a]), false);
  await assert.rejects(() => createReceipt('unknown', 100, 'GENESIS'));
  await assert.rejects(() => createReceipt('luna', 0, 'GENESIS'));
});
test('Following, chapters, badges and valid receipts survive reload without accepting unknown dogs', async () => {
  const receipt = await createReceipt('bella', 10.01, 'GENESIS');
  const saved = {
    followed: ['luna', 'luna', 'unknown'],
    read: ['bella', 'unknown'],
    stages: { luna: 3, bella: 7, milo: -1 },
    receipts: [receipt],
  };
  const restored = await loadSupporter(JSON.stringify(saved));
  assert.deepEqual(restored, {
    followed: ['luna'],
    read: ['bella'],
    stages: { luna: 3 },
    receipts: [receipt],
  });
  assert.equal(badges(restored).filter((b) => b.earned).length, 3);
  assert.equal(
    badges({ ...emptySupporter(), followed: ['luna'], read: ['luna'] }).filter(
      (b) => b.earned,
    ).length,
    2,
  );
  await assert.rejects(() =>
    loadSupporter(
      JSON.stringify({
        ...saved,
        receipts: [{ ...receipt, amountOre: 40000 }],
      }),
    ),
  );
  assert.deepEqual(await loadSupporter(null), emptySupporter());
});
test('Every demo dog maps to an official shelter location and aggregate funds count each shelter once', () => {
  assert.equal(new Set(shelters.map((s) => s.id)).size, 3);
  assert.equal(
    sweden.raised,
    shelters.reduce((s, t) => s + t.raised, 0),
  );
  assert.equal(
    sweden.goal,
    shelters.reduce((s, t) => s + t.goal, 0),
  );
  for (const dog of dogs) {
    assert.ok(shelters.some((s) => s.id === dog.shelterId));
    assert.equal(dog.updates.length, 4);
    assert.ok(dog.stage >= 0 && dog.stage < 4);
  }
});
