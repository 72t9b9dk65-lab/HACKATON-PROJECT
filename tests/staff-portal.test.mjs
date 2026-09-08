import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyStaffLedger,
  splitCostEqually,
  recordReceipt,
  planReceipt,
  donorPortfolios,
  projectDonor,
  readStaffLedger,
  postTransactionPhoto,
  parseReceiptAmount,
  distributeTransactions,
  portalTransactions,
  setTransactionProducts,
} from '../lib/staff-portal.ts';
import { workbookLedger } from '../lib/workbook-transactions.ts';
import { SHARED_CARE_ID } from '../lib/donation-shell.ts';
import { liveDogPhoto, expensePhotoUpdate } from '../lib/care-calendar.ts';

const base = workbookLedger();
const withPending = {
  ...base,
  gifts: [
    ...base.gifts,
    {
      id: 'pending',
      dogId: SHARED_CARE_ID,
      recipientIds: ['ake'],
      amountOre: 100000,
      createdAt: '2026-09-07T10:00:00Z',
    },
  ],
};
const input = (amountOre = 40000) => ({
  id: 'receipt-1',
  supplier: 'Pet supplier',
  reference: 'INV-104',
  purchasedOn: '2026-09-07',
  recordedAt: '2026-09-07T14:00:00Z',
  file: {
    name: 'receipt.pdf',
    type: 'application/pdf',
    src: 'data:application/pdf;base64,JVBERg==',
  },
  lines: [
    {
      id: 'line-1',
      description: 'Dog meals',
      category: 'food',
      amountOre,
      products: Array.from({ length: 4 }, (_, i) => ({
        id: `meal-${i}`,
        name: `Meal ${i + 1}`,
        amountOre: Math.floor(amountOre / 4) + (i < amountOre % 4 ? 1 : 0),
      })),
    },
  ],
});
const photo = {
  id: 'photo-1',
  src: '/dogs/hundstallet/ake-1.jpg',
  dogIds: ['ake', 'koby'],
  postedAt: '2026-09-07T15:00:00Z',
  liveHours: 2,
};

test('equal shares conserve every öre, cap low balances and skip empty donors', () => {
  assert.deepEqual(
    splitCostEqually(100, [
      { id: 'b', pendingOre: 100 },
      { id: 'a', pendingOre: 100 },
      { id: 'empty', pendingOre: 0 },
      { id: 'c', pendingOre: 100 },
    ]),
    [
      { donorId: 'a', amountOre: 34 },
      { donorId: 'b', amountOre: 33 },
      { donorId: 'c', amountOre: 33 },
    ],
  );
  assert.deepEqual(
    splitCostEqually(90, [
      { id: 'a', pendingOre: 5 },
      { id: 'b', pendingOre: 100 },
      { id: 'c', pendingOre: 100 },
    ]),
    [
      { donorId: 'a', amountOre: 5 },
      { donorId: 'b', amountOre: 43 },
      { donorId: 'c', amountOre: 42 },
    ],
  );
  for (let amount = 1; amount <= 213; amount++) {
    const wallets = [
      { id: 'a', pendingOre: 13 },
      { id: 'b', pendingOre: 100 },
      { id: 'c', pendingOre: 100 },
    ];
    const shares = splitCostEqually(amount, wallets);
    assert.equal(
      shares.reduce((n, s) => n + s.amountOre, 0),
      amount,
    );
    assert.ok(
      shares.every(
        (s) =>
          Number.isSafeInteger(s.amountOre) &&
          s.amountOre > 0 &&
          s.amountOre <= wallets.find((w) => w.id === s.donorId).pendingOre,
      ),
    );
  }
  assert.throws(
    () => splitCostEqually(214, [{ id: 'a', pendingOre: 213 }]),
    /Not enough/,
  );
  assert.throws(
    () => splitCostEqually(1, [{ id: 'a', pendingOre: -1 }]),
    /Invalid/,
  );
});

