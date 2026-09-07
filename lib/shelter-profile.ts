import { dateValue, isCarePlanId, type CarePlanId } from './care-impact.ts';
import { MAX_DEMO_GIFT_ORE } from './donation-shell.ts';

export const PROFILE_STORAGE_KEY = 'hundstallet.personal-shelter.v1';
export type MonthlyPlan = {
  amountOre: number;
  careId: CarePlanId;
  startDate: string;
};
export type ShelterProfile = {
  name: string;
  shelterName: string;
  monthlyPlan: MonthlyPlan | null;
};
export const defaultShelterProfile: ShelterProfile = {
  name: 'Dog friend',
  shelterName: 'My little shelter',
  monthlyPlan: null,
};

export function readShelterProfile(raw: string | null): ShelterProfile {
  if (!raw) return { ...defaultShelterProfile };
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object')
      return { ...defaultShelterProfile };
    const result = { ...defaultShelterProfile };
    if (
      typeof value.name === 'string' &&
      value.name.trim() &&
      value.name.trim().length <= 40
    )
      result.name = value.name.trim();
    if (
      typeof value.shelterName === 'string' &&
      value.shelterName.trim() &&
      value.shelterName.trim().length <= 60
    )
      result.shelterName = value.shelterName.trim();
    const plan = value.monthlyPlan;
    if (
      plan &&
      Number.isSafeInteger(plan.amountOre) &&
      plan.amountOre >= 100 &&
      plan.amountOre <= MAX_DEMO_GIFT_ORE &&
      isCarePlanId(plan.careId)
    ) {
      try {
        dateValue(plan.startDate);
        result.monthlyPlan = {
          amountOre: plan.amountOre,
          careId: plan.careId,
          startDate: plan.startDate,
        };
      } catch {
        /* Keep profile names when only the saved forecast is invalid. */
      }
    }
    return result;
  } catch {
    return { ...defaultShelterProfile };
  }
}
