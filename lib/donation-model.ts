import {
  allTerritories,
  categories,
  territories,
  demoDonors,
  type Donation,
  type Profile,
  type Territory,
  type CategoryId,
} from './earth-data.ts';
export const STORAGE_KEY = 'earthhealth.prototype.v1';
export const stages = [
  'Contributo registrato',
  'Destinazione assegnata',
  'Acquisto documentato',
  'Aiuto consegnato',
];
export const personFactors = {
  water: 4,
  food: 4,
  health: 1,
  shelter: 2,
  education: 1,
};
export function estimate(amount: number, category: CategoryId) {
  const c = categories.find((x) => x.id === category)!;
  const units = Math.floor(amount / c.unitCost);
  return {
    units,
    people: units * personFactors[category],
    remainder: Math.round((amount - units * c.unitCost) * 100) / 100,
    unitCost: c.unitCost,
    unit: c.unit,
  };
}
export function validUsername(value: string) {
  return (
    /^[a-zA-Z0-9_]{3,24}$/.test(value) &&
    !demoDonors.some((d) => d.username.toLowerCase() === value.toLowerCase())
  );
}
export function validAmount(value: number) {
  return (
    Number.isFinite(value) &&
    value >= 1 &&
    value <= 25000 &&
    Math.abs(value * 100 - Math.round(value * 100)) < 0.00001
  );
}
export function newDonation(
  territory: Territory,
  category: CategoryId,
  amount: number,
  id: string,
): Donation {
  if (
    !validAmount(amount) ||
    !categories.some((c) => c.id === category) ||
    !allTerritories.some((t) => t.id === territory.id) ||
    territory.score < 0
  )
    throw new Error('Contributo non valido.');
  return {
    id,
    territoryId: territory.id,
    territoryName: territory.name,
    countryId: territory.countryId ?? territory.id,
    category,
    amount,
    createdAt: new Date().toISOString(),
    stage: 0,
  };
}
export function parseSavedState(raw: string | null): {
  profile: Profile | null;
  donations: Donation[];
} {
  if (!raw) return { profile: null, donations: [] };
  const data = JSON.parse(raw);
  if (
    data.version !== 1 ||
    !data.profile ||
    !validUsername(data.profile.username) ||
    !Number.isInteger(data.profile.avatar) ||
    data.profile.avatar < 0 ||
    data.profile.avatar > 4
  )
    throw new Error('Profilo salvato non valido.');
  const ids = new Set<string>();
  const donations: Donation[] = Array.isArray(data.donations)
    ? data.donations.filter((d: Donation) => {
        const valid =
          typeof d.id === 'string' &&
          !ids.has(d.id) &&
          allTerritories.some(
            (t) =>
              t.id === d.territoryId && (t.countryId ?? t.id) === d.countryId,
          ) &&
          validAmount(d.amount) &&
          categories.some((c) => c.id === d.category) &&
          Number.isInteger(d.stage) &&
          d.stage >= 0 &&
          d.stage <= 3 &&
          Number.isFinite(Date.parse(d.createdAt));
        if (valid) ids.add(d.id);
        return valid;
      })
    : [];
  return {
    profile: {
      username: data.profile.username,
      avatar: data.profile.avatar,
      createdAt:
        typeof data.profile.createdAt === 'string'
          ? data.profile.createdAt
          : new Date().toISOString(),
    },
    donations,
  };
}
export function addedFunds(donations: Donation[]) {
  const result: Record<string, number> = {};
  for (const d of donations) {
    result[d.territoryId] = (result[d.territoryId] ?? 0) + d.amount;
    if (d.countryId !== d.territoryId)
      result[d.countryId] = (result[d.countryId] ?? 0) + d.amount;
    const t = allTerritories.find((t) => t.id === d.territoryId);
    if (t && t.continent !== d.territoryId)
      result[t.continent] = (result[t.continent] ?? 0) + d.amount;
  }
  return result;
}
// The six illustrative donor ledgers reconcile exactly with the country totals.
export const seedContributions = territories.flatMap((t, i) => {
  const first = Math.round(t.raised * 0.6);
  const second = Math.round(t.raised * 0.28);
  return [first, second, t.raised - first - second].map((amount, j) => ({
    username: demoDonors[(i + j) % demoDonors.length].username,
    territoryId: t.id,
    amount,
  }));
});
export const rankedSeedDonors = demoDonors
  .map((d) => ({
    ...d,
    total: seedContributions
      .filter((c) => c.username === d.username)
      .reduce((s, c) => s + c.amount, 0),
    territories: new Set(
      seedContributions
        .filter((c) => c.username === d.username)
        .map((c) => c.territoryId),
    ).size,
  }))
  .sort((a, b) => b.total - a.total);
export const allocationWeights = [0.32, 0.26, 0.2, 0.14, 0.08];
export function categoryFunding(
  territory: Territory,
  category: CategoryId,
  donations: Donation[],
) {
  const index = categories.findIndex((c) => c.id === category);
  const base =
    index === 4
      ? territory.raised -
        allocationWeights
          .slice(0, 4)
          .reduce((s, w) => s + Math.round(territory.raised * w), 0)
      : Math.round(territory.raised * allocationWeights[index]);
  const additions = donations
    .filter(
      (d) =>
        d.category === category &&
        (d.territoryId === territory.id ||
          d.countryId === territory.id ||
          allTerritories.find((t) => t.id === d.territoryId)?.continent ===
            territory.id),
    )
    .reduce((s, d) => s + d.amount, 0);
  return base + additions;
}
