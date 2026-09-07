import type { CarePlanId } from './care-impact.ts';

export const shelterActivities = [
  {
    id: 'walk',
    label: 'Park walks',
    action: 'Walking',
    asset: '/care/pixel/park-walk.png',
  },
  {
    id: 'food',
    label: 'Meals',
    action: 'Eating',
    asset: '/care/pixel/food-enrichment.png',
  },
  {
    id: 'rehabilitation',
    label: 'Recovery',
    action: 'Recovering',
    asset: '/care/pixel/care-rehabilitation.png',
  },
  {
    id: 'vaccination',
    label: 'Veterinarian',
    action: 'At the vet',
    asset: '/care/pixel/examination-vaccination.png',
  },
  {
    id: 'play',
    label: 'Playtime',
    action: 'Playing',
    asset: '/care/pixel/play-enrichment.png',
  },
] as const;
export type ShelterActivity =
  | (typeof shelterActivities)[number]['id']
  | 'home'
  | 'sleep';
export const SHELTER_HOUR_MS = 1800;

export function isShelterNight(hour: number) {
  return hour >= 20 || hour < 6;
}

// A small repeatable animation schedule, independent of donation accounting.
// Only dogs with care on the selected forecast day visit medical stations.
export function dogActivity(
  index: number,
  hour: number,
  careId: CarePlanId,
  careScheduled: boolean,
): ShelterActivity {
  if (isShelterNight(hour)) return 'sleep';
  if (hour < 8 || hour === 19) return 'home';
  if (careScheduled && hour === 10 + (index % 3)) return careId;
  if ([8 + (index % 2), 13 + (index % 2), 17 + (index % 2)].includes(hour))
    return 'food';
  return (['walk', 'play', 'home'] as const)[(hour + index) % 3];
}

export function activityLabel(activity: ShelterActivity) {
  if (activity === 'sleep') return 'Sleeping';
  if (activity === 'home') return 'Resting';
  return shelterActivities.find((item) => item.id === activity)!.action;
}

export function shelterActivityLayout(
  viewportWidth: number,
  population: number,
  activities?: ShelterActivity[],
) {
  // Five legible destinations stay on one row; compact screens can pan the scene.
  const width = Math.max(760, viewportWidth);
  const homeWidth = Math.min(510, width - 80);
  const columns = Math.floor(homeWidth / 76);
  const rows = Math.ceil(population / columns);
  const activityTop = Math.max(445, 275 + rows * 108) + 36;
  const busiest = Math.max(
    0,
    ...shelterActivities.map((station) =>
      activities
        ? activities.filter((activity) => activity === station.id).length
        : population,
    ),
  );
  const height =
    activityTop + Math.max(222, 96 + Math.ceil(busiest / 2) * 108 + 16);
  const stationWidth = (width - 32) / shelterActivities.length;
  const stations = shelterActivities.map((station, index) => ({
    ...station,
    x: 16 + index * stationWidth,
    y: activityTop,
    width: stationWidth,
  }));
  const homes = Array.from({ length: population }, (_, index) => {
    const rowCount = Math.min(
      columns,
      population - Math.floor(index / columns) * columns,
    );
    const cell = homeWidth / columns;
    return {
      x:
        width / 2 -
        (rowCount * cell) / 2 +
        ((index % columns) + 0.5) * cell -
        32,
      y: 275 + Math.floor(index / columns) * 108,
    };
  });
  function position(index: number, activity: ShelterActivity) {
    if (activity === 'home' || activity === 'sleep') return homes[index];
    const station = stations.find((item) => item.id === activity)!;
    const rank = activities
      ? activities.slice(0, index).filter((value) => value === activity).length
      : index;
    const lane = rank % 2 === 0 ? -1 : 1;
    return {
      x: Math.max(
        8,
        Math.min(width - 72, station.x + station.width / 2 - 32 + lane * 34),
      ),
      y: station.y + 96 + Math.floor(rank / 2) * 108,
    };
  }
  return { width, height, activityTop, stations, homes, position };
}
