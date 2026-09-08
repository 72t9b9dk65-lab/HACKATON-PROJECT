import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { seedWorkspace } from '../lib/platform/seed.ts';
import {
  activePhoto,
  allocateProducts,
  applyAction,
  assertBalanced,
  balances,
  contributionToDog,
  donorProducts,
  expandLines,
  parseMoney,
  publishedPosts,
  supportedDogs,
  dogStage,
} from '../lib/platform/model.ts';
import {
  appendProofs,
  canonical,
  makeProof,
  receiptEvidence,
  sha256,
  verifyChain,
  verifyProof,
} from '../lib/platform/proofs.ts';
import { parseReceiptText } from '../lib/platform/receipt-parser.ts';

const now = '2026-09-07T12:00:00.000Z';
const dogs = ['koby', 'ove', 'ake', 'kenzo'];
const seed = () => seedWorkspace(now);
let serial = 0;
const id = () => `test-${++serial}`;
const apply = (s, a, time = now) => applyAction(s, a, time, dogs, id);
const file = {
  id: 'test-photo',
  name: 'care.jpg',
  type: 'image/jpeg',
  size: 40,
  hash: 'a'.repeat(64),
  url: '/api/platform/files/test-photo',
};
const draft = (
  lines = [
    { description: 'Chew bone', category: 'play', quantity: 5, unitOre: 3000 },
  ],
) => ({
  supplier: 'Test Care',
  reference: `REF-${++serial}`,
  purchasedAt: '2026-09-07',
  totalOre: lines.reduce((n, l) => n + l.quantity * l.unitOre, 0),
  lines,
  file: null,
});
const receipt = (s, d = draft()) => {
  const next = apply(s, { type: 'receipt', draft: d });
  return [next, next.receipts.at(-1).id];
};
const post = (changes = {}) => ({
  title: 'A care moment',
  note: 'Recorded by staff.',
  dogIds: ['koby'],
  productIds: ['fixture-play'],
  category: 'play',
  stage: null,
  photo: file,
  occurredAt: now,
  publishAt: now,
  liveHours: 2,
  ...changes,
});

// Photo and correction tests create their own funded purchase instead of
// relying on a historical receipt in the application seed.
async function seedWithCare() {
  const state = await seed();
  const care = {
    id: 'fixture-care-receipt',
    supplier: 'Test care supplier',
    reference: 'TEST-CARE',
    purchasedAt: now,
    createdAt: now,
    totalOre: 12500,
    products: [
      {
        id: 'fixture-play',
        description: 'Chew toy',
        category: 'play',
        amountOre: 7500,
        shares: [{ donorId: 'personal', amountOre: 7500 }],
      },
      {
        id: 'fixture-meals',
        description: 'Dog food',
        category: 'food',
        amountOre: 5000,
        shares: [{ donorId: 'personal', amountOre: 5000 }],
      },
    ],
    file: null,
    state: 'funded',
    fundedAt: now,
    source: 'staff',
  };
  const proof = await makeProof(
    {
      kind: 'receipt.funded',
      entityId: care.id,
      evidenceVersion: 2,
      receipt: await receiptEvidence(care),
    },
    undefined,
    now,
  );
  care.proofId = proof.id;
  state.receipts.push(care);
  state.proofs.push(proof);
  assertBalanced(state);
  return state;
}

