import test from 'node:test';
import assert from 'node:assert/strict';
import {
  exampleExpenses,
  expenseActivity,
  expenseCategories,
  expenseHour,
  firstCareExpenses,
  readGivingLedger,
  spendingSummary,
  validExpenses,
} from '../lib/donation-spending.ts';
import {
  exampleGifts,
  profileDogs,
  SHARED_CARE_ID,
} from '../lib/donation-shell.ts';
import { previewCareRecipients } from '../lib/virtual-shelter.ts';
import { projectCare } from '../lib/care-impact.ts';

const empty = { gifts: [], expenses: [] };
function createGift(amountOre, careId, id = 'gift') {
  const projection = projectCare({
    amountOre,
    careId,
    frequency: 'once',
    startDate: '2026-09-07',
    day: 0,
  });
  const recipientIds = previewCareRecipients(
    Math.max(1, projection.dogCount),
    spendingSummary(empty).funding,
    careId,
  );
  return {
    id,
    amountOre,
    carePlanId: careId,
    dogId: SHARED_CARE_ID,
    recipientIds,
    createdAt: '2026-09-07T10:15:00Z',
  };
}
function assertReconciled(ledger) {
  const summary = spendingSummary(ledger);
  assert.equal(summary.totalOre, summary.pendingOre + summary.usedOre);
  assert.ok(summary.pendingOre >= 0);
  assert.equal(
    Object.values(summary.byCategory).reduce((sum, value) => sum + value, 0),
    summary.usedOre,
  );
  assert.equal(
    Object.values(summary.funding.byDog).reduce(
      (sum, item) => sum + item.amountOre,
      0,
    ),
    summary.usedOre,
  );
  assert.deepEqual(
    summary.residentIds,
    profileDogs
      .filter(
        (dog) =>
          !dog.group &&
          ledger.expenses.some(
            (expense) => expense.dogId === dog.id && expense.amountOre > 0,
          ),
      )
      .map((dog) => dog.id),
  );
  return summary;
}

test('Starter example has explicit sample expenses; previous user gifts stay pending without proof of spending', () => {
  const prior = createGift(100000, 'food', 'prior');
  const gifts = [...exampleGifts, prior];
  const before = JSON.stringify(gifts);
  const ledger = readGivingLedger(null, JSON.stringify(gifts));
  const summary = assertReconciled(ledger);
  assert.equal(summary.totalOre, 150000);
  assert.equal(summary.usedOre, 22000);
  assert.equal(summary.pendingOre, 128000);
  assert.deepEqual([...summary.residentIds].sort(), ['ake', 'ove']);
  assert.ok(ledger.expenses.every((expense) => expense.giftId === 'example'));
  assert.equal(JSON.stringify(gifts), before);
});

test('A donation alone never creates a permanent companion; first care spends only complete units', () => {
  for (const [amountOre, careId, expectedUsed] of [
    [100, 'food', 0],
    [10000, 'food', 5000],
    [50000, 'food', 5000],
    [24000, 'rehabilitation', 12000],
    [109900, 'vaccination', 0],
    [110000, 'vaccination', 110000],
  ]) {
    const gift = createGift(amountOre, careId);
    const before = assertReconciled({ gifts: [gift], expenses: [] });
    assert.equal(before.usedOre, 0);
    assert.equal(before.pendingOre, amountOre);
    assert.deepEqual(before.residentIds, []);
    const expenses = firstCareExpenses(gift);
    const after = assertReconciled({ gifts: [gift], expenses });
    assert.equal(after.usedOre, expectedUsed);
    assert.equal(after.residentIds.length, expenses.length);
    assert.ok(
      expenses.every((expense) => expense.recordedAt === gift.createdAt),
    );
  }
});

