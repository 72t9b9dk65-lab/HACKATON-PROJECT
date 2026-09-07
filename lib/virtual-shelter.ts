import {
  MAX_DEMO_GIFT_ORE,
  profileDogs,
  type fundingSummary,
} from './donation-shell.ts';
import type { CarePlanId } from './care-impact.ts';
import { matchesCareNeed, needPriority } from './dog-needs.ts';

export function parseDonationAmount(value: string): number | null {
  if (!/^\d{1,5}$/.test(value.trim())) return null;
  const ore = Number(value.trim()) * 100;
  return ore >= 100 && ore <= MAX_DEMO_GIFT_ORE ? ore : null;
}

export function previewCareRecipients(
  dogCount: number,
  funding: ReturnType<typeof fundingSummary>,
  careId?: CarePlanId,
): string[] {
  if (!Number.isSafeInteger(dogCount) || dogCount < 1) return [];

  // Start with unsupported profiles, then those with the least demo support.
  // Sorting a copy preserves the directory and historical receipt allocations.
  return profileDogs
    .filter((dog) => !dog.group && (!careId || matchesCareNeed(dog.id, careId)))
    .sort(
      (a, b) =>
        Number(funding.byDog[a.id].amountOre > 0) -
          Number(funding.byDog[b.id].amountOre > 0) ||
        (careId
          ? needPriority(a.id, careId) - needPriority(b.id, careId)
          : 0) ||
        funding.byDog[a.id].amountOre - funding.byDog[b.id].amountOre,
    )
    .slice(0, dogCount)
    .map((dog) => dog.id);
}
