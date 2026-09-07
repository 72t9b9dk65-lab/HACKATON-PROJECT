// Download the five pinned source files listed in the manifest into the input directory first.
// Usage: node scripts/build-sweden-map.mjs /path/to/natural-earth-geojson
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { geoBounds, geoArea } from 'd3-geo';
const input = process.argv[2];
if (!input)
  throw Error(
    'Pass the directory containing the Natural Earth source JSON files.',
  );
const revision = 'ca96624a56bd078437bca8184e78163e5039ad19';
const sources = [];
function read(name) {
  const bytes = fs.readFileSync(path.join(input, `${name}.json`));
  sources.push({
    name,
    url: `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${revision}/geojson/ne_10m_${name}.geojson`,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
  return JSON.parse(bytes).features;
}
function feature(f, id, properties) {
  return { type: 'Feature', id, properties, geometry: f.geometry };
}
const country = read('admin_0_countries').find(
  (f) => f.properties.ADM0_A3 === 'SWE',
);
if (!country || geoArea(country) > Math.PI * 2)
  throw Error('Missing Sweden or incorrect polygon winding.');
const boundary = feature(country, '752', { name: 'Sweden' });
const counties = read('admin_1_states_provinces')
  .filter((f) => f.properties.adm0_a3 === 'SWE')
  .map((f) =>
    feature(f, f.properties.iso_3166_2, {
      name: f.properties.name_en || f.properties.name,
      coordinates: [f.properties.longitude, f.properties.latitude],
    }),
  );
const [[west, south], [east, north]] = geoBounds(boundary);
function intersects(f) {
  const [[w, s], [e, n]] = geoBounds(f);
  return w <= east && e >= west && s <= north && n >= south;
}
const lakes = read('lakes')
  .filter(intersects)
  .map((f, i) =>
    feature(f, `lake-${i}`, {
      name: f.properties.name_en || f.properties.name || '',
      rank: f.properties.scalerank,
    }),
  );
const rivers = read('rivers_lake_centerlines')
  .filter(intersects)
  .map((f, i) =>
    feature(f, `river-${i}`, {
      name: f.properties.name_en || f.properties.name || '',
      rank: f.properties.scalerank,
    }),
  );
const places = read('populated_places')
  .filter((f) => f.properties.ADM0_A3 === 'SWE')
  .map((f) =>
    feature(f, String(f.properties.NE_ID), {
      name: f.properties.NAME_EN || f.properties.NAME,
      rank: f.properties.SCALERANK,
      population: f.properties.POP_MAX,
    }),
  )
  .sort((a, b) => b.properties.population - a.properties.population);
const output = new URL('../public/data/', import.meta.url);
function write(name, data) {
  fs.writeFileSync(
    new URL(name, output),
    JSON.stringify(data, (_key, value) =>
      typeof value === 'number' ? Math.round(value * 1e5) / 1e5 : value,
    ) + '\n',
  );
}
write('sweden.json', boundary);
write('sweden-details.json', { counties, lakes, rivers, places });
write('sweden-sources.json', {
  dataset: 'Natural Earth',
  scale: '1:10 million',
  license: 'Public domain',
  licenseUrl: 'https://www.naturalearthdata.com/about/terms-of-use/',
  revision,
  sources,
  processing:
    'Country and counties filtered to SWE. Hydrology selected by Sweden bounding box and clipped to the country outline when rendered. Coordinates rounded to five decimal places. Population is used only for label priority, not shown as current data.',
  counts: {
    counties: counties.length,
    lakes: lakes.length,
    rivers: rivers.length,
    places: places.length,
  },
});
console.log(
  JSON.stringify({
    counties: counties.length,
    lakes: lakes.length,
    rivers: rivers.length,
    places: places.length,
  }),
);
