// Virtual progression is a visual reward, never a claim about an individual dog's costs.
// Cumulative donated SEK, not a price charged for each dog.
export const MAX_COMPANIONS = 100;
export function companionThresholdOre(count: number) {
  if (count <= 0) return 0;
  if (count > MAX_COMPANIONS) return Infinity;
  return (
    (count <= 20
      ? count * 50
      : count <= 50
        ? 1000 + (count - 20) * 100
        : 4000 + (count - 50) * 200) * 100
  );
}
export function companionProfileId(id: string) {
  return id.split('::')[0];
}
export function companionCount(totalOre: number, maximum: number) {
  let count = 0;
  while (
    count < Math.min(maximum, MAX_COMPANIONS) &&
    companionThresholdOre(count + 1) <= totalOre
  )
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
  | 'sport'
  | 'pool';
export type Point = { x: number; y: number };
// Equal 448px steps leave a compact badge lane clear of level-five artwork.
export const zones = [
  {
    id: 'garden',
    name: 'The garden',
    family: 'giardino',
    first: 0,
    x: 672,
    y: 632,
    entrance: 'all',
    entrances: ['top', 'right', 'bottom', 'left'],
  },
  {
    id: 'kennel',
    name: 'A cosy home',
    family: 'cuccia',
    first: 1,
    x: 224,
    y: 632,
    entrance: 'right',
    entrances: ['top', 'right', 'bottom'],
  },
  {
    id: 'food',
    name: 'The kitchen',
    family: 'cibo',
    first: 2,
    x: 224,
    y: 184,
    entrance: 'right',
    entrances: ['right', 'bottom'],
  },
  {
    id: 'water',
    name: 'Fresh water',
    family: 'abbeveraggio',
    first: 3,
    x: 224,
    y: 1080,
    entrance: 'right',
    entrances: ['top', 'right'],
  },
  {
    id: 'play',
    name: 'Playground',
    family: 'gioco',
    first: 4,
    x: 672,
    y: 184,
    entrance: 'left',
    entrances: ['left', 'right', 'bottom'],
  },
  {
    id: 'wellbeing',
    name: 'Wellbeing',
    family: 'benessere',
    first: 6,
    x: 1120,
    y: 1080,
    entrance: 'top',
    entrances: ['top', 'left'],
  },
  {
    id: 'medical',
    name: 'Care studio',
    family: 'cura',
    first: 8,
    x: 1120,
    y: 632,
    entrance: 'left',
    entrances: ['top', 'left', 'bottom'],
  },
  {
    id: 'pool',
    name: 'Pool',
    family: 'piscina',
    first: 5,
    x: 672,
    y: 1080,
    entrance: 'top',
    entrances: ['top', 'left', 'right'],
  },
  {
    id: 'sport',
    name: 'Sports',
    family: 'sport',
    first: 10,
    x: 1120,
    y: 184,
    entrance: 'left',
    entrances: ['left', 'bottom'],
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
  const order = catalog
    .filter((d) => !d.group)
    .map((d) => d.id)
    .sort(
      (a, b) =>
        hashSeed(donorId + ':' + a + ':shelter-v1') -
          hashSeed(donorId + ':' + b + ':shelter-v1') || a.localeCompare(b),
    );
  return order.length
    ? Array.from({ length: MAX_COMPANIONS }, (_, i) =>
        i < order.length
          ? order[i]
          : `${order[i % order.length]}::${Math.floor(i / order.length)}`,
      )
    : [];
}
export function thresholds(zone: (typeof zones)[number]) {
  const amounts: Record<ZoneId, number[]> = {
    garden: [0, 200, 700, 2750, 5750],
    kennel: [50, 200, 700, 2750, 5750],
    food: [100, 300, 1000, 3000, 6000],
    water: [150, 400, 1250, 3250, 6250],
    play: [200, 500, 1500, 3500, 6500],
    pool: [300, 700, 1750, 3750, 6750],
    wellbeing: [400, 1000, 2000, 4000, 7000],
    medical: [700, 1500, 2500, 4500, 7500],
    sport: [1250, 2000, 3000, 5000, 8000],
  };
  return amounts[zone.id].map((n) => n * 100);
}
export function maximumShelterDonationOre(_catalog: { group?: boolean }[]) {
  return companionThresholdOre(MAX_COMPANIONS);
}

export type GrowthCheckpoint = {
  amountOre: number;
  companion: number | null;
  upgrades: { id: ZoneId; name: string; level: number }[];
  current: boolean;
};

/** Group simultaneous rewards into one stop on the preview's donation scale. */
export function shelterGrowthCheckpoints(
  usedOre: number,
  pendingOre: number,
  catalog: { group?: boolean }[],
) {
  const used = Math.max(0, usedOre);
  const donated = used + Math.max(0, pendingOre);
  const points = new Map<number, GrowthCheckpoint>();
  const at = (amountOre: number) => {
    if (!points.has(amountOre)) {
      points.set(amountOre, {
        amountOre,
        companion: null,
        upgrades: [],
        current: amountOre === donated,
      });
    }
    return points.get(amountOre)!;
  };
  at(0);
  at(donated);
  at(Math.max(donated, maximumShelterDonationOre(catalog)));
  if (catalog.some((dog) => !dog.group)) {
    for (let count = 1; count <= MAX_COMPANIONS; count++) {
      at(companionThresholdOre(count)).companion = count;
    }
  }
  for (const zone of zones) {
    thresholds(zone).forEach((amount, index) => {
      // Pending-funded upgrades first appear at the current donation stop.
      const total = amount > used ? Math.max(amount, donated) : amount;
      at(total).upgrades.push({
        id: zone.id,
        name: zone.name,
        level: index + 1,
      });
    });
  }
  return [...points.values()].sort((a, b) => a.amountOre - b.amountOre);
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
    // Preview companions have no real profile identity.
    potentialIds: Array.from(
      { length: futureCount - count },
      (_, i) => `preview-companion-${count + i + 1}`,
    ),
    zones: zones.map((zone) => {
      const steps = thresholds(zone);
      const level = steps.filter((s) => s <= used).length;
      const next = steps[level] ?? null;
      return {
        ...zone,
        level,
        projectedLevel: steps.filter((s) => s <= potential).length,
        nextThresholdOre: next,
        remainingOre: next === null ? 0 : next - used,
        donationGapOre: next === null ? 0 : Math.max(0, next - donated),
      };
    }),
    nextDogOre:
      count < order.length ? companionThresholdOre(count + 1) - donated : null,
  };
}
export type ShelterProgress = ReturnType<typeof shelterProgress>;

/** Revisit earned levels without turning unspent donations into past upgrades. */
export function shelterPreviewProgress(
  donorId: string,
  usedOre: number,
  pendingOre: number,
  totalOre: number,
  catalog: { id: string; group?: boolean }[],
) {
  const donated = Math.max(0, usedOre) + Math.max(0, pendingOre);
  const total = Math.max(0, totalOre);
  if (total >= donated) {
    return shelterProgress(
      donorId,
      usedOre,
      pendingOre,
      total - donated,
      catalog,
    );
  }
  const earlierUsed = Math.min(Math.max(0, usedOre), total);
  const earlier = shelterProgress(
    donorId,
    earlierUsed,
    total - earlierUsed,
    0,
    catalog,
  );
  return {
    ...earlier,
    zones: earlier.zones.map((zone) => ({
      ...zone,
      projectedLevel: zone.level,
    })),
  };
}

export const tileSize = (level: number) => 210 + Math.max(1, level) * 22;
export type Entrance = 'top' | 'right' | 'bottom' | 'left';
export const WORLD_WIDTH = 1304;
export const WORLD_HEIGHT = 1356;
type Road = {
  id: string;
  points: Point[];
  locked: boolean;
  zoneId: ZoneId;
  entrance: Entrance;
};

export function areaAsset(
  zone: Pick<ZoneProgress, 'id' | 'family'>,
  level: number,
) {
  const folder = zone.id === 'garden' ? 'garden-v3' : 'grid-v2';
  const format = zone.id === 'medical' ? 'png' : 'webp';
  return `/care/${folder}/${zone.family}-livello-${level}.${format}`;
}

/** Nine area centres form four squares; each edge joins facing entrances directly. */
export function buildShelterNetwork(states: ZoneProgress[], preview = false) {
  const paths: Road[] = [];
  const ports: {
    zoneId: ZoneId;
    direction: Entrance;
    gate: Point;
    outside: Point;
  }[] = [];
  const connections: {
    from: ZoneId;
    to: ZoneId;
    locked: boolean;
    length: number;
  }[] = [];
  for (const a of states) {
    for (const direction of a.entrances.filter(
      (d) => d === 'right' || d === 'bottom',
    )) {
      const horizontal = direction === 'right';
      const candidates = states.filter((b) =>
        horizontal ? b.y === a.y && b.x > a.x : b.x === a.x && b.y > a.y,
      );
      const b = candidates.sort((b, c) =>
        horizontal ? b.x - c.x : b.y - c.y,
      )[0];
      if (!b) continue;
      const opposite: Entrance = horizontal ? 'left' : 'top';
      if (!(b.entrances as readonly Entrance[]).includes(opposite)) continue;
      const halfA =
        zoneSize(a.id, Math.max(1, preview ? a.projectedLevel : a.level)) / 2;
      const halfB =
        zoneSize(b.id, Math.max(1, preview ? b.projectedLevel : b.level)) / 2;
      const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const gateA = {
        x: a.x + (horizontal ? halfA : 0),
        y: a.y + (horizontal ? 0 : halfA),
      };
      const gateB = {
        x: b.x - (horizontal ? halfB : 0),
        y: b.y - (horizontal ? 0 : halfB),
      };
      const locked = a.level === 0 || b.level === 0;
      connections.push({
        from: a.id,
        to: b.id,
        locked,
        length: Math.hypot(b.x - a.x, b.y - a.y),
      });
      ports.push(
        { zoneId: a.id, direction, gate: gateA, outside: middle },
        { zoneId: b.id, direction: opposite, gate: gateB, outside: middle },
      );
      paths.push(
        {
          id: `${a.id}-${b.id}:a`,
          points: [{ x: a.x, y: a.y }, middle],
          locked,
          zoneId: a.id,
          entrance: direction,
        },
        {
          id: `${a.id}-${b.id}:b`,
          points: [middle, { x: b.x, y: b.y }],
          locked,
          zoneId: b.id,
          entrance: opposite,
        },
      );
    }
  }
  const route = (from: ZoneId, to: ZoneId): Point[] => {
    const start = states.find((z) => z.id === from),
      end = states.find((z) => z.id === to);
    if (!start || !end || !start.level || !end.level) return [];
    const distance = new Map<ZoneId, number>([[from, 0]]);
    const previous = new Map<ZoneId, ZoneId>();
    const visited = new Set<ZoneId>();
    while (true) {
      const current = [...distance.keys()]
        .filter((id) => !visited.has(id))
        .sort((a, b) => distance.get(a)! - distance.get(b)!)[0];
      if (!current) return [];
      if (current === to) break;
      visited.add(current);
      for (const edge of connections.filter(
        (e) => !e.locked && (e.from === current || e.to === current),
      )) {
        const neighbor = edge.from === current ? edge.to : edge.from;
        const next = distance.get(current)! + edge.length;
        if (next < (distance.get(neighbor) ?? Infinity)) {
          distance.set(neighbor, next);
          previous.set(neighbor, current);
        }
      }
    }
    const result: Point[] = [];
    let current = to;
    while (true) {
      const zone = states.find((z) => z.id === current)!;
      result.unshift({ x: zone.x, y: zone.y });
      if (current === from) break;
      current = previous.get(current)!;
    }
    return result;
  };
  return { paths, ports, connections, route };
}
export type ShelterNetwork = ReturnType<typeof buildShelterNetwork>;

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

export function zoneSize(_id: ZoneId, level: number) {
  return tileSize(level);
}
