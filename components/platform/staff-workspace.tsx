'use client';
import { CareImage } from './care-image';
import { useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpRight,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  ImagePlus,
  ListChecks,
  Plus,
  Search,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DogPortrait } from '@/components/dog-portrait';
import { profileDogs } from '@/lib/donation-shell';
import { useCareWorkspace } from '@/hooks/use-care-workspace';
import {
  balances,
  categoryFor,
  donorProducts,
  money,
  publishedPosts,
  stages,
  supportedDogs,
} from '@/lib/platform/model';
import type { Receipt } from '@/lib/platform/types';
import { AllocationDialog } from './allocation-dialog';
import { PhotoComposer } from './photo-composer';
import { ReceiptDialog } from './receipt-dialog';
import { ProofDialog } from './proof-dialog';
import {
  CategoryIcon,
  Header,
  LoadingWorkspace,
  Modal,
  Notice,
  Photo,
  Primary,
  dateLabel,
  useClock,
} from './shared';

type Tab = 'today' | 'receipts' | 'supporters' | 'stories';
const stockDay = (time: number | string) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm' }).format(
    new Date(time),
  );
export default function StaffWorkspace() {
  const store = useCareWorkspace();
  const now = useClock();
  const [tab, setTab] = useState<Tab>('today');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('active');
  const [limit, setLimit] = useState(12);
  const [receiptEditor, setReceiptEditor] = useState<Receipt | true | null>(
    null,
  );
  const [photoEditor, setPhotoEditor] = useState<{
    productId?: string;
    publishDay?: string;
    milestone?: boolean;
  } | null>(null);
  const [allocation, setAllocation] = useState<string | null>(null);
  const [selectedDonor, setSelectedDonor] = useState('personal');
  const [proofId, setProofId] = useState<string | null>(null);
  const [receiptDetailId, setReceiptDetailId] = useState<string | null>(null);
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [correction, setCorrection] = useState<{
    type: 'receipt' | 'post';
    id: string;
  } | null>(null);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [calendarDay, setCalendarDay] = useState<string | null>(null);
  const state = store.state;
  if (!state) return <LoadingWorkspace store={store} />;
  const clock = now ?? Date.parse(state.createdAt);
  const wallets = balances(state);
  const donated = wallets.reduce((n, d) => n + d.donated, 0);
  const available = wallets.reduce((n, d) => n + d.pending, 0);
  const used = wallets.reduce((n, d) => n + d.used, 0);
  const pending = state.receipts.filter((r) => r.state === 'draft');
  const active = publishedPosts(state, clock);
  const scheduled = state.posts
    .filter((p) => !p.withdrawnAt && Date.parse(p.publishAt) > clock)
    .sort((a, b) => a.publishAt.localeCompare(b.publishAt));
  const photographed = new Set(
    state.posts.filter((p) => !p.withdrawnAt).flatMap((p) => p.productIds),
  );
  const unpictured = state.receipts
    .filter((r) => r.state === 'funded')
    .flatMap((receipt) =>
      receipt.products
        .filter((p) => !p.id.endsWith(':unitemized') && !photographed.has(p.id))
        .map((product) => ({ receipt, product })),
    );
  const receiptDetail = state.receipts.find((r) => r.id === receiptDetailId);
  const photoDetail = state.posts.find((p) => p.id === photoId);
  const proof = state.proofs.find((p) => p.id === proofId) ?? null;
  const proofReceipt = state.receipts.find(
    (r) => r.id === proof?.payload.entityId,
  );
  const donor = wallets.find((d) => d.id === selectedDonor)!;
  const donorItems = donorProducts(state, selectedDonor);
  const dogIds = supportedDogs(state, selectedDonor, clock);
  const filtered = state.receipts
    .filter(
      (r) =>
        filter === 'all' ||
        (filter === 'active' && r.source !== 'workbook') ||
        (filter === 'workbook' && r.source === 'workbook') ||
        r.state === filter,
    )
    .filter((r) =>
      `${r.supplier} ${r.reference} ${r.products.map((p) => p.description).join(' ')}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .sort(
      (a, b) =>
        b.createdAt.localeCompare(a.createdAt) ||
        b.purchasedAt.localeCompare(a.purchasedAt),
    );
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(clock);
    date.setDate(date.getDate() + i);
    return stockDay(date.getTime());
  });
  const selectedDay = calendarDay ?? days[0];
  const dailyPosts = state.posts
    .filter((p) => !p.withdrawnAt && stockDay(p.publishAt) === selectedDay)
    .sort((a, b) => a.publishAt.localeCompare(b.publishAt));
  function changeTab(value: Tab) {
    setTab(value);
    setSearch('');
    setLimit(12);
    store.clearError();
  }
  function editReceipt(receipt?: Receipt) {
    store.clearError();
    setReceiptEditor(receipt ?? true);
  }
  function addPhoto(productId?: string, milestone = false) {
    store.clearError();
    setPhotoEditor({
      productId,
      milestone,
      publishDay: tab === 'stories' ? (calendarDay ?? days[0]) : undefined,
    });
  }
  function correct(type: 'receipt' | 'post', id: string) {
    setReason('');
    store.clearError();
    setCorrection({ type, id });
  }
  async function confirmCorrection() {
    if (!correction) return;
    const action =
      correction.type === 'receipt'
        ? { type: 'void' as const, receiptId: correction.id, reason }
        : { type: 'withdraw' as const, postId: correction.id, reason };
    if (await store.send(action)) {
      setMessage(
        correction.type === 'receipt'
          ? 'Correction recorded. Contributions are available again; the original assignment remains in the history.'
          : 'Update withdrawn. It no longer appears in public stories or the live shelter.',
      );
      setCorrection(null);
      setReceiptDetailId(null);
      setPhotoId(null);
    }
  }
  function exportLedger() {
    if (!state) return;
    const data = {
      exportedAt: new Date().toISOString(),
      environment: 'local-demo',
      donors: wallets.map(({ id, name, donated, pending, used }) => ({
        id,
        name,
        donatedOre: donated,
        availableOre: pending,
        usedOre: used,
      })),
      receipts: state.receipts,
      audit: state.audit,
      proofs: state.proofs,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `hundstallet-care-records-${stockDay(clock)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
  const receiptCard = (r: Receipt) => {
    const post = active.find((p) =>
      p.productIds.some((id) => r.products.some((p) => p.id === id)),
    );
    const isUnitemized = r.products.some((p) => p.id.endsWith(':unitemized'));
    return (
      <article className="cp-staff-receipt" key={r.id}>
        <div className="cp-staff-receipt-summary">
          <CategoryIcon category={r.products[0].category} />
          <div>
            <div className="cp-receipt-badges">
              <span className={`cp-status cp-status-${r.state}`}>
                {r.state === 'draft'
                  ? 'Pending allocation'
                  : r.state === 'voided'
                    ? 'Corrected'
                    : 'Allocated'}
              </span>
              {r.source === 'workbook' && (
                <span className="cp-tag">Workbook</span>
              )}
              {r.source === 'demo' && <span className="cp-tag">Sample</span>}
            </div>
            <button
              className="cp-receipt-name"
              onClick={() => setReceiptDetailId(r.id)}
            >
              {r.supplier}
              <ChevronRight size={15} />
            </button>
            <small>
              {r.reference} · {dateLabel(r.purchasedAt, false)} ·{' '}
              {isUnitemized
                ? 'Product details not supplied'
                : `${r.products.length} purchased items`}
            </small>
          </div>
          <strong>
            {money(r.totalOre)} <small>SEK</small>
          </strong>
        </div>
        <div className="cp-staff-receipt-bottom">
          <details className="cp-product-disclosure">
            <summary>Products & contributors</summary>
            {r.products.map((p) => (
              <div className="cp-staff-product" key={p.id}>
                <span>
                  <strong>{p.description}</strong>
                  <small>
                    {p.shares.length
                      ? p.shares
                          .map(
                            (s) =>
                              `${state.donors.find((d) => d.id === s.donorId)!.name} · ${money(s.amountOre)} SEK`,
                          )
                          .join(' / ')
                      : 'Not allocated yet'}
                  </small>
                </span>
                <b>{money(p.amountOre)} SEK</b>
                {r.state === 'funded' && !isUnitemized && (
                  <button
                    className="cp-icon-button"
                    aria-label={`Add photo for ${p.description}`}
                    onClick={() => addPhoto(p.id)}
                  >
                    <ImagePlus size={18} />
                  </button>
                )}
              </div>
            ))}
          </details>
          <div className="cp-receipt-card-actions">
            {r.state === 'draft' ? (
              <>
                <Button variant="outline" onClick={() => editReceipt(r)}>
                  Edit details
                </Button>
                <Primary
                  onClick={() => {
                    store.clearError();
                    setAllocation(r.id);
                  }}
                >
                  Allocate products <ArrowUpRight size={15} />
                </Primary>
              </>
            ) : r.state === 'funded' ? (
              isUnitemized ? (
                <Button variant="outline" onClick={() => editReceipt(r)}>
                  Add original product details
                </Button>
              ) : (
                <button
                  className="cp-care-photo-slot"
                  onClick={() =>
                    post ? setPhotoId(post.id) : addPhoto(r.products[0].id)
                  }
                >
                  {post ? (
                    <>
                      <CareImage
                        src={post.photo?.url ?? post.demoPhoto}
                        alt={post.title}
                      />
                      <span>View care photo</span>
                    </>
                  ) : (
                    <>
                      <ImagePlus size={24} />
                      <span>Add care photo</span>
                    </>
                  )}
                </button>
              )
            ) : (
              <span className="cp-muted">{r.reason}</span>
            )}
          </div>
        </div>
      </article>
    );
  };
  return (
    <div className="care-platform cp-staff">
      <Header staff online={store.online} />
      <main className="cp-staff-main">
        <div className="cp-staff-intro">
          <div>
            <span className="cp-eyebrow">LESS ADMIN. MORE TIME WITH DOGS.</span>
            <h1>A little care, made visible.</h1>
            <p>Receipts in. Moments out. Every contribution accounted for.</p>
          </div>
          <div className="cp-inline-actions">
            <Button variant="outline" onClick={() => addPhoto()}>
              <Camera size={17} /> Add care photo
            </Button>
            <Primary onClick={() => editReceipt()}>
              <Plus size={19} /> Add receipts or invoices
            </Primary>
          </div>
        </div>
        {message && (
          <div className="cp-dismissable">
            <Notice kind="success">{message}</Notice>
            <button onClick={() => setMessage('')} aria-label="Dismiss message">
              ×
            </button>
          </div>
        )}
        {store.error &&
          !receiptEditor &&
          !photoEditor &&
          !allocation &&
          !correction && <Notice kind="error">{store.error}</Notice>}
        <div className="cp-staff-stats">
          <button onClick={() => changeTab('supporters')}>
            <span>
              <Users size={16} /> Total donated
            </span>
            <strong>
              {money(donated)} <small>SEK</small>
            </strong>
            <small>{wallets.length} supporter portfolios</small>
          </button>
          <button
            onClick={() => {
              changeTab('receipts');
              setFilter('draft');
            }}
          >
            <span>
              <Wallet size={16} /> Available to spend
            </span>
            <strong>
              {money(available)} <small>SEK</small>
            </strong>
            <small>
              {pending.length
                ? `${pending.length} receipts ready for allocation`
                : 'Ready for the next care purchase'}
            </small>
          </button>
          <button
            onClick={() => {
              changeTab('receipts');
              setFilter('funded');
            }}
          >
            <span>
              <CheckCircle2 size={16} /> Used for care
            </span>
            <strong>
              {money(used)} <small>SEK</small>
            </strong>
            <small>Linked to recorded purchases</small>
          </button>
        </div>
        <div className="cp-staff-nav-row">
          <nav className="cp-staff-tabs" aria-label="Staff workspace">
            {(
              [
                {
                  id: 'today',
                  label: 'Today',
                  icon: ListChecks,
                  count: pending.length + unpictured.length,
                },
                {
                  id: 'receipts',
                  label: 'Receipts & products',
                  icon: FileText,
                },
                { id: 'supporters', label: 'Supporters', icon: Users },
                {
                  id: 'stories',
                  label: 'Stories & calendar',
                  icon: CalendarDays,
                },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                className={tab === t.id ? 'active' : ''}
                aria-current={tab === t.id ? 'page' : undefined}
                onClick={() => changeTab(t.id)}
              >
                <t.icon size={18} />
                {t.label}
                {'count' in t && t.count > 0 && <span>{t.count}</span>}
              </button>
            ))}
          </nav>
          <button className="cp-text-link" onClick={exportLedger}>
            <ArrowDownToLine size={15} /> Export records
          </button>
        </div>
        {tab === 'today' && (
          <div className="cp-staff-today">
            <div className="cp-todo-main">
              <div className="cp-section-title">
                <div>
                  <span className="cp-eyebrow">THE NEXT SMALL STEPS</span>
                  <h2>Your care inbox</h2>
                </div>
                <span>{pending.length + unpictured.length} to do</span>
              </div>
              {pending.length > 0 && (
                <section className="cp-todo-group">
                  <div className="cp-section-title">
                    <h3>Ready to allocate</h3>
                    <button
                      className="cp-text-link"
                      onClick={() => setAllocation('all')}
                    >
                      Review all <ArrowUpRight size={15} />
                    </button>
                  </div>
                  {pending.slice(0, 3).map((r) => (
                    <button
                      className="cp-todo-row"
                      key={r.id}
                      onClick={() => setAllocation(r.id)}
                    >
                      <span className="cp-todo-icon">
                        <FileText size={22} />
                      </span>
                      <span>
                        <strong>{r.supplier}</strong>
                        <small>
                          {r.products.length} items · {r.reference}
                        </small>
                      </span>
                      <b>{money(r.totalOre)} SEK</b>
                      <ChevronRight size={18} />
                    </button>
                  ))}
                </section>
              )}
              <section className="cp-todo-group">
                <div className="cp-section-title">
                  <h3>A photo makes the connection</h3>
                  <span>{unpictured.length}</span>
                </div>
                <p>
                  These funded products are waiting for a photo and the dogs who
                  used them.
                </p>
                {unpictured.slice(0, 8).map(({ receipt, product }) => (
                  <button
                    className="cp-todo-row"
                    key={product.id}
                    onClick={() => addPhoto(product.id)}
                  >
                    <CategoryIcon category={product.category} />
                    <span>
                      <strong>{product.description}</strong>
                      <small>
                        {receipt.supplier} · {money(product.amountOre)} SEK
                      </small>
                    </span>
                    <span className="cp-todo-camera">
                      <ImagePlus size={21} />
                      <small>Add photo</small>
                    </span>
                  </button>
                ))}
                {!unpictured.length && (
                  <div className="cp-todo-clear">
                    <CheckCircle2 size={31} />
                    <h3>Every funded item has a moment.</h3>
                    <p>
                      Add your next receipt, or share another chapter in a dog’s
                      story.
                    </p>
                  </div>
                )}
                {unpictured.length > 8 && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      changeTab('receipts');
                      setFilter('funded');
                    }}
                  >
                    See all funded products <ChevronRight size={16} />
                  </Button>
                )}
              </section>
              <div className="cp-staff-how">
                <span>
                  <b>1</b> Add a receipt
                </span>
                <ChevronRight size={15} />
                <span>
                  <b>2</b> Check & allocate
                </span>
                <ChevronRight size={15} />
                <span>
                  <b>3</b> Photo + dogs
                </span>
              </div>
            </div>
            <aside className="cp-staff-aside">
              <section className="cp-staff-scheduled">
                <div className="cp-section-title">
                  <h2>Coming up</h2>
                  <Clock size={19} />
                </div>
                {scheduled.slice(0, 4).map((p) => (
                  <button
                    key={p.id}
                    aria-label={`Open ${p.title}`}
                    onClick={() => setPhotoId(p.id)}
                  >
                    <CareImage src={p.photo?.url ?? p.demoPhoto} alt="" />
                    <span>
                      <strong>{p.title}</strong>
                      <small>{dateLabel(p.publishAt)}</small>
                    </span>
                  </button>
                ))}
                {!scheduled.length && (
                  <p>
                    No scheduled updates. A photo can be published now or saved
                    for a later moment.
                  </p>
                )}
                <Button
                  variant="outline"
                  onClick={() => addPhoto(undefined, true)}
                >
                  <Plus size={16} /> Add a story milestone
                </Button>
              </section>
              <section className="cp-staff-last">
                <span className="cp-eyebrow">LATEST SHARED MOMENT</span>
                {active[0] ? (
                  <>
                    <Photo
                      post={active[0]}
                      onClick={() => setPhotoId(active[0].id)}
                    />
                    <h3>{active[0].title}</h3>
                    <p>{dateLabel(active[0].publishAt)}</p>
                  </>
                ) : (
                  <p>Your next photo starts the story.</p>
                )}
              </section>
              <Notice>
                All accounts, contributions and care posts in this workspace are
                local prototype data. No payment is taken.
              </Notice>
            </aside>
          </div>
        )}
        {tab === 'receipts' && (
          <section className="cp-staff-panel">
            <div className="cp-section-title">
              <div>
                <h2>All care transactions</h2>
                <p>
                  Receipts contain products. Products connect supporters to
                  care.
                </p>
              </div>
              <Primary
                disabled={!pending.length}
                onClick={() => setAllocation('all')}
              >
                Distribute products to supporters <ArrowUpRight size={16} />
              </Primary>
            </div>
            <div className="cp-filter-row">
              <div className="cp-filter-chips">
                {[
                  { id: 'active', label: 'Recent workspace' },
                  { id: 'draft', label: `Pending (${pending.length})` },
                  { id: 'funded', label: 'Allocated' },
                  { id: 'workbook', label: 'Imported workbook' },
                  { id: 'voided', label: 'Corrected' },
                  { id: 'all', label: 'All' },
                ].map((f) => (
                  <button
                    className={filter === f.id ? 'active' : ''}
                    key={f.id}
                    onClick={() => {
                      setFilter(f.id);
                      setLimit(12);
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <label className="cp-search">
                <Search size={16} />
                <input
                  aria-label="Search receipts and products"
                  placeholder="Supplier, receipt, product…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setLimit(12);
                  }}
                />
              </label>
            </div>
            {filter === 'workbook' && (
              <Notice>
                100 original spreadsheet records. Dates, categories and amounts
                are preserved. Add the original receipt to identify its
                products; no extra donation is spent.
              </Notice>
            )}
            <div>
              {filtered.slice(0, limit).map(receiptCard)}
              {!filtered.length && (
                <div className="cp-todo-clear">
                  <FileText size={30} />
                  <h3>No matching receipts</h3>
                  <p>New documents are reviewed before they use donations.</p>
                  <Button variant="outline" onClick={() => editReceipt()}>
                    Add a receipt
                  </Button>
                </div>
              )}
            </div>
            {filtered.length > limit && (
              <Button
                variant="outline"
                className="cp-load-more"
                onClick={() => setLimit(limit + 24)}
              >
                Show more · {filtered.length - limit} remaining
              </Button>
            )}
          </section>
        )}
        {tab === 'supporters' && (
          <div className="cp-supporters-layout">
            <aside className="cp-supporter-picker">
              <h2>Supporter portfolios</h2>
              {wallets.map((d) => (
                <button
                  key={d.id}
                  className={d.id === selectedDonor ? 'selected' : ''}
                  onClick={() => setSelectedDonor(d.id)}
                >
                  <span className="cp-person-avatar">
                    {d.name
                      .split(' ')
                      .map((s) => s[0])
                      .join('')
                      .slice(0, 2)}
                  </span>
                  <span>
                    <strong>{d.name}</strong>
                    <small>{money(d.pending)} SEK available</small>
                  </span>
                  <ChevronRight size={15} />
                </button>
              ))}
            </aside>
            <section className="cp-staff-panel">
              <div className="cp-section-title">
                <div>
                  <span className="cp-eyebrow">SUPPORTER PORTFOLIO</span>
                  <h2>{donor.name}</h2>
                  <p>{donor.shelterName}</p>
                </div>
                <a
                  className="cp-text-link"
                  href={`/?donor=${encodeURIComponent(donor.id)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open their shelter <ArrowUpRight size={15} />
                </a>
              </div>
              <div className="cp-supporter-stats">
                <span>
                  Total donated
                  <strong>
                    {money(donor.donated)} <small>SEK</small>
                  </strong>
                </span>
                <span>
                  Available
                  <strong>
                    {money(donor.pending)} <small>SEK</small>
                  </strong>
                </span>
                <span>
                  Used for care
                  <strong>
                    {money(donor.used)} <small>SEK</small>
                  </strong>
                </span>
              </div>
              <h3>Dogs connected to funded care</h3>
              <div className="cp-supporter-dogs">
                {dogIds.map((id) => {
                  const d = profileDogs.find((d) => d.id === id)!;
                  return (
                    <div key={id}>
                      <DogPortrait dog={d} />
                      <strong>{d.name}</strong>
                    </div>
                  );
                })}
                {!dogIds.length && (
                  <p>
                    Dogs appear when a published care photo identifies who
                    benefited.
                  </p>
                )}
              </div>
              <h3>Precisely what their contribution funded</h3>
              <div className="cp-record-table">
                {donorItems.map(({ receipt, product, contribution }) => (
                  <button
                    key={product.id}
                    onClick={() => setReceiptDetailId(receipt.id)}
                  >
                    <CategoryIcon category={product.category} />
                    <span>
                      <strong>{product.description}</strong>
                      <small>
                        {receipt.reference} ·{' '}
                        {dateLabel(receipt.purchasedAt, false)}
                      </small>
                    </span>
                    <span>
                      <strong>{money(contribution)} SEK</strong>
                      <small>of {money(product.amountOre)} SEK</small>
                    </span>
                    <ArrowUpRight size={15} />
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}
        {tab === 'stories' && (
          <section className="cp-staff-panel">
            <div className="cp-section-title">
              <div>
                <h2>A calendar of second chances</h2>
                <p>
                  Published photos guide the live shelter and stay in each dog’s
                  journey.
                </p>
              </div>
              <Primary onClick={() => addPhoto(undefined, true)}>
                <Plus size={17} /> New milestone
              </Primary>
            </div>
            <div className="cp-calendar-days">
              {days.map((day) => {
                const n = state.posts.filter(
                  (p) => !p.withdrawnAt && stockDay(p.publishAt) === day,
                ).length;
                return (
                  <button
                    key={day}
                    className={day === selectedDay ? 'selected' : ''}
                    onClick={() => setCalendarDay(day)}
                  >
                    <span>
                      {new Intl.DateTimeFormat('en-GB', {
                        weekday: 'short',
                        timeZone: 'Europe/Stockholm',
                      }).format(new Date(`${day}T12:00:00Z`))}
                    </span>
                    <strong>{Number(day.slice(-2))}</strong>
                    <small>{n ? `${n} updates` : '—'}</small>
                  </button>
                );
              })}
            </div>
            <div className="cp-section-title">
              <h3>{dateLabel(selectedDay, false)}</h3>
              <label className="cp-field cp-calendar-date">
                Choose a date
                <input
                  type="date"
                  value={selectedDay}
                  onChange={(e) => setCalendarDay(e.target.value || null)}
                />
              </label>
            </div>
            <div className="cp-story-grid">
              {dailyPosts.map((p) => (
                <article key={p.id}>
                  <Photo post={p} onClick={() => setPhotoId(p.id)} />
                  <div>
                    <span
                      className={`cp-status cp-status-${Date.parse(p.publishAt) > clock ? 'draft' : 'funded'}`}
                    >
                      {Date.parse(p.publishAt) > clock
                        ? 'Scheduled'
                        : 'Published'}{' '}
                      ·{' '}
                      {new Intl.DateTimeFormat('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Europe/Stockholm',
                      }).format(new Date(p.publishAt))}
                    </span>
                    <h3>{p.title}</h3>
                    <p>
                      {p.dogIds
                        .map((id) => profileDogs.find((d) => d.id === id)?.name)
                        .join(' & ')}
                    </p>
                    <small>
                      {p.stage
                        ? stages.find((s) => s.id === p.stage)?.label
                        : categoryFor(p.category).label}
                    </small>
                  </div>
                </article>
              ))}
            </div>
            {!dailyPosts.length && (
              <div className="cp-todo-clear">
                <CalendarDays size={30} />
                <h3>An open page in their story</h3>
                <p>No updates scheduled or published for this date.</p>
                <Button
                  variant="outline"
                  onClick={() => addPhoto(undefined, true)}
                >
                  Add a photo milestone
                </Button>
              </div>
            )}
            <details className="cp-details">
              <summary>Recent changes & corrections</summary>
              <div className="cp-audit-list">
                {[...state.audit]
                  .reverse()
                  .slice(0, 30)
                  .map((event) => (
                    <div key={event.id}>
                      <small>{dateLabel(event.at)}</small>
                      <strong>{event.kind.replaceAll('.', ' · ')}</strong>
                      <span>{event.note}</span>
                    </div>
                  ))}
              </div>
            </details>
          </section>
        )}
      </main>
      <footer className="cp-staff-footer">
        <ShieldCheck size={15} />
        <span>
          Shared local records · reviewed receipts · traceable corrections
        </span>
        <small>
          Local prototype. No external staff connection or automatic payment
          processing.
        </small>
      </footer>
      {receiptEditor && (
        <ReceiptDialog
          store={store}
          receipt={receiptEditor === true ? undefined : receiptEditor}
          onClose={() => setReceiptEditor(null)}
          onSaved={(text) => {
            setMessage(text);
            setTab('receipts');
            setFilter('draft');
          }}
        />
      )}
      {photoEditor && (
        <PhotoComposer
          store={store}
          initialProductId={photoEditor.productId}
          initialPublishDay={photoEditor.publishDay}
          milestone={photoEditor.milestone}
          onClose={() => setPhotoEditor(null)}
          onSaved={setMessage}
        />
      )}
      {allocation && (
        <AllocationDialog
          store={store}
          receiptId={allocation}
          onClose={() => setAllocation(null)}
          onSaved={(text) => {
            setMessage(text);
            setTab('today');
          }}
        />
      )}
      <Modal
        wide
        open={!!receiptDetail}
        onClose={() => setReceiptDetailId(null)}
        title={receiptDetail?.supplier ?? 'Care record'}
        description={
          receiptDetail
            ? `${receiptDetail.reference} · ${dateLabel(receiptDetail.purchasedAt, false)}`
            : undefined
        }
      >
        {receiptDetail && (
          <>
            <div className="cp-receipt-total">
              <span>Receipt total</span>
              <strong>{money(receiptDetail.totalOre)} SEK</strong>
              <span className={`cp-status cp-status-${receiptDetail.state}`}>
                {receiptDetail.state === 'draft'
                  ? 'Pending allocation'
                  : receiptDetail.state === 'voided'
                    ? 'Corrected — funds returned'
                    : 'Allocated'}
              </span>
            </div>
            {receiptDetail.products.map((p) => (
              <div key={p.id} className="cp-product-detail">
                <CategoryIcon category={p.category} />
                <span>
                  <strong>{p.description}</strong>
                  <small>{categoryFor(p.category).label}</small>
                  {p.shares.map((s) => (
                    <small key={s.donorId}>
                      {state.donors.find((d) => d.id === s.donorId)!.name} ·{' '}
                      {money(s.amountOre)} SEK
                    </small>
                  ))}
                </span>
                <b>{money(p.amountOre)} SEK</b>
              </div>
            ))}
            {receiptDetail.file && (
              <a
                className="cp-text-link"
                href={receiptDetail.file.url}
                target="_blank"
                rel="noreferrer"
              >
                Open original document <ArrowUpRight size={15} />
              </a>
            )}
            {receiptDetail.reason && <Notice>{receiptDetail.reason}</Notice>}
            <div className="cp-inline-actions">
              {receiptDetail.proofId && (
                <Button
                  variant="outline"
                  onClick={() => setProofId(receiptDetail.proofId!)}
                >
                  <ShieldCheck size={16} /> Verify record
                </Button>
              )}
              {receiptDetail.state === 'draft' ? (
                <Primary
                  onClick={() => {
                    setReceiptDetailId(null);
                    setAllocation(receiptDetail.id);
                  }}
                >
                  Review allocation
                </Primary>
              ) : (
                receiptDetail.state === 'funded' && (
                  <Button
                    variant="ghost"
                    onClick={() => correct('receipt', receiptDetail.id)}
                  >
                    Record a correction
                  </Button>
                )
              )}
            </div>
          </>
        )}
      </Modal>
      <Modal
        open={!!photoDetail}
        onClose={() => setPhotoId(null)}
        title={photoDetail?.title ?? 'Care photo'}
        description={
          photoDetail
            ? `${Date.parse(photoDetail.publishAt) > clock ? 'Scheduled for' : 'Published'} ${dateLabel(photoDetail.publishAt)}`
            : undefined
        }
      >
        {photoDetail && (
          <>
            <CareImage
              className="cp-full-photo"
              src={photoDetail.photo?.url ?? photoDetail.demoPhoto}
              alt={photoDetail.title}
            />
            <span className="cp-tag">
              {photoDetail.source === 'demo'
                ? 'Demo story'
                : categoryFor(photoDetail.category).label}
            </span>
            <p>{photoDetail.note}</p>
            <p>
              {photoDetail.dogIds
                .map((id) => profileDogs.find((d) => d.id === id)?.name)
                .join(' & ')}
            </p>
            <small>
              Photo taken {dateLabel(photoDetail.occurredAt)} · Live for{' '}
              {photoDetail.liveHours} hours
            </small>
            {photoDetail.withdrawnAt ? (
              <Notice>Withdrawn: {photoDetail.withdrawalReason}</Notice>
            ) : (
              <Button
                variant="ghost"
                onClick={() => correct('post', photoDetail.id)}
              >
                Withdraw this update
              </Button>
            )}
          </>
        )}
      </Modal>
      <Modal
        open={!!correction}
        onClose={() => setCorrection(null)}
        title="Record a correction"
        description={
          correction?.type === 'receipt'
            ? 'The original record remains in the history. Its contributions become available again.'
            : 'The update leaves the live shelter and public journey, while the correction stays in the history.'
        }
      >
        <label className="cp-field">
          Reason
          <textarea
            value={reason}
            rows={4}
            minLength={10}
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain what needs correcting"
          />
        </label>
        {store.error && <Notice kind="error">{store.error}</Notice>}
        <div className="cp-modal-actions">
          <Button variant="ghost" onClick={() => setCorrection(null)}>
            Cancel
          </Button>
          <Primary
            disabled={reason.trim().length < 10 || store.busy}
            onClick={() => void confirmCorrection()}
          >
            Confirm correction
          </Primary>
        </div>
      </Modal>
      <ProofDialog
        key={proofId ?? 'closed'}
        proof={proof}
        receipt={proofReceipt}
        onClose={() => setProofId(null)}
        onRefresh={() => void store.refresh()}
      />
    </div>
  );
}
