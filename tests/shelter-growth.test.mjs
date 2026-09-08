import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { profileDogs } from '../lib/donation-shell.ts';
import {
  shelterProgress,
  companionThresholdOre,
  companionCount,
  companionOrder,
  companionProfileId,
  buildShelterNetwork,
  pointOnRoute,
  tileSize,
  zoneSize,
  areaAsset,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  maximumShelterDonationOre,
} from '../lib/platform/shelter-growth.ts';
import { seedWorkspace } from '../lib/platform/seed.ts';
import {
  applyAction,
  balances,
  allocateProducts,
} from '../lib/platform/model.ts';
import {
  appendProofs,
  verifyReceipt,
  verifyChain,
  receiptEvidence,
  makeProof,
  anchorData,
} from '../lib/platform/proofs.ts';
import { validateAnchorResponse } from '../lib/platform/anchor-validation.ts';
const now = '2026-09-08T10:00:00.000Z';
test('cumulative donated thresholds include pending and exact one-ore boundaries', () => {
  const steps = Array.from({ length: 100 }, (_, i) =>
    i < 20
      ? (i + 1) * 50
      : i < 50
        ? 1000 + (i - 19) * 100
        : 4000 + (i - 49) * 200,
  );
  steps.forEach((sek, i) => {
    assert.equal(companionThresholdOre(i + 1), sek * 100);
    assert.equal(
      shelterProgress('a', 0, sek * 100 - 1, 0, profileDogs).residentIds.length,
      i,
    );
    assert.equal(
      shelterProgress('a', 0, sek * 100, 0, profileDogs).residentIds.length,
      i + 1,
    );
  });
  const p = shelterProgress('a', 2500, 2500, 5000, profileDogs);
  assert.equal(p.residentIds.length, 1);
  assert.equal(p.potentialIds.length, 1);
  assert.equal(p.zones.find((z) => z.id === 'food').level, 0);
  assert.equal(p.zones.find((z) => z.id === 'food').projectedLevel, 1);
  assert.equal(p.zones.find((z) => z.id === 'food').donationGapOre, 5000);
  assert.equal(p.nextDogOre, 5000);
  assert.deepEqual(
    shelterProgress('a', 5000, 0, 5000, profileDogs).residentIds,
    p.residentIds,
  );
});
test('growth preview reaches every upgrade using anonymous companions without changing the owned shelter', () => {
  const donated = 529500;
  const maximum = maximumShelterDonationOre(profileDogs);
  const owned = shelterProgress('personal', donated, 0, 0, profileDogs);
  const halfway = shelterProgress(
    'personal',
    donated,
    0,
    Math.floor((maximum - donated) / 2),
    profileDogs,
  );
  const full = shelterProgress(
    'personal',
    donated,
    0,
    maximum - donated,
    profileDogs,
  );
  assert.ok(maximum >= donated);
  assert.ok(full.zones.every((zone) => zone.projectedLevel === 5));
  assert.equal(full.residentIds.length + full.potentialIds.length, 100);
  assert.deepEqual(full.residentIds, owned.residentIds);
  assert.deepEqual(
    full.zones.map((zone) => zone.level),
    owned.zones.map((zone) => zone.level),
  );
  assert.equal(full.usedOre, owned.usedOre);
  assert.equal(full.pendingOre, owned.pendingOre);
  assert.deepEqual(owned.potentialIds, []);
  assert.ok(
    full.potentialIds.every(
      (id) =>
        id.startsWith('preview-companion-') &&
        !profileDogs.some((dog) => dog.id === id),
    ),
  );
  assert.deepEqual(
    full.potentialIds.slice(0, halfway.potentialIds.length),
    halfway.potentialIds,
  );
  assert.ok(
    halfway.zones.every(
      (zone) =>
        zone.projectedLevel >= zone.level &&
        zone.projectedLevel <=
          full.zones.find((z) => z.id === zone.id).projectedLevel,
    ),
  );
});
test('random companion prefixes are stable on reload, catalog reordering and reversals', () => {
  const order = companionOrder('personal', profileDogs);
  assert.deepEqual(
    order,
    companionOrder('personal', [...profileDogs].reverse()),
  );
  assert.equal(order.length, new Set(order).size);
  assert.ok(
    order.every(
      (id) => !profileDogs.find((d) => d.id === companionProfileId(id)).group,
    ),
  );
  assert.notDeepEqual(order, companionOrder('alex', profileDogs));
  const high = shelterProgress('personal', 900000, 0, 0, profileDogs);
  const low = shelterProgress('personal', 15000, 0, 0, profileDogs);
  assert.deepEqual(high.residentIds.slice(0, 3), low.residentIds);
  assert.equal(
    shelterProgress('personal', 1e12, 0, 0, profileDogs).residentIds.length,
    order.length,
  );
});
test('garden stays in the centre, every level has an asset, and all areas connect through approved entrances', () => {
  const p = shelterProgress('a', 1e8, 0, 0, profileDogs);
  const garden = p.zones.find((z) => z.id === 'garden');
  assert.deepEqual([garden.x, garden.y], [672, 632]);
  const network = buildShelterNetwork(p.zones);
  for (const z of p.zones) {
    assert.equal(z.level, 5);
    for (let level = 1; level <= 5; level++)
      assert.ok(
        fs.existsSync(
          new URL('../public' + areaAsset(z, level), import.meta.url),
        ),
      );
    for (const direction of z.entrances) {
      assert.ok(
        network.paths.some(
          (path) => path.zoneId === z.id && path.entrance === direction,
        ),
      );
    }
    for (const to of p.zones) {
      const path = network.route(z.id, to.id);
      assert.deepEqual(pointOnRoute(path, 0), { x: z.x, y: z.y });
      assert.deepEqual(pointOnRoute(path, 1), { x: to.x, y: to.y });
      for (let i = 1; i < path.length; i++)
        assert.ok(
          path[i].x === path[i - 1].x || path[i].y === path[i - 1].y,
          'No diagonal routes through walls',
        );
    }
  }
  assert.ok(tileSize(5) > tileSize(1));
});
test('allocation finds a whole-item solution where greedy assignment would split a product', () => {
  const products = [800, 500, 400].map((amountOre, i) => ({
    id: 'p' + i,
    description: 'Bone ' + i,
    category: 'play',
    amountOre,
    shares: [],
  }));
  const original = structuredClone(products);
  const result = allocateProducts(products, [
    { id: 'a', pending: 900 },
    { id: 'b', pending: 800 },
  ]);
  assert.deepEqual(products, original);
  assert.ok(
    result.every(
      (p) => p.shares.length === 1 && p.shares[0].amountOre === p.amountOre,
    ),
  );
  assert.equal(result[0].shares[0].donorId, 'b');
  assert.equal(result[1].shares[0].donorId, 'a');
  assert.equal(result[2].shares[0].donorId, 'a');
});
test('central product allocation grows the right shelters and correction restores pending exactly', async () => {
  let s = await seedWorkspace(now);
  let serial = 0;
  const apply = (a) => {
    s = applyAction(
      s,
      a,
      now,
      ['ake', 'koby', 'ove'],
      () => 'growth-' + ++serial,
    );
  };
  const before = balances(s);
  apply({
    type: 'receipt',
    draft: {
      supplier: 'Growth QA',
      reference: 'G-1',
      purchasedAt: '2026-09-08',
      totalOre: 100000,
      lines: [
        {
          description: 'A large bag of food',
          category: 'food',
          quantity: 2,
          unitOre: 50000,
        },
      ],
      file: null,
    },
  });
  const id = s.receipts.at(-1).id;
  apply({ type: 'fund', receiptId: id });
  const funded = balances(s);
  for (const wallet of funded) {
    const old = before.find((d) => d.id === wallet.id);
    const spent = wallet.used - old.used;
    assert.equal(old.pending - wallet.pending, spent);
    assert.equal(wallet.donated, old.donated);
    const p = shelterProgress(
      wallet.id,
      wallet.used,
      wallet.pending,
      0,
      profileDogs,
    );
    assert.equal(p.residentIds.length, companionCount(wallet.donated, 100));
  }
  apply({
    type: 'void',
    receiptId: id,
    reason: 'QA supplier refund, cancelled purchase.',
  });
  assert.deepEqual(balances(s), before);
  assert.throws(() =>
    apply({
      type: 'void',
      receiptId: id,
      reason: 'Repeated correction attempt.',
    }),
  );
});
test('proof compares live supplier, products, allocations and document to its snapshot', async () => {
  const s = await seedWorkspace(now),
    receipt = structuredClone(
      s.receipts.find((r) => r.id === 'demo-care-receipt'),
    );
  const evidence = await receiptEvidence(receipt);
  const proof = await makeProof(
    { evidenceVersion: 2, entityId: receipt.id, receipt: evidence },
    undefined,
    now,
  );
  assert.equal(await verifyReceipt(proof, receipt), 'match');
  for (const change of [
    (r) => (r.supplier += ' changed'),
    (r) => (r.reference += ' changed'),
    (r) => (r.purchasedAt = '2026-09-01'),
    (r) => (r.products[0].description += ' changed'),
    (r) => r.products[0].shares[0].amountOre++,
    (r) =>
      (r.file = {
        id: 'x',
        name: 'x.pdf',
        url: '/x',
        size: 1,
        type: 'application/pdf',
        hash: 'f'.repeat(64),
      }),
  ]) {
    const changed = structuredClone(receipt);
    change(changed);
    assert.equal(await verifyReceipt(proof, changed), 'mismatch');
  }
  const legacy = await makeProof(
    { totalOre: receipt.totalOre },
    undefined,
    now,
  );
  assert.equal(await verifyReceipt(legacy, receipt), 'legacy');
});
test('import snapshot preserves missing source document, existing proof chain and balances', async () => {
  const previous = await seedWorkspace(now),
    r = previous.receipts.find((r) => r.source === 'workbook');
  const next = applyAction(
    previous,
    { type: 'seal-record', receiptId: r.id },
    now,
    [],
    () => 'seal-qa',
  );
  await appendProofs(previous, next, now);
  const current = next.receipts.find((n) => n.id === r.id),
    proof = next.proofs.find((p) => p.id === current.proofId);
  assert.equal(proof.payload.receipt.source, 'workbook');
  assert.equal(proof.payload.receipt.documentHash, null);
  assert.equal(await verifyReceipt(proof, current), 'match');
  assert.equal(await verifyChain(next.proofs), true);
  assert.deepEqual(balances(previous), balances(next));
  assert.deepEqual(next.proofs.slice(0, -1), previous.proofs);
});
test('anchor verification rejects pending, reverted, wrong-network and mismatched evidence', () => {
  const hash = 'a'.repeat(64),
    txHash = '0x' + 'b'.repeat(64),
    blockHash = '0x' + 'c'.repeat(64);
  const tx = {
    hash: txHash,
    blockHash,
    blockNumber: '0x42',
    input: anchorData(hash),
  };
  const receipt = {
    transactionHash: txHash,
    blockHash,
    blockNumber: '0x42',
    status: '0x1',
  };
  assert.equal(
    validateAnchorResponse(hash, txHash, '0xaa36a7', tx, receipt),
    66,
  );
  for (const args of [
    [hash, txHash, '0x1', tx, receipt],
    [hash, txHash, '0xaa36a7', null, null],
    [hash, txHash, '0xaa36a7', tx, { ...receipt, status: '0x0' }],
    [hash, txHash, '0xaa36a7', { ...tx, input: '0x00' }, receipt],
    [
      hash,
      txHash,
      '0xaa36a7',
      tx,
      { ...receipt, blockHash: '0x' + 'd'.repeat(64) },
    ],
    [hash, txHash, '0xaa36a7', { ...tx, hash: '0x' + 'e'.repeat(64) }, receipt],
    [hash, txHash, '0xaa36a7', tx, { ...receipt, blockNumber: '0x43' }],
  ])
    assert.throws(() => validateAnchorResponse(...args));
});
test('same uploaded receipt cannot be charged again using a different reference', async () => {
  const s = await seedWorkspace(now);
  const draft = {
    supplier: 'Supplier',
    reference: 'A',
    purchasedAt: '2026-09-08',
    totalOre: 100,
    lines: [
      { description: 'Bone', category: 'play', quantity: 1, unitOre: 100 },
    ],
    file: {
      id: 'file',
      name: 'receipt.pdf',
      size: 4,
      type: 'application/pdf',
      url: '/file',
      hash: 'f'.repeat(64),
    },
  };
  const next = applyAction(s, { type: 'receipt', draft }, now, []);
  assert.throws(
    () =>
      applyAction(
        next,
        { type: 'receipt', draft: { ...draft, reference: 'B' } },
        now,
        [],
      ),
    /already been recorded/,
  );
  assert.deepEqual(balances(s), balances(next));
});

