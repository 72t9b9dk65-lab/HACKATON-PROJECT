import test from 'node:test';
import assert from 'node:assert/strict';
import {
  exampleGifts,
  fundingSummary,
  MAX_DEMO_GIFT_ORE,
  profileDogs,
  readDemoGifts,
  SHARED_CARE_ID,
} from '../lib/donation-shell.ts';
import {
  parseDonationAmount,
  previewCareRecipients,
} from '../lib/virtual-shelter.ts';

test('Custom donations accept only whole SEK within the advertised limits', () => {
  for (const [input, expected] of [
    ['1', 100],
    ['250', 25_000],
    [' 500 ', 50_000],
    ['10000', MAX_DEMO_GIFT_ORE],
  ]) {
    assert.equal(parseDonationAmount(input), expected);
  }
  for (const input of [
    '',
    ' ',
    '0',
    '-1',
    '1.5',
    '1e3',
    'NaN',
    'Infinity',
    '10001',
    '100000',
    '250 SEK',
  ]) {
    assert.equal(parseDonationAmount(input), null, input);
  }
});

test('Changing an illustrative preview never changes confirmed giving or directory order', () => {
  const gifts = structuredClone(exampleGifts);
  const funding = fundingSummary(gifts);
  const before = JSON.stringify({ gifts, funding, profileDogs });
  for (const [amount, count] of [
    [0, 0],
    [1, 1],
    [3, 3],
    [5, 5],
    [100, profileDogs.filter((dog) => !dog.group).length],
  ]) {
    const ids = previewCareRecipients(amount, funding);
    assert.equal(ids.length, count);
    assert.equal(new Set(ids).size, count);
    assert.ok(ids.every((id) => profileDogs.some((dog) => dog.id === id)));
  }
  for (const amount of [-1, 1.2, NaN, Infinity]) {
    assert.deepEqual(previewCareRecipients(amount, funding), []);
  }
  assert.equal(JSON.stringify({ gifts, funding, profileDogs }), before);
});

test('Preview prioritizes unsupported dogs and then those with the least demo care', () => {
  const gifts = profileDogs.slice(0, 3).map((dog, index) => ({
    id: `direct-${index}`,
    dogId: dog.id,
    amountOre: (index + 1) * 10_000,
    createdAt: '2026-09-07T12:00:00Z',
  }));
  const funding = fundingSummary(gifts);
  const small = previewCareRecipients(3, funding);
  assert.ok(small.every((id) => funding.byDog[id].amountOre === 0));
  const all = previewCareRecipients(100, funding);
  assert.deepEqual(
    all.slice(-3),
    profileDogs.slice(0, 3).map((dog) => dog.id),
  );
  assert.deepEqual(previewCareRecipients(3, funding), small);
});

test('Confirming a custom amount funds exactly the preview and survives reload without redistributing history', () => {
  const legacy = {
    id: 'previous-shared',
    dogId: SHARED_CARE_ID,
    amountOre: 50_000,
    createdAt: '2026-09-07T09:00:00Z',
  };
  const original = readDemoGifts(JSON.stringify([legacy]));
  const before = fundingSummary(original);
  const amountOre = parseDonationAmount('1275');
  const recipientIds = previewCareRecipients(3, before);
  const gift = {
    id: 'custom',
    dogId: SHARED_CARE_ID,
    amountOre,
    recipientIds,
    createdAt: '2026-09-07T12:00:00Z',
  };
  const saved = [...original, gift];
  const restored = readDemoGifts(JSON.stringify(saved));
  assert.deepEqual(restored, saved);
  assert.deepEqual(restored[0].recipientIds, ['ake', 'koby', 'ove']);
  const after = fundingSummary(restored);
  assert.equal(after.amountOre - before.amountOre, amountOre);
  for (const dog of profileDogs) {
    const change =
      after.byDog[dog.id].amountOre - before.byDog[dog.id].amountOre;
    assert.equal(change > 0, recipientIds.includes(dog.id));
  }
  assert.equal(
    Object.values(after.allocation).reduce((a, b) => a + b),
    after.amountOre,
  );
  assert.equal(
    Object.values(after.byDog).reduce((sum, dog) => sum + dog.amountOre, 0),
    after.amountOre,
  );
});

test('Saved gifts support the new maximum while rejecting corrupt larger amounts', () => {
  const gift = {
    id: 'max',
    dogId: 'ake',
    amountOre: MAX_DEMO_GIFT_ORE,
    createdAt: '2026-09-07T12:00:00Z',
  };
  assert.deepEqual(readDemoGifts(JSON.stringify([gift])), [gift]);
  assert.deepEqual(
    readDemoGifts(
      JSON.stringify([{ ...gift, amountOre: MAX_DEMO_GIFT_ORE + 1 }]),
    ),
    exampleGifts,
  );
});
