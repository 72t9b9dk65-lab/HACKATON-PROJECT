'use client';
import { useEffect, useState } from 'react';
import {
  Heart,
  ArrowUpRight,
  BarChart3,
  Trees,
  ShieldCheck,
  Image as ImageIcon,
  Search,
  X,
  Eye,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCareWorkspace } from '@/hooks/use-care-workspace';
import { profileDogs } from '@/lib/donation-shell';
import {
  balances,
  categories,
  donorProducts,
  money,
  parseMoney,
  publishedPosts,
} from '@/lib/platform/model';
import { shelterProgress } from '@/lib/platform/shelter-growth';
import { CareImage } from './care-image';
import { DogPortrait } from '@/components/dog-portrait';
import { GrowingShelter } from './growing-shelter';
import { ProofDialog } from './proof-dialog';
import {
  Header,
  Footer,
  LoadingWorkspace,
  Modal,
  Notice,
  Primary,
  CategoryIcon,
  dateLabel,
  useClock,
} from './shared';
export default function DonorWorkspace() {
  const store = useCareWorkspace(),
    now = useClock();
  const [donorId, setDonorId] = useState('personal');
  const [view, setView] = useState<'shelter' | 'statistics'>('shelter');
  const [donating, setDonating] = useState(false),
    [amount, setAmount] = useState('500'),
    [preview, setPreview] = useState<number | null>(null);
  const [dogId, setDogId] = useState<string | null>(null),
    [receiptId, setReceiptId] = useState<string | null>(null),
    [proofReceiptId, setProofReceiptId] = useState<string | null>(null);
  const [query, setQuery] = useState(''),
    [limit, setLimit] = useState(10),
    [message, setMessage] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      const id = new URLSearchParams(window.location.search).get('donor');
      if (id) setDonorId(id);
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  const state = store.state;
  if (!state) return <LoadingWorkspace store={store} />;
  const donor =
    balances(state).find((d) => d.id === donorId) ?? balances(state)[0];
  const clock = now ?? Date.parse(state.createdAt),
    progress = shelterProgress(
      donor.id,
      donor.used,
      donor.pending,
      preview ?? 0,
      profileDogs,
    );
  const rows = donorProducts(state, donor.id),
    posts = publishedPosts(state, clock);
  const receipts = state.receipts
    .filter(
      (r) =>
        (r.state === 'funded' || r.state === 'voided') &&
        r.products.some((p) => p.shares.some((s) => s.donorId === donor.id)),
    )
    .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt));
  const filtered = receipts.filter((r) =>
    (
      r.supplier +
      ' ' +
      r.reference +
      ' ' +
      r.products.map((p) => p.description).join(' ')
    )
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const selected = state.receipts.find((r) => r.id === receiptId),
    proofReceipt = state.receipts.find((r) => r.id === proofReceiptId);
  const dog = profileDogs.find((d) => d.id === dogId);
  const categoryTotals = categories.map((c) => ({
    ...c,
    total: rows
      .filter((r) => r.product.category === c.id)
      .reduce((n, r) => n + r.contribution, 0),
  }));
  const maxCategory = Math.max(1, ...categoryTotals.map((c) => c.total));
  const nextZone = progress.zones
    .filter((z) => z.nextThresholdOre !== null)
    .sort((a, b) => a.remainingOre - b.remainingOre)[0];
  const parsed = parseMoney(amount),
    valid = parsed !== null && parsed >= 100 && parsed <= 1_000_000;
  async function recordGift() {
    if (!valid) return;
    if (
      await store.send({
        type: 'donate',
        donorId: donor.id,
        amountOre: parsed!,
        monthly: false,
        category: 'comfort',
      })
    ) {
      setDonating(false);
      setPreview(null);
      setMessage(
        money(parsed!) +
          ' SEK added to pending. Your virtual shelter has grown; funds remain pending until assigned to care products.',
      );
    }
  }
  const shareTotal = (r: (typeof receipts)[number]) =>
    r.products.reduce(
      (n, p) =>
        n + (p.shares.find((s) => s.donorId === donor.id)?.amountOre ?? 0),
      0,
    );
  const growthSummary = (
    <section className="gs-next gs-next-horizontal">
      <div>
        <span className="gs-eyebrow">Growing together</span>
        <h2>{progress.residentIds.length} visual companions</h2>
        <p>
          {progress.nextDogOre === null
            ? 'All companions unlocked'
            : `${money(progress.nextDogOre)} SEK more donated for your next companion`}
        </p>
      </div>
      {nextZone && (
        <div className="gs-next-preview">
          <CareImage
            src={`/care/upgrades/${nextZone.family}-livello-${nextZone.level + 1}.webp`}
            alt=""
          />
          <div>
            <strong>Next: {nextZone.name}</strong>
            <small>
              Level {nextZone.level + 1} · {money(nextZone.remainingOre)} SEK to
              unlock
            </small>
          </div>
        </div>
      )}
      <Button
        variant="outline"
        onClick={() => {
          setDonating(true);
          setView('shelter');
        }}
      >
        <Eye size={16} /> Preview growth
      </Button>
    </section>
  );
  const renderTransaction = (r: (typeof receipts)[number]) => {
    const photo = posts.find((p) =>
      p.productIds.some((id) =>
        r.products.some((product) => product.id === id),
      ),
    );
    const proof = state.proofs.find((p) => p.id === r.proofId);
    return (
      <article
        key={r.id}
        className={
          'gs-transaction ' + (r.state === 'voided' ? 'is-reversed' : '')
        }
      >
        <button
          className="gs-transaction-main"
          onClick={() => setReceiptId(r.id)}
        >
          <CategoryIcon category={r.products[0].category} />
          <span>
            <strong>
              {r.source === 'workbook' ? r.products[0].description : r.supplier}
            </strong>
            <small>
              {dateLabel(r.purchasedAt, false)} ·{' '}
              {r.source === 'workbook' ? 'Imported record' : r.reference}
            </small>
          </span>
        </button>
        <span className="gs-transaction-amount">
          <strong>
            {r.state === 'voided' ? '↩ ' : ''}
            {money(shareTotal(r))} SEK
          </strong>
          <small>
            {r.state === 'voided' ? 'Returned to pending' : 'Your contribution'}
          </small>
        </span>
        <button
          className="gs-photo-slot"
          aria-label={
            photo
              ? 'View transaction photo'
              : 'Open transaction — photo unavailable'
          }
          onClick={() => setReceiptId(r.id)}
        >
          {photo ? (
            <CareImage
              src={photo.photo?.url ?? photo.demoPhoto}
              alt="Care photo"
              width={120}
              height={120}
            />
          ) : (
            <ImageIcon size={22} />
          )}
        </button>
        <Button
          className="gs-blockchain-status"
          variant="outline"
          onClick={() => setProofReceiptId(r.id)}
        >
          <span>
            <ShieldCheck size={16} /> Verified by blockchain
          </span>
          <small>Click for more info</small>
          {!proof?.anchors.length && <small>Demo · not yet anchored</small>}
        </Button>
      </article>
    );
  };
  return (
    <div className="care-platform gs-platform">
      <Header
        online={store.online}
        heading={
          <h1 className="gs-header-title">
            My little shelter<span>, connected to real dogs</span>
          </h1>
        }
      />
      <main className="gs-main">
        {store.error && <Notice kind="error">{store.error}</Notice>}
        {message && (
          <div className="gs-notice-row">
            <Notice kind="success">{message}</Notice>
            <Button
              variant="ghost"
              aria-label="Dismiss message"
              onClick={() => setMessage('')}
            >
              <X size={16} />
            </Button>
          </div>
        )}
        <div className="gs-dashboard">
          <aside className="gs-wallet-column">
            <Primary className="gs-donate" onClick={() => setDonating(true)}>
              <Heart fill="currentColor" size={23} /> Donate{' '}
              <ArrowUpRight size={24} />
            </Primary>
            <button
              className="gs-wallet"
              onClick={() =>
                setView(view === 'statistics' ? 'shelter' : 'statistics')
              }
            >
              <span>Your total donated</span>
              <strong>
                {money(donor.donated)} <small>SEK</small>
              </strong>
              <div className="gs-wallet-split">
                <div>
                  <span>
                    <i /> Pending
                  </span>
                  <b>
                    {money(donor.pending)} <small>SEK</small>
                  </b>
                </div>
                <div>
                  <span>
                    <i /> Used
                  </span>
                  <b>
                    {money(donor.used)} <small>SEK</small>
                  </b>
                </div>
              </div>
              <div className="gs-balance-track">
                <i
                  style={{
                    width:
                      (donor.donated ? (donor.used / donor.donated) * 100 : 0) +
                      '%',
                  }}
                />
              </div>
              <span className="gs-wallet-link">
                See where your money went <ArrowRight size={17} />
              </span>
            </button>

            <section className="gs-transactions gs-sidebar-transactions">
              <header>
                <div>
                  <h2>Your care transactions</h2>
                  <p>Purchased products funded by your donations.</p>
                </div>
                <label className="gs-search">
                  <Search size={17} />
                  <input
                    aria-label="Search transactions"
                    placeholder="Search transactions"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setLimit(10);
                    }}
                  />
                </label>
              </header>
              <div className="gs-transaction-list">
                {filtered.slice(0, 3).map(renderTransaction)}
              </div>
              {!filtered.length && (
                <p className="gs-empty-list">No transactions found.</p>
              )}
            </section>
          </aside>
          <div className="gs-main-column">
            <div className="gs-view-switch" aria-label="Shelter view">
              <Button
                variant={view === 'shelter' ? 'default' : 'ghost'}
                onClick={() => setView('shelter')}
              >
                <Trees size={17} /> Live shelter
              </Button>
              <Button
                variant={view === 'statistics' ? 'default' : 'ghost'}
                onClick={() => setView('statistics')}
              >
                <BarChart3 size={17} /> Spending statistics
              </Button>
            </div>
            {preview !== null && view === 'shelter' && (
              <div className="gs-preview-banner">
                <span>
                  <Eye size={18} />
                  <strong>Donation preview</strong> ·{' '}
                  {progress.residentIds.length + progress.potentialIds.length}{' '}
                  potential companions
                  {preview > 0 ? ' with ' + money(preview) + ' SEK extra' : ''}
                </span>
                <Button variant="ghost" onClick={() => setPreview(null)}>
                  <X size={17} /> Close preview
                </Button>
              </div>
            )}
            {view === 'shelter' ? (
              <GrowingShelter
                growthSummary={growthSummary}
                progress={progress}
                clock={clock}
                preview={preview !== null}
                onDog={setDogId}
                onDonate={() => setDonating(true)}
              />
            ) : (
              <section className="gs-statistics">
                <div>
                  <span className="gs-eyebrow">
                    Your contributions, accounted for
                  </span>
                  <h2>{money(donor.used)} SEK put to work</h2>
                  <p>Only allocated products count as used.</p>
                </div>
                <div className="gs-bars">
                  {categoryTotals.map((c) => (
                    <div key={c.id}>
                      <CategoryIcon category={c.id} />
                      <span>{c.label}</span>
                      <div>
                        <i
                          style={{ width: (c.total / maxCategory) * 100 + '%' }}
                        />
                      </div>
                      <strong>
                        {money(c.total)} <small>SEK</small>
                      </strong>
                    </div>
                  ))}
                </div>
                <div className="gs-stats-foot">
                  <b>{rows.length} allocated items</b>
                  <b>
                    {receipts.filter((r) => r.state === 'funded').length} funded
                    transactions
                  </b>
                  <span>{money(donor.pending)} SEK still available</span>
                </div>
              </section>
            )}
            <div className="gs-roster">
              <div className="gs-roster-title">
                <strong>Your visual companions</strong>
                <small>
                  Public Hundstallet profiles · illustrative selection
                </small>
              </div>
              <div>
                {progress.residentIds.map((id) => {
                  const d = profileDogs.find((p) => p.id === id)!;
                  return (
                    <button key={id} onClick={() => setDogId(id)}>
                      <DogPortrait dog={d} />
                      <strong>{d.name}</strong>
                    </button>
                  );
                })}
                {!progress.residentIds.length && (
                  <p>Your first companion arrives at 50 SEK donated.</p>
                )}
              </div>
            </div>
          </div>
        </div>
        {filtered.length > 3 && (
          <section className="gs-transactions gs-transaction-continuation">
            <header>
              <h2>More care transactions</h2>
            </header>
            <div className="gs-transaction-list">
              {filtered.slice(3, limit).map(renderTransaction)}
            </div>
            {!filtered.length && (
              <p className="gs-empty-list">
                No transactions found. Pending donations stay available until
                products are allocated.
              </p>
            )}
            {filtered.length > limit && (
              <Button variant="outline" onClick={() => setLimit((n) => n + 20)}>
                Show more transactions ({filtered.length - limit} remaining)
              </Button>
            )}
          </section>
        )}
        <p className="gs-prototype-note">
          Visual companions and upgrades illustrate your support; they do not
          assign your spending to those dogs. Real beneficiaries appear only on
          linked care photos. Public dog profiles are a saved snapshot from 7
          September 2026.
        </p>
      </main>
      <Footer />
      {donating && (
        <Modal
          open
          onClose={() => setDonating(false)}
          title="Help their world grow"
          description="Your donation stays pending until staff assign it to purchased care products."
        >
          <div className="gs-amount-presets">
            {[100, 500, 1000, 2500].map((n) => (
              <Button
                key={n}
                variant={amount === String(n) ? 'default' : 'outline'}
                onClick={() => setAmount(String(n))}
              >
                {n.toLocaleString('en-GB')} SEK
              </Button>
            ))}
          </div>
          <label className="cp-field">
            Your amount
            <div className="cp-money-input">
              <input
                aria-label="Donation amount in SEK"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <span>SEK</span>
            </div>
          </label>
          {valid ? (
            <div className="gs-gift-impact">
              <CareImage src="/care/upgrades/giardino-livello-3.webp" alt="" />
              <div>
                <strong>
                  {shelterProgress(
                    donor.id,
                    donor.used,
                    donor.pending,
                    parsed!,
                    profileDogs,
                  ).residentIds.length +
                    shelterProgress(
                      donor.id,
                      donor.used,
                      donor.pending,
                      parsed!,
                      profileDogs,
                    ).potentialIds.length}{' '}
                  potential companions
                </strong>
                <p>Based on your total donations, including this gift.</p>
              </div>
            </div>
          ) : (
            <Notice kind="error">
              Enter 1–10,000 SEK, with up to two decimal places.
            </Notice>
          )}
          {store.error && <Notice kind="error">{store.error}</Notice>}
          <div className="cp-modal-actions">
            <Button
              variant="outline"
              disabled={!valid}
              onClick={() => {
                setPreview(parsed);
                setDonating(false);
                setView('shelter');
              }}
            >
              <Eye size={17} /> Preview shelter
            </Button>
            <Primary
              disabled={!valid || store.busy}
              onClick={() => void recordGift()}
            >
              <Heart size={17} />
              {store.busy ? 'Saving…' : 'Record demo donation'}
            </Primary>
          </div>
          <a
            className="cp-real-gift"
            href="https://hundstallet.se/stod-oss/"
            target="_blank"
            rel="noreferrer"
          >
            Make a real donation on Hundstallet’s website ↗
          </a>
          <small className="cp-demo-note">
            Local prototype · no payment is taken.
          </small>
        </Modal>
      )}
      {dog && (
        <Modal
          open
          onClose={() => setDogId(null)}
          title={dog.name}
          description="Virtual companion · public Hundstallet profile"
        >
          <div className="gs-dog-profile">
            <DogPortrait dog={dog} large />
            <div>
              <h3>{dog.breed}</h3>
              <p>
                {dog.age} · {dog.location}
              </p>
              <p>{dog.description}</p>
              <a
                className="cp-real-gift"
                href={dog.source}
                target="_blank"
                rel="noreferrer"
              >
                Meet {dog.name} on Hundstallet ↗
              </a>
            </div>
          </div>
          <p className="cp-fine-print">
            This virtual companion was selected from the saved public directory.
            Their presence does not mean your donation funded their individual
            care.
          </p>
        </Modal>
      )}
      {selected && (
        <Modal
          wide
          open
          onClose={() => setReceiptId(null)}
          title={selected.supplier}
          description={
            selected.reference + ' · ' + dateLabel(selected.purchasedAt, false)
          }
        >
          <div className="gs-receipt-total">
            <span>
              Your contribution
              <strong>{money(shareTotal(selected))} SEK</strong>
            </span>
            <span>
              Receipt total<strong>{money(selected.totalOre)} SEK</strong>
            </span>
          </div>
          {selected.state === 'voided' && (
            <Notice>
              Reversed on {dateLabel(selected.voidedAt!)}.{' '}
              {money(shareTotal(selected))} SEK returned to pending.{' '}
              {selected.reason}
            </Notice>
          )}
          {selected.source === 'workbook' && (
            <Notice>
              Imported spreadsheet record. Product details and an original
              receipt were not supplied.
            </Notice>
          )}
          <div className="gs-product-list">
            {selected.products.map((p) => (
              <div key={p.id}>
                <CategoryIcon category={p.category} />
                <span>
                  <strong>{p.description}</strong>
                  <small>
                    {p.shares.some((s) => s.donorId === donor.id)
                      ? 'Funded by your donation'
                      : 'Funded by another donor'}
                  </small>
                </span>
                <strong>{money(p.amountOre)} SEK</strong>
              </div>
            ))}
          </div>
          {posts
            .filter((p) =>
              p.productIds.some((id) =>
                selected.products.some((product) => product.id === id),
              ),
            )
            .map((p) => (
              <figure className="gs-evidence-photo" key={p.id}>
                <CareImage src={p.photo?.url ?? p.demoPhoto} alt={p.title} />
                <figcaption>
                  <strong>{p.title}</strong>
                  <p>
                    {p.dogIds
                      .map(
                        (id) =>
                          profileDogs.find((d) => d.id === id)?.name ?? id,
                      )
                      .join(', ')}{' '}
                    · {dateLabel(p.occurredAt)}
                  </p>
                  <p>{p.note}</p>
                  {p.source === 'demo' && (
                    <small>Demonstration photo link</small>
                  )}
                </figcaption>
              </figure>
            ))}
          <div className="cp-modal-actions">
            {selected.file && (
              <a
                className="cp-text-link"
                href={selected.file.url}
                target="_blank"
                rel="noreferrer"
              >
                Original receipt ↗
              </a>
            )}
            <Primary
              onClick={() => {
                setProofReceiptId(selected.id);
                setReceiptId(null);
              }}
            >
              <ShieldCheck size={18} /> Verify this transaction
            </Primary>
          </div>
        </Modal>
      )}
      {proofReceipt && (
        <ProofDialog
          key={proofReceipt.id + ':' + proofReceipt.proofId}
          proof={
            state.proofs.find((p) => p.id === proofReceipt.proofId) ?? null
          }
          receipt={proofReceipt}
          onClose={() => setProofReceiptId(null)}
          onRefresh={() => void store.refresh()}
        />
      )}
    </div>
  );
}
