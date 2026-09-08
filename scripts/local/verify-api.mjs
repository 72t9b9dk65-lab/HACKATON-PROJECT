import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { balances, supportedDogs } from '../../lib/platform/model.ts';
import { verifyChain, sha256 } from '../../lib/platform/proofs.ts';
const base = process.env.CARE_QA_URL;
if (base !== 'http://127.0.0.1:3002')
  throw new Error(
    'Run only against the isolated QA server on port 3002, with its own CARE_STATE_DIR.',
  );
const timings = [];
async function get() {
  const res = await fetch(`${base}/api/platform`);
  assert.equal(res.status, 200);
  return res.json();
}
async function submit(
  state,
  action,
  { id = crypto.randomUUID(), revision = state.revision, status = 200 } = {},
) {
  const start = performance.now();
  const response = await fetch(`${base}/api/platform`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, revision, action }),
  });
  const data = await response.json();
  assert.equal(response.status, status, JSON.stringify(data));
  timings.push({
    action: action.type,
    ms: Math.round(performance.now() - start),
  });
  return { state: data, id };
}
async function upload(bytes, name, type) {
  const body = new FormData();
  body.append('file', new File([bytes], name, { type }));
  const response = await fetch(`${base}/api/platform/upload`, {
    method: 'POST',
    body,
  });
  const data = await response.json();
  assert.equal(response.status, 200, JSON.stringify(data));
  return data;
}
const initial = await get();
let state = initial;
const receiptText = `QA supplier\nReceipt: QA-${crypto.randomUUID()}\n2026-09-07\nSmall bone 3 x 14.99\nLarge bone 2 x 22.05\nTotal 89.07 SEK`;
const ocr = await fetch(`${base}/api/receipt-extraction`, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },
  body: receiptText,
});
assert.equal(ocr.status, 200);
assert.equal((await ocr.json()).text, receiptText);
const document = await upload(receiptText, 'qa-receipt.txt', 'text/plain');
assert.equal(document.hash, await sha256(receiptText));
const download = await fetch(`${base}${document.url}`);
assert.equal(await download.text(), receiptText);
const gift = {
  type: 'donate',
  donorId: 'noah',
  amountOre: 12345,
  monthly: false,
  category: 'food',
};
const donated = await submit(state, gift);
state = donated.state;
const replay = await submit(initial, gift, {
  id: donated.id,
  revision: initial.revision,
});
assert.equal(replay.state.revision, state.revision);
assert.equal(replay.state.gifts.length, state.gifts.length);
const current = state;
const command = () => ({
  id: crypto.randomUUID(),
  revision: current.revision,
  action: gift,
});
const commands = [command(), command()];
const races = await Promise.all(
  commands.map(async (c) => {
    const response = await fetch(`${base}/api/platform`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(c),
    });
    return response.status;
  }),
);
assert.deepEqual(races.sort(), [200, 409]);
state = await get();
assert.equal(state.gifts.length, initial.gifts.length + 2);
const draft = {
  supplier: 'QA supplier',
  reference: `QA-${crypto.randomUUID()}`,
  purchasedAt: '2026-09-07',
  totalOre: 8907,
  lines: [
    { description: 'Small bone', category: 'play', quantity: 3, unitOre: 1499 },
    { description: 'Large bone', category: 'play', quantity: 2, unitOre: 2205 },
  ],
  file: document,
};
const beforeDraft = balances(state);
state = (await submit(state, { type: 'receipt', draft })).state;
assert.deepEqual(balances(state), beforeDraft);
const receiptId = state.receipts.at(-1).id;
await submit(state, { type: 'receipt', draft }, { status: 400 });
const fresh = await get();
assert.equal(fresh.revision, state.revision);
const funded = await submit(state, { type: 'fund', receiptId });
state = funded.state;
const usedDelta =
  balances(state).reduce((n, d) => n + d.used, 0) -
  beforeDraft.reduce((n, d) => n + d.used, 0);
assert.equal(usedDelta, 8907);
assert.equal(state.receipts.at(-1).products.length, 5);
const imageBytes = await readFile(
  new URL('../../public/dogs/hundstallet/koby-1.jpg', import.meta.url),
);
const photo = await upload(imageBytes, 'qa-koby.jpg', 'image/jpeg');
const stamp = new Date().toISOString();
const products = state.receipts.at(-1).products;
const post = {
  title: 'QA care moment',
  note: 'Isolated verification fixture, not a real care event.',
  dogIds: ['koby', 'ove'],
  productIds: products.map((p) => p.id),
  category: 'play',
  stage: 'confidence',
  photo,
  occurredAt: stamp,
  publishAt: stamp,
  liveHours: 1,
};
await submit(
  state,
  { type: 'publish', post: { ...post, category: 'food' } },
  { status: 400 },
);
state = (await submit(state, { type: 'publish', post })).state;
const postId = state.posts.at(-1).id;
const contributor = products[0].shares[0].donorId;
assert.ok(supportedDogs(state, contributor).includes('koby'));
assert.ok(supportedDogs(state, contributor).includes('ove'));
assert.equal(await verifyChain(state.proofs), true);
const uploaded = await fetch(`${base}${photo.url}`);
assert.equal(uploaded.status, 200);
assert.equal(uploaded.headers.get('x-content-type-options'), 'nosniff');
assert.equal(await sha256(await uploaded.arrayBuffer()), photo.hash);
const wrongOrigin = await fetch(`${base}/api/platform`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Origin: 'https://unrelated.example',
  },
  body: JSON.stringify({
    id: crypto.randomUUID(),
    revision: state.revision,
    action: gift,
  }),
});
assert.equal(wrongOrigin.status, 403);
const validPhotoAsPdf = await submit(
  state,
  { type: 'publish', post: { ...post, photo: document } },
  { status: 400 },
);
assert.match(validPhotoAsPdf.state.error, /image/);
const directAnchor = await submit(
  state,
  {
    type: 'anchor',
    proofId: state.proofs[0].id,
    chainId: '0xaa36a7',
    txHash: '0x' + 'a'.repeat(64),
    blockNumber: 1,
  },
  { status: 400 },
);
assert.match(directAnchor.state.error, /verification endpoint/);
state = (
  await submit(state, {
    type: 'void',
    receiptId,
    reason: 'QA correction verifies that funds return exactly once.',
  })
).state;
assert.equal(
  balances(state).reduce((n, d) => n + d.used, 0),
  beforeDraft.reduce((n, d) => n + d.used, 0),
);
assert.equal(state.receipts.at(-1).products.length, 5);
state = (
  await submit(state, {
    type: 'withdraw',
    postId,
    reason: 'The isolated QA run is complete.',
  })
).state;
assert.equal(await verifyChain(state.proofs), true);
assert.equal((await get()).revision, state.revision);
console.log(
  JSON.stringify(
    {
      result: 'PASS',
      checks: [
        'OCR text',
        'upload and download hash',
        'gift retry idempotency',
        'concurrent-write conflict',
        'review before spending',
        'duplicate receipt rejection',
        'five priced products',
        'photo category inheritance',
        'multiple dogs',
        'shared persistence',
        'file type validation',
        'local-origin boundary',
        'anchor verification boundary',
        'correction without deletion',
        'fingerprint chain',
      ],
      revision: state.revision,
      timings,
    },
    null,
    2,
  ),
);
