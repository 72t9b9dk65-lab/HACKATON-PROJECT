import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import {
  carePlans,
  projectCare,
  dateAfterMonths,
  daysBetween,
  forecastDays,
  dateAfterDays,
} from '../lib/care-impact.ts';
import {
  defaultShelterProfile,
  readShelterProfile,
} from '../lib/shelter-profile.ts';
import {
  fundingSummary,
  exampleGifts,
  giftAllocation,
  readDemoGifts,
} from '../lib/donation-shell.ts';
import { shelterSceneLayout } from '../lib/shelter-scene.ts';
const startDate = '2026-09-07';
const project = (values = {}) =>
  projectCare({
    amountOre: 50_000,
    careId: 'food',
    frequency: 'once',
    startDate,
    day: 0,
    ...values,
  });

test('Official examples produce the stated care capacity without counting the same budget three times', () => {
  for (const [amountOre, careId, units, dogs] of [
    [10_000, 'food', 2, 1],
    [50_000, 'food', 10, 1],
    [24_000, 'rehabilitation', 2, 1],
    [110_000, 'vaccination', 1, 1],
  ]) {
    const result = project({ amountOre, careId });
    assert.equal(result.totalUnits, units);
    assert.equal(result.dogCount, dogs);
    assert.equal(result.allocatedOre, amountOre);
    assert.equal(result.reserveOre, 0);
  }
  assert.equal(project({ amountOre: 49_00 }).dogCount, 0);
  assert.equal(project({ amountOre: 49_00 }).reserveOre, 49_00);
  assert.equal(
    project({ amountOre: 100_000, careId: 'vaccination' }).dogCount,
    0,
  );
  assert.equal(project({ amountOre: 100_000, careId: 'food' }).dogCount, 2);
});

test('Day-by-day use is bounded by funded capacity and monthly food supports the same cohort', () => {
  assert.equal(project({ day: 0 }).usedUnits, 1);
  assert.equal(project({ day: 1 }).usedUnits, 2);
  assert.equal(project({ day: 9 }).usedUnits, 10);
  assert.equal(project({ day: 10 }).activeDogs, 0);
  const month2 = daysBetween(startDate, dateAfterMonths(startDate, 1));
  const once = project({ day: month2 });
  assert.equal(once.contributions, 1);
  assert.equal(once.usedUnits, 10);
  const monthly = project({ frequency: 'monthly', day: month2 });
  assert.equal(monthly.committedOre, 100_000);
  assert.equal(monthly.usedUnits, 11);
  assert.equal(monthly.totalUnits, 20);
  assert.equal(monthly.dogCount, 1);
  const year = project({ frequency: 'monthly', day: forecastDays(startDate) });
  assert.equal(year.contributions, 12);
  assert.equal(year.committedOre, 600_000);
  assert.equal(year.usedUnits, 120);
  assert.equal(year.dogCount, 1);
});

test('Monthly reserves fund only complete units and vaccination visits use different dogs', () => {
  const before = project({
    amountOre: 10_000,
    careId: 'vaccination',
    frequency: 'monthly',
    day: daysBetween(startDate, dateAfterMonths(startDate, 9)),
  });
  assert.equal(before.totalUnits, 0);
  assert.equal(before.dogCount, 0);
  assert.equal(before.reserveOre, 100_000);
  const funded = project({
    amountOre: 10_000,
    careId: 'vaccination',
    frequency: 'monthly',
    day: daysBetween(startDate, dateAfterMonths(startDate, 10)),
  });
  assert.equal(funded.totalUnits, 1);
  assert.equal(funded.reserveOre, 0);
  const next = project({
    amountOre: 110_000,
    careId: 'vaccination',
    frequency: 'monthly',
    day: daysBetween(startDate, dateAfterMonths(startDate, 1)),
  });
  assert.equal(next.dogCount, 2);
  assert.equal(next.activeDogs, 1);
  assert.equal(next.activeStartIndex, 1);
});

