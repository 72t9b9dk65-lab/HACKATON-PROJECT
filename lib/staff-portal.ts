import { fundingSummary, profileDogs } from './donation-shell.ts';
import {
  expenseActivity,
  expenseCategories,
  spendingSummary,
  type DemoExpense,
  type ExpenseCategory,
  type GivingLedger,
} from './donation-spending.ts';
import { safeCarePhoto, type CareUpdate } from './care-calendar.ts';
import {
  assignWholeProducts,
  productCostShares,
  validProductDrafts,
  type ProductDraft,
  type PurchasedProduct,
} from './product-allocation.ts';

export const STAFF_STORAGE_KEY = 'hundstallet.staff-portfolios.v1';
export const PERSONAL_DONOR_ID = 'personal';
export type CostShare = { donorId: string; amountOre: number };
export type ReceiptFile = { name: string; src: string; type: string };
export type StaffPhoto = {
  id: string;
  src: string;
  dogIds: string[];
  postedAt: string;
  liveHours: 1 | 2;
};
export type ReceiptLine = {
  id: string;
  description: string;
  category: ExpenseCategory;
  amountOre: number;
  allocations: CostShare[];
  products?: PurchasedProduct[];
};
export type StaffReceipt = {
  id: string;
  supplier: string;
  reference: string;
  purchasedOn: string;
  recordedAt: string;
  file: ReceiptFile;
  lines: ReceiptLine[];
};
export type StaffLedger = {
  version: 1;
  donors: { id: string; name: string; donatedOre: number }[];
  receipts: StaffReceipt[];
  photos: Record<string, StaffPhoto[]>;
  products?: Record<string, PurchasedProduct[]>;
  productsDistributedAt?: string;
  distribution?: {
    updatedAt: string;
    allocations: Record<string, CostShare[]>;
  };
};
export type PortalTransaction = {
  id: string;
  description: string;
  category: ExpenseCategory;
  amountOre: number;
  recordedAt: string;
  supplier: string;
  receiptId?: string;
  allocations: CostShare[];
  photos: StaffPhoto[];
  legacy?: DemoExpense;
  products?: PurchasedProduct[];
};
export type DonorTransaction = PortalTransaction & { expenses: DemoExpense[] };

export function emptyStaffLedger(): StaffLedger {
  return {
    version: 1,
    donors: [
      { id: 'demo-alex', name: 'Alex Lind', donatedOre: 120000 },
      { id: 'demo-maja', name: 'Maja Berg', donatedOre: 80000 },
      { id: 'demo-noah', name: 'Noah Ek', donatedOre: 200000 },
    ],
    receipts: [],
    photos: {},
  };
}
const positiveMoney = (n: number) =>
  Number.isSafeInteger(n) && n > 0 && n <= 100_000_000;
const text = (v: unknown, max = 180): v is string =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const date = (v: unknown): v is string =>
  typeof v === 'string' && Number.isFinite(Date.parse(v));
