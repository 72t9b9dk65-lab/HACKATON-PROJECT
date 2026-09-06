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
    label: 'Acqua potabile',
    short: 'Acqua',
    description:
      'Ripristino dei punti di distribuzione, filtri domestici e kit per rendere l’acqua più sicura per le famiglie.',
    project: 'Acqua sicura, ogni giorno',
    unit: 'kit di filtrazione',
    unitCost: 15,
    organization: 'WaterAid',
    url: 'https://www.wateraid.org/uk/donate?v=1',
    color: '#83c5df',
  },
  {
    id: 'food',
    label: 'Cibo e nutrizione',
    short: 'Cibo',
    description:
      'Pacchi alimentari e sostegno nutrizionale per le famiglie che faticano ad accedere a pasti regolari.',
    project: 'Un pasto, una possibilità',
    unit: 'pacchi alimentari',
    unitCost: 10,
    organization: 'World Food Programme',
    url: 'https://www.wfp.org/support-us',
    color: '#d7b774',
  },
  {
    id: 'health',
    label: 'Salute e cure',
    short: 'Salute',
    description:
      'Kit di primo soccorso, farmaci essenziali e accesso alle cure di base nelle comunità meno servite.',
    project: 'Le cure arrivano più lontano',
    unit: 'kit di primo soccorso',
    unitCost: 20,
    organization: 'Medici Senza Frontiere',
    url: 'https://www.msf.org/donate',
    color: '#d79aa4',
  },
  {
    id: 'shelter',
    label: 'Riparo e protezione',
    short: 'Riparo',
    description:
      'Beni di prima necessità, coperte e sostegno abitativo per chi ha perso un luogo sicuro in cui vivere.',
    project: 'Un luogo da chiamare casa',
    unit: 'kit con coperte',
    unitCost: 25,
    organization: 'UNHCR',
    url: 'https://www.unhcr.org/get-involved/ways-give',
    color: '#b5abdd',
  },
  {
    id: 'education',
    label: 'Istruzione',
    short: 'Istruzione',
    description:
      'Materiale scolastico e spazi di apprendimento per aiutare bambini e ragazzi a proseguire gli studi.',
    project: 'Il futuro comincia a scuola',
    unit: 'kit scolastici',
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
  ['180', 'RD del Congo', 'Africa', 23, -3, 88, 72480, 160000, 18600],
  ['706', 'Somalia', 'Africa', 46, 6, 92, 28740, 95000, 8200],
  ['231', 'Etiopia', 'Africa', 39, 8, 81, 56800, 110000, 11200],
  ['148', 'Ciad', 'Africa', 19, 15, 87, 19150, 80000, 5600],
  ['562', 'Niger', 'Africa', 9, 17, 79, 31800, 75000, 6800],
  ['566', 'Nigeria', 'Africa', 8, 9, 73, 69500, 130000, 16400],
  ['404', 'Kenya', 'Africa', 37, 0, 61, 94500, 150000, 14300],
  ['686', 'Senegal', 'Africa', -14, 14, 52, 52650, 85000, 7600],
  ['450', 'Madagascar', 'Africa', 47, -20, 76, 39700, 90000, 8900],
  ['710', 'Sudafrica', 'Africa', 25, -29, 46, 87750, 120000, 10200],
  ['818', 'Egitto', 'Africa', 30, 26, 51, 58700, 100000, 7900],
  ['504', 'Marocco', 'Africa', -7, 31, 43, 45500, 60000, 5400],
  ['004', 'Afghanistan', 'Asia', 66, 34, 91, 65400, 160000, 16200],
  ['887', 'Yemen', 'Asia', 47, 16, 94, 36900, 130000, 14200],
  ['760', 'Siria', 'Asia', 38, 35, 85, 87450, 170000, 16300],
  ['586', 'Pakistan', 'Asia', 69, 30, 71, 78400, 135000, 12600],
  ['356', 'India', 'Asia', 78, 22, 59, 254700, 400000, 36100],
  ['050', 'Bangladesh', 'Asia', 90, 24, 68, 85200, 145000, 16800],
  ['524', 'Nepal', 'Asia', 84, 28, 64, 56300, 95000, 9200],
  ['360', 'Indonesia', 'Asia', 116, -2, 48, 165700, 230000, 20800],
  ['392', 'Giappone', 'Asia', 138, 37, 18, 98400, 105000, 7300],
  ['156', 'Cina', 'Asia', 104, 35, 36, 194300, 260000, 18200],
  ['804', 'Ucraina', 'Europa', 32, 49, 83, 248900, 400000, 27800],
  ['380', 'Italia', 'Europa', 12.5, 42.5, 34, 128600, 160000, 8600],
  ['250', 'Francia', 'Europa', 2, 46, 25, 98450, 120000, 5200],
  ['276', 'Germania', 'Europa', 10, 51, 21, 117300, 130000, 4300],
  ['724', 'Spagna', 'Europa', -4, 40, 32, 79300, 105000, 5100],
  ['826', 'Regno Unito', 'Europa', -2, 54, 26, 131500, 150000, 6100],
  ['752', 'Svezia', 'Europa', 15, 62, 16, 53200, 55000, 2100],
  ['578', 'Norvegia', 'Europa', 9, 62, 12, 47300, 48000, 1800],
  ['616', 'Polonia', 'Europa', 19, 52, 38, 76400, 100000, 7300],
  ['792', 'Turchia', 'Asia', 35, 39, 56, 186300, 260000, 18300],
  ['076', 'Brasile', 'Sud America', -51, -12, 58, 245900, 380000, 26700],
  ['170', 'Colombia', 'Sud America', -73, 4, 62, 134900, 210000, 14300],
  ['604', 'Perù', 'Sud America', -75, -10, 56, 88500, 130000, 11300],
  ['032', 'Argentina', 'Sud America', -64, -35, 42, 97600, 125000, 9700],
  ['152', 'Cile', 'Sud America', -71, -33, 31, 70500, 85000, 4800],
  ['332', 'Haiti', 'Nord America', -72.3, 19, 89, 42400, 110000, 13100],
  ['484', 'Messico', 'Nord America', -102, 24, 47, 153200, 200000, 16200],
  ['840', 'Stati Uniti', 'Nord America', -98, 38, 33, 267300, 340000, 21600],
  ['124', 'Canada', 'Nord America', -106, 57, 19, 93500, 100000, 6400],
  ['036', 'Australia', 'Oceania', 134, -26, 24, 115000, 130000, 7200],
  ['554', 'Nuova Zelanda', 'Oceania', 173, -41, 17, 41300, 45000, 2900],
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
  ['mogadishu', 'Mogadiscio', '706', 45.32, 2.04, 94, 15700, 45000, 5100],
  ['dakar', 'Dakar', '686', -17.45, 14.69, 54, 21300, 40000, 1700],
  ['kabul', 'Kabul', '004', 69.2, 34.53, 92, 19400, 60000, 4800],
  ['kyiv', 'Kyiv', '804', 30.52, 50.45, 78, 48900, 90000, 3200],
  ['roma', 'Roma', '380', 12.5, 41.9, 38, 28600, 40000, 1800],
  ['milano', 'Milano', '380', 9.19, 45.46, 31, 32600, 42000, 1700],
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
  { id: 'Europa', coordinates: [17, 48] },
  { id: 'Asia', coordinates: [90, 30] },
  { id: 'Nord America', coordinates: [-100, 35] },
  { id: 'Sud America', coordinates: [-60, -15] },
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
  { username: 'radice_libera', avatar: 1, total: 24850, territories: 18 },
  { username: 'little_blue_dot', avatar: 3, total: 18240, territories: 12 },
  { username: 'onda_gentile', avatar: 2, total: 15600, territories: 16 },
  { username: 'seme_di_luce', avatar: 0, total: 12350, territories: 9 },
  { username: 'orizzonte_07', avatar: 4, total: 9800, territories: 11 },
  { username: 'passo_leggero', avatar: 2, total: 7650, territories: 7 },
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
    ? 'Critica'
    : score >= 70
      ? 'Alta'
      : score >= 50
        ? 'Elevata'
        : score >= 30
          ? 'Moderata'
          : 'Contenuta';
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
  new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: n % 1 ? 2 : 0,
  }).format(n);
export const number = (n: number) => new Intl.NumberFormat('it-IT').format(n);
export const allTerritories = [...territories, ...cities, ...continents];
