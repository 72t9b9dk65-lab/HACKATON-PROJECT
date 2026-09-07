import { careCategories, dogs } from './hundstallet-data.ts';
export const HUND_STORAGE_KEY = 'hundstallet.prototype.v1';
export type Receipt = {
  id: string;
  dogId: string;
  amountOre: number;
  createdAt: string;
  previousHash: string;
  hash: string;
};
export type SupporterState = {
  followed: string[];
  read: string[];
  receipts: Receipt[];
  stages: Record<string, number>;
};
export const emptySupporter = (): SupporterState => ({
  followed: [],
  read: [],
  receipts: [],
  stages: {},
});
export function amountInOre(value: number) {
  if (
    !Number.isFinite(value) ||
    value < 10 ||
    value > 25000 ||
    Math.abs(value * 100 - Math.round(value * 100)) > 0.00001
  )
    throw Error('Choose SEK 10–25,000, with up to two decimal places.');
  return Math.round(value * 100);
}
export function allocate(amountOre: number) {
  const parts = careCategories.map((c) => ({
    ...c,
    amountOre: Math.floor((amountOre * c.share) / 100),
  }));
  parts[parts.length - 1].amountOre +=
    amountOre - parts.reduce((s, p) => s + p.amountOre, 0);
  return parts;
}
async function receiptHash(receipt: Omit<Receipt, 'hash'>) {
  const payload = JSON.stringify([
    receipt.id,
    receipt.dogId,
    receipt.amountOre,
    receipt.createdAt,
    receipt.previousHash,
  ]);
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(payload),
  );
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}
export async function createReceipt(
  dogId: string,
  amount: number,
  previousHash: string,
): Promise<Receipt> {
  if (!dogs.some((d) => d.id === dogId))
    throw Error('Choose an available demo dog.');
  const receipt = {
    id: `HS-${crypto.randomUUID()}`,
    dogId,
    amountOre: amountInOre(amount),
    createdAt: new Date().toISOString(),
    previousHash,
  };
  return { ...receipt, hash: await receiptHash(receipt) };
}
export async function verifyReceipts(receipts: Receipt[]) {
  let previous = 'GENESIS';
  const ids = new Set<string>();
  for (const receipt of receipts) {
    if (
      !receipt ||
      typeof receipt.id !== 'string' ||
      ids.has(receipt.id) ||
      !dogs.some((d) => d.id === receipt.dogId) ||
      !Number.isSafeInteger(receipt.amountOre) ||
      receipt.amountOre < 1000 ||
      receipt.amountOre > 2500000 ||
      !Number.isFinite(Date.parse(receipt.createdAt)) ||
      receipt.previousHash !== previous ||
      (await receiptHash(receipt)) !== receipt.hash
    )
      return false;
    ids.add(receipt.id);
    previous = receipt.hash;
  }
  return true;
}
export async function loadSupporter(
  raw: string | null,
): Promise<SupporterState> {
  if (!raw) return emptySupporter();
  const data = JSON.parse(raw);
  if (
    !data ||
    !Array.isArray(data.receipts) ||
    !(await verifyReceipts(data.receipts))
  )
    throw Error(
      'Saved receipt integrity could not be verified. The stored data has not been overwritten.',
    );
  const validIds = (values: unknown): string[] =>
    Array.isArray(values)
      ? [
          ...new Set(
            values.filter(
              (id): id is string =>
                typeof id === 'string' && dogs.some((d) => d.id === id),
            ),
          ),
        ]
      : [];
  const stages: Record<string, number> = {};
  for (const dog of dogs) {
    const stage = data.stages?.[dog.id];
    if (Number.isInteger(stage) && stage >= dog.stage && stage <= 3)
      stages[dog.id] = stage;
  }
  return {
    followed: validIds(data.followed),
    read: validIds(data.read),
    receipts: data.receipts,
    stages,
  };
}
export function badges(state: SupporterState) {
  return [
    {
      name: 'First connection',
      description: 'Follow a dog’s journey',
      earned: state.followed.length > 0,
    },
    {
      name: 'Thoughtful supporter',
      description: 'Read a care update',
      earned: state.read.length > 0,
    },
    {
      name: 'A helping paw',
      description: 'Try a demo contribution',
      earned: state.receipts.length > 0,
    },
  ];
}
