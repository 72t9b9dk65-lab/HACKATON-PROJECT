import { geoMercator, geoPath } from 'd3-geo';
import type { Feature, Geometry } from 'geojson';

export type SwedenBoundary = Feature<Geometry, { name: string }>;
export function prepareSwedenMap(
  boundary: SwedenBoundary,
  width: number,
  height: number,
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
  return { projection, outline };
}