test('recording a receipt updates every portfolio once with no premature dog assignment', () => {
  const initial = emptyStaffLedger();
  const saved = recordReceipt(initial, withPending, input());
  assert.equal(initial.receipts.length, 0);
  assert.equal(saved.receipts.length, 1);
  assert.equal(saved.receipts[0].lines[0].allocations.length, 4);
  assert.ok(
    saved.receipts[0].lines[0].allocations.every((s) => s.amountOre === 10000),
  );
  const wallet = donorPortfolios(saved, withPending).find(
    (d) => d.id === 'personal',
  );
  assert.equal(wallet.pendingOre, 90000);
  assert.equal(wallet.usedOre, 479500 + 10000);
  const view = projectDonor(saved, withPending);
  assert.equal(view.spending.totalOre, 579500);
  assert.equal(view.spending.byCategory.food, 132800 + 10000);
  assert.equal(
    view.transactions.find((t) => t.id === 'line-1').expenses.length,
    0,
  );
  assert.deepEqual([...view.spending.residentIds].sort(), [
    'ake',
    'koby',
    'ove',
  ]);
  assert.equal(view.events.length, 0);
  assert.deepEqual(readStaffLedger(JSON.stringify(saved)), saved);
  assert.throws(
    () => recordReceipt(saved, withPending, input()),
    /already recorded/,
  );
  assert.throws(
    () =>
      recordReceipt(saved, withPending, {
        ...input(),
        id: 'different-id',
        supplier: 'PET SUPPLIER',
        reference: 'inv-104',
      }),
    /already recorded/,
  );
});

test('multiple one-cent products balance the invoice without splitting any unit', () => {
  const receipt = {
    ...input(),
    lines: Array.from({ length: 13 }, (_, i) => ({
      id: `cent-${i}`,
      category: i % 2 ? 'play' : 'food',
      description: `Item ${i}`,
      amountOre: 1,
    })),
  };
  const planned = planReceipt(emptyStaffLedger(), withPending, receipt);
  const totals = donorPortfolios(emptyStaffLedger(), withPending).map((donor) =>
    planned.lines.reduce(
      (n, l) =>
        n + (l.allocations.find((a) => a.donorId === donor.id)?.amountOre ?? 0),
      0,
    ),
  );
  assert.equal(
    totals.reduce((a, b) => a + b, 0),
    13,
  );
  assert.equal(Math.max(...totals) - Math.min(...totals), 1);
  assert.ok(
    planned.lines.every(
      (l) => l.allocations.reduce((n, a) => n + a.amountOre, 0) === l.amountOre,
    ),
  );
});

test('an unaffordable or invalid invoice never partially debits any wallet', () => {
  const initial = emptyStaffLedger();
  const before = JSON.stringify(initial);
  assert.throws(
    () => recordReceipt(initial, base, input(400001)),
    /Not enough/,
  );
  assert.throws(
    () =>
      recordReceipt(initial, withPending, {
        ...input(),
        lines: [
          ...input().lines,
          { id: 'bad', description: '', amountOre: 10, category: 'invalid' },
        ],
      }),
    /Invalid|Product prices/,
  );
  assert.equal(JSON.stringify(initial), before);
  const corrupt = recordReceipt(initial, withPending, input());
  corrupt.receipts[0].lines[0].allocations[0].amountOre += 1;
  assert.throws(
    () => readStaffLedger(JSON.stringify(corrupt)),
    /Invalid receipt allocation/,
  );
});

