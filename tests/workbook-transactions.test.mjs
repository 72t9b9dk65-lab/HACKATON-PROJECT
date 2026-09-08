import test from 'node:test';
import assert from 'node:assert/strict';
import fixture from '../public/data/hundstallet/fake-transactions.json' with { type: 'json' };
import {
  workbookLedger,
  workbookTransaction,
  WORKBOOK_GIFT_ID,
} from '../lib/workbook-transactions.ts';
import {
  expenseActivity,
  expenseDateLabel,
  expenseHasTime,
  expenseHour,
  expenseLabel,
  exampleExpenses,
  firstCareExpenses,
  readGivingLedger,
  spendingSummary,
  validExpenses,
} from '../lib/donation-spending.ts';
import {
  exampleGifts,
  giftAllocation,
  readDemoGifts,
} from '../lib/donation-shell.ts';

test('All 102 source rows retain their amounts, date-only precision, categories, and row identity', () => {
  const ledger = workbookLedger();
  assert.equal(fixture.source.sheet, 'Blad1');
  assert.equal(fixture.source.range, 'A1:C101');
  assert.equal(ledger.expenses.length, 102);
  assert.equal(new Set(ledger.expenses.map((expense) => expense.id)).size, 102);
  const sourceTotals = {
    Food: 132800,
    Medicine: 78300,
    Shelter: 110800,
    Toys: 55400,
    Rehabilitation: 2200,
    'Veterinary care': 45000,
    'Walks & confidence': 55000,
  };
  const totals = {
    Food: 0,
    Medicine: 0,
    Shelter: 0,
    Toys: 0,
    Rehabilitation: 0,
    'Veterinary care': 0,
    'Walks & confidence': 0,
  };
  for (const [index, expense] of ledger.expenses.entries()) {
    const row = fixture.transactions[index];
    assert.equal(expense.sourceRow, row.row);
    assert.deepEqual(workbookTransaction(expense), row);
    assert.equal(expense.recordedAt, row.date);
    assert.equal(expense.amountOre, row.amountOre);
    assert.equal(expenseHasTime(expense), false);
    totals[expenseLabel(expense)] += expense.amountOre;
  }
  assert.deepEqual(totals, sourceTotals);
  const summary = spendingSummary(ledger);
  assert.equal(summary.usedOre, 479500);
  assert.equal(summary.totalOre, 479500);
  assert.equal(summary.pendingOre, 0);
  assert.deepEqual(summary.byCategory, {
    food: 132800,
    medicine: 78300,
    rehabilitation: 2200,
    vaccination: 45000,
    walk: 55000,
    play: 55400,
    comfort: 110800,
  });
  assert.equal(
    Object.values(summary.funding.byDog).reduce(
      (sum, dog) => sum + dog.amountOre,
      0,
    ),
    479500,
  );
  assert.deepEqual([...summary.residentIds].sort(), ['ake', 'koby', 'ove']);
});

test('Imported dates never acquire invented source times and all categories have a care replay', () => {
  const ledger = workbookLedger();
  const expected = {
    Food: 'food',
    Medicine: 'rehabilitation',
    Shelter: 'sleep',
    Toys: 'play',
    Rehabilitation: 'rehabilitation',
    'Veterinary care': 'vaccination',
    'Walks & confidence': 'walk',
  };
  for (const expense of ledger.expenses) {
    assert.equal(expenseActivity(expense), expected[expenseLabel(expense)]);
    assert.equal(expenseHour(expense), 12); // Illustration hour, never displayed as a recorded time.
    assert.match(expenseDateLabel(expense), /Time not supplied$/);
    assert.doesNotMatch(expenseDateLabel(expense), /\d{2}:\d{2}/);
  }
  const newest = [...ledger.expenses].sort((a, b) =>
    b.recordedAt.localeCompare(a.recordedAt),
  )[0];
  assert.equal(newest.recordedAt, '2026-09-07');
  assert.equal(expenseDateLabel(newest), '7 Sept 2026 · Time not supplied');
  const sameDay = ledger.expenses.filter(
    (expense) => expense.recordedAt === '2025-03-08',
  );
  assert.equal(sameDay.length, 4);
  assert.deepEqual(
    sameDay.map((expense) => expense.amountOre),
    [800, 4000, 5400, 4000],
  );
});

test('Existing v2 sessions replace only the starter sample, retain user spending, and do not import twice', () => {
  const gift = {
    id: 'user-donation',
    dogId: 'ake',
    amountOre: 10000,
    carePlanId: 'food',
    createdAt: '2026-09-07T10:15:00Z',
  };
  const userExpenses = firstCareExpenses(gift);
  const old = {
    gifts: [...exampleGifts, gift],
    expenses: [...exampleExpenses(exampleGifts), ...userExpenses],
  };
  const before = JSON.stringify(old);
  const loaded = readGivingLedger(before, null);
  assert.equal(JSON.stringify(old), before);
  assert.deepEqual(
    loaded.gifts.filter((item) => item.id !== WORKBOOK_GIFT_ID),
    [gift],
  );
  assert.deepEqual(
    loaded.expenses.filter((item) => item.giftId !== WORKBOOK_GIFT_ID),
    userExpenses,
  );
  assert.equal(loaded.expenses.length, 103);
  assert.equal(
    loaded.gifts.some((item) => item.id === 'example'),
    false,
  );
  assert.equal(spendingSummary(loaded).usedOre, 484500);
  assert.equal(spendingSummary(loaded).pendingOre, 5000);
  let restored = loaded;
  for (let i = 0; i < 3; i++)
    restored = readGivingLedger(JSON.stringify(restored), before);
  assert.deepEqual(restored, loaded);
  assert.deepEqual(readGivingLedger(null, null), workbookLedger());
});

test('Opening funding uses exact source category totals, persists, and rejects malformed allocation budgets', () => {
  const { gifts, expenses } = workbookLedger();
  assert.deepEqual(giftAllocation(gifts[0]), {
    food: 132800,
    health: 125500,
    comfort: 221200,
  });
  assert.deepEqual(readDemoGifts(JSON.stringify(gifts)), gifts);
  assert.equal(validExpenses(expenses, gifts), true);
  const tampered = structuredClone(expenses);
  tampered[0].amountOre += 1;
  assert.equal(validExpenses(tampered, gifts), false);
  for (const allocation of [
    { food: 133801, health: 125500, comfort: 221200 },
    { food: -1, health: 1, comfort: 479500 },
    { food: 132800.5, health: 123299.5, comfort: 221200 },
    { food: 479500 },
    null,
  ]) {
    const invalid = [{ ...gifts[0], allocation }];
    assert.notEqual(
      readDemoGifts(JSON.stringify(invalid))[0].id,
      WORKBOOK_GIFT_ID,
    );
    assert.throws(() => giftAllocation(invalid[0]));
  }
});