test('large legal batches allocate iteratively without overflowing the call stack', () => {
  const items = Array.from({ length: 10000 }, (_, i) => ({
    id: 'unit-' + i,
    description: 'Unit',
    category: 'food',
    amountOre: 1,
    shares: [],
  }));
  const result = allocateProducts(items, [
    { id: 'a', pending: 5000 },
    { id: 'b', pending: 5000 },
  ]);
  assert.equal(result.length, 10000);
  assert.ok(result.every((p) => p.shares.length === 1));
});
test('a hypothetical preview never changes the real pending coverage', () => {
  const p = shelterProgress('a', 0, 0, 5000, profileDogs);
  assert.equal(p.zones.find((z) => z.id === 'kennel').donationGapOre, 5000);
  assert.equal(p.zones.find((z) => z.id === 'kennel').projectedLevel, 1);
});
test('repeated sealing keeps the previous proof and its anchor visible', async () => {
  const a = await seedWorkspace(now),
    id = a.receipts[0].id;
  const b = applyAction(a, { type: 'seal-record', receiptId: id }, now, []);
  await appendProofs(a, b, now);
  const proofId = b.receipts[0].proofId,
    proof = b.proofs.find((p) => p.id === proofId);
  proof.anchors.push({
    chainId: '0xaa36a7',
    txHash: '0x' + 'f'.repeat(64),
    blockNumber: 10,
    at: now,
  });
  const c = applyAction(b, { type: 'seal-record', receiptId: id }, now, []);
  await appendProofs(b, c, now);
  assert.equal(c.receipts[0].proofId, proofId);
  assert.equal(c.proofs.length, b.proofs.length);
  assert.deepEqual(
    c.proofs.find((p) => p.id === proofId).anchors,
    proof.anchors,
  );
});

