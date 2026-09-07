import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activeDogUpdate,
  careUpdateStatus,
  dogCareBasket,
  dogEventPhoto,
  linkedCareExpense,
  readCareCalendar,
  safeCarePhoto,
  stockholmInput,
  stockholmInstant,
  validCareUpdate,
  visibleCareUpdates,
} from '../lib/care-calendar.ts';
import { workbookLedger } from '../lib/workbook-transactions.ts';
import { profileDogs } from '../lib/donation-shell.ts';

const ledger = workbookLedger();

const entry = {
  id: 'walk-1',
  dogId: 'ake',
  activity: 'walk',
  title: 'An afternoon walk',
  note: 'A calm walk in the park.',
  startsAt: '2026-09-07T14:00:00Z',
  endsAt: '2026-09-07T14:30:00Z',
  publishedAt: '2026-09-07T12:00:00Z',
  completedAt: null,
  expenseId: null,
  photos: [],
};
const at = (time) => Date.parse(`2026-09-07T${time}:00Z`);

test('published schedules start and stop on wall time; drafts never drive a dog', () => {
  const draft = { ...entry, id: 'draft', publishedAt: null };
  assert.equal(activeDogUpdate([entry, draft], 'ake', at('13:59')), undefined);
  assert.equal(
    activeDogUpdate([entry, draft], 'ake', at('14:00')).id,
    entry.id,
  );
  assert.equal(activeDogUpdate([entry], 'ake', at('14:29')).activity, 'walk');
  assert.equal(activeDogUpdate([entry], 'ake', at('14:30')), undefined);
  assert.equal(activeDogUpdate([entry], 'koby', at('14:10')), undefined);
  assert.equal(activeDogUpdate([draft], 'ake', at('14:10')), undefined);
  assert.deepEqual(visibleCareUpdates([entry], at('11:59')), []);
});

test('the passage of time never claims that planned care was completed', () => {
  assert.equal(careUpdateStatus(entry, at('13:00')), 'Upcoming');
  assert.equal(careUpdateStatus(entry, at('14:10')), 'Scheduled now');
  assert.equal(careUpdateStatus(entry, at('15:00')), 'Awaiting update');
  const completed = { ...entry, completedAt: '2026-09-07T14:15:00Z' };
  assert.equal(careUpdateStatus(completed, at('14:15')), 'Completed');
  assert.equal(activeDogUpdate([completed], 'ake', at('14:15')), undefined);
});

test('photo badges follow the current published event or the exact replayed expense', () => {
  const photographed = {
    ...entry,
    expenseId: 'expense-1',
    photos: [{ src: '/dogs/hundstallet/ake-1.jpg', caption: 'The walk' }],
  };
  assert.equal(dogEventPhoto([photographed], 'ake', at('14:10'))?.id, entry.id);
  assert.equal(dogEventPhoto([entry], 'ake', at('14:10')), undefined);
  assert.equal(dogEventPhoto([photographed], 'koby', at('14:10')), undefined);
  assert.equal(dogEventPhoto([photographed], 'ake', at('13:59')), undefined);
  assert.equal(dogEventPhoto([photographed], 'ake', at('14:30')), undefined);
  assert.equal(
    dogEventPhoto([{ ...photographed, publishedAt: null }], 'ake', at('14:10')),
    undefined,
  );
  const completed = { ...photographed, completedAt: '2026-09-07T14:30:00Z' };
  assert.equal(
    dogEventPhoto([completed], 'ake', at('15:00'), 'expense-1')?.id,
    entry.id,
  );
  assert.equal(
    dogEventPhoto([completed], 'ake', at('15:00'), 'expense-2'),
    undefined,
  );
  assert.equal(
    dogEventPhoto(
      [{ ...completed, publishedAt: null }],
      'ake',
      at('15:00'),
      'expense-1',
    ),
    undefined,
  );
});

