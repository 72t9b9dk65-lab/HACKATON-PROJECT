export type CareKind = 'food' | 'health' | 'comfort';
export type ProfileDog = {
  id: string;
  name: string;
  shelterId: string;
  location: string;
  coordinates: [number, number];
  age: string;
  breed: string;
  sprite: string;
  spriteDescription: string;
  description: string;
  food: string;
  source: string;
  photos: { src: string; caption: string }[];
};

// Public profile snapshot, checked 7 September 2026. Positions are city-level,
// not live animal locations. Photo order does not imply dated care events.
export const profileDogs: ProfileDog[] = [
  {
    id: 'ake',
    name: 'Åke',
    shelterId: 'alingsas',
    location: 'Alingsås',
    coordinates: [12.53, 57.93],
    age: '3 years',
    breed: 'French bulldog',
    sprite: '/dogs/pixel-breeds/french-bulldog.png',
    spriteDescription: 'French bulldog pixel avatar',
    description:
      'A playful little character who loves company. His profile notes that he currently eats allergy food.',
    food: 'Allergy food',
    source: 'https://hundstallet.se/hundar/ake/',
    photos: [
      { src: '/dogs/hundstallet/ake-1.jpg', caption: 'Meet Åke' },
      { src: '/dogs/hundstallet/ake-2.jpg', caption: 'A playful side' },
      { src: '/dogs/hundstallet/ake-3.jpg', caption: 'Out for a walk' },
      {
        src: '/dogs/hundstallet/ake-4.jpg',
        caption: 'More from Åke’s profile',
      },
    ],
  },
  {
    id: 'koby',
    name: 'Koby',
    shelterId: 'stockholm',
    location: 'Stockholm',
    coordinates: [18.06, 59.33],
    age: '5 years',
    breed: 'Chihuahua mix',
    sprite: '/dogs/pixel-breeds/long-haired-chihuahua.png',
    spriteDescription: 'Long-haired Chihuahua pixel avatar for a Chihuahua mix',
    description:
      'A gentle, affectionate dog finding his confidence, one small step at a time.',
    food: 'Daily meals',
    source: 'https://hundstallet.se/hundar/koby/',
    photos: [
      { src: '/dogs/hundstallet/koby-1.jpg', caption: 'Meet Koby' },
      { src: '/dogs/hundstallet/koby-2.jpg', caption: 'A closer look at Koby' },
      {
        src: '/dogs/hundstallet/koby-3.jpg',
        caption: 'More from Koby’s profile',
      },
    ],
  },
  {
    id: 'ove',
    name: 'Ove',
    shelterId: 'orkelljunga',
    location: 'Örkelljunga',
    coordinates: [13.28, 56.28],
    age: '2 years',
    breed: 'Mixed breed',
    sprite: '/dogs/pixel-breeds/tibetan-spaniel.png',
    spriteDescription:
      'Spaniel-style pixel avatar for Ove, whose profile lists mixed breed',
    description:
      'A quiet, loving companion who needs patience, reassurance, and time to feel at home.',
    food: 'Daily meals',
    source: 'https://hundstallet.se/hundar/ove/',
    photos: [
      { src: '/dogs/hundstallet/ove-1.jpg', caption: 'Meet Ove' },
      { src: '/dogs/hundstallet/ove-2.jpg', caption: 'A closer look at Ove' },
      {
        src: '/dogs/hundstallet/ove-3.jpg',
        caption: 'More from Ove’s profile',
      },
    ],
  },
];

export const careKinds: {
  id: CareKind;
  label: string;
  color: string;
  share: number;
}[] = [
  { id: 'food', label: 'Food', color: '#dfb66f', share: 50 },
  { id: 'health', label: 'Vet care', color: '#a5bfee', share: 30 },
  { id: 'comfort', label: 'Daily care', color: '#c3a6df', share: 20 },
];
export const DEMO_GIFT_ORE = 25_000;
export const SHARED_CARE_ID = 'shared-care';
export const SHELL_STORAGE_KEY = 'hundstallet.donation-shell.v1';
export type DemoGift = {
  id: string;
  dogId: string;
  amountOre: number;
  createdAt: string;
};
export const exampleGifts: DemoGift[] = [
  {
    id: 'example',
    dogId: SHARED_CARE_ID,
    amountOre: 50_000,
    createdAt: '2026-09-07T08:00:00Z',
  },
];

export function careAllocation(amountOre: number) {
  if (
    !Number.isSafeInteger(amountOre) ||
    amountOre < 0 ||
    amountOre > 100_000_000
  )
    throw new Error('Invalid demo amount.');
  const food = Math.floor(amountOre * 0.5);
  const health = Math.floor(amountOre * 0.3);
  return { food, health, comfort: amountOre - food - health };
}

export function giftsForDog(gifts: DemoGift[], dogId: string) {
  return fundingSummary(gifts).byDog[dogId]?.amountOre ?? 0;
}

// Divide each care category in integer öre, so both the map and overall bars
// reconcile. Shared allocation is a demo model, not a claim about shelter costs.
export function fundingSummary(gifts: DemoGift[]) {
  const byDog: Record<
    string,
    { amountOre: number; allocation: ReturnType<typeof careAllocation> }
  > = Object.fromEntries(
    profileDogs.map((dog) => [
      dog.id,
      { amountOre: 0, allocation: careAllocation(0) },
    ]),
  );
  const allocation = careAllocation(0);
  let amountOre = 0;
  for (const gift of gifts) {
    const recipients =
      gift.dogId === SHARED_CARE_ID
        ? profileDogs.map((dog) => dog.id)
        : [gift.dogId];
    if (!recipients.every((id) => byDog[id]))
      throw new Error('Unknown demo recipient.');
    const care = careAllocation(gift.amountOre);
    amountOre += gift.amountOre;
    for (const kind of careKinds) {
      allocation[kind.id] += care[kind.id];
      const each = Math.floor(care[kind.id] / recipients.length);
      const remainder = care[kind.id] % recipients.length;
      recipients.forEach((id, index) => {
        const share = each + (index < remainder ? 1 : 0);
        byDog[id].allocation[kind.id] += share;
        byDog[id].amountOre += share;
      });
    }
  }
  return { amountOre, allocation, byDog };
}

export function readDemoGifts(raw: string | null): DemoGift[] {
  if (!raw) return [...exampleGifts];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length > 1000)
      return [...exampleGifts];
    const seen = new Set<string>();
    const valid = parsed.every((gift: unknown) => {
      if (!gift || typeof gift !== 'object') return false;
      const g = gift as DemoGift;
      if (
        typeof g.id !== 'string' ||
        !g.id ||
        seen.has(g.id) ||
        (g.dogId !== SHARED_CARE_ID &&
          !profileDogs.some((dog) => dog.id === g.dogId)) ||
        !Number.isSafeInteger(g.amountOre) ||
        g.amountOre <= 0 ||
        g.amountOre > 50_000 ||
        typeof g.createdAt !== 'string' ||
        !Number.isFinite(Date.parse(g.createdAt))
      )
        return false;
      seen.add(g.id);
      return true;
    });
    // Only move the built-in example into shared care. User-created legacy
    // gifts keep their original recipient, amount, and timestamp.
    return valid
      ? (parsed as DemoGift[]).map((gift) =>
          gift.id === 'example' ? { ...gift, dogId: SHARED_CARE_ID } : gift,
        )
      : [...exampleGifts];
  } catch {
    return [...exampleGifts];
  }
}

export function kronor(ore: number) {
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(
    ore / 100,
  );
}
