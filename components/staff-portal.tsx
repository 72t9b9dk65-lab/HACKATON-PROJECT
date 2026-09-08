'use client';
/* oxlint-disable next/no-img-element -- Locally uploaded receipt photos and existing pixel assets use native image rendering. */

import { useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Camera,
  Check,
  FileText,
  ImagePlus,
  Plus,
  Receipt,
  Upload,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { CarePhoto } from '@/components/dog-profile-dialog';
import { TransactionProductsEditor } from '@/components/transaction-products-editor';
import { expandProductUnits } from '@/lib/product-allocation';
import { useStaffLedger } from '@/hooks/use-staff-ledger';
import { kronor, profileDogs } from '@/lib/donation-shell';
import {
  expenseCategories,
  type ExpenseCategory,
} from '@/lib/donation-spending';
import { stockholmInput } from '@/lib/care-calendar';
import {
  donorPortfolios,
  distributeTransactions,
  parseReceiptAmount,
  PERSONAL_DONOR_ID,
  planReceipt,
  portalTransactions,
  postTransactionPhoto,
  recordReceipt,
  type PortalTransaction,
  type ReceiptFile,
  type StaffReceipt,
} from '@/lib/staff-portal';

type Store = ReturnType<typeof useStaffLedger>;
const money = (value: number) => `${kronor(value)} SEK`;
function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/Stockholm',
  }).format(new Date(value));
}
async function readUpload(file: File, receipt = false): Promise<ReceiptFile> {
  const types = [
    'image/jpeg',
    'image/png',
    'image/webp',
    ...(receipt ? ['application/pdf'] : []),
  ];
  if (!types.includes(file.type) || file.size > 1_000_000)
    throw new Error(
      `Choose ${receipt ? 'a PDF or ' : ''}a JPG, PNG or WebP file up to 1 MB.`,
    );
  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Could not read the file.'));
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });
  return { name: file.name, type: file.type, src };
}