test('the new shared workspace preserves all 102 workbook rows, precision and total', async () => {
  const s = await seed();
  const source = JSON.parse(
    fs.readFileSync(
      new URL(
        '../public/data/hundstallet/fake-transactions.json',
        import.meta.url,
      ),
    ),
  );
  const rows = s.receipts.filter((r) => r.source === 'workbook');
  assert.equal(rows.length, 102);
  assert.equal(
    rows.reduce((n, r) => n + r.totalOre, 0),
    479500,
  );
  for (const [index, row] of source.transactions.entries()) {
    const r = rows[index];
    assert.equal(r.sourceRow, row.row);
    assert.equal(r.purchasedAt, row.date);
    assert.equal(r.totalOre, row.amountOre);
    assert.equal(r.file, null);
    assert.match(r.products[0].id, /:unitemized$/);
  }
  assertBalanced(s);
  assert.equal(
    balances(s).reduce((n, d) => n + d.donated, 0),
    929500,
  );
  assert.equal(s.receipts.length, 102);
  assert.ok(
    s.receipts.every(
      (r) => r.id !== 'demo-care-receipt' && r.reference !== 'DEMO-001',
    ),
  );
  assert.ok(s.posts.every((p) => p.productIds.length === 0 && p.stage));
  assert.equal(s.proofs.length, 0);
  assert.equal(
    balances(s).reduce((n, d) => n + d.used, 0),
    479500,
  );
  assert.equal(
    balances(s).reduce((n, d) => n + d.pending, 0),
    450000,
  );
});
test('a gift increases available funds, never creates a dog or an automatic future payment', async () => {
  const s = await seed(),
    before = balances(s).find((d) => d.id === 'noah');
  const n = apply(s, {
    type: 'donate',
    donorId: 'noah',
    amountOre: 10000,
    monthly: true,
    category: 'food',
  });
  const after = balances(n).find((d) => d.id === 'noah');
  assert.equal(after.pending, before.pending + 10000);
  assert.equal(after.used, before.used);
  assert.deepEqual(supportedDogs(n, 'noah', Date.parse(now)), []);
  assert.equal(n.gifts.length, s.gifts.length + 1);
  assert.equal(n.donors.find((d) => d.id === 'noah').monthly.amountOre, 10000);
  const cancelled = apply(n, { type: 'cancel-plan', donorId: 'noah' });
  assert.equal(cancelled.gifts.length, n.gifts.length);
  assert.deepEqual(
    balances(cancelled).map((d) => d.pending),
    balances(n).map((d) => d.pending),
  );
});
test('SEK parsing uses integer öre; invalid precision, NaN and outside limits fail', async () => {
  assert.equal(parseMoney('1 100,25'), 110025);
  assert.equal(parseMoney('0.01'), 1);
  for (const input of ['', '-2', '1e3', '1,100', '0', 'Infinity', '2.005'])
    assert.equal(parseMoney(input), null);
  const s = await seed();
  for (const amountOre of [0, NaN, 1.2, -100, 1, 99, 100, 4999, 1000001])
    assert.throws(
      () =>
        apply(s, {
          type: 'donate',
          donorId: 'personal',
          amountOre,
          monthly: false,
          category: 'food',
        }),
      /between 50 and/,
    );
  const before = balances(s).find((d) => d.id === 'personal').pending;
  for (const amountOre of [5000, 5001, 1000000]) {
    const next = apply(s, {
      type: 'donate',
      donorId: 'personal',
      amountOre,
      monthly: false,
      category: 'food',
    });
    assert.equal(
      balances(next).find((d) => d.id === 'personal').pending,
      before + amountOre,
    );
  }
});
test('priced units are expanded exactly, with differing prices preserved', () => {
  const rows = expandLines(
    [
      {
        description: 'Small bone',
        category: 'play',
        quantity: 3,
        unitOre: 1499,
      },
      {
        description: 'Large bone',
        category: 'play',
        quantity: 2,
        unitOre: 2205,
      },
    ],
    'r',
  );
  assert.equal(rows.length, 5);
  assert.deepEqual(
    rows.map((p) => p.amountOre),
    [1499, 1499, 1499, 2205, 2205],
  );
  assert.equal(new Set(rows.map((p) => p.id)).size, 5);
  for (const quantity of [0, 101, 1.1, NaN])
    assert.throws(() =>
      expandLines(
        [{ description: 'Bone', category: 'play', quantity, unitOre: 100 }],
        'r',
      ),
    );
});
test('a receipt waits for review and funding; confirming twice never charges twice', async () => {
  const s = await seed();
  const [pending, rid] = receipt(s);
  assert.deepEqual(balances(pending), balances(s));
  assert.equal(pending.receipts.at(-1).state, 'draft');
  const funded = apply(pending, { type: 'fund', receiptId: rid });
  assert.equal(
    balances(funded).reduce((n, d) => n + d.used, 0) -
      balances(s).reduce((n, d) => n + d.used, 0),
    15000,
  );
  assert.equal(funded.receipts.at(-1).products.length, 5);
  const again = apply(funded, { type: 'fund', receiptId: rid });
  assert.deepEqual(again, funded);
  assertBalanced(funded);
});
test('new purchases never redistribute an existing product assignment', async () => {
  const s = await seed();
  const before = structuredClone(s.receipts);
  let [n, rid] = receipt(s);
  n = apply(n, { type: 'fund', receiptId: rid });
  assert.deepEqual(n.receipts.slice(0, before.length), before);
  [n, rid] = receipt(
    n,
    draft([
      {
        description: 'Medicine',
        category: 'medicine',
        quantity: 1,
        unitOre: 90000,
      },
    ]),
  );
  n = apply(n, { type: 'fund', receiptId: rid });
  assert.deepEqual(n.receipts.slice(0, before.length), before);
  assertBalanced(n);
});
test('an unaffordable individual item stays pending rather than splitting across donors', () => {
  assert.throws(
    () =>
      allocateProducts(
        [
          {
            id: 'exam',
            description: 'Exam',
            category: 'vaccination',
            amountOre: 110000,
            shares: [],
          },
        ],
        [
          { id: 'a', pending: 50000 },
          { id: 'b', pending: 70000 },
        ],
      ),
    /assigned whole/,
  );
});
test('insufficient pooled funds leave all receipts and wallets unchanged', async () => {
  const s = await seed();
  const [n, rid] = receipt(
    s,
    draft([
      {
        description: 'Veterinary examination',
        category: 'vaccination',
        quantity: 1,
        unitOre: 500000,
      },
    ]),
  );
  const original = structuredClone(n);
  assert.throws(() => apply(n, { type: 'fund', receiptId: rid }), /not enough/);
  assert.deepEqual(n, original);
});
test('batch allocation matches the review plan and confirms atomically', async () => {
  let s = await seed();
  [s] = receipt(s);
  [s] = receipt(
    s,
    draft([
      { description: 'Food', category: 'food', quantity: 2, unitOre: 11011 },
    ]),
  );
  const pending = s.receipts.filter((r) => r.state === 'draft');
  const plan = allocateProducts(
    pending.flatMap((r) => r.products),
    balances(s),
  );
  const n = apply(s, { type: 'fund-pending' });
  assert.deepEqual(
    n.receipts
      .filter((r) => pending.some((p) => p.id === r.id))
      .flatMap((r) => r.products),
    plan,
  );
  assertBalanced(n);
  let invalid;
  [invalid] = receipt(
    s,
    draft([
      {
        description: 'Unaffordable',
        category: 'comfort',
        quantity: 1,
        unitOre: 1000000,
      },
    ]),
  );
  const original = structuredClone(invalid);
  assert.throws(() => apply(invalid, { type: 'fund-pending' }));
  assert.deepEqual(invalid, original);
});
test('duplicate receipt references and mismatched totals cannot debit any wallet', async () => {
  const s = await seed();
  const d = draft();
  const [n] = receipt(s, d);
  assert.throws(
    () => receipt(n, { ...d, supplier: d.supplier.toUpperCase() }),
    /already/,
  );
  assert.throws(
    () => receipt(s, { ...d, totalOre: d.totalOre + 1 }),
    /exactly/,
  );
  assertBalanced(n);
});
test('pending receipt edits do not spend money; confirmed products cannot be edited', async () => {
  const s = await seed();
  const [n, rid] = receipt(s);
  const edited = apply(n, {
    type: 'edit-receipt',
    receiptId: rid,
    draft: draft([
      {
        description: 'Correct bone',
        category: 'play',
        quantity: 2,
        unitOre: 2333,
      },
    ]),
  });
  assert.equal(edited.receipts.at(-1).totalOre, 4666);
  assert.deepEqual(balances(edited), balances(s));
  const funded = apply(edited, { type: 'fund', receiptId: rid });
  assert.throws(
    () =>
      apply(funded, { type: 'edit-receipt', receiptId: rid, draft: draft() }),
    /Only pending/,
  );
});
test('corrections retain the purchase and release funds exactly once', async () => {
  const s = await seedWithCare();
  const used = balances(s).reduce((n, d) => n + d.used, 0);
  const shares = structuredClone(s.receipts.at(-1).products);
  const n = apply(s, {
    type: 'void',
    receiptId: 'fixture-care-receipt',
    reason: 'Supplier refunded this purchase.',
  });
  assert.equal(
    balances(n).reduce((sum, d) => sum + d.used, 0),
    used - 12500,
  );
  assert.deepEqual(n.receipts.at(-1).products, shares);
  assert.deepEqual(supportedDogs(n, 'personal', Date.parse(now)), []);
  assert.throws(() =>
    apply(n, {
      type: 'void',
      receiptId: 'fixture-care-receipt',
      reason: 'Another refund.',
    }),
  );
  assertBalanced(n);
});
test('workbook itemization restores actual products without changing historical contributions', async () => {
  const s = await seed();
  const original = s.receipts.find(
    (r) => r.source === 'workbook' && r.totalOre > 100,
  );
  const amount = original.totalOre;
  const n = apply(s, {
    type: 'itemize',
    receiptId: original.id,
    file: { ...file, type: 'application/pdf' },
    lines: [
      {
        description: 'Original small product',
        category: original.products[0].category,
        quantity: 1,
        unitOre: 1,
      },
      {
        description: 'Original larger product',
        category: original.products[0].category,
        quantity: 1,
        unitOre: amount - 1,
      },
    ],
  });
  assert.deepEqual(balances(n), balances(s));
  assert.equal(n.receipts.find((r) => r.id === original.id).products.length, 2);
  assert.equal(n.receipts.find((r) => r.id === original.id).totalOre, amount);
  assert.throws(
    () =>
      apply(n, { type: 'itemize', receiptId: original.id, file, lines: [] }),
    /Only an unitemized/,
  );
  assertBalanced(n);
});
test('every live moment requires a photo, known dogs, and matching funded products', async () => {
  const s = await seedWithCare();
  for (const change of [
    { photo: null },
    { dogIds: [] },
    { dogIds: ['unknown'] },
    { dogIds: ['koby', 'koby'] },
    { category: 'food' },
    { productIds: ['not-funded'] },
    { photo: { ...file, type: 'application/pdf' } },
    {
      productIds: [s.receipts[0].products[0].id],
      category: s.receipts[0].products[0].category,
    },
  ])
    assert.throws(() => apply(s, { type: 'publish', post: post(change) }));
  const n = apply(s, {
    type: 'publish',
    post: post({ dogIds: ['koby', 'ove'] }),
  });
  assert.equal(n.posts.at(-1).source, 'staff');
  assert.deepEqual(balances(n), balances(s));
});
test('publication and expiry follow wall time while the photo remains in the timeline', async () => {
  const s = await seedWithCare();
  const future = '2026-09-07T14:00:00.000Z';
  const n = apply(s, {
    type: 'publish',
    post: post({ publishAt: future, liveHours: 1 }),
  });
  const id = n.posts.at(-1).id;
  assert.ok(
    !publishedPosts(n, Date.parse(future) - 1).some((p) => p.id === id),
  );
  assert.equal(activePhoto(n, 'koby', Date.parse(future)).id, id);
  assert.equal(activePhoto(n, 'koby', Date.parse(future) + 3599999).id, id);
  assert.equal(activePhoto(n, 'koby', Date.parse(future) + 3600000), undefined);
  assert.ok(
    publishedPosts(n, Date.parse(future) + 86400000).some((p) => p.id === id),
  );
});
test('multiple photos cannot multiply the same product cost; shared dogs reconcile to the item', async () => {
  let s = await seedWithCare();
  s = apply(s, {
    type: 'publish',
    post: post({ dogIds: ['koby', 'ove', 'ake'] }),
  });
  s = apply(s, { type: 'publish', post: post({ dogIds: ['ake', 'ove'] }) });
  const total = dogs.reduce(
    (n, d) => n + contributionToDog(s, 'personal', d, Date.parse(now)),
    0,
  );
  const linked = new Set(
    publishedPosts(s, Date.parse(now)).flatMap((p) => p.productIds),
  );
  const itemTotal = donorProducts(s, 'personal')
    .filter((p) => linked.has(p.product.id))
    .reduce((n, p) => n + p.contribution, 0);
  assert.equal(total, itemTotal);
  assert.equal(total, 7500);
});
test('following costs nothing and journey milestones do not invent financial support', async () => {
  const s = await seed();
  const n = apply(s, { type: 'follow', donorId: 'noah', dogId: 'kenzo' });
  assert.deepEqual(
    balances(n).map((d) => d.pending),
    balances(s).map((d) => d.pending),
  );
  assert.deepEqual(supportedDogs(n, 'noah', Date.parse(now)), []);
  const home = apply(n, {
    type: 'publish',
    post: post({
      productIds: [],
      category: 'comfort',
      stage: 'home',
      dogIds: ['koby'],
    }),
  });
  assert.equal(dogStage(home, 'koby', Date.parse(now)), 'home');
  assert.deepEqual(balances(home), balances(n));
});
test('withdrawing a photo stops it driving the shelter and preserves its audit entry', async () => {
  const s = await seedWithCare();
  const n = apply(s, { type: 'publish', post: post() });
  const id = n.posts.at(-1).id;
  const withdrawn = apply(n, {
    type: 'withdraw',
    postId: id,
    reason: 'Photo attached to the wrong moment.',
  });
  assert.ok(
    !publishedPosts(withdrawn, Date.parse(now)).some((p) => p.id === id),
  );
  assert.ok(withdrawn.posts.find((p) => p.id === id).withdrawnAt);
  assert.equal(withdrawn.audit.at(-1).kind, 'care.withdrawn');
  assert.deepEqual(balances(withdrawn), balances(s));
});
test('fingerprints detect any changed product amount or document and form a verifiable chain', async () => {
  const s = await seed();
  const [drafted, rid] = receipt(s);
  const funded = apply(drafted, { type: 'fund', receiptId: rid });
  await appendProofs(drafted, funded, now);
  assert.equal(await verifyChain(funded.proofs), true);
  const proof = funded.proofs.at(-1);
  assert.equal(await verifyProof(proof), true);
  const changed = structuredClone(proof);
  changed.payload.receipt.products[0].amountOre++;
  assert.equal(await verifyProof(changed), false);
  assert.notEqual(
    await sha256('original receipt'),
    await sha256('edited receipt'),
  );
  assert.equal(canonical({ b: 2, a: 1 }), canonical({ a: 1, b: 2 }));
  assert.ok(!JSON.stringify(proof.payload).includes('Alex Lind'));
  assert.ok(!JSON.stringify(proof.payload).includes('Dog friend'));
  assert.ok(!JSON.stringify(proof.payload).includes('/dogs/'));
});
test('corrections append a new proof without rewriting the original record', async () => {
  const s = await seedWithCare();
  const before = structuredClone(s.proofs[0]);
  const n = apply(s, {
    type: 'void',
    receiptId: 'fixture-care-receipt',
    reason: 'Supplier refund after a duplicate delivery.',
  });
  await appendProofs(s, n, now);
  assert.deepEqual(n.proofs[0], before);
  assert.equal(n.proofs.at(-1).payload.kind, 'receipt.corrected');
  assert.equal(await verifyChain(n.proofs), true);
});
test('direct financial changes and unverified network labels cannot become an anchor', async () => {
  const s = await seedWithCare();
  assert.throws(
    () =>
      apply(s, {
        type: 'anchor',
        proofId: s.proofs[0].id,
        chainId: '0x1',
        txHash: '0x' + 'a'.repeat(64),
        blockNumber: 1,
      }),
    /Sepolia/,
  );
  assert.throws(
    () =>
      apply(s, {
        type: 'anchor',
        proofId: s.proofs[0].id,
        chainId: '0xaa36a7',
        txHash: 'invalid',
        blockNumber: 1,
      }),
    /Sepolia/,
  );
});
test('receipt text reads Swedish/English quantities and retains unequal unit prices', () => {
  const result = parseReceiptText(
    'Care Supplier\nKvitto nr: R-102\n2026-09-07\nSmall bone 3 x 14,99\nLarge bone 2 x 22,05\nTotalt 89,07 kr',
  );
  assert.equal(result.reference, 'R-102');
  assert.equal(result.purchasedAt, '2026-09-07');
  assert.equal(result.totalOre, 8907);
  assert.equal(result.lines.length, 2);
  assert.equal(result.lines[0].unitOre, 1499);
  assert.equal(result.lines[1].unitOre, 2205);
  assert.deepEqual(result.warnings, []);
  const suspicious = parseReceiptText('Shop\nFood 2 x 50.00\nTotal 150.00 SEK');
  assert.ok(suspicious.warnings.some((w) => w.includes('do not match')));
});
test('allocation conserves every öre through many irregular affordable purchases', () => {
  let wallets = [
    { id: 'a', pending: 123456 },
    { id: 'b', pending: 78910 },
    { id: 'c', pending: 65432 },
    { id: 'd', pending: 5 },
  ];
  let totalSpent = 0;
  const initial = wallets.reduce((n, w) => n + w.pending, 0);
  for (let i = 0; i < 150; i++) {
    const products = [
      {
        id: `p${i}`,
        description: 'Care',
        category: 'food',
        amountOre: 1 + ((i * 7919) % 1300),
        shares: [],
      },
    ];
    if (wallets.reduce((n, w) => n + w.pending, 0) < products[0].amountOre)
      break;
    const allocated = allocateProducts(products, wallets);
    for (const s of allocated[0].shares) {
      wallets.find((w) => w.id === s.donorId).pending -= s.amountOre;
      assert.ok(wallets.find((w) => w.id === s.donorId).pending >= 0);
    }
    totalSpent += products[0].amountOre;
    assert.equal(
      wallets.reduce((n, w) => n + w.pending, 0) + totalSpent,
      initial,
    );
  }
});