test('bulk import registration is complete, honestly sourced and repeat-safe', async () => {
  const a = await seedWorkspace(now);
  const b = applyAction(a, { type: 'seal-records' }, now, []);
  await appendProofs(a, b, now);
  assert.deepEqual(balances(b), balances(a));
  for (const r of b.receipts.filter((r) => r.state !== 'draft')) {
    const proof = b.proofs.find((p) => p.id === r.proofId);
    assert.equal(await verifyReceipt(proof, r), 'match');
    assert.equal(proof.payload.receipt.documentHash, r.file?.hash ?? null);
    assert.equal(proof.anchors.length, 0);
  }
  assert.equal(await verifyChain(b.proofs), true);
  const c = applyAction(b, { type: 'seal-records' }, now, []);
  await appendProofs(b, c, now);
  assert.equal(c.proofs.length, b.proofs.length);
});

test('label lanes clear all area images at every upgrade level', () => {
  const zones = shelterProgress('a', 1e8, 0, 0, profileDogs).zones;
  for (const z of zones)
    for (let level = 1; level <= 5; level++) {
      const half = zoneSize(z.id, level) / 2;
      // Fixed-height badges keep funding details in their accessible tooltip.
      const label = {
        left: z.x - (z.entrances.includes('bottom') ? 200 : 140),
        right: z.x + (z.entrances.includes('bottom') ? -20 : 140),
        top: z.y + half + 8,
      };
      assert.ok(label.left >= 0 && label.right <= WORLD_WIDTH);
      assert.ok(label.top + 84 <= WORLD_HEIGHT);
      for (const other of zones) {
        const maxHalf = zoneSize(other.id, other.id === z.id ? level : 5) / 2;
        const overlaps =
          label.left < other.x + maxHalf &&
          label.right > other.x - maxHalf &&
          label.top < other.y + maxHalf &&
          label.top + 84 > other.y - maxHalf;
        assert.equal(
          overlaps,
          false,
          `${z.id} level ${level} label overlaps ${other.id}`,
        );
      }
    }
});