export default function StaffPortal() {
  const store = useStaffLedger();
  const [view, setView] = useState<'donors' | 'receipts'>('donors');
  const [donorId, setDonorId] = useState(PERSONAL_DONOR_ID);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [photoTransaction, setPhotoTransaction] = useState<string | null>(null);
  const [productTransaction, setProductTransaction] = useState<string | null>(
    null,
  );
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const donors = donorPortfolios(store.staff, store.base, store.personalName);
  const transactions = portalTransactions(store.staff, store.base);
  const donor = donors.find((d) => d.id === donorId) ?? donors[0];
  const shown =
    view === 'receipts'
      ? transactions
      : transactions.filter((tx) =>
          tx.allocations.some((a) => a.donorId === donor.id),
        );
  const selectedPhotoTransaction = transactions.find(
    (tx) => tx.id === photoTransaction,
  );
  const total = donors.reduce((n, d) => n + d.donatedOre, 0);
  const selectedProductTransaction = transactions.find(
    (tx) => tx.id === productTransaction,
  );
  const productCount = transactions.reduce(
    (sum, tx) => sum + (tx.products?.length ?? 0),
    0,
  );
  const unitemizedCount = transactions.filter(
    (tx) => !tx.products?.length,
  ).length;
  const pending = donors.reduce((n, d) => n + d.pendingOre, 0);
  async function distribute() {
    setNotice('');
    setActionError('');
    const failure = await store.updateStaff((staff, base) =>
      distributeTransactions(staff, base, new Date().toISOString()),
    );
    if (failure) setActionError(failure);
    else
      setNotice(
        'Whole products assigned to donors within their available balances. Every product keeps its price; the total spent stays the same.',
      );
  }
  return (
    <div className="donation-shell staff-site">
      <header className="staff-site-header">
        <Link href="/staff" className="staff-site-brand">
          <img
            src="/shelters/pixel-shelter.png"
            alt=""
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <span>
            HUNDSTALLET <small>Staff workspace</small>
          </span>
        </Link>
        <span className="staff-local-tag">
          Local prototype · sample donor accounts
        </span>
        <a href="/" target="_blank" rel="noreferrer">
          Donor shelter <ArrowUpRight size={17} />
        </a>
      </header>
      <main className="staff-site-main">
        <div className="staff-page-heading">
          <div>
            <span className="donation-eyebrow">CARE, ACCOUNTED FOR</span>
            <h1>From donation to daily care.</h1>
          </div>
          <Button
            className="staff-primary"
            onClick={() => {
              setNotice('');
              setReceiptOpen(true);
            }}
            disabled={!store.ready || store.busy}
          >
            <Plus size={19} /> Add receipts or invoices
          </Button>
        </div>
        <div className="staff-wallet-totals">
          <Metric label="Total donated" value={total} />
          <Metric label="Available to spend" value={pending} />
          <Metric label="Used for care" value={total - pending} />
        </div>
        {(store.error || actionError) && (
          <p role="alert" className="staff-error">
            {store.error || actionError}
          </p>
        )}
        {notice && (
          <output className="staff-success">
            <Check size={17} />
            {notice}
          </output>
        )}
        <div className="staff-dashboard">
          <aside className="staff-donor-rail">
            <div className="staff-view-switch">
              <button
                type="button"
                aria-pressed={view === 'donors'}
                onClick={() => setView('donors')}
              >
                <Users size={17} /> Donors
              </button>
              <button
                type="button"
                aria-pressed={view === 'receipts'}
                onClick={() => setView('receipts')}
              >
                <Receipt size={17} /> All spending
              </button>
            </div>
            <h2>
              Donor portfolios <span>{donors.length}</span>
            </h2>
            {donors.map((item) => (
              <button
                className="staff-donor-row"
                key={item.id}
                type="button"
                aria-pressed={view === 'donors' && donor.id === item.id}
                onClick={() => {
                  setDonorId(item.id);
                  setView('donors');
                }}
              >
                <span className="staff-donor-avatar">
                  {item.name
                    .split(' ')
                    .map((word) => word[0])
                    .slice(0, 2)
                    .join('')}
                </span>
                <span>
                  <strong>{item.name}</strong>
                  <small>
                    {item.id === PERSONAL_DONOR_ID
                      ? 'Connected donor shelter'
                      : 'Donor'}
                  </small>
                  <span>{money(item.pendingOre)} available</span>
                </span>
              </button>
            ))}
            <p className="staff-rail-note">
              Your shelter uses the existing donation balance. The other three
              portfolios are sample accounts.
            </p>
          </aside>
          <section className="staff-transactions-panel">
            <div className="staff-panel-heading">
              <div>
                <h2>
                  {view === 'donors' ? donor.name : 'All care transactions'}
                </h2>
                <p>
                  {view === 'donors'
                    ? 'Every amount, connected to the care it paid for.'
                    : 'Upload a care photo, then choose the dogs that benefited.'}
                </p>
              </div>
              <div className="staff-panel-actions">
                {view === 'receipts' && (
                  <Button
                    className="staff-primary staff-distribute-button"
                    onClick={distribute}
                    disabled={!store.ready || store.busy || !productCount}
                  >
                    <Users size={17} />{' '}
                    {store.busy
                      ? 'Distributing…'
                      : 'Distribute products to donators'}
                  </Button>
                )}
                <span>{shown.length} transactions</span>
                {view === 'receipts' && unitemizedCount > 0 && (
                  <span>{unitemizedCount} need product details</span>
                )}
              </div>
            </div>
            {view === 'donors' && (
              <div className="staff-donor-balance">
                <Metric label="Donated" value={donor.donatedOre} />
                <Metric label="Still available" value={donor.pendingOre} />
                <Metric label="Spent" value={donor.usedOre} />
              </div>
            )}
            {view === 'donors' && (
              <div className="staff-category-totals">
                {expenseCategories.map((category) => {
                  const value = shown
                    .filter((tx) => tx.category === category.id)
                    .reduce(
                      (n, tx) =>
                        n +
                        tx.allocations.find((a) => a.donorId === donor.id)!
                          .amountOre,
                      0,
                    );
                  return value > 0 ? (
                    <span key={category.id}>
                      <img src={category.asset} alt="" />
                      <span>
                        {category.label}
                        <strong>{money(value)}</strong>
                      </span>
                    </span>
                  ) : null;
                })}
              </div>
            )}
            <div className="staff-transactions-list">
              {!shown.length && (
                <div className="staff-empty">
                  <Wallet size={34} />
                  <h3>Ready to help.</h3>
                  <p>
                    This donor’s funds will contribute when a receipt is
                    recorded.
                  </p>
                </div>
              )}
              {shown.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  transaction={tx}
                  store={store}
                  donorId={view === 'donors' ? donor.id : undefined}
                  onPhoto={() => setPhotoTransaction(tx.id)}
                  onProducts={() => setProductTransaction(tx.id)}
                />
              ))}
            </div>
          </section>
        </div>
        <footer className="staff-site-footer">
          Local prototype. Receipts, photos and balances are shared between tabs
          on this browser. No real payments or staff accounts.
        </footer>
      </main>
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        {receiptOpen && (
          <DialogContent className="donation-shell staff-receipt-dialog">
            <ReceiptEditor
              store={store}
              onSaved={() => {
                setReceiptOpen(false);
                setView('receipts');
                setNotice(
                  'Receipt recorded. Every donor balance has been updated. Add photos to show the care it paid for.',
                );
              }}
            />
          </DialogContent>
        )}
      </Dialog>
      <Dialog
        open={!!selectedProductTransaction}
        onOpenChange={(open) => {
          if (!open) setProductTransaction(null);
        }}
      >
        {selectedProductTransaction && (
          <DialogContent className="donation-shell staff-receipt-dialog">
            <TransactionProductsEditor
              key={selectedProductTransaction.id}
              transaction={selectedProductTransaction}
              store={store}
              onSaved={() => {
                setProductTransaction(null);
                setNotice(
                  'Purchased products saved and assigned to donors. Balances are updated.',
                );
              }}
            />
          </DialogContent>
        )}
      </Dialog>
      <Dialog
        open={!!selectedPhotoTransaction}
        onOpenChange={(open) => {
          if (!open) setPhotoTransaction(null);
        }}
      >
        {selectedPhotoTransaction && (
          <DialogContent className="donation-shell staff-photo-dialog">
            <TransactionPhotoEditor
              key={selectedPhotoTransaction.id}
              transaction={selectedPhotoTransaction}
              store={store}
              onSaved={() => {
                setPhotoTransaction(null);
                setNotice(
                  'Photo posted. The selected dogs and their donors’ shelters are up to date.',
                );
              }}
            />
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="staff-metric">
      <span>{label}</span>
      <strong>
        {kronor(value)} <small>SEK</small>
      </strong>
    </div>
  );
}

