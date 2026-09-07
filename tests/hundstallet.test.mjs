import test from 'node:test';
import assert from 'node:assert/strict';
import {
  allocate,
  amountInOre,
  createReceipt,
  verifyReceipts,
  loadSupporter,
  emptySupporter,
  badges,
} from '../lib/hundstallet-model.ts';
import { dogs, shelters, sweden } from '../lib/hundstallet-data.ts';

test('Care allocation reconciles exactly, including fractional kronor', () => {
  for (const amount of [10, 10.01, 49.99, 100, 25000]) {
    const ore = amountInOre(amount);
    const parts = allocate(ore);
    assert.equal(
      parts.reduce((s, p) => s + p.amountOre, 0),
      ore,
    );
    assert.ok(
      parts.every((p) => Number.isSafeInteger(p.amountOre) && p.amountOre >= 0),
    );
  }
  for (const amount of [0, 9.99, 25000.01, -100, NaN, Infinity, 10.005])
    assert.throws(() => amountInOre(amount));
});
test('Receipts detect modified amounts, ordering, broken links, and duplicate IDs', async () => {
  const a = await createReceipt('luna', 100, 'GENESIS');
  const b = await createReceipt('milo', 50, a.hash);
  assert.equal(await verifyReceipts([a, b]), true);
  assert.equal(await verifyReceipts([{ ...a, amountOre: 20000 }, b]), false);
  assert.equal(await verifyReceipts([b, a]), false);
  assert.equal(
    await verifyReceipts([a, { ...b, previousHash: 'GENESIS' }]),
    false,
  );
  assert.equal(await verifyReceipts([a, a]), false);
  await assert.rejects(() => createReceipt('unknown', 100, 'GENESIS'));
  await assert.rejects(() => createReceipt('luna', 0, 'GENESIS'));
});
test('Following, chapters, badges and valid receipts survive reload without accepting unknown dogs', async () => {
  const receipt = await createReceipt('bella', 10.01, 'GENESIS');
  const saved = {
    followed: ['luna', 'luna', 'unknown'],
    read: ['bella', 'unknown'],
    stages: { luna: 3, bella: 7, milo: -1 },
    receipts: [receipt],
  };
  const restored = await loadSupporter(JSON.stringify(saved));
  assert.deepEqual(restored, {
    followed: ['luna'],
    read: ['bella'],
    stages: { luna: 3 },
    receipts: [receipt],
  });
  assert.equal(badges(restored).filter((b) => b.earned).length, 3);
  assert.equal(
    badges({ ...emptySupporter(), followed: ['luna'], read: ['luna'] }).filter(
      (b) => b.earned,
    ).length,
    2,
  );
  await assert.rejects(() =>
    loadSupporter(
      JSON.stringify({
        ...saved,
        receipts: [{ ...receipt, amountOre: 40000 }],
      }),
    ),
  );
  assert.deepEqual(await loadSupporter(null), emptySupporter());
});
test('Every demo dog maps to an official shelter location and aggregate funds count each shelter once', () => {
  assert.equal(new Set(shelters.map((s) => s.id)).size, 3);
  assert.equal(
    sweden.raised,
    shelters.reduce((s, t) => s + t.raised, 0),
  );
  assert.equal(
    sweden.goal,
    shelters.reduce((s, t) => s + t.goal, 0),
  );
  for (const dog of dogs) {
    assert.ok(shelters.some((s) => s.id === dog.shelterId));
    assert.equal(dog.updates.length, 4);
    assert.ok(dog.stage >= 0 && dog.stage < 4);
  }
});

test('The active map contains Sweden only and projects every shelter at desktop and mobile sizes', async () => {
  const { readFileSync } = await import('node:fs');
  const { prepareSwedenMap } = await import('../lib/sweden-map.ts');
  const boundary = JSON.parse(
    readFileSync(
      new URL('../public/data/sweden.json', import.meta.url),
      'utf8',
    ),
  );
  assert.equal(boundary.type, 'Feature');
  assert.equal(String(boundary.id), '752');
  for (const [width, height] of [
    [800, 770],
    [360, 570],
  ]) {
    const { projection, outline } = prepareSwedenMap(boundary, width, height);
    assert.ok(outline && !outline.includes('NaN'));
    for (const shelter of shelters) {
      const [x, y] = projection(shelter.coordinates);
      assert.ok(
        x > 0 && x < width && y > 0 && y < height,
        `${shelter.name} stays within the map at ${width}px`,
      );
    }
  }
  assert.throws(() => prepareSwedenMap({ ...boundary, id: '840' }, 800, 770));
});

test('Detailed Sweden layers have valid regional geometry, all 21 counties, and the major lakes', async () => {
  const { readFileSync } = await import('node:fs');
  const { geoArea, geoBounds } = await import('d3-geo');
  const { prepareSwedenMap } = await import('../lib/sweden-map.ts');
  const read = (name) =>
    JSON.parse(
      readFileSync(new URL(`../public/data/${name}`, import.meta.url), 'utf8'),
    );
  const boundary = read('sweden.json');
  const details = read('sweden-details.json');
  assert.equal(new Set(details.counties.map((c) => c.id)).size, 21);
  assert.ok(details.counties.every((c) => c.id.startsWith('SE-')));
  assert.ok(details.lakes.some((l) => l.properties.name === 'Vänern'));
  assert.ok(details.lakes.some((l) => l.properties.name === 'Vättern'));
  assert.ok(details.places.some((p) => p.properties.name === 'Stockholm'));
  const [[west, south], [east, north]] = geoBounds(boundary);
  assert.ok(west > 10 && east < 25 && south > 55 && north < 70);
  for (const f of [boundary, ...details.counties, ...details.lakes])
    assert.ok(
      geoArea(f) > 0 && geoArea(f) < Math.PI * 2,
      'Polygon winding must not cover the rest of the world',
    );
  for (const [width, height] of [
    [800, 770],
    [360, 570],
  ]) {
    const prepared = prepareSwedenMap(boundary, width, height, details);
    assert.equal(prepared.counties.length, 21);
    for (const feature of [
      ...prepared.counties,
      ...prepared.lakes,
      ...prepared.rivers,
    ])
      assert.ok(feature.path && !feature.path.includes('NaN'));
  }
});