test('editing, unpublishing and removing an event immediately changes schedule selection', () => {
  assert.equal(
    activeDogUpdate([{ ...entry, activity: 'food' }], 'ake', at('14:10'))
      .activity,
    'food',
  );
  assert.equal(
    activeDogUpdate([{ ...entry, publishedAt: null }], 'ake', at('14:10')),
    undefined,
  );
  assert.equal(activeDogUpdate([], 'ake', at('14:10')), undefined);
  const other = {
    ...entry,
    id: 'later',
    activity: 'sleep',
    startsAt: '2026-09-07T14:05:00Z',
  };
  assert.equal(activeDogUpdate([entry, other], 'ake', at('14:10')).id, 'later');
});

test('Stockholm dates survive timezone changes, midnight and daylight saving', () => {
  assert.equal(
    stockholmInstant('2026-09-07T16:23'),
    '2026-09-07T14:23:00.000Z',
  );
  assert.equal(
    stockholmInstant('2026-01-07T16:23'),
    '2026-01-07T15:23:00.000Z',
  );
  assert.equal(
    stockholmInput(new Date('2026-09-07T22:01:00Z')),
    '2026-09-08T00:01',
  );
  assert.equal(
    stockholmInput(new Date('2026-12-31T23:01:00Z')),
    '2027-01-01T00:01',
  );
  assert.throws(() => stockholmInstant('2026-03-29T02:30'));
  assert.throws(() => stockholmInstant('2026-02-30T10:00'));
  assert.equal(
    stockholmInstant('2026-10-25T02:30'),
    '2026-10-25T00:30:00.000Z',
  );
});

test('every care basket reconciles to recorded spending without adding forecast or calendar amounts', () => {
  const original = JSON.stringify(ledger);
  let total = 0;
  for (const dog of profileDogs) {
    const basket = dogCareBasket(ledger.expenses, dog.id);
    const sum = basket.reduce((amount, item) => amount + item.amountOre, 0);
    assert.equal(
      sum,
      ledger.expenses
        .filter((expense) => expense.dogId === dog.id)
        .reduce((amount, expense) => amount + expense.amountOre, 0),
    );
    total += sum;
  }
  assert.equal(total, 478300);
  assert.deepEqual(dogCareBasket([], 'ake'), []);
  assert.equal(JSON.stringify(ledger), original);
});

test('a calendar photo can only link to the expense of the same dog', () => {
  const expense = ledger.expenses[0];
  assert.equal(
    linkedCareExpense(
      { ...entry, dogId: expense.dogId, expenseId: expense.id },
      [expense],
    ),
    expense,
  );
  assert.equal(
    linkedCareExpense(
      { ...entry, dogId: 'unrelated-dog', expenseId: expense.id },
      [expense],
    ),
    undefined,
  );
  assert.equal(
    linkedCareExpense({ ...entry, expenseId: 'missing' }, [expense]),
    undefined,
  );
});

test('calendar storage validates drafts and photos and refuses malformed data', () => {
  assert.equal(validCareUpdate(entry), true);
  assert.deepEqual(readCareCalendar(JSON.stringify([entry])), [entry]);
  for (const change of [
    { dogId: 'missing' },
    { activity: 'unknown' },
    { endsAt: entry.startsAt },
    { title: '' },
    { photos: [{ src: 'javascript:alert(1)', caption: '' }] },
  ]) {
    assert.equal(validCareUpdate({ ...entry, ...change }), false);
  }
  assert.throws(() => readCareCalendar(JSON.stringify([entry, entry])));
  assert.throws(() => readCareCalendar('{broken'));
  assert.deepEqual(readCareCalendar(null), []);
});

test('photo links accept existing assets and safe image formats only', () => {
  assert.equal(safeCarePhoto('/dogs/hundstallet/ake-1.jpg'), true);
  assert.equal(safeCarePhoto('https://hundstallet.se/photo.jpg'), true);
  assert.equal(safeCarePhoto('data:image/png;base64,aGVsbG8='), true);
  assert.equal(safeCarePhoto('data:image/svg+xml;base64,aGVsbG8='), false);
  assert.equal(safeCarePhoto('http://hundstallet.se/photo.jpg'), false);
  assert.equal(
    safeCarePhoto('https://user:password@example.com/photo.jpg'),
    false,
  );
  assert.equal(safeCarePhoto('/dogs/../../secret'), false);
});