export function safeReceiptFile(file: ReceiptFile) {
  return (
    file &&
    text(file.name) &&
    ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(
      file.type,
    ) &&
    typeof file.src === 'string' &&
    file.src.length <= 1_400_000 &&
    file.src.startsWith(`data:${file.type};base64,`) &&
    /^[A-Za-z0-9+/=]+$/.test(file.src.split(',')[1] ?? '')
  );
}
function validPhoto(photo: StaffPhoto) {
  return (
    photo &&
    text(photo.id) &&
    safeCarePhoto(photo.src) &&
    date(photo.postedAt) &&
    [1, 2].includes(photo.liveHours) &&
    Array.isArray(photo.dogIds) &&
    photo.dogIds.length > 0 &&
    new Set(photo.dogIds).size === photo.dogIds.length &&
    photo.dogIds.every((id) =>
      profileDogs.some((dog) => dog.id === id && !dog.group),
    )
  );
}
export function readStaffLedger(raw: string | null): StaffLedger {
  if (!raw) return emptyStaffLedger();
  const value = JSON.parse(raw) as StaffLedger;
  if (
    !value ||
    value.version !== 1 ||
    !Array.isArray(value.donors) ||
    !Array.isArray(value.receipts) ||
    value.receipts.length > 500 ||
    !value.photos ||
    typeof value.photos !== 'object' ||
    Array.isArray(value.photos)
  )
    throw new Error(
      'The staff records could not be read. Existing data was kept.',
    );
  const ids = new Set([PERSONAL_DONOR_ID]);
  for (const donor of value.donors) {
    if (
      !donor ||
      !text(donor.id) ||
      ids.has(donor.id) ||
      !text(donor.name, 60) ||
      !positiveMoney(donor.donatedOre)
    )
      throw new Error('Invalid donor record.');
    ids.add(donor.id);
  }
  const receiptIds = new Set<string>();
  const lineIds = new Set<string>();
  for (const receipt of value.receipts) {
    if (
      !receipt ||
      !text(receipt.id) ||
      receiptIds.has(receipt.id) ||
      !text(receipt.supplier) ||
      !text(receipt.reference) ||
      !date(receipt.purchasedOn) ||
      !date(receipt.recordedAt) ||
      !safeReceiptFile(receipt.file) ||
      !Array.isArray(receipt.lines) ||
      !receipt.lines.length ||
      receipt.lines.length > 30
    )
      throw new Error('Invalid receipt.');
    receiptIds.add(receipt.id);
    for (const line of receipt.lines) {
      if (
        !line ||
        !text(line.id) ||
        lineIds.has(line.id) ||
        !text(line.description) ||
        !positiveMoney(line.amountOre) ||
        !expenseCategories.some((c) => c.id === line.category) ||
        !Array.isArray(line.allocations) ||
        !line.allocations.length ||
        new Set(line.allocations.map((a) => a.donorId)).size !==
          line.allocations.length ||
        line.allocations.some(
          (a) => !ids.has(a.donorId) || !positiveMoney(a.amountOre),
        ) ||
        line.allocations.reduce((n, a) => n + a.amountOre, 0) !== line.amountOre
      )
        throw new Error('Invalid receipt allocation.');
      lineIds.add(line.id);
      if (
        line.products &&
        (!validProductDrafts(line.products) ||
          line.products.some((p) => !ids.has(p.donorId)) ||
          line.products.reduce((sum, p) => sum + p.amountOre, 0) !==
            line.amountOre ||
          JSON.stringify(productCostShares(line.products)) !==
            JSON.stringify(
              [...line.allocations].sort((a, b) =>
                a.donorId.localeCompare(b.donorId),
              ),
            ))
      )
        throw new Error('Invalid receipt products.');
    }
  }
  for (const photos of Object.values(value.photos)) {
    if (
      !Array.isArray(photos) ||
      photos.length > 30 ||
      !photos.every(validPhoto) ||
      new Set(photos.map((p) => p.id)).size !== photos.length
    )
      throw new Error('Invalid staff photo.');
  }
  if (value.distribution !== undefined) {
    const distribution = value.distribution;
    if (
      !distribution ||
      !date(distribution.updatedAt) ||
      !distribution.allocations ||
      typeof distribution.allocations !== 'object' ||
      Array.isArray(distribution.allocations)
    )
      throw new Error('Invalid transaction distribution.');
    for (const shares of Object.values(distribution.allocations)) {
      if (
        !Array.isArray(shares) ||
        !shares.length ||
        shares.some(
          (share) =>
            !share ||
            !ids.has(share.donorId) ||
            !positiveMoney(share.amountOre),
        ) ||
        new Set(shares.map((share) => share.donorId)).size !== shares.length
      )
        throw new Error('Invalid transaction distribution.');
    }
  }
  if (value.products !== undefined) {
    if (
      !value.products ||
      typeof value.products !== 'object' ||
      Array.isArray(value.products)
    )
      throw new Error('Invalid purchased products.');
    for (const products of Object.values(value.products)) {
      if (
        !validProductDrafts(products) ||
        products.some((p) => !ids.has(p.donorId))
      )
        throw new Error('Invalid purchased products.');
    }
  }
  if (
    value.productsDistributedAt !== undefined &&
    !date(value.productsDistributedAt)
  )
    throw new Error('Invalid product distribution date.');
  return value;
}

