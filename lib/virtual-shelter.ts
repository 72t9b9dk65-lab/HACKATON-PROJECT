import {
  MAX_DEMO_GIFT_ORE,
  profileDogs,
  type fundingSummary,
} from './donation-shell.ts';

// A visual prototype assumption, not a verified cost of supporting a dog.
export const PREVIEW_CARE_SHARE_ORE = 10_000;

export function parseDonationAmount(value: string): number | null {
  if (!/^\d{1,5}$/.test(value.trim())) return null;
  const ore = Number(value.trim()) * 100;
  return ore >= 100 && ore <= MAX_DEMO_GIFT_ORE ? ore : null;
}

export function previewCareRecipients(
  amountOre: number | null,
  funding: ReturnType<typeof fundingSummary>,
): string[] {
  if (
    amountOre === null ||
    !Number.isSafeInteger(amountOre) ||
    amountOre < 100 ||
    amountOre > MAX_DEMO_GIFT_ORE
  )
    return [];

  const count = Math.min(
    profileDogs.length,
    Math.ceil(amountOre / PREVIEW_CARE_SHARE_ORE),
  );
  // Start with unsupported profiles, then those with the least demo support.
  // Sorting a copy preserves the directory and historical receipt allocations.
  return [...profileDogs]
    .sort(
      (a, b) => funding.byDog[a.id].amountOre - funding.byDog[b.id].amountOre,
    )
    .slice(0, count)
    .map((dog) => dog.id);
}