test('one transaction photo links multiple dogs, uses its category, and never charges twice', () => {
  const staff = recordReceipt(emptyStaffLedger(), withPending, input());
  const after = postTransactionPhoto(staff, withPending, 'line-1', photo);
  const view = projectDonor(after, withPending);
  const tx = view.transactions.find((t) => t.id === 'line-1');
  assert.equal(tx.expenses.length, 2);
  assert.equal(
    tx.expenses.reduce((n, e) => n + e.amountOre, 0),
    10000,
  );
  assert.ok(
    tx.expenses.every((e) => e.amountOre === 5000 && e.category === 'food'),
  );
  assert.equal(
    view.spending.pendingOre,
    projectDonor(staff, withPending).spending.pendingOre,
  );
  for (const dogId of photo.dogIds) {
    const event = liveDogPhoto(
      view.events,
      dogId,
      Date.parse('2026-09-07T16:00:00Z'),
    );
    assert.equal(event.activity, 'food');
    assert.equal(event.photos[0].src, photo.src);
    assert.equal(
      liveDogPhoto(view.events, dogId, Date.parse('2026-09-07T17:00:00Z')),
      undefined,
    );
    assert.ok(
      expensePhotoUpdate(
        view.events,
        tx.expenses.find((e) => e.dogId === dogId),
        Date.parse('2026-09-08T10:00:00Z'),
      ),
    );
  }
  assert.equal(projectDonor(after, withPending, 'demo-alex').events.length, 2);
  const more = postTransactionPhoto(after, withPending, 'line-1', {
    ...photo,
    id: 'photo-2',
    dogIds: ['ove'],
    postedAt: '2026-09-07T16:00:00Z',
  });
  const next = projectDonor(more, withPending);
  assert.equal(next.spending.usedOre, view.spending.usedOre);
  assert.equal(
    next.transactions
      .find((t) => t.id === 'line-1')
      .expenses.reduce((n, e) => n + e.amountOre, 0),
    10000,
  );
  assert.throws(
    () => postTransactionPhoto(after, withPending, 'missing', photo),
    /existing transaction/,
  );
  assert.throws(
    () =>
      postTransactionPhoto(after, withPending, 'line-1', {
        ...photo,
        dogIds: [],
      }),
    /at least one dog/,
  );
});

test('staff can add evidence to imported expenses without changing historical spending', () => {
  const expense = base.expenses[0];
  const before = projectDonor(emptyStaffLedger(), base);
  const staff = postTransactionPhoto(
    emptyStaffLedger(),
    base,
    expense.id,
    photo,
  );
  const after = projectDonor(staff, base);
  assert.equal(after.spending.usedOre, before.spending.usedOre);
  assert.equal(after.spending.pendingOre, 0);
  assert.deepEqual(after.spending.byCategory, before.spending.byCategory);
  assert.equal(
    after.transactions.find((t) => t.id === expense.id).amountOre,
    expense.amountOre,
  );
  assert.equal(after.events.length, 2);
});

test('receipt amount parsing handles decimal SEK exactly and rejects ambiguous values', () => {
  assert.equal(parseReceiptAmount('100,05'), 10005);
  assert.equal(parseReceiptAmount(' 10.1 '), 1010);
  for (const value of ['0', '-1', '1.005', '1e3', '1,200.50', 'Infinity', ''])
    assert.equal(parseReceiptAmount(value), null);
});

