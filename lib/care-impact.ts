export type CarePlanId = 'food' | 'rehabilitation' | 'vaccination';
export type GivingFrequency = 'once' | 'monthly';

export const CARE_SOURCE = 'https://hundstallet.se/stod-oss/';
export const CARE_SOURCE_CHECKED = '2026-09-07';
export const carePlans = [
  {
    id: 'food' as const,
    name: 'Food & enrichment',
    asset: '/care/pixel/food-enrichment.png',
    presetOre: 10_000,
    unitOre: 5_000,
    unit: 'dog-days',
    daysPerDog: 10,
    example: '100 SEK · 1 dog, 2 days',
    detail: '500 SEK can provide food and enrichment for one dog for 10 days.',
    activity: 'Eating & playing',
  },
  {
    id: 'rehabilitation' as const,
    name: 'Vet care & rehabilitation',
    asset: '/care/pixel/care-rehabilitation.png',
    presetOre: 24_000,
    unitOre: 12_000,
    unit: 'care days',
    daysPerDog: 2,
    example: '240 SEK · 2 days of care',
    detail: 'The recipient estimate assumes one dog per two-day care example.',
    activity: 'Care & recovery',
  },
  {
    id: 'vaccination' as const,
    name: 'Examination & vaccination',
    asset: '/care/pixel/examination-vaccination.png',
    presetOre: 110_000,
    unitOre: 110_000,
    unit: 'vet visits',
    daysPerDog: 1,
    example: '1,100 SEK · 1 dog, 1 visit',
    detail: 'A veterinary examination and vaccination for one dog.',
    activity: 'At the vet',
  },
];
export function isCarePlanId(value: unknown): value is CarePlanId {
  return carePlans.some((plan) => plan.id === value);
}
export function carePlan(id: CarePlanId) {
  const plan = carePlans.find((item) => item.id === id);
  if (!plan) throw new Error('Unknown care plan.');
  return plan;
}

const DAY_MS = 86_400_000;
export function dateValue(isoDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) throw new Error('Invalid date.');
  const value = Date.parse(`${isoDate}T00:00:00Z`);
  if (
    !Number.isFinite(value) ||
    new Date(value).toISOString().slice(0, 10) !== isoDate
  )
    throw new Error('Invalid date.');
  return value;
}
export function dateAfterDays(start: string, days: number) {
  return new Date(dateValue(start) + days * DAY_MS).toISOString().slice(0, 10);
}
export function dateAfterMonths(start: string, months: number) {
  const date = new Date(dateValue(start));
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), lastDay)))
    .toISOString()
    .slice(0, 10);
}
export function daysBetween(start: string, end: string) {
  return Math.round((dateValue(end) - dateValue(start)) / DAY_MS);
}
export function forecastDays(start: string) {
  return daysBetween(start, dateAfterMonths(start, 12)) - 1;
}
export function displayDate(date: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dateValue(date));
}

export function projectCare({
  amountOre,
  careId,
  frequency,
  startDate,
  day,
}: {
  amountOre: number | null;
  careId: CarePlanId;
  frequency: GivingFrequency;
  startDate: string;
  day: number;
}) {
  const plan = carePlan(careId);
  const maxDay = forecastDays(startDate);
  if (!Number.isInteger(day) || day < 0 || day > maxDay)
    throw new Error('Invalid forecast day.');
  if (frequency !== 'once' && frequency !== 'monthly')
    throw new Error('Invalid frequency.');
  if (
    amountOre !== null &&
    (!Number.isSafeInteger(amountOre) ||
      amountOre < 100 ||
      amountOre > 1_000_000)
  )
    throw new Error('Invalid forecast amount.');
  const date = dateAfterDays(startDate, day);
  let contributions = 0,
    reserveOre = 0,
    totalUnits = 0,
    usedUnits = 0,
    dogCount = 0,
    activeDogs = 0;
  let month = 1,
    activeStartIndex = 0;
  const cycles: {
    date: string;
    amountOre: number;
    units: number;
    usedUnits: number;
    reserveOre: number;
  }[] = [];
  for (let index = 0; index < 12; index++) {
    const cycleDate = dateAfterMonths(startDate, index);
    const cycleDay = daysBetween(startDate, cycleDate);
    if (cycleDay > day) break;
    month = index + 1;
    if (amountOre === null || (frequency === 'once' && index > 0)) continue;
    contributions++;
    const budget = reserveOre + amountOre;
    const units = Math.floor(budget / plan.unitOre);
    reserveOre = budget - units * plan.unitOre;
    totalUnits += units;
    const cycleDogs = Math.ceil(units / plan.daysPerDog);
    const elapsed = day - cycleDay;
    // A forecast schedule, not shelter reporting. Food/rehab supports the same
    // cohort each month; an examination/vaccination is never repeated on the
    // same dog merely because another monthly contribution arrives.
    const used = Math.min(units, (elapsed + 1) * cycleDogs);
    usedUnits += used;
    if (careId === 'vaccination') {
      if (elapsed === 0) activeStartIndex = dogCount;
      dogCount += cycleDogs;
    } else dogCount = Math.max(dogCount, cycleDogs);
    if (elapsed * cycleDogs < units)
      activeDogs += Math.min(cycleDogs, units - elapsed * cycleDogs);
    cycles.push({
      date: cycleDate,
      amountOre,
      units,
      usedUnits: used,
      reserveOre,
    });
  }
  const committedOre = (amountOre ?? 0) * contributions;
  return {
    careId,
    frequency,
    date,
    day,
    maxDay,
    month,
    contributions,
    committedOre,
    allocatedOre: totalUnits * plan.unitOre,
    reserveOre,
    totalUnits,
    usedUnits,
    remainingUnits: totalUnits - usedUnits,
    dogCount,
    activeDogs,
    activeStartIndex,
    cycles,
  };
}
export type CareProjection = ReturnType<typeof projectCare>;