test('a newly published photo drives live activity even when it was taken earlier', async () => {
  const s = await seedWithCare();
  const n = apply(s, {
    type: 'publish',
    post: post({
      category: 'food',
      productIds: ['fixture-meals'],
      occurredAt: '2026-09-06T12:00:00.000Z',
      publishAt: now,
    }),
  });
  assert.equal(activePhoto(n, 'koby', Date.parse(now)).id, n.posts.at(-1).id);
});
test('verifiers reject a self-consistent proof with an invalid display date', async () => {
  const proof = await makeProof({ kind: 'test' }, undefined, 'not-a-date');
  assert.equal(await verifyProof(proof), false);
});
test('every known static dog photo has both lightweight preview sizes', async () => {
  const { profilePreview } = await import('../lib/platform/photo-preview.ts');
  const photos = fs
    .readdirSync(new URL('../public/dogs/hundstallet/', import.meta.url))
    .filter((p) => /\.(jpg|png|webp)$/.test(p));
  for (const file of photos)
    for (const width of [320, 960])
      assert.ok(
        fs.existsSync(
          new URL(
            `../public${profilePreview(`/dogs/hundstallet/${file}`, width)}`,
            import.meta.url,
          ),
        ),
      );
  assert.equal(
    profilePreview('/api/platform/files/id'),
    '/api/platform/files/id',
  );
});