test('itemizing and redistributing assigns whole products without charging twice', () => {
  const empty = emptyStaffLedger();
  assert.throws(
    () => distributeTransactions(empty, base, '2026-09-07T16:00:00Z'),
    /Enter purchased products/,
  );
  const tx = portalTransactions(empty, base).find(
    (t) => t.amountOre === 2400 && t.category === 'play',
  );
  assert.ok(tx);
  const initial = postTransactionPhoto(empty, base, tx.id, photo);
  const original = JSON.stringify(initial);
  const drafts = [200, 300, 400, 600, 900].map((amountOre, i) => ({
    id: `bone-${i}`,
    name: `Bone ${i + 1}`,
    amountOre,
  }));
  const itemized = setTransactionProducts(initial, base, tx.id, drafts);
  const distributed = distributeTransactions(
    itemized,
    base,
    '2026-09-07T16:00:00Z',
  );
  assert.equal(JSON.stringify(initial), original);
  assert.deepEqual(distributed.photos, initial.photos);
  const donors = donorPortfolios(distributed, base);
  assert.equal(
    donors.reduce((sum, d) => sum + d.usedOre, 0),
    479500,
  );
  assert.equal(
    donors.reduce((sum, d) => sum + d.pendingOre, 0),
    400000,
  );
  assert.ok(
    donors.every(
      (d) => d.pendingOre >= 0 && d.pendingOre + d.usedOre === d.donatedOre,
    ),
  );
  const assigned = portalTransactions(distributed, base).find(
    (t) => t.id === tx.id,
  );
  assert.deepEqual(
    assigned.products.map(({ donorId: _donorId, ...product }) => product),
    drafts,
  );
  assert.ok(
    assigned.products.every((p) => donors.some((d) => d.id === p.donorId)),
  );
  const untouched = portalTransactions(initial, base).filter(
    (t) => t.id !== tx.id,
  );
  assert.deepEqual(
    portalTransactions(distributed, base).filter((t) => t.id !== tx.id),
    untouched,
  );
  for (const donor of donors) {
    const view = projectDonor(distributed, base, donor.id);
    assert.equal(
      view.expenses.reduce((sum, expense) => sum + expense.amountOre, 0),
      donor.usedOre,
    );
    assert.equal(
      Object.values(view.spending.byCategory).reduce(
        (sum, amount) => sum + amount,
        0,
      ),
      donor.usedOre,
    );
    assert.equal(
      view.transactions.reduce((sum, tx) => sum + tx.amountOre, 0),
      donor.usedOre,
    );
    const owned = view.transactions.find((t) => t.id === tx.id);
    if (owned) {
      assert.ok(owned.products.every((p) => p.donorId === donor.id));
      assert.equal(
        owned.products.reduce((sum, p) => sum + p.amountOre, 0),
        owned.amountOre,
      );
    }
  }
  const repeated = distributeTransactions(
    distributed,
    base,
    '2026-09-07T16:01:00Z',
  );
  assert.deepEqual(repeated.products, distributed.products);
  assert.deepEqual(donorPortfolios(repeated, base), donors);
  assert.deepEqual(readStaffLedger(JSON.stringify(repeated)), repeated);
  assert.throws(
    () => setTransactionProducts(initial, base, tx.id, drafts.slice(1)),
    /add up exactly/,
  );
  assert.equal(JSON.stringify(initial), original);
});

test('distribution includes receipts, preserves evidence and still permits later purchases', () => {
  const recorded = recordReceipt(emptyStaffLedger(), withPending, input());
  const photographed = postTransactionPhoto(
    recorded,
    withPending,
    'line-1',
    photo,
  );
  const distributed = distributeTransactions(
    photographed,
    withPending,
    '2026-09-07T16:00:00Z',
  );
  assert.deepEqual(distributed.photos, photographed.photos);
  assert.deepEqual(distributed.receipts, photographed.receipts);
  assert.equal(
    donorPortfolios(distributed, withPending).reduce(
      (sum, d) => sum + d.usedOre,
      0,
    ),
    519500,
  );
  for (const donor of donorPortfolios(distributed, withPending)) {
    const tx = projectDonor(
      distributed,
      withPending,
      donor.id,
    ).transactions.find((t) => t.id === 'line-1');
    if (tx)
      assert.equal(
        tx.expenses.reduce((sum, expense) => sum + expense.amountOre, 0),
        tx.amountOre,
      );
  }
  const next = recordReceipt(distributed, withPending, {
    ...input(10000),
    id: 'receipt-2',
    reference: 'INV-105',
    lines: [
      {
        ...input(10000).lines[0],
        id: 'line-2',
        products: input(10000).lines[0].products.map((p) => ({
          ...p,
          id: p.id + '-next',
        })),
      },
    ],
  });
  assert.equal(
    donorPortfolios(next, withPending).reduce((sum, d) => sum + d.usedOre, 0),
    529500,
  );
  assert.ok(donorPortfolios(next, withPending).every((d) => d.pendingOre >= 0));
});

