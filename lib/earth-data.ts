export type CategoryId = 'water' | 'food' | 'health' | 'shelter' | 'education';
export type MapMode = 'needs' | 'impact';
export type MapLevel = 'continents' | 'countries' | 'cities';
export type Territory = {
  id: string;
  name: string;
  continent: string;
  coordinates: [number, number];
  score: number;
  raised: number;
  goal: number;
  people: number;
  countryId?: string;
  countryName?: string;
};
export type Donation = {
  id: string;
  territoryId: string;
  territoryName: string;
  countryId: string;
  category: CategoryId;
  amount: number;
  createdAt: string;
  stage: number;
};
export type Profile = { username: string; avatar: number; createdAt: string };
export const categories: {
  id: CategoryId;
  label: string;
  short: string;
  description: string;
  project: string;
  unit: string;
  unitCost: number;
  organization: string;
  url: string;
  color: string;
}[] = [
  {
    id: 'water',
    label: 'Clean water',
    short: 'Water',
    description:
      'Restoring water distribution points, household filters, and kits to make water safer for families.',
    project: 'Safe water, every day',
    unit: 'water filtration kits',
    unitCost: 15,
    organization: 'WaterAid',
    url: 'https://www.wateraid.org/uk/donate?v=1',
    color: '#83c5df',
  },
  {
    id: 'food',
    label: 'Food and nutrition',
    short: 'Food',
    description:
      'Food parcels and nutritional support for families struggling to access regular meals.',
    project: 'A meal, an opportunity',
    unit: 'food parcels',
    unitCost: 10,
    organization: 'World Food Programme',
    url: 'https://www.wfp.org/support-us',
    color: '#d7b774',
  },
  {
    id: 'health',
    label: 'Health and care',
    short: 'Health',
    description:
      'First aid kits, essential medicines, and access to basic care in underserved communities.',
    project: 'Taking care further',
    unit: 'first aid kits',
    unitCost: 20,
    organization: 'Doctors Without Borders',
    url: 'https://www.msf.org/donate',
    color: '#d79aa4',
  },
  {
    id: 'shelter',
    label: 'Shelter and protection',
    short: 'Shelter',
    description:
      'Essential supplies, blankets, and housing support for people who have lost a safe place to live.',
    project: 'A place to call home',
    unit: 'blanket kits',
    unitCost: 25,
    organization: 'UNHCR',
    url: 'https://www.unhcr.org/get-involved/ways-give',
    color: '#b5abdd',
  },
  {
    id: 'education',
    label: 'Education',
    short: 'Education',
    description:
      'School supplies and learning spaces to help children and young people continue their education.',
    project: 'The future starts at school',
    unit: 'school kits',
    unitCost: 12,
    organization: 'UNICEF',
    url: 'https://www.unicef.org/take-action',
    color: '#b4cf93',
  },
];
// All social, financial, and impact values are synthetic prototype data.
const rows: [
  string,
  string,
  string,
  number,
  number,
  number,
  number,
  number,
  number,
][] = [
  ['729', 'Sudan', 'Africa', 30, 15, 96, 48650, 125000, 12400],
  ['180', 'DR Congo', 'Africa', 23, -3, 88, 72480, 160000, 18600],
  ['706', 'Somalia', 'Africa', 46, 6, 92, 28740, 95000, 8200],
  ['231', 'Ethiopia', 'Africa', 39, 8, 81, 56800, 110000, 11200],
  ['148', 'Chad', 'Africa', 19, 15, 87, 19150, 80000, 5600],
  ['562', 'Niger', 'Africa', 9, 17, 79, 31800, 75000, 6800],
  ['566', 'Nigeria', 'Africa', 8, 9, 73, 69500, 130000, 16400],
  ['404', 'Kenya', 'Africa', 37, 0, 61, 94500, 150000, 14300],
  ['686', 'Senegal', 'Africa', -14, 14, 52, 52650, 85000, 7600],
  ['450', 'Madagascar', 'Africa', 47, -20, 76, 39700, 90000, 8900],
  ['710', 'South Africa', 'Africa', 25, -29, 46, 87750, 120000, 10200],
  ['818', 'Egypt', 'Africa', 30, 26, 51, 58700, 100000, 7900],
  ['504', 'Morocco', 'Africa', -7, 31, 43, 45500, 60000, 5400],
  ['004', 'Afghanistan', 'Asia', 66, 34, 91, 65400, 160000, 16200],
  ['887', 'Yemen', 'Asia', 47, 16, 94, 36900, 130000, 14200],
  ['760', 'Syria', 'Asia', 38, 35, 85, 87450, 170000, 16300],
  ['586', 'Pakistan', 'Asia', 69, 30, 71, 78400, 135000, 12600],
  ['356', 'India', 'Asia', 78, 22, 59, 254700, 400000, 36100],
  ['050', 'Bangladesh', 'Asia', 90, 24, 68, 85200, 145000, 16800],
  ['524', 'Nepal', 'Asia', 84, 28, 64, 56300, 95000, 9200],
  ['360', 'Indonesia', 'Asia', 116, -2, 48, 165700, 230000, 20800],
  ['392', 'Japan', 'Asia', 138, 37, 18, 98400, 105000, 7300],
  ['156', 'China', 'Asia', 104, 35, 36, 194300, 260000, 18200],
  ['804', 'Ukraine', 'Europe', 32, 49, 83, 248900, 400000, 27800],
  ['380', 'Italy', 'Europe', 12.5, 42.5, 34, 128600, 160000, 8600],
  ['250', 'France', 'Europe', 2, 46, 25, 98450, 120000, 5200],
  ['276', 'Germany', 'Europe', 10, 51, 21, 117300, 130000, 4300],
  ['724', 'Spain', 'Europe', -4, 40, 32, 79300, 105000, 5100],
  ['826', 'United Kingdom', 'Europe', -2, 54, 26, 131500, 150000, 6100],
  ['752', 'Sweden', 'Europe', 15, 62, 16, 53200, 55000, 2100],
  ['578', 'Norway', 'Europe', 9, 62, 12, 47300, 48000, 1800],
  ['616', 'Poland', 'Europe', 19, 52, 38, 76400, 100000, 7300],
  ['792', 'Turkey', 'Asia', 35, 39, 56, 186300, 260000, 18300],
  ['076', 'Brazil', 'South America', -51, -12, 58, 245900, 380000, 26700],
  ['170', 'Colombia', 'South America', -73, 4, 62, 134900, 210000, 14300],
  ['604', 'Peru', 'South America', -75, -10, 56, 88500, 130000, 11300],
  ['032', 'Argentina', 'South America', -64, -35, 42, 97600, 125000, 9700],
  ['152', 'Chile', 'South America', -71, -33, 31, 70500, 85000, 4800],
  ['332', 'Haiti', 'North America', -72.3, 19, 89, 42400, 110000, 13100],
  ['484', 'Mexico', 'North America', -102, 24, 47, 153200, 200000, 16200],
  ['840', 'United States', 'North America', -98, 38, 33, 267300, 340000, 21600],
  ['124', 'Canada', 'North America', -106, 57, 19, 93500, 100000, 6400],
  ['036', 'Australia', 'Oceania', 134, -26, 24, 115000, 130000, 7200],
  ['554', 'New Zealand', 'Oceania', 173, -41, 17, 41300, 45000, 2900],
];
export const territories: Territory[] = rows.map(
  ([id, name, continent, lng, lat, score, raised, goal, people]) => ({
    id,
    name,
    continent,
    coordinates: [lng, lat],
    score,
    raised,
    goal,
    people,
  }),
);
const cityRows: [
  string,
  string,
  string,
  number,
  number,
  number,
  number,
  number,
  number,
][] = [
  ['khartoum', 'Khartoum', '729', 32.56, 15.5, 97, 15400, 45000, 3400],
  ['port-sudan', 'Port Sudan', '729', 37.21, 19.61, 91, 9650, 28000, 2300],
  ['nyala', 'Nyala', '729', 24.88, 12.05, 95, 7600, 32000, 2900],
  ['nairobi', 'Nairobi', '404', 36.82, -1.29, 64, 34500, 55000, 3100],
  ['kinshasa', 'Kinshasa', '180', 15.27, -4.44, 86, 24800, 60000, 4800],
  ['mogadishu', 'Mogadishu', '706', 45.32, 2.04, 94, 15700, 45000, 5100],
  ['dakar', 'Dakar', '686', -17.45, 14.69, 54, 21300, 40000, 1700],
  ['kabul', 'Kabul', '004', 69.2, 34.53, 92, 19400, 60000, 4800],
  ['kyiv', 'Kyiv', '804', 30.52, 50.45, 78, 48900, 90000, 3200],
  ['roma', 'Rome', '380', 12.5, 41.9, 38, 28600, 40000, 1800],
  ['milano', 'Milan', '380', 9.19, 45.46, 31, 32600, 42000, 1700],
  ['rio', 'Rio de Janeiro', '076', -43.17, -22.91, 65, 45900, 80000, 5700],
];
export const cities: Territory[] = cityRows.map(
  ([id, name, countryId, lng, lat, score, raised, goal, people]) => ({
    id,
    name,
    countryId,
    countryName: territories.find((t) => t.id === countryId)!.name,
    continent: territories.find((t) => t.id === countryId)!.continent,
    coordinates: [lng, lat],
    score,
    raised,
    goal,
    people,
  }),
);
export const continents: Territory[] = [
  { id: 'Africa', coordinates: [20, 4] },
  { id: 'Europe', coordinates: [17, 48] },
  { id: 'Asia', coordinates: [90, 30] },
  { id: 'North America', coordinates: [-100, 35] },
  { id: 'South America', coordinates: [-60, -15] },
  { id: 'Oceania', coordinates: [135, -25] },
].map((c) => {
  const group = territories.filter((t) => t.continent === c.id);
  return {
    ...c,
    name: c.id,
    coordinates: c.coordinates as [number, number],
    continent: c.id,
    score: Math.round(group.reduce((a, t) => a + t.score, 0) / group.length),
    raised: group.reduce((a, t) => a + t.raised, 0),
    goal: group.reduce((a, t) => a + t.goal, 0),
    people: group.reduce((a, t) => a + t.people, 0),
  };
});
export const demoDonors = [
  { username: 'free_root', avatar: 1, total: 24850, territories: 18 },
  { username: 'little_blue_dot', avatar: 3, total: 18240, territories: 12 },
  { username: 'kind_wave', avatar: 2, total: 15600, territories: 16 },
  { username: 'seed_of_light', avatar: 0, total: 12350, territories: 9 },
  { username: 'horizon_07', avatar: 4, total: 9800, territories: 11 },
  { username: 'light_step', avatar: 2, total: 7650, territories: 7 },
];
export function needColor(score: number) {
  return score >= 85
    ? '#a44b4c'
    : score >= 70
      ? '#d78e72'
      : score >= 50
        ? '#d9ca95'
        : score >= 30
          ? '#a9c4a2'
          : '#91bfcd';
}
export function needLabel(score: number) {
  return score >= 85
    ? 'Critical'
    : score >= 70
      ? 'High'
      : score >= 50
        ? 'Elevated'
        : score >= 30
          ? 'Moderate'
          : 'Low';
}
export function categoryScore(score: number, id: CategoryId) {
  return Math.min(
    99,
    Math.max(
      8,
      score +
        { water: 2, food: 0, health: -5, shelter: -9, education: -15 }[id],
    ),
  );
}
export function impactColor(ratio: number) {
  return ratio < 0.25
    ? '#dce7bf'
    : ratio < 0.45
      ? '#b7d49d'
      : ratio < 0.65
        ? '#80bba6'
        : ratio < 0.85
          ? '#529baf'
          : '#367aaa';
}
export const money = (n: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: n % 1 ? 2 : 0,
  }).format(n);
export const number = (n: number) => new Intl.NumberFormat('en-GB').format(n);
export const allTerritories = [...territories, ...cities, ...continents];