test('every entrance connects at each level and outdoor roads never cross area art', () => {
  const manifest = ['garden-v3', 'grid-v2'].flatMap((folder) =>
    JSON.parse(
      fs.readFileSync(
        new URL(`../public/care/${folder}/manifest.json`, import.meta.url),
      ),
    ),
  );
  for (let level = 1; level <= 5; level++) {
    const states = shelterProgress('a', 1e8, 0, 0, profileDogs).zones.map(
      (z) => ({ ...z, level, projectedLevel: level }),
    );
    const network = buildShelterNetwork(states);
    for (const port of network.ports) {
      assert.ok(
        network.paths.some(
          (path) =>
            path.zoneId !== port.zoneId &&
            [path.points[0], path.points.at(-1)].some(
              (p) => p.x === port.outside.x && p.y === port.outside.y,
            ),
        ),
        `${port.zoneId} ${port.direction} must continue into an outdoor road at level ${level}`,
      );
    }
    for (const z of states) {
      const asset = manifest.find((a) => a.path === areaAsset(z, level));
      assert.deepEqual([...z.entrances].sort(), [...asset.entrances].sort());
    }
    for (const path of network.paths) {
      for (let i = 1; i < path.points.length; i++) {
        const a = path.points[i - 1],
          b = path.points[i];
        assert.ok(a.x === b.x || a.y === b.y);
        for (const z of states.filter((z) => z.id !== path.zoneId)) {
          const half = zoneSize(z.id, level) / 2 + 14; // include road half-width
          const crosses =
            a.x === b.x
              ? a.x > z.x - half &&
                a.x < z.x + half &&
                Math.max(a.y, b.y) > z.y - half &&
                Math.min(a.y, b.y) < z.y + half
              : a.y > z.y - half &&
                a.y < z.y + half &&
                Math.max(a.x, b.x) > z.x - half &&
                Math.min(a.x, b.x) < z.x + half;
          assert.equal(
            crosses,
            false,
            `Road crosses ${z.id} at level ${level}`,
          );
        }
      }
    }
    for (const from of states)
      for (const to of states) {
        const route = network.route(from.id, to.id);
        assert.deepEqual(route[0], { x: from.x, y: from.y });
        assert.deepEqual(route.at(-1), { x: to.x, y: to.y });
      }
    const direct = network.route('water', 'pool');
    assert.ok(
      network.route('garden', 'pool').every((point) => point.x === 672),
      'Garden connects straight to the north entrance of Pool',
    );
    assert.ok(
      !direct.some((p) => p.x === 672 && p.y === 632),
      'Adjacent areas do not detour through garden',
    );
  }
});
test('nine areas and twelve direct connections form exactly four squares', () => {
  const states = shelterProgress('a', 1e8, 0, 0, profileDogs).zones;
  const network = buildShelterNetwork(states);
  assert.equal(states.length, 9);
  assert.equal(network.connections.length, 12);
  assert.equal(network.ports.length, 24);
  assert.ok(
    network.connections.every((edge) => edge.length === 448),
    'All square sides have equal length',
  );
  const rows = [184, 632, 1080].map((y) =>
    states
      .filter((z) => z.y === y)
      .sort((a, b) => a.x - b.x)
      .map((z) => z.id),
  );
  assert.deepEqual(rows, [
    ['food', 'play', 'sport'],
    ['kennel', 'garden', 'medical'],
    ['water', 'pool', 'wellbeing'],
  ]);
  for (let y = 0; y < 2; y++)
    for (let x = 0; x < 2; x++) {
      const square = [
        rows[y][x],
        rows[y][x + 1],
        rows[y + 1][x + 1],
        rows[y + 1][x],
      ];
      for (let i = 0; i < 4; i++)
        assert.ok(
          network.connections.some(
            (c) =>
              [c.from, c.to].includes(square[i]) &&
              [c.from, c.to].includes(square[(i + 1) % 4]),
          ),
        );
    }
  for (const edge of network.connections)
    assert.equal(network.route(edge.from, edge.to).length, 2);
});
test('locked areas cannot be used as shortcuts, including in a donation preview', () => {
  for (const amount of [5000, 10000, 20000, 100000]) {
    const p = shelterProgress('a', amount, 0, 1000000, profileDogs);
    for (const preview of [false, true]) {
      const network = buildShelterNetwork(p.zones, preview);
      for (const from of p.zones.filter((z) => z.level))
        for (const to of p.zones.filter((z) => z.level)) {
          assert.ok(network.route(from.id, to.id).length);
        }
      for (const locked of p.zones.filter((z) => !z.level))
        assert.deepEqual(network.route('garden', locked.id), []);
    }
  }
});
