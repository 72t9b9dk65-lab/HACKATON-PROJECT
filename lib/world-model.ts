import { feature, merge } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type {
  Topology,
  GeometryCollection,
  Polygon,
  MultiPolygon,
} from 'topojson-specification';
import { continents } from './earth-data.ts';

export type CountryMeta = Record<
  string,
  { name: string; continent: string; coords: [number, number] }
>;
export type GeoFeature = Feature<Geometry, { name: string }>;
export type WorldTopology = Topology<{
  countries: GeometryCollection<{ name: string }>;
}>;

/** Convert the downloaded atlas using the same path in the browser and regression tests. */
export function buildWorld(topology: WorldTopology, meta: CountryMeta) {
  const collection = feature(
    topology,
    topology.objects.countries,
  ) as FeatureCollection<Geometry, { name: string }>;
  const continentFeatures = continents.map((continent) => ({
    id: continent.id,
    // topojson-client expects an array, despite its published types also accepting a collection.
    geometry: merge(
      topology,
      topology.objects.countries.geometries.filter(
        (g): g is Polygon<{ name: string }> | MultiPolygon<{ name: string }> =>
          (g.type === 'Polygon' || g.type === 'MultiPolygon') &&
          meta[String(g.id).padStart(3, '0')]?.continent === continent.id,
      ),
    ),
  }));
  return { features: collection.features, continents: continentFeatures, meta };
}