test('stored distributions reject missing transactions, invalid sums and unknown donors', () => {
  const good = {
    ...emptyStaffLedger(),
    distribution: {
      updatedAt: '2026-09-07T16:00:00Z',
      allocations: Object.fromEntries(
        base.expenses.map((e) => [
          e.id,
          [{ donorId: 'personal', amountOre: e.amountOre }],
        ]),
      ),
    },
  };
  assert.deepEqual(readStaffLedger(JSON.stringify(good)), good);
  assert.deepEqual(
    donorPortfolios(good, base),
    donorPortfolios(emptyStaffLedger(), base),
  );
  const missing = structuredClone(good);
  missing.distribution.allocations.missing = [
    { donorId: 'personal', amountOre: 1 },
  ];
  assert.throws(() => donorPortfolios(missing, base), /does not match/);
  const wrongTotal = structuredClone(good);
  Object.values(wrongTotal.distribution.allocations)[0][0].amountOre++;
  assert.throws(() => donorPortfolios(wrongTotal, base), /does not match/);
  const unknown = structuredClone(good);
  Object.values(unknown.distribution.allocations)[0][0].donorId = 'missing';
  assert.throws(
    () => readStaffLedger(JSON.stringify(unknown)),
    /Invalid transaction distribution/,
  );
});

test('a single purchased item is paid in full by one donor', () => {
  const receipt = input();
  receipt.lines[0].products = [
    { id: 'one-item', name: 'Food bag', amountOre: 40000 },
  ];
  const saved = recordReceipt(emptyStaffLedger(), withPending, receipt);
  const line = saved.receipts[0].lines[0];
  assert.equal(line.products.length, 1);
  assert.deepEqual(line.allocations, [
    { donorId: line.products[0].donorId, amountOre: 40000 },
  ]);
});

test('indivisible products cannot overdraw a donor even with sufficient pooled funds', () => {
  const initial = emptyStaffLedger();
  const before = JSON.stringify(initial);
  const receipt = input(250000);
  receipt.lines[0].products = [
    { id: 'large-item', name: 'Equipment', amountOre: 250000 },
  ];
  assert.throws(
    () => recordReceipt(initial, withPending, receipt),
    /individual donor balances/,
  );
  assert.equal(JSON.stringify(initial), before);
});

test('product ownership and identifiers are validated before committing a receipt', () => {
  const saved = recordReceipt(emptyStaffLedger(), withPending, input());
  const duplicate = {
    ...input(),
    id: 'receipt-2',
    reference: 'INV-105',
    lines: [{ ...input().lines[0], id: 'line-2' }],
  };
  assert.throws(
    () => recordReceipt(saved, withPending, duplicate),
    /identifiers must be unique/,
  );
  const corrupt = structuredClone(saved);
  corrupt.receipts[0].lines[0].products[0].donorId = 'unknown';
  assert.throws(
    () => readStaffLedger(JSON.stringify(corrupt)),
    /Invalid receipt products/,
  );
});

test('itemization replaces an old equal split while preserving its transaction evidence', () => {
  const tx = portalTransactions(emptyStaffLedger(), base).find(
    (t) => t.amountOre === 2400 && t.category === 'play',
  );
  const legacy = {
    ...emptyStaffLedger(),
    distribution: {
      updatedAt: '2026-09-07T16:00:00Z',
      allocations: {
        [tx.id]: ['personal', 'demo-alex', 'demo-maja', 'demo-noah'].map(
          (donorId) => ({ donorId, amountOre: 600 }),
        ),
      },
    },
  };
  const before = donorPortfolios(legacy, base);
  const next = setTransactionProducts(legacy, base, tx.id, [
    { id: 'bone', name: 'Chew bone', amountOre: 2400 },
  ]);
  const itemized = portalTransactions(next, base).find((t) => t.id === tx.id);
  assert.equal(itemized.allocations.length, 1);
  assert.equal(itemized.allocations[0].amountOre, 2400);
  assert.equal(
    donorPortfolios(next, base).reduce((s, d) => s + d.usedOre, 0),
    before.reduce((s, d) => s + d.usedOre, 0),
  );
});
