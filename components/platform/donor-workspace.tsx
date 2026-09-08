'use client';
import { companionProfileId } from '@/lib/platform/shelter-growth';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Heart,
  ArrowUpRight,
  BarChart3,
  ShieldCheck,
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
import {
  shelterProgress,
  areaAsset,
  maximumShelterDonationOre,
} from '@/lib/platform/shelter-growth';
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
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [railLayout, setRailLayout] = useState<{
    height?: number;
    count: number;
  }>({ count: 3 });
  const [view, setView] = useState<'shelter' | 'statistics'>('shelter');
  const [donating, setDonating] = useState(false),
    [amount, setAmount] = useState('500'),
    [preview, setPreview] = useState<number | null>(null);
  const [dogId, setDogId] = useState<string | null>(null),
    [receiptId, setReceiptId] = useState<string | null>(null),
    [proofReceiptId, setProofReceiptId] = useState<string | null>(null);
  const [limit, setLimit] = useState(10),
    [message, setMessage] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      const id = new URLSearchParams(window.location.search).get('donor');
      if (id) setDonorId(id);
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  const state = store.state;
  const previewActive = preview !== null;
  useLayoutEffect(() => {
    const dashboard = dashboardRef.current;
    if (!dashboard) return;
    const right = dashboard.querySelector<HTMLElement>('.gs-main-column')!;
    const aside = dashboard.querySelector<HTMLElement>('.gs-wallet-column')!;
    const section = dashboard.querySelector<HTMLElement>(
      '.gs-sidebar-transactions',
    )!;
    const list = section.querySelector<HTMLElement>('.gs-transaction-list')!;
    const header = section.querySelector('header')!;
    const measure = () => {
      if (matchMedia('(max-width: 760px)').matches) {
        setRailLayout((old) =>
          old.height === undefined && old.count === 3 ? old : { count: 3 },
        );
        return;
      }
      const height = right.getBoundingClientRect().height;
      const available =
        aside.getBoundingClientRect().top +
        height -
        list.getBoundingClientRect().top -
        parseFloat(getComputedStyle(section).paddingBottom) -
        1;
      let used = 0,
        count = 0;
      for (const row of section.querySelectorAll<HTMLElement>(
        '.gs-rail-measurements [data-rail-row]',
      )) {
        const rowHeight = row.getBoundingClientRect().height;
        if (used + rowHeight > available) break;
        used += rowHeight;
        count++;
      }
      setRailLayout((old) =>
        old.height === height && old.count === count ? old : { height, count },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    for (const node of [
      right,
      header,
      aside.querySelector('.gs-wallet')!,
      aside.querySelector('.gs-donate')!,
      ...section.querySelectorAll('.gs-rail-measurements [data-rail-row]'),
    ])
      observer.observe(node);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [state, limit, view, previewActive]);
  if (!state) return <LoadingWorkspace store={store} />;
  const donor =
    balances(state).find(
      (d) =>
        d.id === (state.viewer?.role === 'donor' ? state.viewer.id : donorId),
    ) ?? balances(state)[0];
  const donatedOre = Math.max(0, donor.used) + Math.max(0, donor.pending);
  const previewMaximumOre = Math.max(
    donatedOre,
    maximumShelterDonationOre(profileDogs),
  );
  const previewExtraOre = Math.min(
    Math.max(0, preview ?? 0),
    previewMaximumOre - donatedOre,
  );
  const previewTotalOre = donatedOre + previewExtraOre;
  const clock = now ?? Date.parse(state.createdAt),
    progress = shelterProgress(
      donor.id,
      donor.used,
      donor.pending,
      previewExtraOre,
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
  const filtered = receipts;
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
          ' SEK added to pending. Your companions have grown; area upgrades unlock when staff assign care products.',
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
        <h2>
          {progress.residentIds.length +
            (previewActive ? progress.potentialIds.length : 0)}{' '}
          visual companions
        </h2>
        <p>
          {previewActive
            ? `${progress.potentialIds.length} additional companions in this preview`
            : progress.nextDogOre === null
              ? 'All companions unlocked'
              : `${money(progress.nextDogOre)} SEK more donated for your next companion`}
        </p>
      </div>
      {!previewActive && nextZone && (
        <div className="gs-next-preview">
          <CareImage src={areaAsset(nextZone, nextZone.level + 1)} alt="" />
          <div>
            <strong>Next: {nextZone.name}</strong>
            <small>
              Level {nextZone.level + 1} · {money(nextZone.remainingOre)} SEK of
              care to unlock
            </small>
          </div>
        </div>
      )}
      <Button
        className="gs-preview-growth-button"
        variant="outline"
        aria-expanded={previewActive}
        aria-controls="shelter-growth-slider"
        onClick={() => {
          setPreview(previewActive ? null : 0);
          setView('shelter');
        }}
      >
        {previewActive ? <X size={22} /> : <Eye size={22} />}
        {previewActive ? 'Close preview' : 'Preview growth'}
      </Button>
    </section>
  );
  const renderTransaction = (r: (typeof receipts)[number]) => {
    const proof = state.proofs.find((p) => p.id === r.proofId);
    return (
      <article
        key={r.id}
        className={
          'gs-transaction ' + (r.state === 'voided' ? 'is-reversed' : '')
        }
      >
        <div className="gs-transaction-heading">
          <button
            className="gs-transaction-main"
            aria-label={'Open transaction: ' + r.supplier + ' · ' + r.reference}
            onClick={() => setReceiptId(r.id)}
          >
            <CategoryIcon category={r.products[0].category} />
            <span>
              <strong>
                {r.source === 'workbook'
                  ? r.products[0].description
                  : r.supplier}
              </strong>
              <small>
                {dateLabel(r.purchasedAt, false)} ·{' '}
                {r.source === 'workbook' ? 'Imported record' : r.reference}
              </small>
            </span>
          </button>
        </div>
        <div className="gs-transaction-summary">
          <span className="gs-transaction-amount">
            <strong>
              {r.state === 'voided' ? '↩ ' : ''}
              {money(shareTotal(r))} SEK
            </strong>
            <small>
              {r.state === 'voided'
                ? 'Returned to pending'
                : 'Your contribution'}
            </small>
          </span>
          <Button
            className="gs-blockchain-status"
            variant="outline"
            onClick={() => setProofReceiptId(r.id)}
          >
            <span>
              <ShieldCheck size={16} />{' '}
              {proof?.anchors.length
                ? 'Verified by blockchain'
                : 'Blockchain verification'}
            </span>
            <small>Click for more info</small>
          </Button>
        </div>
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
        <div className="gs-dashboard" ref={dashboardRef}>
          <aside
            className="gs-wallet-column"
            style={{ height: railLayout.height }}
          >
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
                  <div className="gs-transaction-title">
                    <h2>Your care transactions</h2>
                    <span aria-label={`${receipts.length} transactions`}>
                      {receipts.length}
                    </span>
                  </div>
                  <Button
                    className="gs-spending-toggle"
                    variant={view === 'statistics' ? 'default' : 'outline'}
                    aria-pressed={view === 'statistics'}
                    onClick={() =>
                      setView(view === 'statistics' ? 'shelter' : 'statistics')
                    }
                  >
                    <BarChart3 size={17} /> Spending statistics
                  </Button>
                  <p>Purchased products funded by your donations.</p>
                </div>
              </header>
              <div className="gs-transaction-list">
                {filtered.slice(0, railLayout.count).map((receipt) => (
                  <div key={receipt.id} className="gs-rail-visible-row">
                    {renderTransaction(receipt)}
                  </div>
                ))}
              </div>
              <div className="gs-rail-measurements" aria-hidden="true" inert>
                {filtered.slice(0, limit).map((receipt) => (
                  <div key={receipt.id} data-rail-row>
                    {renderTransaction(receipt)}
                  </div>
                ))}
              </div>
              {!filtered.length && (
                <p className="gs-empty-list">No transactions found.</p>
              )}
            </section>
          </aside>
          <div className="gs-main-column">
            {view === 'shelter' ? (
              <GrowingShelter
                growthSummary={growthSummary}
                previewControls={
                  previewActive && (
                    <div
                      className="gs-growth-slider"
                      id="shelter-growth-slider"
                    >
                      <div className="gs-growth-slider-heading">
                        <label htmlFor="shelter-donation-range">
                          Preview total donated
                        </label>
                        <output htmlFor="shelter-donation-range">
                          {money(previewTotalOre)} SEK
                        </output>
                      </div>
                      <input
                        id="shelter-donation-range"
                        type="range"
                        min={donatedOre}
                        max={previewMaximumOre}
                        step={1}
                        value={previewTotalOre}
                        disabled={previewMaximumOre === donatedOre}
                        aria-valuetext={`${money(previewTotalOre)} SEK total, ${progress.residentIds.length + progress.potentialIds.length} visual companions`}
                        onChange={(e) => {
                          const total = Math.min(
                            previewMaximumOre,
                            Math.max(
                              donatedOre,
                              Math.round(Number(e.target.value) / 100) * 100,
                            ),
                          );
                          setPreview(total - donatedOre);
                        }}
                        onKeyDown={(e) => {
                          const delta = {
                            ArrowLeft: -5000,
                            ArrowDown: -5000,
                            ArrowRight: 5000,
                            ArrowUp: 5000,
                          }[e.key];
                          if (delta !== undefined) {
                            e.preventDefault();
                            setPreview(
                              Math.min(
                                previewMaximumOre,
                                Math.max(donatedOre, previewTotalOre + delta),
                              ) - donatedOre,
                            );
                          }
                        }}
                      />
                      <div className="gs-growth-slider-scale">
                        <span>{money(donatedOre)} SEK · Your donations</span>
                        <span>
                          {money(previewMaximumOre)} SEK · Fully upgraded
                        </span>
                      </div>
                      <p>
                        <strong>+{money(previewExtraOre)} SEK</strong> ·{' '}
                        {progress.potentialIds.length} new companions ·{' '}
                        {
                          progress.zones.filter(
                            (z) => z.projectedLevel > z.level,
                          ).length
                        }{' '}
                        area upgrades
                      </p>
                    </div>
                  )
                }
                progress={progress}
                clock={clock}
                preview={preview !== null}
                onDog={setDogId}
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
                  Visual companions · profiles may appear more than once
                </small>
              </div>
              <div>
                {progress.residentIds.map((id) => {
                  const d = profileDogs.find(
                    (p) => p.id === companionProfileId(id),
                  )!;
                  return (
                    <button
                      key={id}
                      onClick={() => setDogId(companionProfileId(id))}
                    >
                      <DogPortrait dog={d} />
                      <strong>{d.name}</strong>
                    </button>
                  );
                })}
                {!progress.residentIds.length && (
                  <p>
                    Your first companion arrives at 50 SEK donated. Up to 100
                    companions.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        {filtered.length > railLayout.count && (
          <section className="gs-transactions gs-transaction-continuation">
            <header>
              <h2>More care transactions</h2>
            </header>
            <div className="gs-transaction-list">
              {filtered.slice(railLayout.count, limit).map(renderTransaction)}
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
      {donating && state.viewer?.demo === false && (
        <Modal
          open
          onClose={() => setDonating(false)}
          title="Support the dogs"
          description="Make your gift through Hundstallet’s official donation page."
        >
          <p>
            Use the email linked to your shelter:{' '}
            <strong>{state.viewer.email}</strong>. Once staff match your
            received payment, your balance and companions update here.
          </p>
          <a
            className="cp-button"
            href="https://hundstallet.se/stod-oss/"
            target="_blank"
            rel="noreferrer"
          >
            Donate with Hundstallet ↗
          </a>
        </Modal>
      )}
      {donating && state.viewer?.demo !== false && (
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
              <CareImage src="/care/garden-v3/giardino-livello-3.webp" alt="" />
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
                setPreview(Math.min(parsed!, previewMaximumOre - donatedOre));
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
            {selected.file && !selected.file.restricted && (
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
