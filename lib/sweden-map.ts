import { geoMercator, geoPath, geoCentroid } from 'd3-geo';
import type { Feature, Geometry } from 'geojson';

export type SwedenBoundary = Feature<Geometry, { name: string }>;
export type MapDetail = Feature<
  Geometry,
  {
    name: string;
    coordinates?: [number, number];
    rank?: number;
    population?: number;
  }
>;
export type SwedenDetails = {
  counties: MapDetail[];
  lakes: MapDetail[];
  rivers: MapDetail[];
  places: MapDetail[];
};
export const MAX_SWEDEN_ZOOM = 6;
export function prepareSwedenMap(
  boundary: SwedenBoundary,
  width: number,
  height: number,
  details?: SwedenDetails,
) {
  if (String(boundary.id) !== '752')
    throw Error('Expected the Sweden boundary.');
  const projection = geoMercator().fitExtent(
    [
      [width > 700 ? width * 0.31 : width * 0.2, 118],
      [width * 0.85, height - 160],
    ],
    boundary,
  );
  const outline = geoPath(projection)(boundary);
  if (!outline || outline.includes('NaN'))
    throw Error('Unable to prepare the Sweden map.');
  const path = geoPath(projection);
  const layer = (features: MapDetail[] = []) =>
    features.map((f) => ({
      id: String(f.id),
      name: f.properties.name,
      path: path(f) ?? '',
      coordinates: f.properties.coordinates ?? geoCentroid(f),
    }));
  return {
    projection,
    outline,
    counties: layer(details?.counties),
    lakes: layer(details?.lakes),
    rivers: layer(details?.rivers),
  };
}
