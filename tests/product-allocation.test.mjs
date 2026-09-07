import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignWholeProducts,
  expandProductUnits,
  productCostShares,
  validProductDrafts,
} from '../lib/product-allocation.ts';

const items = (prices) =>
  prices.map((amountOre, i) => ({
    id: `bone-${i}`,
    name: `Bone ${i + 1}`,
    amountOre,
  }));
const wallets = (balances) =>
  balances.map((pendingOre, i) => ({
    id: `donor-${i}`,
    pendingOre,
    usedOre: 0,
  }));

test('five differently priced bones keep their full prices and have one donor each', () => {
  const products = items([200, 300, 400, 600, 900]);
  const donors = wallets([1000, 800, 2000, 0]);
  const original = JSON.stringify({ products, donors });
  const assigned = assignWholeProducts(products, donors);
  assert.deepEqual(
    assigned.map(({ donorId: _donorId, ...p }) => p),
    products,
  );
  assert.equal(new Set(assigned.map((p) => p.id)).size, 5);
  assert.equal(
    productCostShares(assigned).reduce(
      (sum, share) => sum + share.amountOre,
      0,
    ),
    2400,
  );
  assert.ok(
    productCostShares(assigned).every(
      (share) =>
        share.amountOre <=
        donors.find((d) => d.id === share.donorId).pendingOre,
    ),
  );
  assert.deepEqual(assignWholeProducts(products, donors), assigned);
  assert.equal(JSON.stringify({ products, donors }), original);
});

test('quantities create separate physical units at the stated unit price', () => {
  const products = expandProductUnits('order', 'Chew bone', 5, 1299);
  assert.equal(products.length, 5);
  assert.equal(new Set(products.map((p) => p.id)).size, 5);
  assert.ok(products.every((p) => p.amountOre === 1299));
  assert.equal(
    products.reduce((sum, p) => sum + p.amountOre, 0),
    6495,
  );
});

test('bounded rearrangement fits products when the greedy placement gets stuck', () => {
  const assigned = assignWholeProducts(
    items([6, 5, 4, 3, 2]),
    wallets([10, 10]),
  );
  assert.deepEqual(
    productCostShares(assigned).map((s) => s.amountOre),
    [10, 10],
  );
});

test('insufficient individual capacity fails without splitting prices or mutating inputs', () => {
  const products = items([11]);
  const donors = wallets([10, 10]);
  assert.throws(
    () => assignWholeProducts(products, donors),
    /individual donor balances/,
  );
  assert.deepEqual(products, items([11]));
  assert.deepEqual(donors, wallets([10, 10]));
  assert.throws(() => assignWholeProducts(items([21]), donors), /Not enough/);
});

test('invalid product data cannot enter an allocation', () => {
  for (const quantity of [0, -1, 1.5, 101, NaN])
    assert.throws(
      () => expandProductUnits('p', 'Bone', quantity, 100),
      /quantity/,
    );
  for (const quantity of [1, 5])
    assert.throws(
      () => expandProductUnits('p', ' ', quantity, 100),
      /product name/,
    );
  for (const price of [0, -1, 1.5, Infinity])
    assert.throws(
      () => expandProductUnits('p', 'Bone', 1, price),
      /valid unit price/,
    );
  assert.equal(validProductDrafts([items([1])[0], items([1])[0]]), false);
  assert.throws(
    () => assignWholeProducts([items([1])[0], items([1])[0]], wallets([10])),
    /Check product/,
  );
  assert.throws(
    () => assignWholeProducts(items([1]), wallets([-1])),
    /Check product/,
  );
});