// Water filling keeps costs equal until a wallet reaches its balance. Integer
// öre and stable donor ordering conserve the receipt total, including odd cents.
export function splitCostEqually(
  amountOre: number,
  wallets: { id: string; pendingOre: number }[],
): CostShare[] {
  if (!positiveMoney(amountOre))
    throw new Error('Enter a valid amount in SEK.');
  if (
    new Set(wallets.map((w) => w.id)).size !== wallets.length ||
    wallets.some((w) => !Number.isSafeInteger(w.pendingOre) || w.pendingOre < 0)
  )
    throw new Error('Invalid donor balances.');
  const available = wallets
    .filter((w) => w.pendingOre > 0)
    .sort((a, b) => a.id.localeCompare(b.id));
  if (available.reduce((n, w) => n + w.pendingOre, 0) < amountOre)
    throw new Error(
      'Not enough donated funds. This receipt has not been charged.',
    );
  const allocated = new Map(available.map((w) => [w.id, 0]));
  let remaining = amountOre;
  let active = available;
  while (remaining > 0) {
    const each = Math.floor(remaining / active.length);
    const capped = active.filter((wallet) => wallet.pendingOre <= each);
    if (capped.length) {
      for (const wallet of capped) {
        allocated.set(wallet.id, wallet.pendingOre);
        remaining -= wallet.pendingOre;
      }
      active = active.filter((wallet) => wallet.pendingOre > each);
      continue;
    }
    let cents = remaining % active.length;
    for (const wallet of active) {
      const share = each + (cents-- > 0 ? 1 : 0);
      allocated.set(wallet.id, share);
      remaining -= share;
    }
  }
  return [...allocated]
    .filter(([, n]) => n > 0)
    .map(([donorId, amountOre]) => ({ donorId, amountOre }));
}

export function portalTransactions(
  staff: StaffLedger,
  base: GivingLedger,
): PortalTransaction[] {
  return [
    ...base.expenses.map((expense) => ({
      id: expense.id,
      description: expenseCategories.find((c) => c.id === expense.category)!
        .label,
      category: expense.category,
      amountOre: expense.amountOre,
      recordedAt: expense.recordedAt,
      supplier: 'Imported transaction',
      allocations: staff.distribution?.allocations[expense.id] ?? [
        { donorId: PERSONAL_DONOR_ID, amountOre: expense.amountOre },
      ],
      photos: staff.photos[expense.id] ?? [],
      legacy: expense,
    })),
    ...staff.receipts.flatMap((receipt) =>
      receipt.lines.map((line) => ({
        ...line,
        allocations:
          staff.distribution?.allocations[line.id] ?? line.allocations,
        recordedAt: receipt.purchasedOn,
        supplier: receipt.supplier,
        receiptId: receipt.id,
        photos: staff.photos[line.id] ?? [],
      })),
    ),
  ]
    .map((transaction): PortalTransaction => {
      const products =
        staff.products?.[transaction.id] ??
        ('products' in transaction
          ? (transaction.products as PurchasedProduct[] | undefined)
          : undefined);
      return products
        ? { ...transaction, products, allocations: productCostShares(products) }
        : transaction;
    })
    .sort(
      (a, b) =>
        Date.parse(b.recordedAt) - Date.parse(a.recordedAt) ||
        b.id.localeCompare(a.id),
    );
}
export function donorPortfolios(
  staff: StaffLedger,
  base: GivingLedger,
  personalName = 'Your shelter',
) {
  const total = spendingSummary(base).totalOre;
  const transactions = portalTransactions(staff, base);
  const productIds = new Set<string>();
  for (const transaction of transactions)
    for (const product of transaction.products ?? []) {
      if (productIds.has(product.id))
        throw new Error(
          'Product identifiers must be unique. Existing records were kept.',
        );
      productIds.add(product.id);
    }
  for (const [id, products] of Object.entries(staff.products ?? {})) {
    const transaction = transactions.find((tx) => tx.id === id);
    if (
      !transaction ||
      products.reduce((sum, p) => sum + p.amountOre, 0) !==
        transaction.amountOre
    )
      throw new Error(
        'Product prices must add up to their transaction total. Existing records were kept.',
      );
  }
  for (const [id, shares] of Object.entries(
    staff.distribution?.allocations ?? {},
  )) {
    const transaction = transactions.find((tx) => tx.id === id);
    if (
      !transaction ||
      shares.reduce((sum, share) => sum + share.amountOre, 0) !==
        transaction.amountOre
    )
      throw new Error(
        'Transaction distribution does not match the recorded costs. Existing records were kept.',
      );
  }
  return [
    { id: PERSONAL_DONOR_ID, name: personalName, donatedOre: total },
    ...staff.donors,
  ].map((donor) => {
    const usedOre = transactions.reduce(
      (n, tx) =>
        n +
        (tx.allocations.find((a) => a.donorId === donor.id)?.amountOre ?? 0),
      0,
    );
    if (usedOre > donor.donatedOre)
      throw new Error(
        'A donor balance does not match its transactions. Existing records were kept.',
      );
    return { ...donor, usedOre, pendingOre: donor.donatedOre - usedOre };
  });
}

