'use client';
import { useState } from 'react';
import {
  Plus,
  Search,
  ShieldCheck,
  ArrowRight,
  FileText,
  Download,
  ImagePlus,
  Users,
  ReceiptText,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useCareWorkspace,
  uploadCareFile,
  type CareStore,
} from '@/hooks/use-care-workspace';
import {
  balances,
  donorProducts,
  money,
  categoryFor,
} from '@/lib/platform/model';
import { profileDogs } from '@/lib/donation-shell';
import type { Receipt, Product, FileRecord } from '@/lib/platform/types';
import { ReceivedGiftDialog } from './received-gift-dialog';
import { ReceiptDialog } from './receipt-dialog';
import { AllocationDialog } from './allocation-dialog';
import { ProofDialog } from './proof-dialog';
import { prepareCarePhoto } from '@/lib/platform/photo-preview';
import { CareImage } from './care-image';
import {
  Header,
  LoadingWorkspace,
  Modal,
  Notice,
  Primary,
  CategoryIcon,
  dateLabel,
} from './shared';

function TransactionFileDialog({ onClose }: { onClose: () => void }) {
  const [fileName, setFileName] = useState('');
  return (
    <Modal
      open
      onClose={onClose}
      title="Add transaction file"
      description="Choose a transaction export from your accounting app."
    >
      <div className="cp-upload-zone gs-transaction-file">
        <Upload size={28} />
        <strong>{fileName || 'Accounting export'}</strong>
        <span>CSV or Excel file</span>
        <label className="cp-file-picker">
          {fileName ? 'Choose another file' : 'Choose file'}
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            aria-label="Choose transaction file"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
          />
        </label>
      </div>
      <Notice>
        Automatic import is coming soon. Once connected, your export will be
        read automatically so you can review the transactions before saving.
        Files are not uploaded yet.
      </Notice>
      <div className="cp-modal-actions">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
        <Primary disabled>Read transactions</Primary>
      </div>
    </Modal>
  );
}

