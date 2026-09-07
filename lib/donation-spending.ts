import { carePlan, type CarePlanId } from './care-impact.ts';
import {
  fundingSummary,
  giftAllocation,
  LEGACY_SHARED_RECIPIENTS,
  profileDogs,
  readDemoGifts,
  SHARED_CARE_ID,
  type CareKind,
  type DemoGift,
} from './donation-shell.ts';

export const GIVING_STORAGE_KEY = 'hundstallet.giving-ledger.v2';
export const expenseCategories = [
  {
    id: 'food',
    label: 'Food & enrichment',
    kind: 'food',
    asset: '/care/pixel/food-enrichment.png',
  },
  {
    id: 'rehabilitation',
    label: 'Care & rehabilitation',
    kind: 'health',
    asset: '/care/pixel/care-rehabilitation.png',
  },
  {
    id: 'vaccination',
    label: 'Exams & vaccination',
    kind: 'health',
    asset: '/care/pixel/examination-vaccination.png',
  },
  {
    id: 'walk',
    label: 'Park walks',
    kind: 'comfort',
    asset: '/care/pixel/park-walk.png',
  },
  {
    id: 'play',
    label: 'Playtime',
    kind: 'comfort',
    asset: '/care/pixel/play-enrichment.png',
  },
  {
    id: 'comfort',
    label: 'Rest & daily care',
    kind: 'comfort',
    asset: '/shelters/pixel-big-kennel.png',
  },
] as const;
export type ExpenseCategory = (typeof expenseCategories)[number]['id'];
export type DemoExpense = {
  id: string;
  giftId: string;
  dogId: string;
  category: ExpenseCategory;
  amountOre: number;
  recordedAt: string;
};
export type GivingLedger = { gifts: DemoGift[]; expenses: DemoExpense[] };
export type ExpenseReplay = { expense: DemoExpense; key: number };

export function expenseActivity(expense: DemoExpense) {
  return expense.category === 'comfort' ? ('sleep' as const) : expense.category;
}

export function expenseHour(expense: DemoExpense) {
  return Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hourCycle: 'h23',
      timeZone: 'Europe/Stockholm',
    }).format(new Date(expense.recordedAt)),
  );
}

function recipientIds(gift: DemoGift) {
  return gift.dogId === SHARED_CARE_ID
    ? (gift.recipientIds ?? LEGACY_SHARED_RECIPIENTS)
    : [gift.dogId];
}

export function validExpenses(
  value: unknown,
  gifts: DemoGift[],
): value is DemoExpense[] {
  if (!Array.isArray(value) || value.length > 100000) return false;
  const giftsById = new Map(gifts.map((gift) => [gift.id, gift]));
  const knownDogs = new Set(
    profileDogs.filter((dog) => !dog.group).map((dog) => dog.id),
  );
  const seen = new Set<string>();
  const used = new Map<string, Record<CareKind, number>>();
  for (const expense of value) {
    if (!expense || typeof expense !== 'object') return false;
    const gift = giftsById.get(expense.giftId);
    const category = expenseCategories.find(
      (item) => item.id === expense.category,
    );
    if (
      !gift ||
      !category ||
      typeof expense.id !== 'string' ||
      !expense.id ||
      seen.has(expense.id) ||
      !knownDogs.has(expense.dogId) ||
      !recipientIds(gift).includes(expense.dogId) ||
      !Number.isSafeInteger(expense.amountOre) ||
      expense.amountOre <= 0 ||
      typeof expense.recordedAt !== 'string' ||
      !Number.isFinite(Date.parse(expense.recordedAt)) ||
      Date.parse(expense.recordedAt) < Date.parse(gift.createdAt) ||
      (gift.carePlanId && gift.carePlanId !== category.id)
    )
      return false;
    const totals = used.get(gift.id) ?? { food: 0, health: 0, comfort: 0 };
    totals[category.kind] += expense.amountOre;
    if (totals[category.kind] > giftAllocation(gift)[category.kind])
      return false;
    used.set(gift.id, totals);
    seen.add(expense.id);
  }
  return true;
}

