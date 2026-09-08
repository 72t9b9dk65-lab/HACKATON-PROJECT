import type {
  Action,
  Category,
  Donor,
  LineDraft,
  Product,
  Workspace,
  Stage,
} from './types.ts';

export const categories: {
  id: Category;
  label: string;
  station: string;
  asset: string;
  color: string;
}[] = [
  {
    id: 'food',
    label: 'Food & enrichment',
    station: 'Meals',
    asset: '/care/pixel/food-enrichment.png',
    color: '#bc8141',
  },
  {
    id: 'medicine',
    label: 'Medicine',
    station: 'Medicine',
    asset: '/care/pixel/care-rehabilitation.png',
    color: '#8276b2',
  },
  {
    id: 'rehabilitation',
    label: 'Rehabilitation',
    station: 'Recovery',
    asset: '/care/pixel/care-rehabilitation.png',
    color: '#7e92a2',
  },
  {
    id: 'vaccination',
    label: 'Veterinary care',
    station: 'Veterinarian',
    asset: '/care/pixel/examination-vaccination.png',
    color: '#6695b6',
  },
  {
    id: 'walk',
    label: 'Walks & confidence',
    station: 'Park walks',
    asset: '/care/pixel/park-walk.png',
    color: '#6c9275',
  },
  {
    id: 'play',
    label: 'Toys & play',
    station: 'Playtime',
    asset: '/care/pixel/play-enrichment.png',
    color: '#b99c50',
  },
  {
    id: 'comfort',
    label: 'Shelter & daily care',
    station: 'At the shelter',
    asset: '/shelters/pixel-big-kennel.png',
    color: '#a9785d',
  },
];
export const stages: { id: Stage; label: string; detail: string }[] = [
  { id: 'arrived', label: 'A safe arrival', detail: 'A place to feel safe.' },
  {
    id: 'care',
    label: 'Care & recovery',
    detail: 'Care shaped around this dog.',
  },
  {
    id: 'confidence',
    label: 'Finding confidence',
    detail: 'Small steps, at their own pace.',
  },
  {
    id: 'ready',
    label: 'Ready for a family',
    detail: 'Looking for the right match.',
  },
  { id: 'home', label: 'Home at last', detail: 'A new chapter begins.' },
];
export const money = (ore: number) =>
  new Intl.NumberFormat('en-GB', {
    maximumFractionDigits: 2,
    minimumFractionDigits: ore % 100 ? 2 : 0,
  }).format(ore / 100);
export const categoryFor = (id: Category) =>
  categories.find((c) => c.id === id)!;
export function parseMoney(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(result) && result > 0 && result <= 100_000_000
    ? result
    : null;
}
export function balances(state: Workspace) {
  return state.donors.map((donor) => {
    const donated = state.gifts
      .filter((g) => g.donorId === donor.id)
      .reduce((n, g) => n + g.amountOre, 0);
    const used = state.receipts
      .filter((r) => r.state === 'funded')
      .flatMap((r) => r.products)
      .flatMap((p) => p.shares)
      .filter((s) => s.donorId === donor.id)
      .reduce((n, s) => n + s.amountOre, 0);
    return { ...donor, donated, used, pending: donated - used };
  });
}
export function assertBalanced(state: Workspace) {
  const ids = new Set(state.donors.map((d) => d.id));
  if (ids.size !== state.donors.length) throw new Error('Duplicate donor.');
  for (const gift of state.gifts)
    if (!ids.has(gift.donorId) || !validMoney(gift.amountOre))
      throw new Error('Invalid contribution.');
  const receipts = new Set<string>();
  const productIds = new Set<string>();
  for (const receipt of state.receipts) {
    if (
      receipts.has(receipt.id) ||
      receipt.products.reduce((n, p) => n + p.amountOre, 0) !== receipt.totalOre
    )
      throw new Error('Receipt total does not match its products.');
    receipts.add(receipt.id);
    for (const product of receipt.products) {
      if (
        productIds.has(product.id) ||
        !validMoney(product.amountOre) ||
        !categories.some((c) => c.id === product.category)
      )
        throw new Error('Invalid purchased product.');
      productIds.add(product.id);
      if (
        product.shares.some(
          (s) => !ids.has(s.donorId) || !validMoney(s.amountOre),
        ) ||
        new Set(product.shares.map((s) => s.donorId)).size !==
          product.shares.length
      )
        throw new Error('Invalid product funding.');
      if (
        receipt.state !== 'draft' &&
        product.shares.reduce((n, s) => n + s.amountOre, 0) !==
          product.amountOre
      )
        throw new Error('Product funding does not match its price.');
      if (receipt.state === 'draft' && product.shares.length)
        throw new Error('A draft cannot spend donations.');
    }
  }
  if (balances(state).some((b) => b.pending < 0))
    throw new Error('A contribution cannot be spent twice.');
}
const validMoney = (n: unknown): n is number =>
  typeof n === 'number' && Number.isSafeInteger(n) && n > 0 && n <= 100_000_000;
