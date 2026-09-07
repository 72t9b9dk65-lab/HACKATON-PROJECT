import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  careAllocation,
  DEMO_GIFT_ORE,
  exampleGifts,
  giftsForDog,
  profileDogs,
  readDemoGifts,
  fundingSummary,
  SHARED_CARE_ID,
} from '../lib/donation-shell.ts';
import { prepareSwedenMap } from '../lib/sweden-map.ts';

test('Care allocations conserve every öre and legacy gifts retain their recipient', () => {
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
  const gifts = [{ ...exampleGifts[0], id: 'legacy', dogId: 'ake' }, gift];
  assert.equal(giftsForDog(gifts, 'ake'), 50_000);
  assert.equal(giftsForDog(gifts, 'koby'), 25_000);
  assert.equal(giftsForDog(gifts, 'ove'), 0);
  assert.deepEqual(readDemoGifts(JSON.stringify(gifts)), gifts);
  assert.deepEqual(readDemoGifts('[]'), []);
});

test('Shared support reconciles across dogs and care categories without changing the overall total', () => {
  const gifts = [1, 99, 101, 25_000, 50_000].map((amountOre, index) => ({
    id: `shared-${index}`,
    dogId: SHARED_CARE_ID,
    recipientIds: profileDogs.map((dog) => dog.id),
    amountOre,
    createdAt: '2026-09-07T10:00:00Z',
  }));
  const summary = fundingSummary(gifts);
  assert.equal(
    summary.amountOre,
    gifts.reduce((sum, gift) => sum + gift.amountOre, 0),
  );
  assert.equal(
    Object.values(summary.byDog).reduce((sum, dog) => sum + dog.amountOre, 0),
    summary.amountOre,
  );
  for (const category of ['food', 'health', 'comfort']) {
    assert.equal(
      Object.values(summary.byDog).reduce(
        (sum, dog) => sum + dog.allocation[category],
        0,
      ),
      summary.allocation[category],
    );
  }
  for (const dog of profileDogs) {
    assert.ok(summary.byDog[dog.id].amountOre > 0);
    assert.equal(giftsForDog(gifts, dog.id), summary.byDog[dog.id].amountOre);
    assert.equal(
      Object.values(summary.byDog[dog.id].allocation).reduce((a, b) => a + b),
      summary.byDog[dog.id].amountOre,
    );
  }
  assert.deepEqual(readDemoGifts(JSON.stringify(gifts)), gifts);
});

test('The original sample moves into shared care while preserving user-created records', () => {
  const oldSample = { ...exampleGifts[0], dogId: 'ake' };
  const oldGift = {
    id: 'user-gift',
    dogId: 'koby',
    amountOre: 25_000,
    createdAt: '2026-09-07T09:00:00Z',
  };
  const migrated = readDemoGifts(JSON.stringify([oldSample, oldGift]));
  assert.equal(migrated[0].dogId, SHARED_CARE_ID);
  assert.deepEqual(migrated[1], oldGift);
  assert.equal(fundingSummary(migrated).amountOre, 75_000);
  assert.deepEqual(readDemoGifts(JSON.stringify(migrated)), migrated);
});

test('The original atlas and added breed sprites are transparent assets for every profile', () => {
  const manifest = JSON.parse(
    readFileSync(
      new URL('../public/dogs/pixel-breeds/manifest.json', import.meta.url),
    ),
  );
  assert.equal(manifest.sprites.length, 25);
  assert.equal(new Set(manifest.sprites.map((sprite) => sprite.id)).size, 25);
  assert.equal(
    new Set(manifest.sprites.map((sprite) => `${sprite.row}:${sprite.column}`))
      .size,
    25,
  );
  const extra = JSON.parse(
    readFileSync(
      new URL(
        '../public/dogs/pixel-breeds/manifest-extra.json',
        import.meta.url,
      ),
    ),
  );
  assert.equal(extra.sprites.length, 16);
  const sprites = [...manifest.sprites, ...extra.sprites];
  for (const sprite of sprites) {
    const bytes = readFileSync(
      new URL(`../public${sprite.src}`, import.meta.url),
    );
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
    assert.equal(bytes.readUInt32BE(16), 256);
    assert.equal(bytes.readUInt32BE(20), 256);
    assert.equal(bytes[25], 6, 'RGBA PNG color type');
    assert.equal(
      createHash('sha256').update(bytes).digest('hex'),
      sprite.sha256,
    );
    assert.equal(sprite.alphaRange[0], 0);
    assert.ok(sprite.visibleBounds.every((value) => value > 0 && value < 256));
  }
  for (const dog of profileDogs)
    assert.ok(sprites.some((sprite) => sprite.src === dog.sprite));
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
  assert.equal(
    new Set(
      profileDogs.filter((dog) => dog.shelterId).map((dog) => dog.shelterId),
    ).size,
    3,
  );
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
    if (!dog.coordinates) continue;
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

test('All published directory profiles are represented without inventing shelter assignments', () => {
  const snapshot = JSON.parse(
    readFileSync(
      new URL('../public/data/hundstallet/directory.json', import.meta.url),
    ),
  );
  assert.equal(snapshot.profileCount, 43);
  assert.deepEqual(
    profileDogs.map((dog) => dog.id).sort(),
    snapshot.profiles.map((dog) => dog.id).sort(),
  );
  assert.equal(new Set(profileDogs.map((dog) => dog.id)).size, 43);
  assert.equal(profileDogs.filter((dog) => dog.group).length, 2);
  assert.equal(
    profileDogs.filter((dog) => dog.status === 'Trial adoption').length,
    2,
  );
  const grynet = profileDogs.find((dog) => dog.id === 'grynet-2');
  assert.equal(grynet.shelterId, null);
  assert.equal(grynet.coordinates, null);
  assert.equal(grynet.location, 'Rehoming team');
  assert.equal(
    profileDogs.filter((dog) => dog.shelterId === 'alingsas').length,
    15,
  );
  assert.equal(
    profileDogs.filter((dog) => dog.shelterId === 'stockholm').length,
    6,
  );
  assert.equal(
    profileDogs.filter((dog) => dog.shelterId === 'orkelljunga').length,
    21,
  );
});

test('Directory expansion cannot redistribute historical shared gifts', () => {
  const old = {
    id: 'previous-shared',
    dogId: SHARED_CARE_ID,
    amountOre: 25000,
    createdAt: '2026-09-07T09:00:00Z',
  };
  const [migrated] = readDemoGifts(JSON.stringify([old]));
  assert.deepEqual(migrated.recipientIds, ['ake', 'koby', 'ove']);
  assert.equal(fundingSummary([migrated]).byDog.ajjo.amountOre, 0);
  assert.deepEqual(fundingSummary([old]), fundingSummary([migrated]));
  const next = {
    ...old,
    id: 'new-shared',
    recipientIds: profileDogs.map((dog) => dog.id),
  };
  const summary = fundingSummary([migrated, next]);
  assert.equal(summary.amountOre, 50000);
  assert.ok(summary.byDog.ajjo.amountOre > 0);
  assert.deepEqual(readDemoGifts(JSON.stringify([migrated, next])), [
    migrated,
    next,
  ]);
  for (const recipientIds of [[], ['ake', 'ake'], ['unknown']]) {
    assert.deepEqual(
      readDemoGifts(JSON.stringify([{ ...next, recipientIds }])),
      exampleGifts,
    );
  }
});
