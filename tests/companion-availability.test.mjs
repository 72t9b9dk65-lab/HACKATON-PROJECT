import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initialAdoptedCompanions,
  groupCompanions,
} from '../lib/platform/companion-availability.ts';

test('existing companions keep their availability while every new instance is available, including after reload', () => {
  const existing = [
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
  ];
  const snapshot = initialAdoptedCompanions(existing);
  const before = groupCompanions(existing, snapshot);
  assert.ok(before.available.length > 0);
  assert.ok(before.adopted.length > 0);
  const additions = ['nine', 'ten', 'four::1', 'eleven'];
  const after = groupCompanions([...existing, ...additions], snapshot);
  assert.deepEqual(after.available, [...before.available, ...additions]);
  assert.deepEqual(after.adopted, before.adopted);
  assert.deepEqual(
    groupCompanions(
      [...existing, ...additions],
      JSON.parse(JSON.stringify(snapshot)),
    ),
    after,
  );
});

test('a new donor starts empty and all subsequently unlocked companions stay available', () => {
  const snapshot = initialAdoptedCompanions([]);
  const newCompanions = Array.from(
    { length: 100 },
    (_, index) => `dog-${index}`,
  );
  assert.deepEqual(groupCompanions(newCompanions, snapshot), {
    available: newCompanions,
    adopted: [],
  });
});
