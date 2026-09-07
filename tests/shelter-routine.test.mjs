import test from 'node:test';
import assert from 'node:assert/strict';
import {
  daytimeNaps,
  dogIsSleeping,
  shelterMoment,
} from '../lib/platform/shelter-routine.ts';

test('All dogs sleep from 21:00 until 07:00 Stockholm time in summer and winter', () => {
  for (const [date, offset] of [
    ['2026-09-07', '+02:00'],
    ['2026-12-07', '+01:00'],
  ]) {
    for (const hour of [0, 1, 2, 3, 4, 5, 6, 21, 22, 23]) {
      const moment = shelterMoment(
        Date.parse(`${date}T${String(hour).padStart(2, '0')}:30:00${offset}`),
      );
      assert.equal(moment.night, true);
      for (const dog of ['koby', 'ove', 'ake', 'kenzo'])
        assert.equal(dogIsSleeping(dog, moment), true);
    }
    const awake = shelterMoment(Date.parse(`${date}T07:00:00${offset}`));
    assert.equal(awake.night, false);
    assert.equal(dogIsSleeping('koby', awake), false);
    assert.equal(
      shelterMoment(Date.parse(`${date}T20:59:00${offset}`)).night,
      false,
    );
    assert.equal(
      shelterMoment(Date.parse(`${date}T21:00:00${offset}`)).night,
      true,
    );
  }
});

test('Every daily schedule totals 3–4 hours, fits daytime and keeps naps separate', () => {
  for (const day of ['2026-09-07', '2026-09-08', '2026-03-29', '2026-10-25']) {
    for (let dog = 0; dog < 60; dog++) {
      const id = `dog-${dog}`;
      const naps = daytimeNaps(id, day);
      const total = naps.reduce((sum, nap) => sum + nap.end - nap.start, 0);
      assert.ok(total >= 180 && total <= 240);
      assert.ok(naps.length === 3 || naps.length === 4);
      for (const [index, nap] of naps.entries()) {
        assert.ok(nap.start >= 420 && nap.end <= 1260 && nap.end > nap.start);
        if (index) assert.ok(nap.start > naps[index - 1].end);
        assert.equal(
          dogIsSleeping(id, { day, minute: nap.start - 1, night: false }),
          false,
        );
        assert.equal(
          dogIsSleeping(id, { day, minute: nap.start, night: false }),
          true,
        );
        assert.equal(
          dogIsSleeping(id, { day, minute: nap.end - 1, night: false }),
          true,
        );
        assert.equal(
          dogIsSleeping(id, { day, minute: nap.end, night: false }),
          false,
        );
      }
    }
  }
});

test('Schedules survive refreshes, vary by dog and change each calendar day', () => {
  const day = '2026-09-07';
  const koby = daytimeNaps('koby', day);
  assert.deepEqual(daytimeNaps('koby', day), koby);
  assert.notDeepEqual(daytimeNaps('ove', day), koby);
  assert.notDeepEqual(daytimeNaps('koby', '2026-09-08'), koby);
  let independentMinute = false;
  for (let minute = 420; minute < 1260; minute++) {
    const moment = { day, minute, night: false };
    if (dogIsSleeping('koby', moment) !== dogIsSleeping('ove', moment))
      independentMinute = true;
  }
  assert.ok(independentMinute);
});

test('Stockholm calendar and night sleep remain correct across DST clock changes', () => {
  const summer = shelterMoment(Date.parse('2026-09-07T22:30:00Z'));
  assert.deepEqual(summer, { day: '2026-09-08', minute: 30, night: true });
  for (const instant of [
    '2026-03-29T00:30:00Z',
    '2026-03-29T01:30:00Z',
    '2026-10-25T00:30:00Z',
    '2026-10-25T01:30:00Z',
  ]) {
    const moment = shelterMoment(Date.parse(instant));
    assert.equal(moment.night, true);
    assert.equal(dogIsSleeping('ove', moment), true);
  }
});
