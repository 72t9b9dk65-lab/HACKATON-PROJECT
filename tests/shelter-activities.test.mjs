import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import {
  dogActivity,
  isShelterNight,
  shelterActivities,
  shelterActivityLayout,
  activityLabel,
  shelterClock,
} from '../lib/shelter-activities.ts';
import { projectCare } from '../lib/care-impact.ts';
import { exampleGifts } from '../lib/donation-shell.ts';

test('Shelter time follows the Stockholm wall clock, including hour boundaries and daylight saving', () => {
  assert.deepEqual(shelterClock(new Date('2026-09-07T13:00:00Z')), {
    hour: 15,
    minute: 0,
  });
  assert.deepEqual(shelterClock(new Date('2026-09-07T13:00:01.800Z')), {
    hour: 15,
    minute: 0,
  });
  assert.deepEqual(shelterClock(new Date('2026-09-07T14:00:00Z')), {
    hour: 16,
    minute: 0,
  });
  assert.deepEqual(shelterClock(new Date('2026-09-07T13:59:59Z')), {
    hour: 15,
    minute: 59,
  });
  assert.deepEqual(shelterClock(new Date('2026-12-07T13:00:00Z')), {
    hour: 14,
    minute: 0,
  });
  assert.deepEqual(shelterClock(new Date('2026-03-29T00:59:00Z')), {
    hour: 1,
    minute: 59,
  });
  assert.deepEqual(shelterClock(new Date('2026-03-29T01:00:00Z')), {
    hour: 3,
    minute: 0,
  });
});

test('Every companion returns home and sleeps at night, with no nighttime station visits', () => {
  for (const careId of ['food', 'rehabilitation', 'vaccination']) {
    for (let hour = 0; hour < 24; hour++) {
      for (let index = 0; index < 152; index++) {
        const activity = dogActivity(index, hour, careId, true);
        assert.equal(activity === 'sleep', isShelterNight(hour));
        assert.ok(activityLabel(activity));
        if (isShelterNight(hour))
          assert.equal(activityLabel(activity), 'Sleeping');
      }
    }
  }
});

test('Simple daily routines visit the selected care service only when care is scheduled', () => {
  for (const careId of ['food', 'rehabilitation', 'vaccination']) {
    for (let index = 0; index < 12; index++) {
      const routine = Array.from({ length: 24 }, (_, hour) =>
        dogActivity(index, hour, careId, true),
      );
      for (const activity of ['home', 'sleep', 'walk', 'play', 'food', careId])
        assert.ok(routine.includes(activity));
      const withoutCare = Array.from({ length: 24 }, (_, hour) =>
        dogActivity(index, hour, careId, false),
      );
      assert.ok(!withoutCare.includes('rehabilitation'));
      assert.ok(!withoutCare.includes('vaccination'));
      if (careId === 'vaccination')
        assert.equal(
          routine.filter((activity) => activity === careId).length,
          1,
        );
    }
  }
});

test('Kennel stays above a single activity row and all home/service positions remain in bounds', () => {
  for (const viewportWidth of [200, 320, 700, 900, 1500]) {
    for (const count of [0, 1, 8, 43, 152]) {
      for (let hour = 0; hour < 24; hour++) {
        const activities = Array.from({ length: count }, (_, index) =>
          dogActivity(index, hour, 'vaccination', true),
        );
        const layout = shelterActivityLayout(viewportWidth, count, activities);
        assert.ok(layout.width >= viewportWidth);
        assert.equal(
          new Set(layout.stations.map((station) => station.y)).size,
          1,
        );
        assert.equal(layout.stations.length, 5);
        const occupied = new Set();
        activities.forEach((activity, index) => {
          const position = layout.position(index, activity);
          assert.ok(position.x >= 0 && position.x + 64 <= layout.width);
          assert.ok(position.y >= 0 && position.y + 108 <= layout.height);
          const key = `${position.x},${position.y}`;
          assert.ok(!occupied.has(key), 'dogs have distinct places');
          occupied.add(key);
          if (activity === 'home' || activity === 'sleep')
            assert.ok(position.y + 108 <= layout.activityTop);
          else assert.ok(position.y > layout.activityTop);
        });
      }
    }
  }
});

test('Activity animation does not advance the care forecast or change the donation ledger', () => {
  const gifts = structuredClone(exampleGifts);
  const projection = projectCare({
    amountOre: 50000,
    careId: 'food',
    frequency: 'monthly',
    startDate: '2026-09-07',
    day: 30,
  });
  const before = JSON.stringify({ gifts, projection });
  for (let frame = 0; frame < 240; frame++)
    dogActivity(0, frame % 24, projection.careId, projection.activeDogs > 0);
  assert.equal(JSON.stringify({ gifts, projection }), before);
});

test('Every activity and the large kennel use saved PNG assets with alpha', () => {
  for (const asset of [
    '/shelters/pixel-big-kennel.png',
    ...shelterActivities.map((item) => item.asset),
  ]) {
    const file = new URL(`../public${asset}`, import.meta.url);
    assert.ok(existsSync(file), asset);
    const bytes = readFileSync(file);
    assert.equal(bytes.toString('ascii', 1, 4), 'PNG');
    assert.equal(bytes[25], 6, 'PNG contains alpha');
  }
});
