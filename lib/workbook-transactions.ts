import fixture from '../public/data/hundstallet/fake-transactions.json' with { type: 'json' };
import { workbookRows } from './workbook-source.ts';
import {
  SHARED_CARE_ID,
  type CareKind,
  type DemoGift,
} from './donation-shell.ts';
import type {
  DemoExpense,
  ExpenseCategory,
  GivingLedger,
} from './donation-spending.ts';

export const WORKBOOK_GIFT_ID = 'fake-transactions-opening-v1';
export const workbookSource = fixture.source;

// The workbook has no recipient column. These three featured profiles are
// illustrative replay companions, not recipients established by the source.
const demoRecipients = ['ake', 'koby', 'ove'];
const categoryMapping: Record<string, { id: ExpenseCategory; kind: CareKind }> =
  {
    food: { id: 'food', kind: 'food' },
    medicine: { id: 'medicine', kind: 'health' },
    shelter: { id: 'comfort', kind: 'comfort' },
    toys: { id: 'play', kind: 'comfort' },
    rehabilitation: { id: 'rehabilitation', kind: 'health' },
  };

export function workbookLedger(): GivingLedger {
  const allocation = { food: 0, health: 0, comfort: 0 };
  const expenses: DemoExpense[] = workbookRows.map((row, index) => {
    const category = categoryMapping[row.category];
    allocation[category.kind] += row.amountOre;
    return {
      id: `fake-transactions:Blad1:${row.key}`,
      giftId: WORKBOOK_GIFT_ID,
      dogId: demoRecipients[index % demoRecipients.length],
      category: category.id,
      amountOre: row.amountOre,
      recordedAt: row.date,
      sourceRow: row.row,
    };
  });
  // The source is expenses only. Opening funding is an explicit demo assumption
  // equal to those expenses, not a donation receipt supplied by the workbook.
  const opening: DemoGift = {
    id: WORKBOOK_GIFT_ID,
    dogId: SHARED_CARE_ID,
    recipientIds: [...demoRecipients],
    amountOre: expenses.reduce((sum, expense) => sum + expense.amountOre, 0),
    createdAt: expenses.map((expense) => expense.recordedAt).sort()[0],
    allocation,
  };
  return { gifts: [opening], expenses };
}

export function workbookTransaction(expense: DemoExpense) {
  if (expense.giftId !== WORKBOOK_GIFT_ID) return undefined;
  const index = workbookRows.findIndex(
    (row) => expense.id === `fake-transactions:Blad1:${row.key}`,
  );
  return fixture.transactions[index];
}

export function importWorkbookTransactions(ledger: GivingLedger): GivingLedger {
  if (ledger.gifts.some((gift) => gift.id === WORKBOOK_GIFT_ID)) return ledger;
  const imported = workbookLedger();
  return {
    gifts: [
      ...imported.gifts,
      ...ledger.gifts.filter((gift) => gift.id !== 'example'),
    ],
    expenses: [
      ...imported.expenses,
      ...ledger.expenses.filter((expense) => expense.giftId !== 'example'),
    ],
  };
}