function ProductPhotoDialog({
  store,
  product,
  onClose,
  onSaved,
}: {
  store: CareStore;
  product: Product;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [photo, setPhoto] = useState<FileRecord | null>(null),
    [dogs, setDogs] = useState<string[]>([]),
    [query, setQuery] = useState(''),
    [note, setNote] = useState(''),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState('');
  async function upload(file: File) {
    setUploading(true);
    setError('');
    try {
      setPhoto(await uploadCareFile(await prepareCarePhoto(file)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }
  async function save() {
    if (!photo || !dogs.length) return;
    const now = new Date().toISOString();
    if (
      await store.send({
        type: 'publish',
        post: {
          title: product.description,
          note,
          dogIds: dogs,
          productIds: [product.id],
          category: product.category,
          stage: null,
          photo,
          occurredAt: now,
          publishAt: now,
          liveHours: 2,
        },
      })
    ) {
      onSaved('Care photo attached to the product and its donor transactions.');
      onClose();
    }
  }
  return (
    <Modal
      open
      wide
      onClose={onClose}
      title="Attach a care photo"
      description={
        product.description + ' · ' + categoryFor(product.category).label
      }
    >
      <label className="gs-photo-upload">
        {photo ? (
          <CareImage src={photo.url} alt="Uploaded care photo" />
        ) : (
          <>
            <Upload size={26} />
            <strong>{uploading ? 'Uploading…' : 'Choose a photo'}</strong>
          </>
        )}
        <input
          aria-label="Upload care photo"
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={(e) => {
            if (e.target.files?.[0]) void upload(e.target.files[0]);
          }}
        />
      </label>
      <p className="cp-fine-print">
        Category and transaction are already linked. Select the dogs that used
        this product.
      </p>
      <label className="gs-search">
        <Search size={17} />
        <input
          aria-label="Find dogs"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find dogs by name"
        />
      </label>
      <div className="gs-dog-picker">
        {profileDogs
          .filter(
            (d) =>
              !d.group && d.name.toLowerCase().includes(query.toLowerCase()),
          )
          .map((d) => (
            <label key={d.id}>
              <input
                type="checkbox"
                checked={dogs.includes(d.id)}
                onChange={(e) =>
                  setDogs(
                    e.target.checked
                      ? [...dogs, d.id]
                      : dogs.filter((id) => id !== d.id),
                  )
                }
              />
              <CareImage
                src={d.photos[0].src}
                alt=""
                width={120}
                height={120}
              />
              <strong>{d.name}</strong>
            </label>
          ))}
      </div>
      <label className="cp-field">
        Note (optional)
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1600}
        />
      </label>
      {(error || store.error) && (
        <Notice kind="error">{error || store.error}</Notice>
      )}
      <div className="cp-modal-actions">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Primary
          disabled={
            !photo ||
            !dogs.length ||
            dogs.length > 20 ||
            store.busy ||
            uploading
          }
          onClick={() => void save()}
        >
          Attach photo · {dogs.length} dogs
        </Primary>
      </div>
    </Modal>
  );
}
export default function StaffWorkspace() {
  const store = useCareWorkspace();
  const [recordingGift, setRecordingGift] = useState(false);
  const [addingTransactionFile, setAddingTransactionFile] = useState(false);
  const [tab, setTab] = useState<'receipts' | 'donors'>('receipts'),
    [search, setSearch] = useState(''),
    [filter, setFilter] = useState('all'),
    [limit, setLimit] = useState(12);
  const [editor, setEditor] = useState<Receipt | null>(null),
    [allocation, setAllocation] = useState<string | null>(null),
    [photoProduct, setPhotoProduct] = useState<Product | null>(null),
    [proofId, setProofId] = useState<string | null>(null),
    [selectedDonor, setSelectedDonor] = useState('personal'),
    [correction, setCorrection] = useState<Receipt | null>(null),
    [reason, setReason] = useState(''),
    [message, setMessage] = useState('');
  const state = store.state;
  if (!state) return <LoadingWorkspace store={store} />;
  const wallets = balances(state),
    pending = state.receipts.filter((r) => r.state === 'draft');
  const needsSnapshots = state.receipts.filter(
    (r) =>
      r.state !== 'draft' &&
      state.proofs.find((p) => p.id === r.proofId)?.payload.evidenceVersion !==
        2,
  ).length;
  async function prepareSnapshots() {
    if (await store.send({ type: 'seal-records' }))
      setMessage(
        'Imported records now have local fingerprints. Missing original documents remain marked; nothing has been registered on-chain.',
      );
  }
  const totals = wallets.reduce(
    (a, d) => ({
      donated: a.donated + d.donated,
      pending: a.pending + d.pending,
      used: a.used + d.used,
    }),
    { donated: 0, pending: 0, used: 0 },
  );
  const donor = wallets.find((d) => d.id === selectedDonor) ?? wallets[0],
    items = donor ? donorProducts(state, donor.id) : [];
  const filtered = state.receipts
    .filter(
      (r) =>
        filter === 'all' ||
        r.state === filter ||
        (filter === 'workbook' && r.source === 'workbook'),
    )
    .filter((r) =>
      (
        r.supplier +
        ' ' +
        r.reference +
        ' ' +
        r.products.map((p) => p.description).join(' ')
      )
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .sort(
      (a, b) =>
        b.createdAt.localeCompare(a.createdAt) ||
        b.purchasedAt.localeCompare(a.purchasedAt),
    );
  const proof = state.proofs.find((p) => p.id === proofId),
    proofReceipt = state.receipts.find((r) => r.id === proof?.payload.entityId);
  async function seal(r: Receipt) {
    if (await store.send({ type: 'seal-record', receiptId: r.id }))
      setMessage(
        'Current receipt snapshot registered. Open Verify & anchor to check or publish its fingerprint.',
      );
  }
  async function correct() {
    if (!correction) return;
    if (await store.send({ type: 'void', receiptId: correction.id, reason })) {
      setCorrection(null);
      setReason('');
      setMessage(
        'Correction recorded. The assigned funds are pending again; original records remain in the history.',
      );
    }
  }
  function exportLedger() {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              exportedAt: new Date().toISOString(),
              environment: 'local-demo',
              wallets,
              receipts: state!.receipts,
              proofs: state!.proofs,
              audit: state!.audit,
            },
            null,
            2,
          ),
        ],
        { type: 'application/json' },
      ),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hundstallet-ledger.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  const receiptCard = (r: Receipt) => {
    const record = state.proofs.find((p) => p.id === r.proofId),
      unitemized = r.products.some((p) => p.id.endsWith(':unitemized'));
    return (
      <article className="gs-staff-receipt" key={r.id}>
        <div className="gs-staff-receipt-top">
          <CategoryIcon category={r.products[0].category} />
          <div>
            <div className="gs-receipt-tags">
              <span className={'cp-status cp-status-' + r.state}>
                {r.state === 'draft'
                  ? 'Pending allocation'
                  : r.state === 'funded'
                    ? 'Allocated'
                    : 'Corrected'}
              </span>
              {r.source === 'workbook' && (
                <span className="cp-tag">Spreadsheet import</span>
              )}
            </div>
            <h3>{r.supplier}</h3>
            <small>
              {r.reference} · {dateLabel(r.purchasedAt, false)} ·{' '}
              {r.products.length}{' '}
              {unitemized ? 'unitemized record' : 'products'}
            </small>
          </div>
          <strong>{money(r.totalOre)} SEK</strong>
        </div>
        <details className="gs-staff-products" open={r.source !== 'workbook'}>
          <summary>Products, donors & photos</summary>
          {r.products.map((p) => {
            const photos = state.posts.filter(
              (post) => !post.withdrawnAt && post.productIds.includes(p.id),
            );
            return (
              <div className="gs-staff-product" key={p.id}>
                <CategoryIcon category={p.category} />
                <span>
                  <strong>{p.description}</strong>
                  <small>
                    {p.shares.length
                      ? p.shares
                          .map(
                            (s) =>
                              (wallets.find((d) => d.id === s.donorId)?.name ??
                                s.donorId) +
                              ' · ' +
                              money(s.amountOre) +
                              ' SEK',
                          )
                          .join(' / ')
                      : 'Awaiting donor assignment'}
                  </small>
                </span>
                <b>{money(p.amountOre)} SEK</b>
                {r.state === 'funded' && !unitemized && (
                  <button
                    className="gs-photo-slot"
                    onClick={() => setPhotoProduct(p)}
                    aria-label={'Add care photo for ' + p.description}
                  >
                    {photos[0] ? (
                      <CareImage
                        src={photos[0].photo?.url ?? photos[0].demoPhoto}
                        alt="Care photo"
                        width={120}
                        height={120}
                      />
                    ) : (
                      <ImagePlus size={23} />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </details>
        <footer className="gs-staff-receipt-actions">
          {r.file ? (
            <a href={r.file.url} target="_blank" rel="noreferrer">
              <FileText size={16} /> Original receipt ↗
            </a>
          ) : (
            <small>Original document unavailable</small>
          )}
          <div>
            {r.state === 'draft' ? (
              <>
                <Button variant="outline" onClick={() => setEditor(r)}>
                  Edit products
                </Button>
                <Primary onClick={() => setAllocation(r.id)}>
                  Allocate products <ArrowRight size={15} />
                </Primary>
              </>
            ) : (
              <>
                {unitemized && r.state === 'funded' && (
                  <Button variant="outline" onClick={() => setEditor(r)}>
                    Add original product details
                  </Button>
                )}
                {record?.payload.evidenceVersion === 2 ? (
                  <Button
                    variant="outline"
                    onClick={() => setProofId(record.id)}
                  >
                    <ShieldCheck size={16} />
                    {record.anchors.length
                      ? 'Verify on-chain'
                      : 'Verify & anchor'}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    disabled={store.busy}
                    onClick={() => void seal(r)}
                  >
                    <ShieldCheck size={16} /> Register snapshot
                  </Button>
                )}
                {r.state === 'funded' && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setCorrection(r);
                      setReason('');
                    }}
                  >
                    Correct
                  </Button>
                )}
              </>
            )}
          </div>
        </footer>
      </article>
    );
  };
  return (
    <div className="care-platform gs-platform">
      <Header staff online={store.online} />
      <main className="gs-main gs-staff-main">
        <div className="gs-staff-heading">
          <div>
            <h1>Care, accounted for.</h1>
            <p>Import transactions. Check products. Allocate once.</p>
          </div>
          <Primary
            onClick={() => {
              store.clearError();
              setAddingTransactionFile(true);
            }}
          >
            <Plus size={20} /> Add transaction file
          </Primary>
        </div>
        {(message || store.error) && (
          <Notice kind={store.error ? 'error' : 'success'}>
            {store.error || message}
          </Notice>
        )}
        <div className="gs-staff-totals">
          {[
            { label: 'Total donated', value: totals.donated },
            { label: 'Available to spend', value: totals.pending },
            { label: 'Used for care', value: totals.used },
          ].map((t) => (
            <div key={t.label}>
              <span>{t.label}</span>
              <strong>
                {money(t.value)} <small>SEK</small>
              </strong>
            </div>
          ))}
        </div>
        <div className="gs-staff-toolbar">
          <div className="gs-view-switch" aria-label="Staff workspace view">
            <Button
              variant={tab === 'receipts' ? 'default' : 'ghost'}
              onClick={() => setTab('receipts')}
            >
              <ReceiptText size={17} /> Receipts & products
            </Button>
            <Button
              variant={tab === 'donors' ? 'default' : 'ghost'}
              onClick={() => setTab('donors')}
            >
              <Users size={17} /> Donors
            </Button>
          </div>
          <div className="cp-inline-actions">
            <Button variant="outline" onClick={() => setRecordingGift(true)}>
              Record received donation
            </Button>
            <Button variant="outline" onClick={exportLedger}>
              <Download size={16} /> Export ledger
            </Button>
          </div>
        </div>
        {tab === 'receipts' ? (
          <section className="gs-transactions">
            <header>
              <div>
                <h2>All care transactions</h2>
                <p>
                  {pending.length} receipts awaiting allocation · products keep
                  their exact prices.
                </p>
              </div>
              <Primary
                disabled={!pending.length || store.busy}
                onClick={() => setAllocation('all')}
              >
                Distribute products to donors <ArrowRight size={17} />
              </Primary>
            </header>
            {needsSnapshots > 0 && (
              <div className="gs-import-banner">
                <span>
                  {needsSnapshots} older records have no complete fingerprint.
                </span>
                <Button
                  variant="outline"
                  disabled={store.busy}
                  onClick={() => void prepareSnapshots()}
                >
                  <ShieldCheck size={16} /> Register imported records
                </Button>
              </div>
            )}
            <div className="gs-filter-row">
              <label className="gs-search">
                <Search size={18} />
                <input
                  aria-label="Search receipts"
                  value={search}
                  placeholder="Supplier, receipt or product"
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setLimit(12);
                  }}
                />
              </label>
              <select
                aria-label="Filter receipts"
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setLimit(12);
                }}
              >
                <option value="all">All transactions</option>
                <option value="draft">Pending allocation</option>
                <option value="funded">Allocated</option>
                <option value="voided">Corrected</option>
                <option value="workbook">Spreadsheet imports</option>
              </select>
            </div>
            {filtered.slice(0, limit).map(receiptCard)}
            {!filtered.length && (
              <p className="gs-empty-list">No receipts match this view.</p>
            )}
            {filtered.length > limit && (
              <Button variant="outline" onClick={() => setLimit((n) => n + 20)}>
                Show more ({filtered.length - limit} remaining)
              </Button>
            )}
          </section>
        ) : donor ? (
          <div className="gs-donor-portfolios">
            <aside>
              {wallets.map((d) => (
                <button
                  className={d.id === donor?.id ? 'active' : ''}
                  key={d.id}
                  onClick={() => setSelectedDonor(d.id)}
                >
                  <strong>{d.name}</strong>
                  <span>{money(d.pending)} SEK pending</span>
                  <small>{money(d.used)} SEK used</small>
                </button>
              ))}
            </aside>
            <section className="gs-transactions">
              <header>
                <div>
                  <h2>{donor.name}</h2>
                  <p>
                    {money(donor.donated)} SEK donated · {money(donor.pending)}{' '}
                    SEK pending · {money(donor.used)} SEK used
                  </p>
                </div>
                <div>
                  <strong>{donor.email || 'Sample account'}</strong>
                  <p>
                    {donor.provider && donor.provider !== 'demo'
                      ? donor.provider
                      : 'Individual'}
                    {donor.registeredAt
                      ? ' · Registered ' + dateLabel(donor.registeredAt, false)
                      : ''}
                  </p>
                </div>
              </header>
              <div className="gs-product-list">
                {items.map(({ product, receipt, contribution }) => (
                  <div key={product.id}>
                    <CategoryIcon category={product.category} />
                    <span>
                      <strong>{product.description}</strong>
                      <small>
                        {receipt.supplier} ·{' '}
                        {dateLabel(receipt.purchasedAt, false)}
                      </small>
                    </span>
                    <b>{money(contribution)} SEK</b>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTab('receipts');
                        setSearch(receipt.reference);
                        setFilter('all');
                      }}
                    >
                      Receipt
                    </Button>
                  </div>
                ))}
              </div>
              {!items.length && (
                <p className="gs-empty-list">No products assigned yet.</p>
              )}
            </section>
          </div>
        ) : (
          <Notice>
            No registered donors yet. New donor accounts appear here
            automatically.
          </Notice>
        )}
        <p className="gs-prototype-note">
          {state.viewer?.demo
            ? 'Active shelter workspace. '
            : 'Employee workspace. '}
          Blockchain registration uses Sepolia testnet; a fingerprint is not
          proof that care occurred.
        </p>
      </main>
      {addingTransactionFile && (
        <TransactionFileDialog
          onClose={() => setAddingTransactionFile(false)}
        />
      )}
      {recordingGift && (
        <ReceivedGiftDialog
          store={store}
          onClose={() => setRecordingGift(false)}
          onSaved={setMessage}
        />
      )}
      {editor && (
        <ReceiptDialog
          store={store}
          receipt={editor}
          onClose={() => setEditor(null)}
          onSaved={setMessage}
        />
      )}
      {allocation && (
        <AllocationDialog
          store={store}
          receiptId={allocation}
          onClose={() => setAllocation(null)}
          onSaved={setMessage}
        />
      )}
      {photoProduct && (
        <ProductPhotoDialog
          store={store}
          product={photoProduct}
          onClose={() => setPhotoProduct(null)}
          onSaved={setMessage}
        />
      )}
      {proof && (
        <ProofDialog
          key={proof.id}
          proof={proof}
          receipt={proofReceipt}
          allowAnchor
          onClose={() => setProofId(null)}
          onRefresh={() => void store.refresh()}
        />
      )}
      {correction && (
        <Modal
          open
          onClose={() => setCorrection(null)}
          title="Correct this transaction"
          description="The original receipt and allocation stay in the history. Its funds become available again."
        >
          <p>
            {correction.supplier} · {money(correction.totalOre)} SEK
          </p>
          <label className="cp-field">
            Reason
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
            />
          </label>
          {store.error && <Notice kind="error">{store.error}</Notice>}
          <div className="cp-modal-actions">
            <Button variant="ghost" onClick={() => setCorrection(null)}>
              Cancel
            </Button>
            <Primary
              disabled={reason.trim().length < 10 || store.busy}
              onClick={() => void correct()}
            >
              Record correction & return funds
            </Primary>
          </div>
        </Modal>
      )}
    </div>
  );
}
