import workbook from '../../public/data/hundstallet/fake-transactions.json' with { type: 'json' };
import { workbookRows, WORKBOOK_IMPORT_ID } from '../workbook-source.ts';
import type { Category, Workspace, CarePost, Receipt } from './types.ts';
import { assertBalanced } from './model.ts';
import { makeProof } from './proofs.ts';
export async function seedWorkspace(
  now = new Date().toISOString(),
): Promise<Workspace> {
  const ago = (hours: number) =>
    new Date(Date.parse(now) - hours * 3_600_000).toISOString();
  const state: Workspace = {
    version: 1,
    revision: 0,
    createdAt: now,
    donors: [
      {
        id: 'personal',
        name: 'Dog friend',
        shelterName: 'My little shelter',
        following: ['koby', 'ove', 'ake'],
        seenUpdates: [],
        monthly: null,
      },
      {
        id: 'alex',
        name: 'Alex Lind',
        shelterName: 'Alex’s little shelter',
        following: [],
        seenUpdates: [],
        monthly: null,
      },
      {
        id: 'maja',
        name: 'Maja Berg',
        shelterName: 'Maja’s little shelter',
        following: [],
        seenUpdates: [],
        monthly: null,
      },
      {
        id: 'noah',
        name: 'Noah Ek',
        shelterName: 'Noah’s little shelter',
        following: [],
        seenUpdates: [],
        monthly: null,
      },
    ],
    gifts: [],
    receipts: [],
    posts: [],
    proofs: [],
    audit: [],
    commands: [WORKBOOK_IMPORT_ID],
  };
  const total = workbook.transactions.reduce((n, r) => n + r.amountOre, 0);
  state.gifts.push({
    id: 'workbook-opening',
    donorId: 'personal',
    amountOre: total,
    at: '2024-01-01T00:00:00Z',
    source: 'workbook',
  });
  const categoryMap: Record<string, Category> = {
    food: 'food',
    medicine: 'medicine',
    shelter: 'comfort',
    toys: 'play',
    rehabilitation: 'rehabilitation',
  };
  for (const row of workbookRows) {
    const receipt: Receipt = {
      id: `workbook-${row.key}`,
      supplier: 'Imported workbook',
      reference: `Blad1 · row ${row.row}`,
      purchasedAt: row.date,
      createdAt: row.date,
      totalOre: row.amountOre,
      products: [
        {
          id: `workbook-${row.key}:unitemized`,
          description: `${row.category[0].toUpperCase() + row.category.slice(1)} · item details not supplied`,
          category: categoryMap[row.category],
          amountOre: row.amountOre,
          shares: [{ donorId: 'personal', amountOre: row.amountOre }],
        },
      ],
      file: null,
      state: 'funded',
      fundedAt: row.date,
      source: 'workbook',
      sourceRow: row.row,
    };
    state.receipts.push(receipt);
  }
  for (const [donorId, amountOre] of [
    ['personal', 50_000],
    ['alex', 120_000],
    ['maja', 80_000],
    ['noah', 200_000],
  ] as const)
    state.gifts.push({
      id: `demo-opening-${donorId}`,
      donorId,
      amountOre,
      at: ago(72),
      source: 'demo',
      goalId: 'shared-care',
    });
  const demoProducts = [
    {
      id: 'demo-meals',
      description: 'Food & enrichment · care example',
      category: 'food' as const,
      amountOre: 10_000,
      shares: [{ donorId: 'personal', amountOre: 10_000 }],
    },
    {
      id: 'demo-play',
      description: 'Enrichment toy · sample item',
      category: 'play' as const,
      amountOre: 7_500,
      shares: [{ donorId: 'personal', amountOre: 7_500 }],
    },
    {
      id: 'demo-care',
      description: 'Recovery care · sample service',
      category: 'rehabilitation' as const,
      amountOre: 24_000,
      shares: [
        { donorId: 'personal', amountOre: 12_000 },
        { donorId: 'maja', amountOre: 12_000 },
      ],
    },
  ];
  const receipt: Receipt = {
    id: 'demo-care-receipt',
    supplier: 'Sample care supplier',
    reference: 'DEMO-001',
    purchasedAt: ago(30),
    createdAt: ago(30),
    totalOre: 41_500,
    products: demoProducts,
    file: null,
    state: 'funded',
    fundedAt: ago(30),
    source: 'demo',
  };
  state.receipts.push(receipt);
  const post = (
    p: Partial<CarePost> & Pick<CarePost, 'id' | 'title' | 'dogIds'>,
  ): CarePost => ({
    note: 'Sample story using an undated public profile photo. This is not a reported Hundstallet care event.',
    productIds: [],
    category: 'comfort',
    stage: null,
    occurredAt: ago(1),
    publishAt: ago(1),
    liveHours: 2,
    source: 'demo',
    photo: null,
    ...p,
  });
  state.posts.push(
    post({
      id: 'demo-arrival-koby',
      title: 'A little space to feel safe',
      dogIds: ['koby'],
      stage: 'arrived',
      occurredAt: ago(72),
      publishAt: ago(72),
      demoPhoto: '/dogs/hundstallet/koby-1.jpg',
    }),
    post({
      id: 'demo-care-koby',
      title: 'Small moments of care',
      dogIds: ['koby'],
      productIds: ['demo-meals'],
      category: 'food',
      stage: 'care',
      occurredAt: ago(26),
      publishAt: ago(26),
      demoPhoto: '/dogs/hundstallet/koby-2.jpg',
    }),
    post({
      id: 'demo-confidence-koby',
      title: 'A playful next chapter',
      dogIds: ['koby'],
      productIds: ['demo-play'],
      category: 'play',
      stage: 'confidence',
      demoPhoto: '/dogs/hundstallet/koby-3.jpg',
    }),
    post({
      id: 'demo-meals-ake',
      title: 'A moment around the food bowl',
      dogIds: ['ake'],
      productIds: ['demo-meals'],
      category: 'food',
      stage: 'care',
      occurredAt: ago(0.5),
      publishAt: ago(0.5),
      demoPhoto: '/dogs/hundstallet/ake-1.jpg',
    }),
    post({
      id: 'demo-care-ove',
      title: 'Care, at Ove’s pace',
      dogIds: ['ove'],
      productIds: ['demo-care'],
      category: 'rehabilitation',
      stage: 'care',
      occurredAt: ago(12),
      publishAt: ago(12),
      demoPhoto: '/dogs/hundstallet/ove-2.jpg',
    }),
  );
  const proof = await makeProof(
    {
      kind: 'receipt.funded',
      entityId: receipt.id,
      totalOre: receipt.totalOre,
      currency: 'SEK',
      environment: 'local-demo',
      documentHash: null,
      products: demoProducts.map((p) => ({
        id: p.id,
        category: p.category,
        amountOre: p.amountOre,
      })),
      source: 'demo',
    },
    undefined,
    receipt.createdAt,
  );
  receipt.proofId = proof.id;
  state.proofs.push(proof);
  state.audit.push({
    id: 'seed',
    at: now,
    kind: 'workspace.created',
    entityId: 'local',
    note: 'Local demo opened. Workbook totals preserved; sample care stories are separate.',
  });
  assertBalanced(state);
  return state;
}
