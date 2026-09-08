export type Category =
  | 'food'
  | 'medicine'
  | 'rehabilitation'
  | 'vaccination'
  | 'walk'
  | 'play'
  | 'comfort';
export type Stage = 'arrived' | 'care' | 'confidence' | 'ready' | 'home';
export type FileRecord = {
  id: string;
  name: string;
  type: string;
  hash: string;
  size: number;
  url: string;
};
export type Donor = {
  id: string;
  name: string;
  shelterName: string;
  following: string[];
  seenUpdates: string[];
  monthly: { amountOre: number; startedAt: string; category: Category } | null;
};
export type Gift = {
  id: string;
  donorId: string;
  amountOre: number;
  at: string;
  goalId?: string;
  source: 'demo' | 'workbook';
};
export type Share = { donorId: string; amountOre: number };
export type Product = {
  id: string;
  description: string;
  category: Category;
  amountOre: number;
  shares: Share[];
};
export type Receipt = {
  id: string;
  supplier: string;
  reference: string;
  purchasedAt: string;
  createdAt: string;
  totalOre: number;
  products: Product[];
  file: FileRecord | null;
  state: 'draft' | 'funded' | 'voided';
  fundedAt: string | null;
  voidedAt?: string;
  reason?: string;
  source: 'staff' | 'demo' | 'workbook';
  sourceRow?: number;
  proofId?: string;
  itemizedAt?: string;
};
export type CarePost = {
  id: string;
  title: string;
  note: string;
  dogIds: string[];
  productIds: string[];
  category: Category;
  stage: Stage | null;
  photo: FileRecord | null;
  demoPhoto?: string;
  occurredAt: string;
  publishAt: string;
  liveHours: 1 | 2;
  source: 'staff' | 'demo';
  withdrawnAt?: string;
  withdrawalReason?: string;
};
export type Proof = {
  id: string;
  seq: number;
  at: string;
  previousHash: string;
  hash: string;
  payload: Record<string, unknown>;
  anchors: {
    chainId: string;
    txHash: string;
    blockNumber: number;
    at: string;
  }[];
};
export type AuditEvent = {
  id: string;
  at: string;
  kind: string;
  entityId: string;
  note: string;
};
export type Workspace = {
  version: 1;
  revision: number;
  createdAt: string;
  donors: Donor[];
  gifts: Gift[];
  receipts: Receipt[];
  posts: CarePost[];
  proofs: Proof[];
  audit: AuditEvent[];
  commands: string[];
};
export type LineDraft = {
  description: string;
  category: Category;
  quantity: number;
  unitOre: number;
};
export type ReceiptDraft = {
  supplier: string;
  reference: string;
  purchasedAt: string;
  totalOre: number;
  lines: LineDraft[];
  file: FileRecord | null;
};
export type Action =
  | {
      type: 'donate';
      donorId: string;
      amountOre: number;
      monthly: boolean;
      category: Category;
      goalId?: string;
    }
  | { type: 'profile'; donorId: string; name: string; shelterName: string }
  | { type: 'follow'; donorId: string; dogId: string }
  | { type: 'seen'; donorId: string; postId: string }
  | { type: 'cancel-plan'; donorId: string }
  | { type: 'receipt'; draft: ReceiptDraft }
  | { type: 'edit-receipt'; receiptId: string; draft: ReceiptDraft }
  | { type: 'itemize'; receiptId: string; lines: LineDraft[]; file: FileRecord }
  | { type: 'fund'; receiptId: string }
  | { type: 'fund-pending' }
  | { type: 'seal-record'; receiptId: string }
  | { type: 'seal-records' }
  | { type: 'void'; receiptId: string; reason: string }
  | { type: 'publish'; post: Omit<CarePost, 'id' | 'source'> }
  | { type: 'withdraw'; postId: string; reason: string }
  | {
      type: 'anchor';
      proofId: string;
      chainId: string;
      txHash: string;
      blockNumber: number;
    };
export type Command = { id: string; revision: number; action: Action };
