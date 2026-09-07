import type { Territory } from './earth-data';

export const officialDonationUrl = 'https://hundstallet.se/stod-oss/';
export const fundingSourceUrl =
  'https://hundstallet.kb.kundo.se/guide/vad-anvands-mina-pengar-till?category=gavor-och-donationer';
export const careCategories = [
  { id: 'vet', name: 'Veterinary care', share: 40, color: '#bc6471' },
  { id: 'daily', name: 'Food & daily care', share: 30, color: '#d2ae66' },
  {
    id: 'rehab',
    name: 'Training & rehabilitation',
    share: 20,
    color: '#7caf98',
  },
  { id: 'home', name: 'Rehoming support', share: 10, color: '#889fc6' },
] as const;
export const shelters: Territory[] = [
  {
    id: 'stockholm',
    name: 'Stockholm',
    continent: 'Europe',
    countryId: '752',
    countryName: 'Sweden',
    coordinates: [18.13, 59.33],
    score: 78,
    raised: 18400,
    goal: 30000,
    people: 1,
  },
  {
    id: 'alingsas',
    name: 'Alingsås',
    continent: 'Europe',
    countryId: '752',
    countryName: 'Sweden',
    coordinates: [12.53, 57.93],
    score: 62,
    raised: 12700,
    goal: 20000,
    people: 1,
  },
  {
    id: 'orkelljunga',
    name: 'Örkelljunga',
    continent: 'Europe',
    countryId: '752',
    countryName: 'Sweden',
    coordinates: [13.28, 56.28],
    score: 55,
    raised: 8900,
    goal: 15000,
    people: 1,
  },
];
export const sweden: Territory = {
  id: '752',
  name: 'Sweden',
  continent: 'Europe',
  coordinates: [15, 59],
  score: 68,
  raised: shelters.reduce((s, t) => s + t.raised, 0),
  goal: shelters.reduce((s, t) => s + t.goal, 0),
  people: 3,
};
export type DogStory = {
  id: string;
  name: string;
  shelterId: string;
  age: string;
  personality: string;
  description: string;
  next: string;
  stage: number;
  image?: string;
  updates: { title: string; text: string; day: string }[];
};
export const journeyStages = [
  'Safe arrival',
  'Care & trust',
  'Finding a home',
  'Home at last',
];
// Fictional dogs and sample progress. These are not Hundstallet case records or adoption listings.
export const dogs: DogStory[] = [
  {
    id: 'luna',
    name: 'Luna',
    shelterId: 'stockholm',
    age: '3 years',
    personality: 'Gentle soul · Treat enthusiast',
    description:
      'Luna is learning that the world can be a kind place. Quiet walks, a steady routine, and patient company are helping her confidence grow.',
    next: 'More calm walks. A little more confidence.',
    stage: 1,
    image: '/dogs/luna.png',
    updates: [
      {
        title: 'A safe place to land',
        text: 'Luna settled into a quiet space, with a warm bed and a predictable daily routine.',
        day: 'Day 1',
      },
      {
        title: 'A small walk. A big step.',
        text: 'Today, Luna chose to explore the garden beside her carer. Every small moment of trust matters.',
        day: 'Day 8',
      },
      {
        title: 'Getting ready for a new beginning',
        text: 'In this next chapter of the demo, her care team prepares a home-matching plan around her needs.',
        day: 'Day 24',
      },
      {
        title: 'A place to call her own',
        text: 'The final example update celebrates a thoughtful match and continued support after rehoming.',
        day: 'Day 40',
      },
    ],
  },
  {
    id: 'milo',
    name: 'Milo',
    shelterId: 'alingsas',
    age: '5 years',
    personality: 'Curious nose · Slow-walk specialist',
    description:
      'Milo takes life one sniff at a time. Consistent care and gentle enrichment give him room to relax and discover the people around him.',
    next: 'A tailored routine for a curious mind.',
    stage: 1,
    updates: [
      {
        title: 'Time to settle in',
        text: 'A quiet welcome gives Milo space to get used to his new routine.',
        day: 'Day 1',
      },
      {
        title: 'The joy of a sniffing game',
        text: 'Milo explored a simple enrichment trail with his carer in this example update.',
        day: 'Day 10',
      },
      {
        title: 'Meeting his match',
        text: 'The next demo chapter explores how a care team might prepare a suitable home.',
        day: 'Day 27',
      },
      {
        title: 'A new favourite doorstep',
        text: 'This fictional journey ends with a new home and follow-up support.',
        day: 'Day 45',
      },
    ],
  },
  {
    id: 'bella',
    name: 'Bella',
    shelterId: 'orkelljunga',
    age: '2 years',
    personality: 'Playful spirit · Learning every day',
    description:
      'Bella has plenty of energy and a lot to learn. Kind, consistent training helps her channel that curiosity and feel comfortable with new experiences.',
    next: 'Practising calm moments, together.',
    stage: 0,
    updates: [
      {
        title: 'A fresh start for Bella',
        text: 'Bella has a safe place to rest and a care plan built around her needs.',
        day: 'Day 1',
      },
      {
        title: 'Learning through play',
        text: 'In this demo update, short training games help Bella discover a calmer rhythm.',
        day: 'Day 7',
      },
      {
        title: 'Looking for the right fit',
        text: 'Her fictional care team prepares for introductions to a suitable home.',
        day: 'Day 21',
      },
      {
        title: 'Home, with room to grow',
        text: 'Bella’s example story closes with a thoughtful match and ongoing guidance.',
        day: 'Day 35',
      },
    ],
  },
];
export const sek = (value: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 2,
  }).format(value);
