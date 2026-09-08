import type { Proof, Workspace, Receipt } from './types.ts';
export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`)
    .join(',')}}`;
}
export async function sha256(value: string | ArrayBuffer) {
  const bytes =
    typeof value === 'string' ? new TextEncoder().encode(value) : value;
  return Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
  )
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
export async function makeProof(
  payload: Record<string, unknown>,
  previous: Proof | undefined,
  at: string,
): Promise<Proof> {
  const proof = {
    id: crypto.randomUUID(),
    seq: (previous?.seq ?? 0) + 1,
    at,
    previousHash: previous?.hash ?? '0'.repeat(64),
    payload,
  };
  return { ...proof, hash: await sha256(canonical(proof)), anchors: [] };
}
export async function verifyProof(proof: Proof) {
  if (
    !proof ||
    typeof proof.id !== 'string' ||
    !proof.id ||
    !Number.isSafeInteger(proof.seq) ||
    proof.seq < 1 ||
    typeof proof.at !== 'string' ||
    !Number.isFinite(Date.parse(proof.at)) ||
    !/^[a-f0-9]{64}$/.test(proof.previousHash) ||
    !proof.payload ||
    typeof proof.payload !== 'object' ||
    Array.isArray(proof.payload) ||
    !Array.isArray(proof.anchors)
  )
    return false;
  const { id, seq, at, previousHash, payload } = proof;
  return (
    /^[a-f0-9]{64}$/.test(proof.hash) &&
    (await sha256(canonical({ id, seq, at, previousHash, payload }))) ===
      proof.hash
  );
}
export async function verifyChain(proofs: Proof[]) {
  for (let i = 0; i < proofs.length; i++)
    if (
      proofs[i].seq !== i + 1 ||
      proofs[i].previousHash !== (proofs[i - 1]?.hash ?? '0'.repeat(64)) ||
      !(await verifyProof(proofs[i]))
    )
      return false;
  return true;
}
export const anchorData = (hash: string) =>
  '0x' +
  Array.from(new TextEncoder().encode(`HUNDSTALLET:1:${hash}`))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
export async function appendProofs(
  previous: Workspace,
  next: Workspace,
  now: string,
) {
  for (const event of next.audit.slice(previous.audit.length)) {
    if (
      ![
        'gift.recorded',
        'receipt.funded',
        'receipt.corrected',
        'receipt.itemized',
        'receipt.snapshot',
        'care.published',
        'care.withdrawn',
      ].includes(event.kind)
    )
      continue;
    const receipt = next.receipts.find((r) => r.id === event.entityId);
    if (receipt && event.kind === 'receipt.snapshot') {
      const existing = next.proofs.find((p) => p.id === receipt.proofId);
      if (existing && (await verifyReceipt(existing, receipt)) === 'match')
        continue;
    }
    const gift = next.gifts.find((g) => g.id === event.entityId);
    const post = next.posts.find((p) => p.id === event.entityId);
    const payload: Record<string, unknown> = {
      kind: event.kind,
      entityId: event.entityId,
      currency: 'SEK',
      environment: 'local-demo',
    };
    if (receipt)
      Object.assign(payload, {
        evidenceVersion: 2,
        receipt: await receiptEvidence(receipt),
      });
    if (gift)
      Object.assign(payload, {
        amountOre: gift.amountOre,
        supporter: await sha256(`supporter:${gift.donorId}`),
      });
    if (post)
      Object.assign(payload, {
        photoHash: post.photo?.hash ?? null,
        productIds: post.productIds,
        category: post.category,
        stage: post.stage,
        occurredAt: post.occurredAt,
        publishAt: post.publishAt,
        source: post.source,
        withdrawnAt: post.withdrawnAt ?? null,
      });
    const proof = await makeProof(payload, next.proofs.at(-1), now);
    next.proofs.push(proof);
    if (
      receipt &&
      [
        'receipt.funded',
        'receipt.itemized',
        'receipt.corrected',
        'receipt.snapshot',
      ].includes(event.kind)
    )
      receipt.proofId = proof.id;
  }
  return next;
}

// One definition signs and verifies the record currently shown to the donor.
// Private donor names never leave the ledger in an exported public proof.
export async function receiptEvidence(receipt: Receipt) {
  return {
    id: receipt.id,
    supplier: receipt.supplier,
    reference: receipt.reference,
    purchasedAt: receipt.purchasedAt,
    createdAt: receipt.createdAt,
    source: receipt.source,
    sourceRow: receipt.sourceRow ?? null,
    totalOre: receipt.totalOre,
    state: receipt.state,
    fundedAt: receipt.fundedAt,
    voidedAt: receipt.voidedAt ?? null,
    correctionReason: receipt.reason ?? null,
    itemizedAt: receipt.itemizedAt ?? null,
    documentHash: receipt.file?.hash ?? null,
    products: await Promise.all(
      receipt.products.map(async (p) => ({
        id: p.id,
        description: p.description,
        category: p.category,
        amountOre: p.amountOre,
        contributions: await Promise.all(
          p.shares.map(async (share) => ({
            supporter: await sha256('supporter:' + share.donorId),
            amountOre: share.amountOre,
          })),
        ),
      })),
    ),
  };
}
export async function verifyReceipt(proof: Proof, receipt: Receipt) {
  if (!(await verifyProof(proof))) return 'invalid' as const;
  if (proof.payload.evidenceVersion !== 2) return 'legacy' as const;
  return canonical(proof.payload.receipt) ===
    canonical(await receiptEvidence(receipt))
    ? ('match' as const)
    : ('mismatch' as const);
}

export function documentHashOf(proof: Proof) {
  const snapshot = proof.payload.receipt;
  if (snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)) {
    const value = (snapshot as Record<string, unknown>).documentHash;
    return typeof value === 'string' ? value : null;
  }
  return typeof proof.payload.documentHash === 'string'
    ? proof.payload.documentHash
    : null;
}
