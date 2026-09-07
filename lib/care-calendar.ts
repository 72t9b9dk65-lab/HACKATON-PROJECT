import { profileDogs } from './donation-shell.ts';
import {
  expenseActivity,
  expenseCategories,
  type DemoExpense,
} from './donation-spending.ts';
import {
  shelterActivities,
  type ShelterActivity,
} from './shelter-activities.ts';

export const CARE_CALENDAR_KEY = 'hundstallet.care-calendar.v1';
export const calendarActivities = [
  ...shelterActivities,
  {
    id: 'home',
    label: 'At the kennel',
    action: 'Resting',
    asset: '/shelters/pixel-big-kennel.png',
  },
  {
    id: 'sleep',
    label: 'Sleep',
    action: 'Sleeping',
    asset: '/shelters/pixel-big-kennel.png',
  },
] as const;

export type CareUpdate = {
  id: string;
  dogId: string;
  activity: ShelterActivity;
  title: string;
  note: string;
  startsAt: string;
  endsAt: string;
  publishedAt: string | null;
  completedAt: string | null;
  expenseId: string | null;
  liveHours?: 1 | 2;
  photos: { src: string; caption: string }[];
};

export function safeCarePhoto(src: string) {
  if (/^\/dogs\/[a-zA-Z0-9/_.-]+$/.test(src) && !src.includes('..'))
    return true;
  if (
    /^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(src) &&
    src.length <= 1_400_000
  )
    return true;
  try {
    const url = new URL(src);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      src.length <= 2000
    );
  } catch {
    return false;
  }
}

const isDate = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}T/.test(value) &&
  Number.isFinite(Date.parse(value));

export function validCareUpdate(value: unknown): value is CareUpdate {
  if (!value || typeof value !== 'object') return false;
  const e = value as CareUpdate;
  return (
    typeof e.id === 'string' &&
    e.id.length > 0 &&
    e.id.length <= 100 &&
    profileDogs.some((dog) => dog.id === e.dogId) &&
    calendarActivities.some((activity) => activity.id === e.activity) &&
    typeof e.title === 'string' &&
    e.title.trim().length > 0 &&
    e.title.length <= 100 &&
    typeof e.note === 'string' &&
    e.note.length <= 1600 &&
    isDate(e.startsAt) &&
    isDate(e.endsAt) &&
    Date.parse(e.endsAt) > Date.parse(e.startsAt) &&
    (e.publishedAt === null || isDate(e.publishedAt)) &&
    (e.completedAt === null ||
      (isDate(e.completedAt) &&
        Date.parse(e.completedAt) >= Date.parse(e.startsAt))) &&
    (e.expenseId === null ||
      (typeof e.expenseId === 'string' && e.expenseId.length <= 200)) &&
    (e.liveHours === undefined || e.liveHours === 1 || e.liveHours === 2) &&
    Array.isArray(e.photos) &&
    e.photos.length <= 3 &&
    e.photos.every(
      (photo) =>
        photo &&
        typeof photo.src === 'string' &&
        safeCarePhoto(photo.src) &&
        typeof photo.caption === 'string' &&
        photo.caption.length <= 200,
    )
  );
}

export function readCareCalendar(raw: string | null): CareUpdate[] {
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (
    !Array.isArray(parsed) ||
    parsed.length > 500 ||
    !parsed.every(validCareUpdate) ||
    new Set(parsed.map((entry) => entry.id)).size !== parsed.length
  ) {
    throw new Error(
      'The saved calendar could not be read. It has not been overwritten.',
    );
  }
  return parsed;
}

export function visibleCareUpdates(updates: CareUpdate[], now: number) {
  return updates.filter(
    (entry) =>
      entry.publishedAt !== null && Date.parse(entry.publishedAt) <= now,
  );
}

export function livePhotoExpiry(entry: CareUpdate) {
  return entry.publishedAt
    ? Date.parse(entry.publishedAt) + (entry.liveHours ?? 2) * 3_600_000
    : 0;
}

// Live moments come only from published staff photos, never from a routine,
// a donation estimate, or an undated directory image. Completion does not
// remove a photo: it stays visible for its chosen window after publication.
export function livePhotoUpdates(
  updates: CareUpdate[],
  now: number,
  dogIds?: string[],
) {
  return visibleCareUpdates(updates, now)
    .filter(
      (entry) =>
        entry.photos.length > 0 &&
        Date.parse(entry.startsAt) <= now &&
        now < livePhotoExpiry(entry) &&
        (!dogIds || dogIds.includes(entry.dogId)),
    )
    .sort((a, b) => Date.parse(b.publishedAt!) - Date.parse(a.publishedAt!));
}