test('Calendar months retain the billing day, clamp short months, and handle leap years', () => {
  assert.equal(dateAfterMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(dateAfterMonths('2026-01-31', 2), '2026-03-31');
  assert.equal(dateAfterMonths('2028-01-31', 1), '2028-02-29');
  assert.equal(forecastDays('2027-09-07'), 365);
  const at = (date) =>
    project({
      frequency: 'monthly',
      startDate: '2026-01-31',
      day: daysBetween('2026-01-31', date),
    });
  assert.equal(at('2026-02-27').contributions, 1);
  assert.equal(at('2026-02-28').contributions, 2);
  assert.equal(at('2026-03-30').contributions, 2);
  assert.equal(at('2026-03-31').contributions, 3);
  assert.equal(dateAfterDays('2028-02-28', 1), '2028-02-29');
});

test('Every daily forecast conserves money and accumulates monotonically without touching saved gifts', () => {
  const before = JSON.stringify(exampleGifts);
  for (const careId of ['food', 'rehabilitation', 'vaccination']) {
    for (const frequency of ['once', 'monthly']) {
      for (const amountOre of [
        100, 10_000, 24_000, 50_000, 110_000, 1_000_000,
      ]) {
        let previous = {
          totalUnits: 0,
          usedUnits: 0,
          dogCount: 0,
          committedOre: 0,
        };
        for (let day = 0; day <= forecastDays(startDate); day++) {
          const result = project({ careId, frequency, amountOre, day });
          assert.equal(
            result.allocatedOre + result.reserveOre,
            result.committedOre,
          );
          assert.ok(result.usedUnits <= result.totalUnits);
          assert.ok(
            result.activeStartIndex + result.activeDogs <= result.dogCount,
          );
          assert.ok(result.contributions <= 12);
          for (const key of [
            'totalUnits',
            'usedUnits',
            'dogCount',
            'committedOre',
          ])
            assert.ok(
              result[key] >= previous[key],
              `${careId} ${frequency} day ${day}: ${key}`,
            );
          previous = result;
        }
      }
    }
  }
  assert.equal(JSON.stringify(exampleGifts), before);
});

test('Profile and monthly forecast persist independently of demo donation totals', () => {
  const profile = {
    name: 'Alex',
    shelterName: 'Happy paws',
    monthlyPlan: { amountOre: 50_000, careId: 'food', startDate },
  };
  const total = fundingSummary(exampleGifts).amountOre;
  assert.deepEqual(readShelterProfile(JSON.stringify(profile)), profile);
  assert.deepEqual(readShelterProfile(null), defaultShelterProfile);
  assert.deepEqual(readShelterProfile('{'), defaultShelterProfile);
  for (const monthlyPlan of [
    { amountOre: -1, careId: 'food', startDate },
    { amountOre: 100, careId: 'unknown', startDate },
    { amountOre: 100, careId: 'food', startDate: '2026-02-30' },
  ]) {
    assert.equal(
      readShelterProfile(JSON.stringify({ ...profile, monthlyPlan }))
        .monthlyPlan,
      null,
    );
  }
  assert.equal(fundingSummary(exampleGifts).amountOre, total);
});

test('Confirmed care choices reconcile with the ledger and do not redistribute old gifts', () => {
  const previous = fundingSummary(exampleGifts);
  for (const carePlanId of ['food', 'rehabilitation', 'vaccination']) {
    const gift = {
      id: `plan-${carePlanId}`,
      dogId: 'ake',
      amountOre: 50_000,
      createdAt: '2026-09-07T12:00:00Z',
      carePlanId,
    };
    const restored = readDemoGifts(JSON.stringify([...exampleGifts, gift]));
    assert.deepEqual(restored.at(-1), gift);
    const next = fundingSummary(restored);
    assert.equal(next.amountOre - previous.amountOre, gift.amountOre);
    const allocation = giftAllocation(gift);
    assert.equal(
      allocation[carePlanId === 'food' ? 'food' : 'health'],
      gift.amountOre,
    );
    assert.equal(
      Object.values(allocation).reduce((a, b) => a + b),
      gift.amountOre,
    );
  }
});

test('Care assets have alpha and scene homes and service targets remain in bounds', () => {
  for (const plan of carePlans) {
    const file = new URL(`../public${plan.asset}`, import.meta.url);
    assert.ok(existsSync(file));
    const bytes = readFileSync(file);
    assert.equal(bytes.toString('ascii', 1, 4), 'PNG');
    assert.equal(bytes[25], 6, 'PNG includes an alpha channel');
  }
  for (const width of [200, 240, 260, 340, 700, 1300]) {
    for (const population of [0, 1, 43, 152]) {
      for (const station of [0, 1, 2]) {
        const layout = shelterSceneLayout(width, population, station);
        for (const p of layout.positions) {
          assert.ok(p.x >= 0 && p.x + 72 <= width);
          assert.ok(p.y >= 0 && p.y + 108 <= layout.height);
          assert.ok(p.x + p.dx >= 0 && p.x + p.dx + 72 <= width);
        }
      }
    }
  }
});