test('Amounts and category/dog spending reconcile over many donations and after atomic snapshot reload', () => {
  const ledger = {
    gifts: structuredClone(exampleGifts),
    expenses: exampleExpenses(exampleGifts),
  };
  for (const careId of ['food', 'rehabilitation', 'vaccination']) {
    for (let amount = 1; amount <= 10000; amount += 137) {
      const gift = createGift(amount * 100, careId, `${careId}-${amount}`);
      ledger.gifts.push(gift);
      ledger.expenses.push(...firstCareExpenses(gift));
      assertReconciled(ledger);
    }
  }
  const restored = readGivingLedger(JSON.stringify(ledger), null);
  assert.deepEqual(restored, ledger);
  assert.deepEqual(spendingSummary(restored), spendingSummary(ledger));
});

test('Invalid, duplicate, misattributed, or over-budget expenses cannot increase Used', () => {
  const gift = createGift(10000, 'food');
  const expense = firstCareExpenses(gift)[0];
  for (const invalid of [
    [{ ...expense, amountOre: -1 }],
    [{ ...expense, amountOre: 0 }],
    [{ ...expense, amountOre: 0.5 }],
    [{ ...expense, amountOre: 10001 }],
    [expense, expense],
    [{ ...expense, category: 'vaccination' }],
    [{ ...expense, category: 'unrecognized' }],
    [{ ...expense, giftId: 'missing' }],
    [{ ...expense, dogId: 'missing' }],
    [{ ...expense, dogId: profileDogs.find((dog) => dog.group).id }],
    [{ ...expense, recordedAt: 'yesterday' }],
    [{ ...expense, recordedAt: '2025-01-01T00:00:00Z' }],
    [
      {
        ...expense,
        dogId: profileDogs.find((dog) => !gift.recipientIds.includes(dog.id))
          .id,
      },
    ],
    [expense, { ...expense, id: 'second', amountOre: 5001 }],
  ]) {
    assert.equal(validExpenses(invalid, [gift]), false);
    const restored = readGivingLedger(
      JSON.stringify({ gifts: [gift], expenses: invalid }),
      null,
    );
    assert.equal(spendingSummary(restored).usedOre, 0);
    assert.equal(spendingSummary(restored).pendingOre, gift.amountOre);
  }
});

test('Legacy category budgets cannot be overspent and different expenses for the same dog aggregate once', () => {
  const gift = {
    id: 'legacy',
    dogId: 'ake',
    amountOre: 50000,
    createdAt: '2026-09-07T10:00:00Z',
  };
  const expenses = [
    {
      id: 'food',
      giftId: gift.id,
      dogId: 'ake',
      category: 'food',
      amountOre: 25000,
      recordedAt: gift.createdAt,
    },
    {
      id: 'health',
      giftId: gift.id,
      dogId: 'ake',
      category: 'rehabilitation',
      amountOre: 15000,
      recordedAt: gift.createdAt,
    },
    {
      id: 'rest',
      giftId: gift.id,
      dogId: 'ake',
      category: 'comfort',
      amountOre: 10000,
      recordedAt: gift.createdAt,
    },
  ];
  const summary = assertReconciled({ gifts: [gift], expenses });
  assert.equal(summary.pendingOre, 0);
  assert.deepEqual(summary.residentIds, ['ake']);
  assert.equal(summary.funding.byDog.ake.amountOre, 50000);
  assert.equal(
    validExpenses([{ ...expenses[0], amountOre: 25001 }], [gift]),
    false,
  );
});

test('Transaction replays use the saved category and Stockholm hour without changing spending', () => {
  const ledger = {
    gifts: exampleGifts,
    expenses: exampleExpenses(exampleGifts),
  };
  const before = JSON.stringify(ledger);
  for (const category of expenseCategories) {
    const expense = { ...ledger.expenses[0], category: category.id };
    assert.equal(
      expenseActivity(expense),
      category.id === 'comfort' ? 'sleep' : category.id,
    );
  }
  assert.equal(
    expenseHour({ ...ledger.expenses[0], recordedAt: '2026-09-07T12:15:00Z' }),
    14,
  );
  assert.equal(
    expenseHour({ ...ledger.expenses[0], recordedAt: '2026-12-07T12:15:00Z' }),
    13,
  );
  assert.equal(JSON.stringify(ledger), before);
  assertReconciled(ledger);
});