function TransactionRow({
  transaction: tx,
  store,
  donorId,
  onPhoto,
  onProducts,
}: {
  transaction: PortalTransaction;
  store: Store;
  donorId?: string;
  onPhoto: () => void;
  onProducts: () => void;
}) {
  const category = expenseCategories.find((c) => c.id === tx.category)!;
  const receipt = store.staff.receipts.find((r) => r.id === tx.receiptId);
  const donors = donorPortfolios(store.staff, store.base, store.personalName);
  const lastPhoto = tx.photos.at(-1);
  const amount = donorId
    ? tx.allocations.find((a) => a.donorId === donorId)!.amountOre
    : tx.amountOre;
  return (
    <article className="staff-transaction-row">
      <img src={category.asset} alt="" className="staff-transaction-art" />
      <div className="staff-transaction-details">
        <span className="staff-category-tag">{category.label}</span>
        <h3>{tx.description}</h3>
        <p>
          {tx.supplier} ·{' '}
          <time dateTime={tx.recordedAt}>{formatDate(tx.recordedAt)}</time>
        </p>
        {lastPhoto && (
          <p className="staff-photo-dogs">
            {[...new Set(tx.photos.flatMap((p) => p.dogIds))]
              .map((id) => profileDogs.find((d) => d.id === id)!.name)
              .join(', ')}
          </p>
        )}
        {tx.products?.length ? (
          <div className="staff-purchased-products">
            <h4>Purchased products</h4>
            <ul>
              {tx.products
                .filter((product) => !donorId || product.donorId === donorId)
                .map((product) => (
                  <li key={product.id}>
                    <span>
                      <strong>{product.name}</strong>
                      <small>
                        Paid by{' '}
                        {donors.find((d) => d.id === product.donorId)?.name}
                      </small>
                    </span>
                    <b>{money(product.amountOre)}</b>
                  </li>
                ))}
            </ul>
          </div>
        ) : (
          <p className="staff-product-missing">
            Product details not entered yet.
          </p>
        )}
        <Button
          variant="outline"
          className="staff-edit-products"
          onClick={onProducts}
          disabled={!store.ready || store.busy}
        >
          {tx.products?.length ? 'Edit products' : 'Add purchased products'}
        </Button>
        {receipt && (
          <a
            className="staff-receipt-download"
            href={receipt.file.src}
            download={receipt.file.name}
          >
            <FileText size={14} /> Receipt {receipt.reference}
          </a>
        )}
      </div>
      <strong className="staff-transaction-amount">
        {money(amount)}
        {donorId && <small>from this donor</small>}
      </strong>
      <button
        type="button"
        className="staff-photo-slot"
        onClick={onPhoto}
        disabled={!store.ready || store.busy}
        aria-label={`Upload a care photo for ${tx.description}`}
      >
        {lastPhoto ? (
          <>
            <img src={lastPhoto.src} alt={tx.description} />
            <span>
              <Camera size={15} /> {tx.photos.length}{' '}
              {tx.photos.length === 1 ? 'photo' : 'photos'}
            </span>
          </>
        ) : (
          <>
            <ImagePlus size={27} />
            <span>Add care photo</span>
          </>
        )}
      </button>
    </article>
  );
}

