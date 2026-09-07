import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import {
  careAllocation,
  DEMO_GIFT_ORE,
  exampleGifts,
  giftsForDog,
  profileDogs,
  readDemoGifts,
} from '../lib/donation-shell.ts';
import { prepareSwedenMap } from '../lib/sweden-map.ts';

test('Demo allocations conserve every öre and remain specific to the selected dog', () => {
  for (const amount of [0, 1, 99, 101, 25_000, 50_001]) {
    const parts = Object.values(careAllocation(amount));
    assert.equal(
      parts.reduce((a, b) => a + b),
      amount,
    );
    assert.ok(
      parts.every((value) => Number.isSafeInteger(value) && value >= 0),
    );
  }
  assert.deepEqual(careAllocation(DEMO_GIFT_ORE), {
    food: 12_500,
    health: 7_500,
    comfort: 5_000,
  });
  for (const bad of [-1, 1.2, NaN, Infinity, Number.MAX_SAFE_INTEGER])
    assert.throws(() => careAllocation(bad));
  const gift = {
    id: 'new',
    dogId: 'koby',
    amountOre: DEMO_GIFT_ORE,
    createdAt: '2026-09-07T10:00:00Z',
  };
  const gifts = [...exampleGifts, gift];
  assert.equal(giftsForDog(gifts, 'ake'), 50_000);
  assert.equal(giftsForDog(gifts, 'koby'), 25_000);
  assert.equal(giftsForDog(gifts, 'ove'), 0);
  assert.deepEqual(readDemoGifts(JSON.stringify(gifts)), gifts);
  assert.deepEqual(readDemoGifts('[]'), []);
});

test('Corrupt or unknown persisted gifts do not enter the displayed ledger', () => {
  const gift = {
    id: 'new',
    dogId: 'koby',
    amountOre: 25_000,
    createdAt: '2026-09-07T10:00:00Z',
  };
  for (const raw of [
    'null',
    'bad json',
    '{}',
    JSON.stringify([gift, gift]),
    ...[
      { dogId: 'unknown' },
      { amountOre: -100 },
      { amountOre: 25_000.5 },
      { createdAt: 'unknown' },
    ].map((change) => JSON.stringify([{ ...gift, ...change }])),
  ]) {
    assert.deepEqual(readDemoGifts(raw), exampleGifts);
  }
});

test('Real dog profiles use attributed local photos and project into the Sweden map', () => {
  const source = JSON.parse(
    readFileSync(
      new URL('../public/dogs/hundstallet/sources.json', import.meta.url),
    ),
  );
  const boundary = JSON.parse(
    readFileSync(new URL('../public/data/sweden.json', import.meta.url)),
  );
  assert.equal(new Set(profileDogs.map((dog) => dog.shelterId)).size, 3);
  for (const dog of profileDogs) {
    assert.ok(dog.source.startsWith('https://hundstallet.se/hundar/'));
    for (const photo of dog.photos) {
      assert.ok(existsSync(new URL(`../public${photo.src}`, import.meta.url)));
      assert.ok(
        source.images.some(
          (image) => image.local === photo.src && image.profile === dog.source,
        ),
      );
    }
    for (const [width, height] of [
      [900, 690],
      [550, 690],
      [366, 570],
    ]) {
      const prepared = prepareSwedenMap(
        boundary,
        width,
        height,
        undefined,
        'donation',
      );
      const [x, y] = prepared.projection(dog.coordinates);
      assert.ok(x > 0 && x < width && y > 0 && y < height);
      assert.ok(!prepared.outline.includes('NaN'));
    }
  }
});
