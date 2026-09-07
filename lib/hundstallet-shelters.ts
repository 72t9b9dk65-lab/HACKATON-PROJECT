// Public shelter addresses, checked against Hundstallet on 7 September 2026.
// These locate the facilities, not individual animals.
export const realShelters = [
  {
    id: 'stockholm',
    name: 'Stockholm',
    address: 'Åkeshovs Gårdsväg 10, Bromma',
    coordinates: [17.92283, 59.34136] as [number, number],
    coordinateSource: 'https://www.openstreetmap.org/way/113244661',
  },
  {
    id: 'alingsas',
    name: 'Alingsås',
    address: 'Ridhusvägen 4, Alingsås',
    coordinates: [12.5836754, 57.9357986] as [number, number],
    coordinateSource:
      'https://www.eniro.se/kartor/sök/hundstallet+-+svenska+hundskyddsföreningen+alingsås?c=57.935798,12.583675&t=companies&z=17',
  },
  {
    id: 'orkelljunga',
    name: 'Örkelljunga',
    address: 'Västrarp 110B, Örkelljunga',
    coordinates: [13.1283555, 56.2335452] as [number, number],
    coordinateSource:
      'https://www.hitta.se/kartan?center=56.23354518612557:13.128355531719908&rn=Västrarp+110B+286+91+Örkelljunga&toID=hkrtxzlrz&zoom=17',
  },
];
export type RealShelter = (typeof realShelters)[number];
export const SHELTER_ADDRESS_SOURCE =
  'https://hundstallet.se/var-verksamhet/kontakt/';