function required(value: unknown, label: string, limit = 180): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > limit)
    throw new Error(`Enter ${label}.`);
  return value.trim();
}
function date(value: string) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value)))
    throw new Error('Choose a valid date and time.');
  return value;
}
export function expandLines(lines: LineDraft[], receiptId: string): Product[] {
  if (!Array.isArray(lines) || !lines.length || lines.length > 60)
    throw new Error('Add between 1 and 60 product lines.');
  return lines.flatMap((line, index) => {
    required(line.description, 'a product description');
    if (
      !categories.some((c) => c.id === line.category) ||
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > 100 ||
      !validMoney(line.unitOre)
    )
      throw new Error(
        'Check each product’s category, quantity and unit price.',
      );
    return Array.from({ length: line.quantity }, (_, unit) => ({
      id: `${receiptId}:p${index}:${unit}`,
      description:
        line.description.trim() +
        (line.quantity > 1 ? ` · ${unit + 1}/${line.quantity}` : ''),
      category: line.category,
      amountOre: line.unitOre,
      shares: [],
    }));
  });
}
// Confirmed products never participate in a later allocation. A costly service
// can have several contributors while remaining one identifiable priced item.
export function allocateProducts(
  products: Product[],
  wallets: { id: string; pending: number }[],
): Product[] {
  const total = products.reduce((n, p) => n + p.amountOre, 0);
  if (wallets.reduce((n, w) => n + w.pending, 0) < total)
    throw new Error(
      'There are not enough available donations. The receipt stays pending; no balances changed.',
    );
  const ordered = [...products].sort(
    (a, b) => b.amountOre - a.amountOre || a.id.localeCompare(b.id),
  );
  const remaining = wallets.map((w) => w.pending);
  const spent = wallets.map(() => 0);
  const assignments = new Map<string, number>();
  let visits = 0;
  // Largest items first; balance this batch's spending, with backtracking when
  // a fair greedy choice would strand an indivisible product.
  function assign(index: number): boolean {
    if (index === ordered.length) return true;
    if (++visits > 100_000) return false;
    const item = ordered[index];
    const candidates = wallets
      .map((_, i) => i)
      .filter((i) => remaining[i] >= item.amountOre)
      .sort(
        (a, b) =>
          spent[a] - spent[b] ||
          remaining[a] - remaining[b] ||
          wallets[a].id.localeCompare(wallets[b].id),
      );
    const seen = new Set<string>();
    for (const i of candidates) {
      const key = remaining[i] + ':' + spent[i];
      if (seen.has(key)) continue;
      seen.add(key);
      remaining[i] -= item.amountOre;
      spent[i] += item.amountOre;
      assignments.set(item.id, i);
      if (assign(index + 1)) return true;
      remaining[i] += item.amountOre;
      spent[i] -= item.amountOre;
      assignments.delete(item.id);
    }
    return false;
  }
  function greedy(bestFit: boolean) {
    wallets.forEach((w, i) => {
      remaining[i] = w.pending;
      spent[i] = 0;
    });
    assignments.clear();
    for (const item of ordered) {
      const candidates = wallets
        .map((_, i) => i)
        .filter((i) => remaining[i] >= item.amountOre)
        .sort(
          (a, b) =>
            (bestFit ? remaining[a] - remaining[b] : spent[a] - spent[b]) ||
            remaining[a] - remaining[b] ||
            wallets[a].id.localeCompare(wallets[b].id),
        );
      if (!candidates.length) return false;
      const i = candidates[0];
      remaining[i] -= item.amountOre;
      spent[i] += item.amountOre;
      assignments.set(item.id, i);
    }
    return true;
  }
  const fast = greedy(false) || greedy(true);
  if (!fast) {
    wallets.forEach((w, i) => {
      remaining[i] = w.pending;
      spent[i] = 0;
    });
    assignments.clear();
  }
  if (!fast && (ordered.length > 1200 || !assign(0)))
    throw new Error(
      'These products cannot currently be assigned whole within the available donor balances. Keep them pending, add donations, or allocate a smaller receipt batch. No balances changed.',
    );
  return products.map((p) => ({
    ...p,
    shares: [
      { donorId: wallets[assignments.get(p.id)!].id, amountOre: p.amountOre },
    ],
  }));
}
export function publishedPosts(state: Workspace, now = Date.now()) {
  return state.posts
    .filter(
      (p) =>
        !p.withdrawnAt &&
        Date.parse(p.publishAt) <= now &&
        Date.parse(p.occurredAt) <= now,
    )
    .sort(
      (a, b) =>
        b.occurredAt.localeCompare(a.occurredAt) ||
        b.publishAt.localeCompare(a.publishAt),
    );
}
export function dogStage(
  state: Workspace,
  dogId: string,
  now = Date.now(),
): Stage {
  return (
    publishedPosts(state, now).find((p) => p.dogIds.includes(dogId) && p.stage)
      ?.stage ?? 'arrived'
  );
}
export function activePhoto(state: Workspace, dogId: string, now = Date.now()) {
  const latest = publishedPosts(state, now)
    .filter((p) => p.dogIds.includes(dogId) && (p.photo || p.demoPhoto))
    .sort((a, b) => b.publishAt.localeCompare(a.publishAt))[0];
  return latest &&
    now < Date.parse(latest.publishAt) + latest.liveHours * 3_600_000
    ? latest
    : undefined;
}
export function donorProducts(state: Workspace, donorId: string) {
  return state.receipts
    .filter((r) => r.state === 'funded')
    .flatMap((receipt) =>
      receipt.products
        .filter((p) => p.shares.some((s) => s.donorId === donorId))
        .map((product) => ({
          receipt,
          product,
          contribution: product.shares.find((s) => s.donorId === donorId)!
            .amountOre,
        })),
    );
}
export function supportedDogs(
  state: Workspace,
  donorId: string,
  now = Date.now(),
) {
  const products = new Set(
    donorProducts(state, donorId).map((p) => p.product.id),
  );
  return [
    ...new Set(
      publishedPosts(state, now)
        .filter((p) => p.productIds.some((id) => products.has(id)))
        .flatMap((p) => p.dogIds),
    ),
  ];
}
export function contributionToDog(
  state: Workspace,
  donorId: string,
  dogId: string,
  now = Date.now(),
) {
  const posts = publishedPosts(state, now);
  let total = 0;
  for (const row of donorProducts(state, donorId)) {
    const dogIds = [
      ...new Set(
        posts
          .filter((p) => p.productIds.includes(row.product.id))
          .flatMap((p) => p.dogIds),
      ),
    ].sort();
    const index = dogIds.indexOf(dogId);
    if (index >= 0)
      total +=
        Math.floor(row.contribution / dogIds.length) +
        (index < row.contribution % dogIds.length ? 1 : 0);
  }
  return total;
}
export function applyAction(
  input: Workspace,
  action: Action,
  now: string,
  knownDogIds: string[],
  id: () => string = () => crypto.randomUUID(),
): Workspace {
  const state = structuredClone(input);
  const dogIds = new Set(knownDogIds);
  const donor = (donorId: string): Donor => {
    const d = state.donors.find((d) => d.id === donorId);
    if (!d) throw new Error('Unknown supporter.');
    return d;
  };
  const audit = (kind: string, entityId: string, note: string) =>
    state.audit.push({ id: id(), at: now, kind, entityId, note });
  const fund = (receiptId: string) => {
    const receipt = state.receipts.find((r) => r.id === receiptId);
    if (!receipt) throw new Error('Receipt not found.');
    if (receipt.state === 'funded') return;
    if (receipt.state !== 'draft')
      throw new Error('A corrected receipt cannot be funded again.');
    receipt.products = allocateProducts(receipt.products, balances(state));
    receipt.state = 'funded';
    receipt.fundedAt = now;
    audit(
      'receipt.funded',
      receipt.id,
      `${money(receipt.totalOre)} SEK assigned to its purchased products.`,
    );
  };
  switch (action.type) {
    case 'record-gift': {
      const d = donor(action.donorId);
      if (!validMoney(action.amountOre) || action.amountOre > 100_000_000)
        throw new Error('Enter a valid received amount.');
      if (!['swish', 'bank', 'other'].includes(action.method))
        throw new Error('Select a payment method.');
      const reference = required(
        action.reference,
        'a payment reference',
        120,
      ).trim();
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(action.receivedAt) ||
        !Number.isFinite(Date.parse(action.receivedAt)) ||
        action.receivedAt > now.slice(0, 10)
      )
        throw new Error('Enter the date the payment was received.');
      const existing = state.gifts.find(
        (g) =>
          g.method === action.method &&
          g.reference?.toLowerCase() === reference.toLowerCase(),
      );
      if (existing) {
        if (
          existing.donorId !== d.id ||
          existing.amountOre !== action.amountOre
        )
          throw new Error(
            'This payment reference is already registered with different details.',
          );
        break;
      }
      const gift = {
        id: id(),
        donorId: d.id,
        amountOre: action.amountOre,
        at: action.receivedAt,
        source: 'confirmed' as const,
        method: action.method,
        reference,
      };
      state.gifts.push(gift);
      audit(
        'gift.recorded',
        gift.id,
        `${money(gift.amountOre)} SEK received via ${action.method}; reference ${reference}.`,
      );
      break;
    }
    case 'donate': {
      const d = donor(action.donorId);
      if (
        !validMoney(action.amountOre) ||
        action.amountOre < 100 ||
        action.amountOre > 1_000_000
      )
        throw new Error('Choose an amount between 1 and 10,000 SEK.');
      if (!categories.some((c) => c.id === action.category))
        throw new Error('Choose a care example.');
      const gift = {
        id: id(),
        donorId: d.id,
        amountOre: action.amountOre,
        at: now,
        source: 'demo' as const,
        ...(action.goalId
          ? { goalId: required(action.goalId, 'a goal', 100) }
          : {}),
      };
      state.gifts.push(gift);
      if (action.monthly)
        d.monthly = {
          amountOre: action.amountOre,
          startedAt: now,
          category: action.category,
        };
      audit(
        'gift.recorded',
        gift.id,
        `${money(gift.amountOre)} SEK demo contribution received.`,
      );
      break;
    }
    case 'profile': {
      const d = donor(action.donorId);
      d.name = required(action.name, 'your name', 60);
      d.shelterName = required(action.shelterName, 'a shelter name', 60);
      break;
    }
    case 'follow': {
      const d = donor(action.donorId);
      if (!dogIds.has(action.dogId)) throw new Error('Unknown dog.');
      d.following = d.following.includes(action.dogId)
        ? d.following.filter((i) => i !== action.dogId)
        : [...d.following, action.dogId];
      break;
    }
    case 'seen': {
      const d = donor(action.donorId);
      if (
        state.posts.some((p) => p.id === action.postId) &&
        !d.seenUpdates.includes(action.postId)
      )
        d.seenUpdates.push(action.postId);
      break;
    }
    case 'cancel-plan':
      donor(action.donorId).monthly = null;
      break;
    case 'receipt':
    case 'edit-receipt': {
      const draft = action.draft;
      const supplier = required(draft.supplier, 'the supplier');
      const reference = required(draft.reference, 'the receipt number');
      date(draft.purchasedAt);
      const existing =
        action.type === 'edit-receipt'
          ? state.receipts.find((r) => r.id === action.receiptId)
          : undefined;
      if (
        action.type === 'edit-receipt' &&
        (!existing || existing.state !== 'draft')
      )
        throw new Error(
          'Only pending receipts can be edited. Confirmed purchases need a recorded correction.',
        );
      if (new Date(draft.purchasedAt).getTime() > Date.parse(now) + 86_400_000)
        throw new Error('The purchase date cannot be in the future.');
      if (
        state.receipts.some(
          (r) =>
            r.id !== existing?.id &&
            r.supplier.toLowerCase() === supplier.toLowerCase() &&
            r.reference.toLowerCase() === reference.toLowerCase(),
        )
      )
        throw new Error(
          'This supplier and receipt number have already been recorded.',
        );
      if (
        draft.file &&
        state.receipts.some(
          (r) =>
            r.id !== existing?.id &&
            r.state !== 'voided' &&
            r.file?.hash === draft.file!.hash,
        )
      )
        throw new Error('This receipt document has already been recorded.');
      const receiptId = existing?.id ?? id();
      const products = expandLines(draft.lines, receiptId);
      if (
        !validMoney(draft.totalOre) ||
        products.reduce((n, p) => n + p.amountOre, 0) !== draft.totalOre
      )
        throw new Error(
          'Product prices must add up exactly to the receipt total.',
        );
      if (existing)
        Object.assign(existing, {
          supplier,
          reference,
          purchasedAt: draft.purchasedAt,
          totalOre: draft.totalOre,
          products,
          file: draft.file,
        });
      else
        state.receipts.push({
          id: receiptId,
          supplier,
          reference,
          purchasedAt: draft.purchasedAt,
          createdAt: now,
          totalOre: draft.totalOre,
          products,
          file: draft.file,
          state: 'draft',
          fundedAt: null,
          source: 'staff',
        });
      audit(
        existing ? 'receipt.edited' : 'receipt.recorded',
        receiptId,
        `${supplier} · ${reference}`,
      );
      break;
    }
    case 'itemize': {
      const receipt = state.receipts.find((r) => r.id === action.receiptId);
      if (
        !receipt ||
        receipt.source !== 'workbook' ||
        receipt.state !== 'funded' ||
        receipt.itemizedAt ||
        !receipt.products.every((p) => p.id.endsWith(':unitemized'))
      )
        throw new Error(
          'Only an unitemized workbook record can receive its original product details.',
        );
      if (!action.file)
        throw new Error(
          'Attach the original receipt before confirming its products.',
        );
      if (
        state.posts.some((p) =>
          p.productIds.some((id) =>
            receipt.products.some((product) => product.id === id),
          ),
        )
      )
        throw new Error(
          'This record already has linked care moments. Keep those references intact.',
        );
      const products = expandLines(action.lines, `${receipt.id}:details`);
      if (products.reduce((n, p) => n + p.amountOre, 0) !== receipt.totalOre)
        throw new Error(
          'The itemized products must equal the original recorded total.',
        );
      const totals = new Map<string, number>();
      for (const share of receipt.products.flatMap((p) => p.shares))
        totals.set(
          share.donorId,
          (totals.get(share.donorId) ?? 0) + share.amountOre,
        );
      receipt.products = allocateProducts(
        products,
        [...totals].map(([id, pending]) => ({ id, pending })),
      );
      receipt.file = action.file;
      receipt.itemizedAt = now;
      audit(
        'receipt.itemized',
        receipt.id,
        'Original product details added. Every existing supporter contribution is unchanged.',
      );
      break;
    }
    case 'fund':
      fund(action.receiptId);
      break;
    case 'fund-pending': {
      const pending = state.receipts
        .filter((r) => r.state === 'draft')
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      if (!pending.length)
        throw new Error('All receipts are already allocated.');
      const allocated = new Map(
        allocateProducts(
          pending.flatMap((r) => r.products),
          balances(state),
        ).map((p) => [p.id, p]),
      );
      for (const receipt of pending) {
        receipt.products = receipt.products.map((p) => allocated.get(p.id)!);
        receipt.state = 'funded';
        receipt.fundedAt = now;
        audit(
          'receipt.funded',
          receipt.id,
          `${money(receipt.totalOre)} SEK assigned to its purchased products.`,
        );
      }
      break;
    }
    case 'seal-records': {
      for (const receipt of state.receipts) {
        if (receipt.state === 'draft') continue;
        const proof = state.proofs.find((p) => p.id === receipt.proofId);
        if (proof?.payload.evidenceVersion === 2) continue;
        audit(
          'receipt.snapshot',
          receipt.id,
          'Imported baseline snapshot; original document availability preserved.',
        );
      }
      break;
    }
    case 'seal-record': {
      const receipt = state.receipts.find((r) => r.id === action.receiptId);
      if (!receipt || receipt.state === 'draft')
        throw new Error('Choose an allocated or corrected record.');
      audit(
        'receipt.snapshot',
        receipt.id,
        'Current receipt snapshot; original source and document availability preserved.',
      );
      break;
    }
    case 'void': {
      const receipt = state.receipts.find((r) => r.id === action.receiptId);
      if (!receipt || receipt.state !== 'funded')
        throw new Error('Choose a funded receipt to correct.');
      receipt.reason = required(action.reason, 'a correction reason', 500);
      if (receipt.reason.length < 10)
        throw new Error('Explain the correction in at least 10 characters.');
      receipt.state = 'voided';
      receipt.voidedAt = now;
      audit('receipt.corrected', receipt.id, receipt.reason);
      break;
    }
    case 'publish': {
      const {
        title,
        note,
        dogIds: postDogs,
        productIds,
        category,
        stage,
        photo,
        demoPhoto,
        occurredAt,
        publishAt,
        liveHours,
      } = action.post;
      const post = {
        title: required(title, 'an update title', 100),
        note,
        dogIds: postDogs,
        productIds,
        category,
        stage,
        photo,
        demoPhoto,
        occurredAt,
        publishAt,
        liveHours,
      };
      if (typeof post.note !== 'string' || post.note.length > 1600)
        throw new Error('Keep the note below 1,600 characters.');
      if (
        !Array.isArray(post.dogIds) ||
        !post.dogIds.length ||
        post.dogIds.length > 20 ||
        new Set(post.dogIds).size !== post.dogIds.length ||
        post.dogIds.some((d) => !dogIds.has(d))
      )
        throw new Error('Select the dogs in this update.');
      date(post.occurredAt);
      date(post.publishAt);
      if (Date.parse(post.occurredAt) > Date.parse(post.publishAt))
        throw new Error('Publish time must be after the moment took place.');
      if (
        ![1, 2].includes(post.liveHours) ||
        !categories.some((c) => c.id === post.category) ||
        (post.stage && !stages.some((s) => s.id === post.stage))
      )
        throw new Error('Check the update details.');
      if (!post.photo && !post.demoPhoto)
        throw new Error('Attach a photo to publish a care moment.');
      if (
        post.photo &&
        !['image/jpeg', 'image/png', 'image/webp'].includes(post.photo.type)
      )
        throw new Error(
          'A care moment needs an image, not a receipt document.',
        );
      if (
        post.demoPhoto &&
        !/^\/dogs\/hundstallet\/[a-zA-Z0-9_-]+\.(jpg|webp)$/.test(
          post.demoPhoto,
        )
      )
        throw new Error('Choose a sample profile photo.');
      if (
        !Array.isArray(post.productIds) ||
        new Set(post.productIds).size !== post.productIds.length
      )
        throw new Error('Choose valid purchased products.');
      const products = state.receipts
        .filter((r) => r.state === 'funded')
        .flatMap((r) => r.products);
      for (const productId of post.productIds) {
        const product = products.find((p) => p.id === productId);
        if (!product || product.category !== post.category)
          throw new Error('The category must match the funded products.');
        if (product.id.endsWith(':unitemized'))
          throw new Error(
            'Add the original product details before linking a care photo to this workbook record.',
          );
      }
      if (!post.productIds.length && !post.stage)
        throw new Error(
          'Link purchased products, or choose a journey milestone.',
        );
      const entry = {
        ...post,
        id: id(),
        source: post.demoPhoto ? ('demo' as const) : ('staff' as const),
      };
      state.posts.push(entry);
      audit('care.published', entry.id, entry.title);
      break;
    }
    case 'withdraw': {
      const post = state.posts.find((p) => p.id === action.postId);
      if (!post || post.withdrawnAt) throw new Error('Update not found.');
      post.withdrawalReason = required(
        action.reason,
        'a correction reason',
        500,
      );
      post.withdrawnAt = now;
      audit('care.withdrawn', post.id, post.withdrawalReason);
      break;
    }
    case 'anchor': {
      const proof = state.proofs.find((p) => p.id === action.proofId);
      if (!proof) throw new Error('Record not found.');
      if (
        action.chainId !== '0xaa36a7' ||
        !/^0x[0-9a-fA-F]{64}$/.test(action.txHash) ||
        !Number.isSafeInteger(action.blockNumber) ||
        action.blockNumber < 1
      )
        throw new Error('Only confirmed Sepolia testnet records are accepted.');
      if (!proof.anchors.some((a) => a.txHash === action.txHash))
        proof.anchors.push({
          chainId: action.chainId,
          txHash: action.txHash,
          blockNumber: action.blockNumber,
          at: now,
        });
      break;
    }
    default:
      throw new Error('Unknown action.');
  }
  assertBalanced(state);
  return state;
}
