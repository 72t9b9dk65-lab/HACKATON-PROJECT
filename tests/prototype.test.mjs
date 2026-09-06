import { buildWorld } from '../lib/world-model.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { feature, merge } from 'topojson-client';
import { geoOrthographic, geoPath, geoArea } from 'd3-geo';
import {
  territories,
  cities,
  continents,
  categories,
} from '../lib/earth-data.ts';
import {
  validAmount,
  newDonation,
  addedFunds,
  estimate,
  parseSavedState,
  rankedSeedDonors,
  seedContributions,
  categoryFunding,
} from '../lib/donation-model.ts';

const profile = {
  username: 'test_germoglio',
  avatar: 2,
  createdAt: '2026-09-06T12:00:00.000Z',
};
test('The six donor ledgers reconcile exactly to every country and to the world', () => {
  const total = territories.reduce((s, t) => s + t.raised, 0);
  assert.equal(
    rankedSeedDonors.reduce((s, d) => s + d.total, 0),
    total,
  );
  for (const t of territories)
    assert.equal(
      seedContributions
        .filter((c) => c.territoryId === t.id)
        .reduce((s, c) => s + c.amount, 0),
      t.raised,
    );
  assert.equal(new Set(rankedSeedDonors.map((d) => d.username)).size, 6);
});
test('City, country and continent donations aggregate without double counting', () => {
  const city = cities.find((t) => t.id === 'khartoum');
  const country = territories.find((t) => t.id === '729');
  const continent = continents.find((t) => t.id === 'Africa');
  const donations = [
    newDonation(city, 'water', 15.25, 'a'),
    newDonation(country, 'food', 40, 'b'),
    newDonation(continent, 'education', 30, 'c'),
  ];
  const extra = addedFunds(donations);
  assert.equal(extra.khartoum, 15.25);
  assert.equal(extra['729'], 55.25);
  assert.equal(extra.Africa, 85.25);
  for (const t of [city, country, continent])
    assert.equal(
      categories.reduce((s, c) => s + categoryFunding(t, c.id, donations), 0),
      t.raised + extra[t.id],
    );
  assert.equal(extra['380'], undefined);
});
test('Amounts validate before a record is created', () => {
  for (const v of [0, -1, 25000.01, NaN, Infinity, 1.005]) {
    assert.equal(validAmount(v), false);
    assert.throws(() => newDonation(territories[0], 'water', v, 'invalid'));
  }
  for (const v of [1, 1.01, 15.1, 25000]) assert.equal(validAmount(v), true);
  assert.throws(() => newDonation(territories[0], 'unknown', 20, 'invalid'));
  assert.throws(() =>
    newDonation({ ...territories[0], id: 'made-up' }, 'water', 20, 'invalid'),
  );
});
test('The illustrative cost model discloses unallocated remainder and never invents fractional purchases', () => {
  assert.deepEqual(estimate(40, 'water'), {
    units: 2,
    people: 8,
    remainder: 10,
    unitCost: 15,
    unit: 'kit di filtrazione',
  });
  assert.equal(estimate(2, 'water').units, 0);
  assert.equal(estimate(2, 'water').people, 0);
  assert.equal(estimate(2, 'water').remainder, 2);
});
test('Local profile and ledger survive reload; duplicated, invalid or unrelated entries are not accepted', () => {
  const d = newDonation(cities[0], 'water', 30, 'a');
  const raw = JSON.stringify({
    version: 1,
    profile,
    donations: [
      d,
      d,
      { ...d, id: 'bad-amount', amount: -3 },
      { ...d, id: 'bad-stage', stage: 4 },
      { ...d, id: 'bad-place', countryId: '380' },
    ],
  });
  const result = parseSavedState(raw);
  assert.deepEqual(result.profile, profile);
  assert.deepEqual(result.donations, [d]);
  assert.deepEqual(parseSavedState(null), { profile: null, donations: [] });
  assert.throws(() => parseSavedState('{bad json'));
  assert.throws(() =>
    parseSavedState(
      JSON.stringify({
        version: 1,
        profile: { ...profile, username: 'personal@example.com' },
        donations: [],
      }),
    ),
  );
});
test('Every geographic boundary has a unique key, metadata and a valid spherical polygon', () => {
  const world = JSON.parse(
    fs.readFileSync(new URL('../public/data/world.json', import.meta.url)),
  );
  const meta = JSON.parse(
    fs.readFileSync(new URL('../public/data/countries.json', import.meta.url)),
  );
  const features = feature(world, world.objects.countries).features;
  assert.equal(features.length, 177);
  assert.equal(new Set(features.map((f) => f.id)).size, 177);
  const projection = geoOrthographic().rotate([-19, -12, 0]).scale(286);
  const path = geoPath(projection);
  for (const f of features) {
    assert.ok(meta[String(f.id).padStart(3, '0')]);
    assert.ok(geoArea(f) > 0 && geoArea(f) < Math.PI * 2);
    const p = path(f);
    if (p) assert.equal(p.includes('NaN'), false);
  }
  for (const c of continents) {
    const shapes = world.objects.countries.geometries.filter(
      (g) => meta[String(g.id).padStart(3, '0')]?.continent === c.id,
    );
    assert.ok(shapes.length > 0);
    assert.ok(geoArea(merge(world, shapes)) > 0);
  }
});

test('The browser atlas preparation builds all country and continent paths without throwing', () => {
  const topology = JSON.parse(
    fs.readFileSync(new URL('../public/data/world.json', import.meta.url)),
  );
  const metadata = JSON.parse(
    fs.readFileSync(new URL('../public/data/countries.json', import.meta.url)),
  );
  const world = buildWorld(topology, metadata);
  assert.equal(world.features.length, 177);
  assert.equal(world.continents.length, 6);
  for (const continent of world.continents) {
    const target = continents.find((c) => c.id === continent.id);
    const projection = geoOrthographic().rotate([
      -target.coordinates[0],
      -target.coordinates[1],
      0,
    ]);
    const path = geoPath(projection)(continent.geometry);
    assert.ok(path && !path.includes('NaN'), `${continent.id} must render`);
  }
});
