// Seed presentation-only adoption states once for the existing roster.
// New companion instances are absent from this snapshot and stay available.
export function initialAdoptedCompanions(residentIds: string[]) {
  return residentIds.filter((_, index) => index % 4 === 3);
}

export function groupCompanions(
  residentIds: string[],
  adoptedIds: readonly string[],
) {
  const adopted = new Set(adoptedIds);
  return {
    available: residentIds.filter((id) => !adopted.has(id)),
    adopted: residentIds.filter((id) => adopted.has(id)),
  };
}
