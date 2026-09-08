import test from 'node:test';
import assert from 'node:assert/strict';
import {
  trustedSite,
  authorizeAction,
  workspaceFor,
  requireSameOrigin,
  isStaffEmail,
} from '../lib/platform/access-policy.ts';
import { seedWorkspace } from '../lib/platform/seed.ts';
import { applyAction, balances } from '../lib/platform/model.ts';
import { appendProofs, verifyReceipt, sha256 } from '../lib/platform/proofs.ts';
import {
  shelterProgress,
  companionThresholdOre,
} from '../lib/platform/shelter-growth.ts';
const donor = {
  site: 'donor',
  origin: 'https://shelter.example',
  demo: false,
  user: {
    id: 'personal',
    email: 'one@example.com',
    name: 'One',
    provider: 'google',
    createdAt: '',
  },
};
const staff = { ...donor, site: 'staff', origin: 'https://staff.example' };
const now = '2026-09-08T11:00:00.000Z';
test('separate origins and explicit verified staff allowlist', () => {
  const c = {
    CARE_PUBLIC_ORIGIN: donor.origin,
    CARE_STAFF_ORIGIN: staff.origin,
  };
  assert.equal(trustedSite(donor.origin, c).site, 'donor');
  assert.equal(trustedSite(staff.origin, c).site, 'staff');
  assert.throws(() => trustedSite('https://evil.example', c));
  assert.throws(() =>
    trustedSite(donor.origin, { ...c, CARE_STAFF_ORIGIN: donor.origin }),
  );
  assert.equal(
    isStaffEmail('Alice@example.com', 'alice@example.com,bob@example.com'),
    true,
  );
  assert.equal(
    isStaffEmail('intruder@example.com', 'alice@example.com'),
    false,
  );
  assert.equal(isStaffEmail('alice@example.com', ''), false);
});
test('donor cannot mint funds, allocate, upload commands or select another donor', () => {
  for (const action of [
    { type: 'fund-pending' },
    { type: 'receipt' },
    { type: 'record-gift', donorId: 'personal' },
    { type: 'donate', donorId: 'personal' },
    { type: 'profile', donorId: 'alex' },
  ])
    assert.throws(() => authorizeAction(donor, action));
  assert.doesNotThrow(() =>
    authorizeAction(donor, { type: 'profile', donorId: 'personal' }),
  );
  assert.doesNotThrow(() => authorizeAction(staff, { type: 'fund-pending' }));
  assert.doesNotThrow(() =>
    authorizeAction(
      { ...donor, demo: true },
      { type: 'donate', donorId: 'personal' },
    ),
  );
});
test('mutations require exact Origin even with cookies', () => {
  for (const origin of [undefined, 'https://evil.example', 'null'])
    assert.throws(() =>
      requireSameOrigin(
        new Request(donor.origin, {
          method: 'POST',
          headers: origin ? { origin } : {},
        }),
      ),
    );
  assert.doesNotThrow(() =>
    requireSameOrigin(
      new Request(donor.origin, {
        method: 'POST',
        headers: { origin: donor.origin },
      }),
    ),
  );
});
test('donor projection hides other identities, gifts, documents, audit and unrelated records without breaking proofs', async () => {
  let state = await seedWorkspace(now);
  state.donors.forEach((d) => {
    d.email = d.id + '@private.example';
  });
  state = applyAction(state, { type: 'seal-records' }, now, []);
  await appendProofs(await seedWorkspace(now), state, now);
  const view = await workspaceFor(state, donor);
  assert.equal(view.donors.length, 1);
  assert.equal(view.donors[0].id, 'personal');
  assert.ok(view.gifts.every((g) => g.donorId === 'personal'));
  assert.deepEqual(view.audit, []);
  assert.deepEqual(view.commands, []);
  const json = JSON.stringify(view);
  for (const d of state.donors.filter((d) => d.id !== 'personal'))
    assert.equal(json.includes(d.email), false);
  for (const r of view.receipts) {
    assert.ok(
      r.products.some((p) => p.shares.some((s) => s.donorId === 'personal')),
    );
    if (r.file) {
      assert.equal(r.file.url, '');
      assert.equal(r.file.restricted, true);
    }
    const p = view.proofs.find((p) => p.id === r.proofId);
    if (p) assert.equal(await verifyReceipt(p, r), 'match');
  }
  assert.deepEqual(
    balances(view)[0],
    balances(state).find((d) => d.id === 'personal'),
  );
  assert.equal(
    (await workspaceFor(state, staff)).donors.length,
    state.donors.length,
  );
});
test('redacted contributions still validate a multi-donor receipt proof', async () => {
  let a = await seedWorkspace(now);
  const r = a.receipts.find((r) => r.state === 'funded');
  const product = r.products[0];
  product.shares = [
    { donorId: 'personal', amountOre: 1 },
    { donorId: 'alex', amountOre: product.amountOre - 1 },
  ];
  const { makeProof, receiptEvidence } =
    await import('../lib/platform/proofs.ts');
  const proof = await makeProof(
    { evidenceVersion: 2, receipt: await receiptEvidence(r) },
    undefined,
    now,
  );
  a.proofs = [proof];
  r.proofId = proof.id;
  const v = await workspaceFor(a, donor);
  const projected = v.receipts.find((x) => x.id === r.id);
  assert.equal(projected.products[0].shares[1].donorId, 'private');
  assert.equal(
    projected.products[0].shares[1].supporterHash,
    await sha256('supporter:alex'),
  );
  assert.equal(await verifyReceipt(proof, projected), 'match');
});
test('confirmed donations are exact, deduplicated and pending until whole products are assigned', async () => {
  let s = await seedWorkspace(now);
  const before = balances(s).find((d) => d.id === 'alex');
  const gift = {
    type: 'record-gift',
    donorId: 'alex',
    amountOre: 50000,
    method: 'swish',
    reference: 'SWISH-UNIQUE-1',
    receivedAt: '2026-09-08',
  };
  s = applyAction(s, gift, now, []);
  const once = balances(s).find((d) => d.id === 'alex');
  assert.equal(once.pending, before.pending + 50000);
  const double = applyAction(s, gift, now, []);
  assert.deepEqual(balances(double), balances(s));
  assert.throws(
    () => applyAction(s, { ...gift, amountOre: 50001 }, now, []),
    /different details/,
  );
  assert.throws(() =>
    applyAction(
      s,
      { ...gift, reference: 'new', receivedAt: '2099-01-01' },
      now,
      [],
    ),
  );
  const p = shelterProgress('alex', 0, 50000, 0, [{ id: 'dog' }]);
  assert.equal(p.residentIds.length, 10);
  assert.ok(
    p.zones.filter((z) => z.id !== 'garden').every((z) => z.level === 0),
  );
  const funded = shelterProgress('alex', 50000, 0, 0, [{ id: 'dog' }]);
  assert.equal(funded.residentIds.length, p.residentIds.length);
  assert.ok(
    funded.zones.some(
      (z) => z.level > p.zones.find((x) => x.id === z.id).level,
    ),
  );
});
test('all 100 companion milestones and hard maximum', () => {
  assert.equal(companionThresholdOre(20), 100000);
  assert.equal(companionThresholdOre(50), 400000);
  assert.equal(companionThresholdOre(100), 1400000);
  const p = shelterProgress('a', 1400000, 0, 9999999, [
    { id: 'one' },
    { id: 'two' },
  ]);
  assert.equal(p.residentIds.length, 100);
  assert.equal(new Set(p.residentIds).size, 100);
  assert.equal(p.potentialIds.length, 0);
  assert.equal(p.nextDogOre, null);
});