// Release the previous assignments for itemized transactions, then assign their
// individual products whole. Unitemized historical costs remain unchanged.
export function distributeTransactions(
  staff: StaffLedger,
  base: GivingLedger,
  updatedAt: string,
): StaffLedger {
  const transactions = portalTransactions(staff, base).filter(
    (tx) => tx.products?.length,
  );
  if (!transactions.length)
    throw new Error(
      'Enter purchased products and their prices before distributing them.',
    );
  const wallets = donorPortfolios(staff, base).map((donor) => ({
    id: donor.id,
    usedOre: 0,
    pendingOre:
      donor.pendingOre +
      transactions.reduce(
        (sum, tx) =>
          sum +
          (tx.allocations.find((share) => share.donorId === donor.id)
            ?.amountOre ?? 0),
        0,
      ),
  }));
  const assigned = assignWholeProducts(
    transactions.flatMap((tx) => tx.products!),
    wallets,
  );
  const byId = new Map(assigned.map((product) => [product.id, product]));
  const products = { ...staff.products };
  for (const tx of transactions)
    products[tx.id] = tx.products!.map((product) => byId.get(product.id)!);
  const next = { ...staff, products, productsDistributedAt: updatedAt };
  readStaffLedger(JSON.stringify(next));
  donorPortfolios(next, base);
  return next;
}

export function setTransactionProducts(
  staff: StaffLedger,
  base: GivingLedger,
  transactionId: string,
  drafts: ProductDraft[],
): StaffLedger {
  const transaction = portalTransactions(staff, base).find(
    (tx) => tx.id === transactionId,
  );
  if (
    !transaction ||
    !validProductDrafts(drafts) ||
    drafts.reduce((sum, p) => sum + p.amountOre, 0) !== transaction.amountOre
  )
    throw new Error(
      'Product prices must add up exactly to this transaction’s total.',
    );
  const wallets = donorPortfolios(staff, base).map((donor) => {
    const previous =
      transaction.allocations.find((share) => share.donorId === donor.id)
        ?.amountOre ?? 0;
    return {
      id: donor.id,
      pendingOre: donor.pendingOre + previous,
      usedOre: 0,
    };
  });
  const products = assignWholeProducts(drafts, wallets);
  const next = {
    ...staff,
    products: { ...staff.products, [transactionId]: products },
  };
  readStaffLedger(JSON.stringify(next));
  donorPortfolios(next, base);
  return next;
}

export function planReceipt(
  staff: StaffLedger,
  base: GivingLedger,
  input: Omit<StaffReceipt, 'lines'> & {
    lines: (Omit<ReceiptLine, 'allocations' | 'products'> & {
      products?: ProductDraft[];
    })[];
  },
): StaffReceipt {
  if (
    staff.receipts.some(
      (r) =>
        r.id === input.id ||
        (r.supplier.trim().toLowerCase() ===
          input.supplier.trim().toLowerCase() &&
          r.reference.trim().toLowerCase() ===
            input.reference.trim().toLowerCase()),
    )
  )
    throw new Error('This supplier and receipt number are already recorded.');
  const drafted = input.lines.map((line) => {
    const products = line.products ?? [
      {
        id: `${line.id}:unit`,
        name: line.description,
        amountOre: line.amountOre,
      },
    ];
    if (
      !validProductDrafts(products) ||
      products.reduce((sum, p) => sum + p.amountOre, 0) !== line.amountOre
    )
      throw new Error('Product prices must match each receipt line total.');
    return { ...line, products };
  });
  const assigned = assignWholeProducts(
    drafted.flatMap((line) => line.products),
    donorPortfolios(staff, base).map((donor) => ({ ...donor, usedOre: 0 })),
  );
  const byId = new Map(assigned.map((product) => [product.id, product]));
  const lines = drafted.map((line) => {
    const products = line.products.map((product) => byId.get(product.id)!);
    return { ...line, products, allocations: productCostShares(products) };
  });
  const result = { ...input, lines };
  readStaffLedger(
    JSON.stringify({ ...staff, receipts: [...staff.receipts, result] }),
  );
  donorPortfolios({ ...staff, receipts: [...staff.receipts, result] }, base);
  return result;
}
export function recordReceipt(
  staff: StaffLedger,
  base: GivingLedger,
  input: Parameters<typeof planReceipt>[2],
) {
  const receipt = planReceipt(staff, base, input);
  return { ...staff, receipts: [...staff.receipts, receipt] };
}
export function postTransactionPhoto(
  staff: StaffLedger,
  base: GivingLedger,
  transactionId: string,
  photo: StaffPhoto,
): StaffLedger {
  if (!portalTransactions(staff, base).some((tx) => tx.id === transactionId))
    throw new Error('Choose an existing transaction.');
  if (!validPhoto(photo))
    throw new Error('Add a photo and select at least one dog.');
  const next = {
    ...staff,
    photos: {
      ...staff.photos,
      [transactionId]: [...(staff.photos[transactionId] ?? []), photo],
    },
  };
  return readStaffLedger(JSON.stringify(next));
}

