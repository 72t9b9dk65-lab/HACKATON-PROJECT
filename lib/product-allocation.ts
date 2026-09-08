export type ProductDraft = { id: string; name: string; amountOre: number };
export type PurchasedProduct = ProductDraft & { donorId: string };
export type ProductWallet = { id: string; pendingOre: number; usedOre: number };

export function validProductDrafts(products: ProductDraft[]) {
  return (
    Array.isArray(products) &&
    products.length > 0 &&
    products.length <= 100 &&
    new Set(products.map((p) => p?.id)).size === products.length &&
    products.every(
      (p) =>
        p &&
        typeof p.id === 'string' &&
        p.id.length > 0 &&
        p.id.length <= 180 &&
        typeof p.name === 'string' &&
        p.name.trim().length > 0 &&
        p.name.length <= 180 &&
        Number.isSafeInteger(p.amountOre) &&
        p.amountOre > 0 &&
        p.amountOre <= 100_000_000,
    )
  );
}

// Products are indivisible: exactly one wallet pays each item's complete price.
// Try expensive items first and prefer the least-spent eligible donor. If that
// greedy fit fails, a bounded search can rearrange items without splitting them.
export function assignWholeProducts(
  products: ProductDraft[],
  wallets: ProductWallet[],
): PurchasedProduct[] {
  if (
    !products.length ||
    new Set(products.map((p) => p.id)).size !== products.length ||
    products.some((p) => !validProductDrafts([p])) ||
    new Set(wallets.map((w) => w.id)).size !== wallets.length ||
    wallets.some(
      (w) =>
        !Number.isSafeInteger(w.pendingOre) ||
        w.pendingOre < 0 ||
        !Number.isSafeInteger(w.usedOre) ||
        w.usedOre < 0,
    )
  )
    throw new Error('Check product prices and donor balances.');
  const total = products.reduce((sum, p) => sum + p.amountOre, 0);
  if (wallets.reduce((sum, w) => sum + w.pendingOre, 0) < total)
    throw new Error(
      'Not enough available funds to assign these products. No balances changed.',
    );
  const ordered = [...products].sort(
    (a, b) => b.amountOre - a.amountOre || a.id.localeCompare(b.id),
  );
  const sortedWallets = [...wallets].sort((a, b) => a.id.localeCompare(b.id));
  const remaining = sortedWallets.map((w) => w.pendingOre);
  const owners = new Map<string, string>();
  const choices = (price: number) =>
    sortedWallets
      .map((wallet, index) => ({
        index,
        spent: wallet.usedOre + wallet.pendingOre - remaining[index],
        id: wallet.id,
      }))
      .filter((w) => remaining[w.index] >= price)
      .sort(
        (a, b) =>
          a.spent - b.spent ||
          remaining[b.index] - remaining[a.index] ||
          a.id.localeCompare(b.id),
      );
  let fitted = true;
  for (const product of ordered) {
    const candidate = choices(product.amountOre)[0];
    if (!candidate) {
      fitted = false;
      break;
    }
    remaining[candidate.index] -= product.amountOre;
    owners.set(product.id, candidate.id);
  }
  if (!fitted && ordered.length <= 200) {
    remaining.splice(
      0,
      remaining.length,
      ...sortedWallets.map((w) => w.pendingOre),
    );
    owners.clear();
    let attempts = 0;
    const failed = new Set<string>();
    function place(index: number): boolean {
      if (index === ordered.length) return true;
      if (++attempts > 50000) return false;
      const key = `${index}:${[...remaining].sort((a, b) => a - b).join(',')}`;
      if (failed.has(key)) return false;
      const product = ordered[index];
      const triedCapacity = new Set<number>();
      for (const choice of choices(product.amountOre)) {
        if (triedCapacity.has(remaining[choice.index])) continue;
        triedCapacity.add(remaining[choice.index]);
        remaining[choice.index] -= product.amountOre;
        owners.set(product.id, choice.id);
        if (place(index + 1)) return true;
        remaining[choice.index] += product.amountOre;
        owners.delete(product.id);
      }
      failed.add(key);
      return false;
    }
    fitted = place(0);
  }
  if (!fitted)
    throw new Error(
      'These whole products could not be placed within individual donor balances. Add funds or check the product breakdown. No balances changed.',
    );
  return products.map((product) => ({
    ...product,
    donorId: owners.get(product.id)!,
  }));
}

export function productCostShares(products: PurchasedProduct[]) {
  const shares = new Map<string, number>();
  for (const product of products)
    shares.set(
      product.donorId,
      (shares.get(product.donorId) ?? 0) + product.amountOre,
    );
  return [...shares]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([donorId, amountOre]) => ({ donorId, amountOre }));
}

export function expandProductUnits(
  id: string,
  name: string,
  quantity: number,
  unitOre: number,
): ProductDraft[] {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100)
    throw new Error('Enter a quantity from 1 to 100.');
  if (typeof name !== 'string' || !name.trim())
    throw new Error('Enter a product name and valid unit price.');
  const products = Array.from({ length: quantity }, (_, index) => ({
    id: `${id}:${index + 1}`,
    name: quantity === 1 ? name : `${name} (${index + 1}/${quantity})`,
    amountOre: unitOre,
  }));
  if (!validProductDrafts(products))
    throw new Error('Enter a product name and valid unit price.');
  return products;
}
