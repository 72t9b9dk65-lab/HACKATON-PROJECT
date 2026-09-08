// Virtual progression is a visual reward, never a claim about an individual dog's costs.
// Cumulative donated SEK, not a price charged for each dog.
const COMPANION_THRESHOLDS_SEK = [
  50, 100, 150, 200, 300, 400, 500, 700, 1000, 1250, 1500, 1750, 2000,
];
export function companionThresholdOre(count: number) {
  if (count <= 0) return 0;
  return (
    (COMPANION_THRESHOLDS_SEK[count - 1] ??
      2000 + (count - COMPANION_THRESHOLDS_SEK.length) * 250) * 100
  );
}
export function companionCount(totalOre: number, maximum: number) {
  let count = 0;
  while (count < maximum && companionThresholdOre(count + 1) <= totalOre)
    count++;
  return count;
}
export type ZoneId =
  | 'garden'
  | 'kennel'
  | 'food'
  | 'water'
  | 'play'
  | 'wellbeing'
  | 'medical'
  | 'sport';
export type Point = { x: number; y: number };
export const zones = [
  {
    id: 'garden',
    name: 'The garden',
    family: 'giardino',
    first: 0,
    x: 600,
    y: 720,
    entrance: 'all',
  },
  {
    id: 'kennel',
    name: 'A cosy home',
    family: 'cuccia',
    first: 1,
    x: 210,
    y: 720,
    entrance: 'right',
  },
  {
    id: 'food',
    name: 'The kitchen',
    family: 'cibo',
    first: 2,
    x: 210,
    y: 220,
    entrance: 'right',
  },
  {
    id: 'water',
    name: 'Fresh water',
    family: 'abbeveraggio',
    first: 3,
    x: 210,
    y: 1220,
    entrance: 'right',
  },
  {
    id: 'play',
    name: 'Playground',
    family: 'gioco',
    first: 4,
    x: 990,
    y: 220,
    entrance: 'left',
  },
  {
    id: 'wellbeing',
    name: 'Wellbeing',
    family: 'benessere',
    first: 6,
    x: 600,
    y: 1220,
    entrance: 'top',
  },
  {
    id: 'medical',
    name: 'Care studio',
    family: 'cura',
    first: 8,
    x: 990,
    y: 720,
    entrance: 'left',
  },
  {
    id: 'sport',
    name: 'Sport & pool',
    family: 'sport-piscina',
    first: 10,
    x: 990,
    y: 1220,
    entrance: 'top',
  },
] as const;
export type ZoneProgress = (typeof zones)[number] & {
  level: number;
  projectedLevel: number;
  nextThresholdOre: number | null;
  remainingOre: number;
  donationGapOre: number;
};
export function hashSeed(value: string) {
  let h = 2166136261;
  for (const c of value) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
export function companionOrder(
  donorId: string,
  catalog: { id: string; group?: boolean }[],
) {
  return catalog
    .filter((d) => !d.group)
    .map((d) => d.id)
    .sort(
      (a, b) =>
        hashSeed(donorId + ':' + a + ':shelter-v1') -
          hashSeed(donorId + ':' + b + ':shelter-v1') || a.localeCompare(b),
    );
}
export function thresholds(zone: (typeof zones)[number]) {
  return (
    zone.id === 'garden'
      ? [0, 4, 8, 16, 28]
      : [0, 3, 7, 15, 27].map((n) => n + zone.first)
  ).map(companionThresholdOre);
}
export function shelterProgress(
  donorId: string,
  usedOre: number,
  pendingOre: number,
  previewOre: number,
  catalog: { id: string; group?: boolean }[],
) {
  const order = companionOrder(donorId, catalog);
  const used = Math.max(0, usedOre);
  const donated = used + Math.max(0, pendingOre);
  const potential = donated + Math.max(0, previewOre);
  const count = companionCount(donated, order.length);
  const futureCount = companionCount(potential, order.length);
  return {
    usedOre: used,
    pendingOre,
    potentialOre: potential,
    residentIds: order.slice(0, count),
    potentialIds: order.slice(count, futureCount),
    zones: zones.map((zone) => {
      const steps = thresholds(zone);
      const level = steps.filter((s) => s <= donated).length;
      const next = steps[level] ?? null;
      return {
        ...zone,
        level,
        projectedLevel: steps.filter((s) => s <= potential).length,
        nextThresholdOre: next,
        remainingOre: next === null ? 0 : next - donated,
        donationGapOre: next === null ? 0 : Math.max(0, next - donated),
      };
    }),
    nextDogOre:
      count < order.length ? companionThresholdOre(count + 1) - donated : null,
  };
}
export type ShelterProgress = ReturnType<typeof shelterProgress>;
export const tileSize = (level: number) => 210 + Math.max(1, level) * 22;
export function routeToGarden(zone: ZoneProgress): Point[] {
  const size = zoneSize(zone.id, Math.max(1, zone.level));
  const half = size / 2;
  const start = { x: zone.x, y: zone.y };
  if (zone.id === 'garden') return [start];
  if (zone.id === 'wellbeing')
    return [
      start,
      { x: 600, y: 1220 - half },
      { x: 600, y: 970 },
      { x: 600, y: 720 },
    ];
  if (zone.id === 'sport')
    return [
      start,
      { x: 990, y: 1220 - half },
      { x: 990, y: 970 },
      { x: 600, y: 970 },
      { x: 600, y: 720 },
    ];
  const left = zone.entrance === 'left';
  const corridorX = left ? 795 : 405;
  return [
    start,
    { x: zone.x + (left ? -half : half), y: zone.y },
    { x: corridorX, y: zone.y },
    { x: corridorX, y: 720 },
    { x: 600, y: 720 },
  ];
}
export function travelRoute(from: ZoneProgress, to: ZoneProgress) {
  if (from.id === to.id) return [{ x: from.x, y: from.y }];
  return [...routeToGarden(from), ...routeToGarden(to).reverse().slice(1)];
}
export function pointOnRoute(points: Point[], fraction: number) {
  if (points.length < 2) return points[0];
  const lengths = points
    .slice(1)
    .map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
  let distance =
    Math.max(0, Math.min(1, fraction)) * lengths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (distance <= lengths[i] && lengths[i] > 0) {
      const f = distance / lengths[i];
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * f,
        y: points[i].y + (points[i + 1].y - points[i].y) * f,
      };
    }
    distance -= lengths[i];
  }
  return points.at(-1)!;
}

export function zoneSize(id: ZoneId, level: number) {
  if (id === 'garden') return 255 + Math.max(1, level) * 24;
  if (id === 'kennel') return 242 + Math.max(1, level) * 25;
  return tileSize(level);
}