// One dog has one current photo moment. A newer post replaces the previous
// activity; once that post expires, the dog returns to its kennel.
export function liveDogPhoto(
  updates: CareUpdate[],
  dogId: string,
  now: number,
) {
  const latest = visibleCareUpdates(updates, now)
    .filter(
      (entry) =>
        entry.dogId === dogId &&
        entry.photos.length > 0 &&
        Date.parse(entry.startsAt) <= now,
    )
    .sort(
      (a, b) =>
        Date.parse(b.publishedAt!) - Date.parse(a.publishedAt!) ||
        b.id.localeCompare(a.id),
    )[0];
  return latest && now < livePhotoExpiry(latest) ? latest : undefined;
}

export function activeDogUpdate(
  updates: CareUpdate[],
  dogId: string,
  now: number,
) {
  return visibleCareUpdates(updates, now)
    .filter(
      (entry) =>
        entry.dogId === dogId &&
        Date.parse(entry.startsAt) <= now &&
        Date.parse(entry.endsAt) > now &&
        !(entry.completedAt && Date.parse(entry.completedAt) <= now),
    )
    .sort(
      (a, b) =>
        Date.parse(b.startsAt) - Date.parse(a.startsAt) ||
        a.id.localeCompare(b.id),
    )[0];
}

export function careUpdateStatus(entry: CareUpdate, now: number) {
  if (entry.completedAt && Date.parse(entry.completedAt) <= now)
    return 'Completed';
  if (Date.parse(entry.startsAt) > now) return 'Upcoming';
  if (Date.parse(entry.endsAt) > now) return 'Scheduled now';
  return 'Awaiting update';
}

export function dogEventPhoto(
  updates: CareUpdate[],
  dogId: string,
  now: number,
  expenseId?: string,
) {
  const event = expenseId
    ? visibleCareUpdates(updates, now)
        .filter(
          (entry) =>
            entry.dogId === dogId &&
            entry.expenseId === expenseId &&
            Date.parse(entry.startsAt) <= now &&
            entry.photos.length > 0,
        )
        .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt))[0]
    : activeDogUpdate(updates, dogId, now);
  return event?.photos.length ? event : undefined;
}

// The basket is a projection of recorded expenses, never of the calendar or forecasts.
export function dogCareBasket(expenses: DemoExpense[], dogId: string) {
  return expenseCategories
    .map((category) => {
      const matches = expenses.filter(
        (expense) =>
          expense.dogId === dogId && expense.category === category.id,
      );
      return {
        ...category,
        amountOre: matches.reduce((sum, expense) => sum + expense.amountOre, 0),
        count: matches.length,
      };
    })
    .filter((category) => category.amountOre > 0);
}

export function linkedCareExpense(entry: CareUpdate, expenses: DemoExpense[]) {
  return expenses.find(
    (expense) =>
      expense.id === entry.expenseId && careExpenseMatches(entry, expense),
  );
}

export function careExpenseMatches(
  entry: Pick<CareUpdate, 'dogId' | 'activity'>,
  expense: DemoExpense,
) {
  return (
    expense.dogId === entry.dogId &&
    (expenseActivity(expense) === entry.activity ||
      (expense.category === 'comfort' && entry.activity === 'home'))
  );
}

export function carePhotoLinkError(entry: CareUpdate, expenses: DemoExpense[]) {
  if (
    (entry.photos.length || entry.expenseId) &&
    !linkedCareExpense(entry, expenses)
  )
    return 'Link a recorded transaction for this dog and category before saving photos.';
  return null;
}

// Transaction photos remain available after their short live-update window.
export function expensePhotoUpdate(
  updates: CareUpdate[],
  expense: DemoExpense,
  now: number,
) {
  return visibleCareUpdates(updates, now)
    .filter(
      (entry) =>
        entry.photos.length > 0 &&
        Date.parse(entry.startsAt) <= now &&
        linkedCareExpense(entry, [expense]),
    )
    .sort(
      (a, b) =>
        Date.parse(b.publishedAt!) - Date.parse(a.publishedAt!) ||
        b.id.localeCompare(a.id),
    )[0];
}

export function stockholmInput(instant: Date | number) {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const part = (type: string) =>
    parts.find((item) => item.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}

// Reject skipped spring-clock times. Ambiguous autumn times use the first occurrence.
export function stockholmInstant(input: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input))
    throw new Error('Choose a valid date and time.');
  const utc = Date.parse(`${input}:00Z`);
  for (const offset of [2, 1]) {
    const candidate = utc - offset * 3_600_000;
    if (Number.isFinite(candidate) && stockholmInput(candidate) === input)
      return new Date(candidate).toISOString();
  }
  throw new Error(
    'This time does not exist in Stockholm. Choose another time.',
  );
}

export function careDateLabel(instant: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Stockholm',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(instant));
}
