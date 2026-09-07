import test from 'node:test';
import assert from 'node:assert/strict';
import { dogNeeds, matchesCareNeed, waitingDogIds } from '../lib/dog-needs.ts';
import { carePlans, projectCare } from '../lib/care-impact.ts';
import {
  exampleGifts,
  fundingSummary,
  profileDogs,
  readDemoGifts,
  SHARED_CARE_ID,
} from '../lib/donation-shell.ts';
import { previewCareRecipients } from '../lib/virtual-shelter.ts';

const individualIds = profileDogs
  .filter((dog) => !dog.group)
  .map((dog) => dog.id);

test('Preview matches the care labels and prioritizes illustrative urgent medical needs', () => {
  const funding = fundingSummary([]);
  for (const plan of carePlans) {
    const ids = previewCareRecipients(1000, funding, plan.id);
    assert.ok(ids.length > 0);
    assert.ok(ids.every((id) => matchesCareNeed(id, plan.id)));
    assert.ok(ids.every((id) => individualIds.includes(id)));
    assert.equal(ids.length, new Set(ids).size);
  }
  const medical = previewCareRecipients(1000, funding, 'rehabilitation');
  const firstRoutine = medical.findIndex(
    (id) => !dogNeeds(id).includes('urgent'),
  );
  assert.ok(firstRoutine > 0);
  assert.ok(
    medical.slice(firstRoutine).every((id) => !dogNeeds(id).includes('urgent')),
  );
  // Check-ups never imply urgent treatment or vice versa.
  assert.ok(
    previewCareRecipients(1000, funding, 'vaccination').every(
      (id) => !dogNeeds(id).includes('urgent'),
    ),
  );
});

test('Growing and shrinking an amount moves the same matching dogs between grid and shelter without duplicates', () => {
  const funding = fundingSummary([]);
  const before = JSON.stringify({ funding, profileDogs });
  for (const plan of carePlans) {
    let previous = [];
    for (const amountOre of [
      100, 10000, 24000, 50000, 110000, 250000, 1000000,
    ]) {
      const projection = projectCare({
        amountOre,
        careId: plan.id,
        frequency: 'once',
        startDate: '2026-09-07',
        day: 0,
      });
      const preview = previewCareRecipients(
        projection.dogCount,
        funding,
        plan.id,
      );
      assert.deepEqual(preview.slice(0, previous.length), previous);
      assert.ok(preview.length <= projection.dogCount);
      const waiting = waitingDogIds(profileDogs, [], preview);
      assert.ok(waiting.every((id) => !preview.includes(id)));
      assert.deepEqual(
        [...waiting, ...preview].sort(),
        [...individualIds].sort(),
      );
      previous = preview;
    }
    const reduced = previewCareRecipients(1, funding, plan.id);
    const waiting = waitingDogIds(profileDogs, [], reduced);
    assert.ok(previous.slice(1).every((id) => waiting.includes(id)));
    assert.deepEqual(waitingDogIds(profileDogs, [], []), individualIds);
  }
  assert.equal(JSON.stringify({ funding, profileDogs }), before);
});

test('A confirmed gift keeps its dogs in the shelter after clearing the preview and reloading', () => {
  const recipientIds = previewCareRecipients(2, fundingSummary([]), 'food');
  const gift = {
    id: 'need-grid-gift',
    dogId: SHARED_CARE_ID,
    recipientIds,
    amountOre: 100000,
    carePlanId: 'food',
    createdAt: '2026-09-07T13:00:00Z',
  };
  const gifts = readDemoGifts(JSON.stringify([...exampleGifts, gift]));
  const personalFunding = fundingSummary(
    gifts.filter((item) => item.id !== 'example'),
  );
  const residents = individualIds.filter(
    (id) => personalFunding.byDog[id].amountOre > 0,
  );
  assert.deepEqual([...residents].sort(), [...recipientIds].sort());
  assert.ok(
    waitingDogIds(profileDogs, residents, []).every(
      (id) => !recipientIds.includes(id),
    ),
  );
  const nextPreview = previewCareRecipients(1, personalFunding, 'food');
  assert.ok(nextPreview.every((id) => !residents.includes(id)));
  const waiting = waitingDogIds(profileDogs, residents, nextPreview);
  assert.deepEqual(
    [...waiting, ...residents, ...nextPreview].sort(),
    [...individualIds].sort(),
  );
  assert.equal(fundingSummary(gifts).amountOre, 150000);
});

test('Monthly projections only move real matching profiles; overflow remains anonymous and history is unchanged', () => {
  const history = structuredClone(exampleGifts);
  const before = JSON.stringify(history);
  const funding = fundingSummary([]);
  for (const plan of carePlans) {
    const projection = projectCare({
      amountOre: 1000000,
      careId: plan.id,
      frequency: 'monthly',
      startDate: '2026-09-07',
      day: 364,
    });
    const preview = previewCareRecipients(
      projection.dogCount,
      funding,
      plan.id,
    );
    const waiting = waitingDogIds(profileDogs, [], preview);
    assert.ok(preview.every((id) => matchesCareNeed(id, plan.id)));
    assert.ok(projection.dogCount >= preview.length);
    assert.deepEqual(
      [...preview, ...waiting].sort(),
      [...individualIds].sort(),
    );
  }
  assert.equal(JSON.stringify(history), before);
});
