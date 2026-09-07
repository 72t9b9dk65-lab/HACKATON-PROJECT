// An illustrated rest routine, never a staff observation or financial event.
// Stable per dog and Stockholm calendar day, including across reloads and DST.
const stockholm = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Stockholm',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
export type ShelterMoment = { day: string; minute: number; night: boolean };
export type Nap = { start: number; end: number };
export function shelterMoment(clock: number): ShelterMoment {
  const parts = stockholm.formatToParts(clock);
  const part = (name: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === name)!.value;
  const minute = Number(part('hour')) * 60 + Number(part('minute'));
  return {
    day: `${part('year')}-${part('month')}-${part('day')}`,
    minute,
    night: minute < 7 * 60 || minute >= 21 * 60,
  };
}
function randomFor(seed: string) {
  let value = 2166136261;
  for (const character of seed) {
    value = Math.imul(value ^ character.charCodeAt(0), 16777619);
  }
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let next = Math.imul(value ^ (value >>> 15), 1 | value);
    next ^= next + Math.imul(next ^ (next >>> 7), 61 | next);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}
export function daytimeNaps(dogId: string, day: string): Nap[] {
  const random = randomFor(`${day}:${dogId}`);
  const total = 180 + Math.floor(random() * 61);
  const count = 3 + Math.floor(random() * 2);
  const base = Math.floor(total / count);
  // Separate windows keep naps apart and guarantee 3–4 hours of daytime rest.
  return Array.from({ length: count }, (_, index) => {
    const duration = base + (index < total % count ? 1 : 0);
    const from = 7 * 60 + Math.floor((index * 840) / count) + 15;
    const until = 7 * 60 + Math.floor(((index + 1) * 840) / count) - 15;
    const start = from + Math.floor(random() * (until - from - duration + 1));
    return { start, end: start + duration };
  });
}
export function dogIsSleeping(dogId: string, moment: ShelterMoment): boolean {
  return (
    moment.night ||
    daytimeNaps(dogId, moment.day).some(
      (nap) => moment.minute >= nap.start && moment.minute < nap.end,
    )
  );
}