function ReceiptEditor({
  store,
  onSaved,
}: {
  store: Store;
  onSaved: () => void;
}) {
  const [supplier, setSupplier] = useState('');
  const [reference, setReference] = useState('');
  const [purchasedOn, setPurchasedOn] = useState(() =>
    stockholmInput(new Date()).slice(0, 10),
  );
  const [file, setFile] = useState<ReceiptFile | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const [lines, setLines] = useState([
    {
      id: 'line-1',
      description: '',
      category: 'food' as ExpenseCategory,
      amount: '',
      quantity: '1',
    },
  ]);
  const [review, setReview] = useState<StaffReceipt | null>(null);
  const donors = donorPortfolios(store.staff, store.base, store.personalName);
  async function attach(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = '';
    if (!selected) return;
    setReading(true);
    setError('');
    try {
      setFile(await readUpload(selected, true));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReading(false);
    }
  }
  function prepare() {
    setError('');
    try {
      if (!file) throw new Error('Attach the invoice or receipt.');
      if (!supplier.trim() || !reference.trim())
        throw new Error('Enter the supplier and receipt number.');
      const items = lines.map((line) => {
        const unitOre = parseReceiptAmount(line.amount);
        if (!unitOre || !line.description.trim())
          throw new Error(
            'Add a product name and valid unit price for every line.',
          );
        const id = crypto.randomUUID();
        const products = expandProductUnits(
          id,
          line.description.trim(),
          Number(line.quantity),
          unitOre,
        );
        return {
          id,
          description: line.description.trim(),
          category: line.category,
          amountOre: products.reduce(
            (sum, product) => sum + product.amountOre,
            0,
          ),
          products,
        };
      });
      const input = {
        id: crypto.randomUUID(),
        supplier: supplier.trim(),
        reference: reference.trim(),
        purchasedOn,
        recordedAt: new Date().toISOString(),
        file,
        lines: items,
      };
      setReview(planReceipt(store.staff, store.base, input));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function confirm() {
    if (!review) return;
    const failure = await store.updateStaff((staff, base) => {
      const fresh = planReceipt(staff, base, review);
      if (
        JSON.stringify(fresh.lines.map((l) => l.products)) !==
        JSON.stringify(review.lines.map((l) => l.products))
      )
        throw new Error(
          'Balances changed in another tab. Go back and review the product assignments.',
        );
      return recordReceipt(staff, base, review);
    });
    if (failure) setError(failure);
    else onSaved();
  }
  return (
    <>
      <DialogTitle>
        <Receipt size={23} />{' '}
        {review ? 'Review product assignments' : 'Add receipts or invoices'}
      </DialogTitle>
      <DialogDescription>
        {review
          ? 'Confirm once to record every line and update all donor balances.'
          : 'Attach the document and enter products, quantities and unit prices including VAT. Each unit will be assigned to one donor.'}
      </DialogDescription>
      {error && (
        <p className="staff-error" role="alert">
          {error}
        </p>
      )}
      {review ? (
        <>
          <div className="staff-receipt-review">
            <h3>
              {review.supplier} · {review.reference}
            </h3>
            <p>
              {formatDate(review.purchasedOn)} · {review.file.name}
            </p>
            <strong>
              {money(review.lines.reduce((n, l) => n + l.amountOre, 0))}
            </strong>
          </div>
          <table className="staff-split-table">
            <caption className="staff-review-caption">
              Each purchased product
            </caption>
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Paid by</th>
              </tr>
            </thead>
            <tbody>
              {review.lines
                .flatMap((line) => line.products ?? [])
                .map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{money(product.amountOre)}</td>
                    <td>
                      {donors.find((d) => d.id === product.donorId)?.name}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <table className="staff-split-table">
            <thead>
              <tr>
                <th>Donor</th>
                <th>Share</th>
                <th>Remaining</th>
              </tr>
            </thead>
            <tbody>
              {donors.map((donor) => {
                const share = review.lines.reduce(
                  (n, l) =>
                    n +
                    (l.allocations.find((a) => a.donorId === donor.id)
                      ?.amountOre ?? 0),
                  0,
                );
                return (
                  <tr key={donor.id}>
                    <td>{donor.name}</td>
                    <td>{money(share)}</td>
                    <td>{money(donor.pendingOre - share)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="staff-form-note">
            Each product is assigned whole to one donor who can cover its price.
            Assignments balance the cost across donors. No product is split into
            shares.
          </p>
          <div className="staff-form-actions">
            <Button
              variant="outline"
              disabled={store.busy}
              onClick={() => {
                setReview(null);
                setError('');
              }}
            >
              Back
            </Button>
            <Button
              className="staff-primary"
              disabled={store.busy}
              onClick={confirm}
            >
              {store.busy ? 'Recording…' : 'Record receipt & update balances'}
            </Button>
          </div>
        </>
      ) : (
        <form
          className="staff-receipt-form"
          onSubmit={(event) => {
            event.preventDefault();
            prepare();
          }}
        >
          <label className="staff-file-upload">
            <Upload size={25} />
            <strong>
              {reading
                ? 'Reading…'
                : (file?.name ?? 'Choose a receipt or invoice file')}
            </strong>
            <span>PDF, JPG, PNG or WebP · up to 1 MB</span>
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              disabled={reading}
              onChange={attach}
            />
          </label>
          <div className="staff-form-columns">
            <label>
              Supplier
              <input
                required
                maxLength={180}
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="e.g. Pet food supplier"
              />
            </label>
            <label>
              Receipt / invoice number
              <input
                required
                maxLength={180}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. INV-1042"
              />
            </label>
            <label>
              Purchase date
              <input
                type="date"
                required
                value={purchasedOn}
                max={stockholmInput(new Date()).slice(0, 10)}
                onChange={(e) => setPurchasedOn(e.target.value)}
              />
            </label>
          </div>
          <div className="staff-line-heading">
            <h3>Products & services</h3>
            <span>Unit prices include VAT</span>
          </div>
          {lines.map((line, index) => (
            <div className="staff-receipt-line" key={line.id}>
              <label>
                Item {index + 1}
                <input
                  required
                  value={line.description}
                  maxLength={180}
                  placeholder="e.g. Can of wet food"
                  onChange={(e) =>
                    setLines(
                      lines.map((l) =>
                        l.id === line.id
                          ? { ...l, description: e.target.value }
                          : l,
                      ),
                    )
                  }
                />
              </label>
              <label>
                Category
                <select
                  value={line.category}
                  onChange={(e) =>
                    setLines(
                      lines.map((l) =>
                        l.id === line.id
                          ? {
                              ...l,
                              category: e.target.value as ExpenseCategory,
                            }
                          : l,
                      ),
                    )
                  }
                >
                  {expenseCategories.map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Unit price · SEK
                <input
                  required
                  inputMode="decimal"
                  placeholder="0.00"
                  value={line.amount}
                  onChange={(e) =>
                    setLines(
                      lines.map((l) =>
                        l.id === line.id ? { ...l, amount: e.target.value } : l,
                      ),
                    )
                  }
                />
              </label>
              <label>
                Quantity
                <input
                  required
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={line.quantity}
                  onChange={(e) =>
                    setLines(
                      lines.map((l) =>
                        l.id === line.id
                          ? { ...l, quantity: e.target.value }
                          : l,
                      ),
                    )
                  }
                />
              </label>
              <Button
                type="button"
                variant="ghost"
                disabled={lines.length === 1}
                aria-label={`Remove item ${index + 1}`}
                onClick={() => setLines(lines.filter((l) => l.id !== line.id))}
              >
                <X size={17} />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={lines.length >= 30}
            onClick={() =>
              setLines([
                ...lines,
                {
                  id: crypto.randomUUID(),
                  description: '',
                  category: 'food',
                  amount: '',
                  quantity: '1',
                },
              ])
            }
          >
            <Plus size={16} /> Add another item
          </Button>
          <p className="staff-form-note">
            Enter each product’s price including VAT. Use separate rows when
            items have different prices.
          </p>
          <div className="staff-form-actions">
            <span>
              {money(
                lines.reduce(
                  (n, l) =>
                    n +
                    (parseReceiptAmount(l.amount) ?? 0) *
                      (Number(l.quantity) || 0),
                  0,
                ),
              )}{' '}
              total
            </span>
            <Button
              type="submit"
              className="staff-primary"
              disabled={!file || reading || store.busy}
            >
              Review product assignments <ArrowUpRight size={17} />
            </Button>
          </div>
        </form>
      )}
    </>
  );
}

function TransactionPhotoEditor({
  transaction,
  store,
  onSaved,
}: {
  transaction: PortalTransaction;
  store: Store;
  onSaved: () => void;
}) {
  const [file, setFile] = useState<ReceiptFile | null>(null);
  const [dogIds, setDogIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const category = expenseCategories.find(
    (c) => c.id === transaction.category,
  )!;
  const dogs = profileDogs.filter(
    (dog) =>
      !dog.group &&
      `${dog.name} ${dog.breed}`.toLowerCase().includes(query.toLowerCase()),
  );
  async function attach(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = '';
    if (!selected) return;
    setReading(true);
    setError('');
    try {
      setFile(await readUpload(selected));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReading(false);
    }
  }
  async function publish() {
    if (!file || !dogIds.length) return;
    const photo = {
      id: crypto.randomUUID(),
      src: file.src,
      dogIds,
      postedAt: new Date().toISOString(),
      liveHours: 2 as const,
    };
    const failure = await store.updateStaff((staff, base) =>
      postTransactionPhoto(staff, base, transaction.id, photo),
    );
    if (failure) setError(failure);
    else onSaved();
  }
  return (
    <>
      <DialogTitle>
        <Camera size={24} /> Show the care it paid for
      </DialogTitle>
      <DialogDescription>
        {transaction.description} · {money(transaction.amountOre)}
      </DialogDescription>
      <div className="staff-photo-category">
        <img src={category.asset} alt="" />
        <span>
          Category from transaction<strong>{category.label}</strong>
        </span>
        <Check size={19} />
      </div>
      {error && (
        <p role="alert" className="staff-error">
          {error}
        </p>
      )}
      {file ? (
        <div className="staff-upload-preview">
          <CarePhoto key={file.src} src={file.src} caption="" />
          <Button variant="outline" onClick={() => setFile(null)}>
            Change photo
          </Button>
        </div>
      ) : (
        <label className="staff-file-upload">
          <Camera size={29} />
          <strong>
            {reading ? 'Reading…' : 'Take or upload the care photo'}
          </strong>
          <span>JPG, PNG or WebP · up to 1 MB</span>
          <input
            type="file"
            capture="environment"
            accept="image/jpeg,image/png,image/webp"
            disabled={reading}
            onChange={attach}
          />
        </label>
      )}
      <div className="staff-line-heading">
        <h3>Which dogs benefited?</h3>
        <span>{dogIds.length} selected</span>
      </div>
      <input
        className="staff-dog-search"
        aria-label="Find a dog"
        placeholder="Find a dog by name or breed"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="staff-photo-dog-picker">
        {dogs.map((dog) => (
          <label
            key={dog.id}
            htmlFor={`staff-photo-dog-${dog.id}`}
            aria-label={dog.name}
            data-selected={dogIds.includes(dog.id)}
          >
            <input
              id={`staff-photo-dog-${dog.id}`}
              type="checkbox"
              checked={dogIds.includes(dog.id)}
              onChange={(e) =>
                setDogIds(
                  e.target.checked
                    ? [...dogIds, dog.id]
                    : dogIds.filter((id) => id !== dog.id),
                )
              }
            />
            <img src={dog.sprite} alt="" />
            <span>
              <strong>{dog.name}</strong>
              <small>{dog.breed}</small>
            </span>
          </label>
        ))}
        {!dogs.length && <p>No dogs match this search.</p>}
      </div>
      <p className="staff-form-note">
        This photo stays live for 2 hours, then remains in the transaction and
        dog timelines. The transaction cost is shared across its selected dogs;
        uploading a photo does not spend again.
      </p>
      <Button
        className="staff-primary"
        disabled={!file || !dogIds.length || reading || store.busy}
        onClick={publish}
      >
        {store.busy ? 'Posting…' : 'Post photo to donor shelters'}{' '}
        <ArrowUpRight size={17} />
      </Button>
      {!!transaction.photos.length && (
        <details className="staff-previous-photos">
          <summary>{transaction.photos.length} existing photos</summary>
          {transaction.photos.map((photo) => (
            <CarePhoto
              key={photo.id}
              src={photo.src}
              caption={`${photo.dogIds.map((id) => profileDogs.find((d) => d.id === id)!.name).join(', ')} · ${formatDate(photo.postedAt)}`}
            />
          ))}
        </details>
      )}
    </>
  );
}
