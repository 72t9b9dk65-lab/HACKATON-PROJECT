import assert from 'node:assert/strict';
import { balances } from '../../lib/platform/model.ts';
import {
  shelterProgress,
  companionCount,
} from '../../lib/platform/shelter-growth.ts';
import { verifyReceipt } from '../../lib/platform/proofs.ts';
const donor = 'http://127.0.0.1:3011',
  staff = 'http://127.0.0.1:3012';
if (process.env.CARE_CONNECTED_QA !== '1')
  throw new Error(
    'Use isolated ports 3011/3012 and CARE_STATE_DIR only. Set CARE_CONNECTED_QA=1.',
  );
async function request(
  origin,
  path,
  { method = 'GET', cookie = '', body, form, status = 200 } = {},
) {
  const res = await fetch(origin + path, {
    method,
    redirect: 'manual',
    headers: {
      ...(method === 'POST' ? { Origin: origin } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : form,
  });
  assert.equal(
    res.status,
    status,
    `${method} ${path}: ${await (res.status !== status ? res.text() : Promise.resolve(''))}`,
  );
  return res;
}
assert.equal(
  (await (await request(donor, '/api/auth/session')).json()).demo,
  true,
);
await request(staff, '/api/platform', { status: 401 });
await request(donor, '/staff', { status: 404 });
const login = await request(staff, '/api/auth/demo', {
  method: 'POST',
  form: new FormData(),
  status: 303,
});
const staffCookie = login.headers.get('set-cookie').split(';')[0],
  suffix = crypto.randomUUID();
async function account(label) {
  const form = new FormData();
  form.set('email', `${label}-${suffix}@example.test`);
  form.set('name', label);
  const r = await request(donor, '/api/auth/demo', {
    method: 'POST',
    form,
    status: 303,
  });
  const cookie = r.headers.get('set-cookie').split(';')[0];
  const state = await (
    await request(donor, '/api/platform', { cookie })
  ).json();
  assert.equal(state.donors.length, 1);
  assert.equal(balances(state)[0].pending, 0);
  return { id: state.viewer.id, email: state.viewer.email, cookie };
}
const a = await account('A'),
  b = await account('B');
const state = () =>
  request(staff, '/api/platform', { cookie: staffCookie }).then((r) =>
    r.json(),
  );
async function action(value, id = crypto.randomUUID(), revision) {
  const current = await state();
  return (
    await request(staff, '/api/platform', {
      method: 'POST',
      cookie: staffCookie,
      body: { id, revision: revision ?? current.revision, action: value },
    })
  ).json();
}
assert.ok(
  (await state()).donors.find((d) => d.id === a.id && d.email === a.email),
);
const unit =
  Math.max(...balances(await state()).map((d) => d.pending)) + 100000;
const received = unit + 100000;
for (const who of [a, b])
  await action({
    type: 'record-gift',
    donorId: who.id,
    amountOre: received,
    reference: suffix + who.id,
    method: 'bank',
    receivedAt: '2026-09-08',
  });
const text = 'QA receipt ' + suffix,
  form = new FormData();
form.set('file', new File([text], 'receipt.txt', { type: 'text/plain' }));
const file = await (
  await request(staff, '/api/platform/upload', {
    method: 'POST',
    cookie: staffCookie,
    form,
  })
).json();
await request(donor, file.url, { cookie: a.cookie, status: 404 });
assert.equal(
  await (await request(staff, file.url, { cookie: staffCookie })).text(),
  text,
);
let next = await action({
  type: 'receipt',
  draft: {
    supplier: 'Connected QA',
    reference: suffix,
    purchasedAt: '2026-09-08',
    totalOre: unit * 2,
    file,
    lines: [
      {
        description: 'Care equipment',
        category: 'comfort',
        quantity: 2,
        unitOre: unit,
      },
    ],
  },
});
const receipt = next.receipts.at(-1),
  cmd = crypto.randomUUID(),
  revision = next.revision,
  before = balances(next);
next = await action({ type: 'fund', receiptId: receipt.id }, cmd, revision);
const replay = await action(
  { type: 'fund', receiptId: receipt.id },
  cmd,
  revision,
);
assert.equal(next.revision, replay.revision);
for (const who of [a, b]) {
  const view = await (
      await request(donor, '/api/platform', { cookie: who.cookie })
    ).json(),
    wallet = balances(view)[0];
  assert.equal(wallet.used, unit);
  assert.equal(wallet.pending, 100000);
  assert.equal(wallet.donated, received);
  const p = shelterProgress(who.id, wallet.used, wallet.pending, 0, [
    { id: 'dog' },
  ]);
  assert.equal(p.residentIds.length, companionCount(received, 100));
  assert.ok(p.zones.some((z) => z.level >= 4));
  const r = view.receipts.find((r) => r.id === receipt.id);
  assert.equal(
    await verifyReceipt(
      view.proofs.find((p) => p.id === r.proofId),
      r,
    ),
    'match',
  );
  assert.equal(JSON.stringify(view).includes((who === a ? b : a).email), false);
  assert.equal(view.donors.length, 1);
  assert.deepEqual(view.audit, []);
  await request(donor, '/api/platform', {
    method: 'POST',
    cookie: who.cookie,
    body: {
      id: crypto.randomUUID(),
      revision: view.revision,
      action: { type: 'fund-pending' },
    },
    status: 403,
  });
  await request(donor, '/api/platform/upload', {
    method: 'POST',
    cookie: who.cookie,
    form,
    status: 403,
  });
}
const invalid = await fetch(staff + '/api/platform', {
  method: 'POST',
  headers: {
    Cookie: staffCookie,
    Origin: donor,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    id: crypto.randomUUID(),
    revision: next.revision,
    action: { type: 'fund-pending' },
  }),
});
assert.equal(invalid.status, 403);
await action({ type: 'void', receiptId: receipt.id, reason: 'QA reversal' });
const reversed = balances(await state());
for (const who of [a, b])
  assert.equal(
    reversed.find((d) => d.id === who.id).pending,
    before.find((d) => d.id === who.id).pending,
  );
await request(staff, '/api/auth/logout', {
  method: 'POST',
  cookie: staffCookie,
  status: 303,
});
await request(staff, '/api/platform', { cookie: staffCookie, status: 401 });
console.log(
  'Connected API checks passed: registration, isolation, staff permissions, document privacy, allocation, spending upgrades, proofs, replay safety, reversal and logout.',
);
