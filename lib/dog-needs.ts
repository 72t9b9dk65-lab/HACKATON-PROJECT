import type { CarePlanId } from './care-impact.ts';

export const needKinds = [
  { id: 'food', label: 'Food', careId: 'food' },
  { id: 'medical', label: 'Medical care', careId: 'rehabilitation' },
  { id: 'urgent', label: 'Urgent care', careId: 'rehabilitation' },
  { id: 'checkup', label: 'Check-up', careId: 'vaccination' },
] as const;
export type DogNeedId = (typeof needKinds)[number]['id'];

// Demo scenarios only, never inferred diagnoses or published medical needs.
// Stable IDs keep badges unchanged when the amount or directory order changes.
export function dogNeeds(id: string): DogNeedId[] {
  const seed = Array.from(id).reduce(
    (sum, character) => sum + character.charCodeAt(0),
    0,
  );
  return ['food', (['medical', 'urgent', 'checkup'] as const)[seed % 3]];
}

export function matchesCareNeed(id: string, careId: CarePlanId) {
  return dogNeeds(id).some(
    (need) => needKinds.find((kind) => kind.id === need)!.careId === careId,
  );
}

export function needPriority(id: string, careId: CarePlanId) {
  return careId === 'rehabilitation' && dogNeeds(id).includes('urgent') ? 0 : 1;
}

export function waitingDogIds(
  dogs: { id: string; group: boolean }[],
  residentIds: string[],
  previewIds: string[],
): string[] {
  const inShelter = new Set([...residentIds, ...previewIds]);
  return dogs
    .filter((dog) => !dog.group && !inShelter.has(dog.id))
    .map((dog) => dog.id);
}