export function projectDonor(
  staff: StaffLedger,
  base: GivingLedger,
  donorId = PERSONAL_DONOR_ID,
) {
  const wallet = donorPortfolios(staff, base).find((d) => d.id === donorId);
  if (!wallet) throw new Error('Donor not found.');
  const transactions: DonorTransaction[] = portalTransactions(
    staff,
    base,
  ).flatMap((tx) => {
    const share = tx.allocations.find((a) => a.donorId === donorId);
    if (!share) return [];
    const dogs = [...new Set(tx.photos.flatMap((p) => p.dogIds))].sort();
    const expenses: DemoExpense[] =
      !dogs.length && tx.legacy
        ? [
            {
              ...tx.legacy,
              id:
                donorId === PERSONAL_DONOR_ID
                  ? tx.legacy.id
                  : `${tx.id}:${donorId}:${tx.legacy.dogId}`,
              amountOre: share.amountOre,
            },
          ]
        : dogs.flatMap((dogId, i) => {
            const amountOre =
              Math.floor(share.amountOre / dogs.length) +
              (i < share.amountOre % dogs.length ? 1 : 0);
            return amountOre
              ? [
                  {
                    id: `${tx.id}:${donorId}:${dogId}`,
                    giftId: tx.legacy?.giftId ?? `receipt:${tx.receiptId}`,
                    dogId,
                    category: tx.category,
                    amountOre,
                    recordedAt: tx.recordedAt,
                    ...(tx.legacy?.sourceRow
                      ? { sourceRow: tx.legacy.sourceRow }
                      : {}),
                  },
                ]
              : [];
          });
    return [
      {
        ...tx,
        products: tx.products?.filter((p) => p.donorId === donorId),
        amountOre: share.amountOre,
        expenses,
      },
    ];
  });
  const expenses = transactions.flatMap((tx) => tx.expenses);
  const events: CareUpdate[] = transactions.flatMap((tx) =>
    tx.photos.flatMap((photo) =>
      tx.expenses
        .filter((e) => photo.dogIds.includes(e.dogId))
        .map((expense) => ({
          id: `staff:${photo.id}:${donorId}:${expense.dogId}`,
          dogId: expense.dogId,
          activity:
            expense.category === 'comfort' ? 'home' : expenseActivity(expense),
          title: tx.description,
          note: '',
          startsAt: photo.postedAt,
          endsAt: new Date(
            Date.parse(photo.postedAt) + photo.liveHours * 3600000,
          ).toISOString(),
          publishedAt: photo.postedAt,
          completedAt: photo.postedAt,
          expenseId: expense.id,
          liveHours: photo.liveHours,
          photos: [
            {
              src: photo.src,
              caption: photo.dogIds
                .map((id) => profileDogs.find((d) => d.id === id)!.name)
                .join(', '),
            },
          ],
        })),
    ),
  );
  const funding = fundingSummary([]);
  const byCategory = Object.fromEntries(
    expenseCategories.map((c) => [c.id, 0]),
  ) as Record<ExpenseCategory, number>;
  for (const tx of transactions) {
    const category = expenseCategories.find((c) => c.id === tx.category)!;
    byCategory[tx.category] += tx.amountOre;
    funding.amountOre += tx.amountOre;
    funding.allocation[category.kind] += tx.amountOre;
  }
  for (const expense of expenses) {
    const kind = expenseCategories.find((c) => c.id === expense.category)!.kind;
    funding.byDog[expense.dogId].amountOre += expense.amountOre;
    funding.byDog[expense.dogId].allocation[kind] += expense.amountOre;
  }
  const residentIds = profileDogs
    .filter((d) => !d.group && funding.byDog[d.id].amountOre > 0)
    .map((d) => d.id);
  return {
    transactions,
    expenses,
    events,
    spending: {
      totalOre: wallet.donatedOre,
      usedOre: wallet.usedOre,
      pendingOre: wallet.pendingOre,
      byCategory,
      funding,
      residentIds,
    },
  };
}

export function parseReceiptAmount(value: string) {
  const clean = value.trim().replace(',', '.');
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(clean)) return null;
  const [whole, cents = ''] = clean.split('.');
  const amount = Number(whole) * 100 + Number(cents.padEnd(2, '0'));
  return positiveMoney(amount) ? amount : null;
}