export function spendingSummary({ gifts, expenses }: GivingLedger) {
  if (!validExpenses(expenses, gifts))
    throw new Error('Invalid demo expense ledger.');
  const totalOre = gifts.reduce((sum, gift) => sum + gift.amountOre, 0);
  const byCategory = Object.fromEntries(
    expenseCategories.map((category) => [category.id, 0]),
  ) as Record<ExpenseCategory, number>;
  const funding = fundingSummary([]);
  for (const expense of expenses) {
    const category = expenseCategories.find(
      (item) => item.id === expense.category,
    )!;
    byCategory[category.id] += expense.amountOre;
    funding.amountOre += expense.amountOre;
    funding.allocation[category.kind] += expense.amountOre;
    funding.byDog[expense.dogId].amountOre += expense.amountOre;
    funding.byDog[expense.dogId].allocation[category.kind] += expense.amountOre;
  }
  const usedOre = funding.amountOre;
  const residentIds = profileDogs
    .filter((dog) => !dog.group && funding.byDog[dog.id].amountOre > 0)
    .map((dog) => dog.id);
  return {
    totalOre,
    usedOre,
    pendingOre: totalOre - usedOre,
    byCategory,
    funding,
    residentIds,
  };
}

// Only the explicitly labeled starter example gets seeded expenses. Historical
// user gifts remain pending; an allocation alone is not proof of expenditure.
export function exampleExpenses(gifts: DemoGift[]): DemoExpense[] {
  const gift = gifts.find((item) => item.id === 'example');
  if (!gift) return [];
  const requests: {
    dogId: string;
    category: ExpenseCategory;
    amountOre: number;
    kind: CareKind;
  }[] = [
    { dogId: 'ake', category: 'food', amountOre: 10000, kind: 'food' },
    {
      dogId: 'ove',
      category: 'rehabilitation',
      amountOre: 12000,
      kind: 'health',
    },
  ];
  const allocation = giftAllocation(gift);
  return requests
    .filter(
      (request) =>
        recipientIds(gift).includes(request.dogId) &&
        (!gift.carePlanId || gift.carePlanId === request.category),
    )
    .flatMap((request) => {
      const amountOre = Math.min(request.amountOre, allocation[request.kind]);
      return amountOre > 0
        ? [
            {
              id: `example-expense-${request.dogId}`,
              giftId: gift.id,
              dogId: request.dogId,
              category: request.category,
              amountOre,
              recordedAt: gift.createdAt,
            },
          ]
        : [];
    });
}

// Confirming a demo gift records one first-day care unit per matched dog.
// Remaining units and sub-unit amounts stay pending; animation never spends.
export function firstCareExpenses(gift: DemoGift): DemoExpense[] {
  if (!gift.carePlanId) return [];
  const plan = carePlan(gift.carePlanId);
  const units = Math.floor(gift.amountOre / plan.unitOre);
  const dogs = Math.ceil(units / plan.daysPerDog);
  return recipientIds(gift)
    .filter((id) => profileDogs.some((dog) => dog.id === id && !dog.group))
    .slice(0, Math.min(units, dogs))
    .map((dogId) => ({
      id: `${gift.id}:first-care:${dogId}`,
      giftId: gift.id,
      dogId,
      category: gift.carePlanId as CarePlanId,
      amountOre: plan.unitOre,
      recordedAt: gift.createdAt,
    }));
}

export function readGivingLedger(
  raw: string | null,
  legacyGifts: string | null,
): GivingLedger {
  if (raw) {
    try {
      const value = JSON.parse(raw);
      if (value && Array.isArray(value.gifts)) {
        const gifts = readDemoGifts(JSON.stringify(value.gifts));
        return {
          gifts,
          expenses: validExpenses(value.expenses, gifts) ? value.expenses : [],
        };
      }
    } catch {
      /* Keep the original gift records if the new snapshot cannot be read. */
    }
  }
  const gifts = readDemoGifts(legacyGifts);
  return { gifts, expenses: exampleExpenses(gifts) };
}
