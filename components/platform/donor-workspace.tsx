'use client';
import { CareImage } from './care-image';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Camera,
  Heart,
  Home,
  ImageIcon,
  Search,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DogName } from '@/components/dog-name';
import { DogPortrait } from '@/components/dog-portrait';
import { profileDogs } from '@/lib/donation-shell';
import { useCareWorkspace } from '@/hooks/use-care-workspace';
import {
  balances,
  categories,
  categoryFor,
  contributionToDog,
  donorProducts,
  dogStage,
  money,
  publishedPosts,
  supportedDogs,
} from '@/lib/platform/model';
import type { CarePost, Receipt } from '@/lib/platform/types';
import { DonationDialog, type Preview } from './donation-dialog';
import { DogDialog } from './dog-dialog';
import { ProofDialog } from './proof-dialog';
import { ShelterScene } from './shelter-scene';
import { ForecastPanel } from './forecast-panel';
import {
  Footer,
  GoalSummary,
  Header,
  LoadingWorkspace,
  Modal,
  Notice,
  Photo,
  Primary,
  dateLabel,
  CategoryIcon,
} from './shared';

export default function DonorWorkspace() {
  const store = useCareWorkspace();
  const [view, setView] = useState<'shelter' | 'impact' | 'community'>(
    'shelter',
  );
  const [donorId, setDonorId] = useState('personal');
  const [donateOpen, setDonateOpen] = useState(false);
  const [selectedDog, setSelectedDog] = useState<string | null>(null);
  const [photo, setPhoto] = useState<CarePost | null>(null);
  const [receiptSelection, setReceipt] = useState<Receipt | null>(null);
  const [proofId, setProofId] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [message, setMessage] = useState('');
  const [allTransactions, setAllTransactions] = useState(false);
  const [search, setSearch] = useState('');
  const [directorySearch, setDirectorySearch] = useState('');
  const [spendingBy, setSpendingBy] = useState<'categories' | 'dogs'>(
    'categories',
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [name, setName] = useState('');
  const [shelterName, setShelterName] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      const query = new URLSearchParams(window.location.search);
      if (query.get('goal') === 'shared-care') setView('community');
      if (query.get('donate') === '1') setDonateOpen(true);
      const id = query.get('donor');
      if (id && ['personal', 'alex', 'maja', 'noah'].includes(id))
        setDonorId(id);
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  const state = store.state;
  if (!state) return <LoadingWorkspace store={store} />;
  const receipt =
    state.receipts.find((r) => r.id === receiptSelection?.id) ?? null;
  const donor = balances(state).find((d) => d.id === donorId)!;
  const products = donorProducts(state, donorId);
  const dogIds = supportedDogs(state, donorId);
  const followed = donor.following;
  const allPosts = publishedPosts(state);
  const posts = allPosts.filter((p) =>
    p.dogIds.some((id) => dogIds.includes(id) || followed.includes(id)),
  );
  const latest = posts[0];
  const unseen = posts.filter((p) => !donor.seenUpdates.includes(p.id));
  const transactions = state.receipts
    .filter(
      (r) =>
        r.state !== 'draft' &&
        r.products.some((p) => p.shares.some((s) => s.donorId === donorId)),
    )
    .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt))
    .filter((r) =>
      `${r.supplier} ${r.reference} ${r.products.map((p) => p.description).join(' ')}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  const previewIds = preview
    ? profileDogs
        .filter((d) => !d.group && !dogIds.includes(d.id))
        .slice(0, Math.min(preview.dogCount, 18))
        .map((d) => d.id)
    : [];
  function openPhoto(post: CarePost) {
    setPhoto(post);
    void store.send({ type: 'seen', donorId, postId: post.id });
  }
  function donation() {
    store.clearError();
    setDonateOpen(true);
  }
  async function share() {
    const url = new URL(window.location.href);
    url.searchParams.set('goal', 'shared-care');
    try {
      await navigator.clipboard.writeText(url.toString());
      setMessage(
        'Community link copied. Invite someone to share the next chapter.',
      );
    } catch {
      setMessage(`Share this page: ${url.toString()}`);
    }
  }
  const rewards = [
    {
      label: 'First little step',
      detail: 'Made a contribution',
      earned: donor.donated > 0,
      icon: Heart,
    },
    {
      label: 'Part of the story',
      detail: 'Opened a care update',
      earned: donor.seenUpdates.length > 0,
      icon: Camera,
    },
    {
      label: 'Better together',
      detail: 'Contributed to shared care',
      earned: state.gifts.some((g) => g.donorId === donorId && g.goalId),
      icon: Users,
    },
    {
      label: 'Home at last',
      detail: 'A supported dog found a home',
      earned: dogIds.some((id) => dogStage(state, id) === 'home'),
      icon: Home,
    },
  ];
  const impactRows =
    spendingBy === 'categories'
      ? categories.map((c) => ({
          id: c.id,
          label: c.label,
          asset: c.asset,
          amount: products
            .filter((p) => p.product.category === c.id)
            .reduce((n, p) => n + p.contribution, 0),
        }))
      : dogIds.map((id) => {
          const d = profileDogs.find((d) => d.id === id)!;
          return {
            id,
            label: d.name,
            asset: d.photos[0].src,
            amount: contributionToDog(state, donorId, id),
          };
        });
  const max = Math.max(1, ...impactRows.map((r) => r.amount));
  const dogAttributed = dogIds.reduce(
    (n, id) => n + contributionToDog(state, donorId, id),
    0,
  );
  return (
    <div className="care-platform">
      <Header online={store.online}>
        <button
          className="cp-avatar"
          aria-label="Edit your profile"
          onClick={() => {
            setName(donor.name);
            setShelterName(donor.shelterName);
            setProfileOpen(true);
          }}
        >
          {donor.name.slice(0, 1)}
        </button>
      </Header>
      <main className="cp-donor-main">
        <div className="cp-page-intro">
          <div>
            <span className="cp-eyebrow">YOUR LITTLE CORNER OF KINDNESS</span>
            <h1>
              {donor.shelterName}
              <em>, connected to real dogs</em>
            </h1>
          </div>
          <span className="cp-new-count">
            <Camera size={15} />
            {unseen.length} new {unseen.length === 1 ? 'moment' : 'moments'}
          </span>
        </div>
        {message && (
          <div className="cp-dismissable">
            <Notice kind="success">{message}</Notice>
            <button aria-label="Dismiss message" onClick={() => setMessage('')}>
              <X size={16} />
            </button>
          </div>
        )}
        {store.error && !donateOpen && (
          <Notice kind="error">{store.error}</Notice>
        )}
        <div className="cp-donor-grid">
          <aside className="cp-giving-column">
            <Primary className="cp-donate-main" onClick={donation}>
              <Heart size={23} fill="currentColor" />
              Donate
              <ArrowUpRight size={22} />
            </Primary>
            <button
              className="cp-balance-card"
              onClick={() => setView(view === 'impact' ? 'shelter' : 'impact')}
              aria-label="See your spending breakdown"
            >
              <span>Your total donated</span>
              <strong className="cp-total">
                {money(donor.donated)}
                <small>SEK</small>
              </strong>
              <div className="cp-balance-split">
                <div>
                  <small>
                    <i />
                    Available
                  </small>
                  <b>
                    {money(donor.pending)} <small>SEK</small>
                  </b>
                </div>
                <div>
                  <small>
                    <i />
                    Used for care
                  </small>
                  <b>
                    {money(donor.used)} <small>SEK</small>
                  </b>
                </div>
              </div>
              <div className="cp-progress">
                <span
                  style={{
                    width: `${donor.donated ? (donor.used / donor.donated) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="cp-balance-link">
                See where your gift went <ArrowUpRight size={15} />
              </span>
            </button>
            {donor.monthly && (
              <div className="cp-monthly-card">
                <span className="cp-tag">Monthly forecast</span>
                <strong>{money(donor.monthly.amountOre)} SEK / month</strong>
                <p>First demo gift recorded. Future months are estimates.</p>
                <button
                  onClick={() =>
                    void store.send({ type: 'cancel-plan', donorId })
                  }
                >
                  Remove forecast
                </button>
              </div>
            )}
            <section className="cp-transaction-list">
              <div className="cp-section-title">
                <h2>Your care records</h2>
                <span>{transactions.length}</span>
              </div>
              <p className="cp-muted">A closer look at your contribution.</p>
              {transactions.slice(0, 5).map((r) => {
                const p = r.products.find((p) =>
                  p.shares.some((s) => s.donorId === donorId),
                )!;
                const amount = r.products
                  .flatMap((p) => p.shares)
                  .filter((s) => s.donorId === donorId)
                  .reduce((n, s) => n + s.amountOre, 0);
                const post = allPosts.find((post) =>
                  post.productIds.some((id) =>
                    r.products.some((p) => p.id === id),
                  ),
                );
                return (
                  <button
                    key={r.id}
                    className={`cp-transaction ${r.state === 'voided' ? 'cp-voided' : ''}`}
                    onClick={() => setReceipt(r)}
                  >
                    <CategoryIcon category={p.category} />
                    <span>
                      <strong>{categoryFor(p.category).label}</strong>
                      <b>{money(amount)} SEK</b>
                      <small>
                        {dateLabel(r.purchasedAt, false)}
                        {r.state === 'voided' ? ' · Corrected' : ''}
                      </small>
                    </span>
                    <span className="cp-transaction-photo">
                      {post ? (
                        <CareImage
                          src={post.photo?.url ?? post.demoPhoto}
                          alt="Linked care moment"
                        />
                      ) : (
                        <ImageIcon size={21} />
                      )}
                    </span>
                  </button>
                );
              })}
              <Button
                variant="ghost"
                className="cp-show-all"
                onClick={() => setAllTransactions(true)}
              >
                View all care records <ArrowUpRight size={15} />
              </Button>
            </section>
          </aside>
          <div className="cp-main-column">
            <nav className="cp-view-tabs" aria-label="Your shelter views">
              {(['shelter', 'impact', 'community'] as const).map((tab) => (
                <button
                  aria-current={view === tab ? 'page' : undefined}
                  className={view === tab ? 'active' : ''}
                  key={tab}
                  onClick={() => setView(tab)}
                >
                  {tab === 'shelter' ? (
                    <Home size={16} />
                  ) : tab === 'impact' ? (
                    <Wallet size={16} />
                  ) : (
                    <Users size={16} />
                  )}{' '}
                  {tab === 'shelter'
                    ? 'My shelter'
                    : tab === 'impact'
                      ? 'My impact'
                      : 'Together'}
                </button>
              ))}
            </nav>
            {view === 'shelter' && (
              <>
                <ShelterScene
                  state={state}
                  donorId={donorId}
                  onDog={setSelectedDog}
                  onPhoto={openPhoto}
                  previewIds={previewIds}
                  previewCategory={preview?.careId}
                  previewCount={preview?.dogCount ?? 0}
                  onExitPreview={preview ? () => setPreview(null) : undefined}
                />
                {preview && (
                  <ForecastPanel
                    preview={preview}
                    onChange={setPreview}
                    onContinue={donation}
                  />
                )}
                {latest && (
                  <section className="cp-latest">
                    <Photo post={latest} onClick={() => openPhoto(latest)} />
                    <div>
                      <span className="cp-eyebrow">THE LATEST CHAPTER</span>
                      <h2>{latest.title}</h2>
                      <p>
                        {latest.source === 'demo'
                          ? 'Explore a sample care moment and see how a photo connects to a funded product.'
                          : latest.note}
                      </p>
                      <span className="cp-muted">
                        {latest.dogIds
                          .map(
                            (id) => profileDogs.find((d) => d.id === id)?.name,
                          )
                          .join(' & ')}{' '}
                        · {dateLabel(latest.occurredAt)}
                      </span>
                      <Button variant="ghost" onClick={() => openPhoto(latest)}>
                        Open this moment <ArrowUpRight size={16} />
                      </Button>
                    </div>
                  </section>
                )}
                <section className="cp-discover">
                  <div className="cp-section-title">
                    <div>
                      <span className="cp-eyebrow">
                        MORE STORIES TO BE PART OF
                      </span>
                      <h2>Meet the dogs</h2>
                    </div>
                    <label className="cp-search">
                      <Search size={16} />
                      <input
                        aria-label="Find a dog"
                        placeholder="Find a friend"
                        value={directorySearch}
                        onChange={(e) => setDirectorySearch(e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="cp-discover-grid">
                    {profileDogs
                      .filter(
                        (d) =>
                          !d.group &&
                          `${d.name} ${d.breed}`
                            .toLowerCase()
                            .includes(directorySearch.toLowerCase()),
                      )
                      .slice(0, directorySearch ? 43 : 8)
                      .map((d) => (
                        <button key={d.id} onClick={() => setSelectedDog(d.id)}>
                          <CareImage src={d.sprite} alt="" />
                          <DogName name={d.name} />
                          <small>{d.breed}</small>
                          {followed.includes(d.id) && (
                            <Heart size={12} fill="currentColor" />
                          )}
                        </button>
                      ))}
                  </div>
                  <Link className="cp-text-link" href="/explore">
                    Explore all shelters in Sweden <ArrowUpRight size={15} />
                  </Link>
                </section>
              </>
            )}
            {view === 'impact' && (
              <section className="cp-impact-panel">
                <span className="cp-eyebrow">YOUR KINDNESS, ACCOUNTED FOR</span>
                <h2>{money(donor.used)} SEK put to work</h2>
                <p>
                  Every amount links to a care record. Available funds stay
                  available until a receipt is allocated.
                </p>
                <div className="cp-frequency">
                  <button
                    className={spendingBy === 'categories' ? 'active' : ''}
                    onClick={() => setSpendingBy('categories')}
                  >
                    Goods & services
                  </button>
                  <button
                    className={spendingBy === 'dogs' ? 'active' : ''}
                    onClick={() => setSpendingBy('dogs')}
                  >
                    Dogs you support
                  </button>
                </div>
                <div className="cp-impact-bars">
                  {impactRows.map((row) => (
                    <button
                      key={row.id}
                      onClick={() => {
                        if (spendingBy === 'dogs') setSelectedDog(row.id);
                        else {
                          setSearch(
                            row.id === 'comfort'
                              ? 'shelter'
                              : row.id === 'play'
                                ? 'toy'
                                : row.id,
                          );
                          setAllTransactions(true);
                        }
                      }}
                    >
                      <strong>
                        {money(row.amount)}
                        <small> SEK</small>
                      </strong>
                      <div className="cp-bar-space">
                        <div
                          style={{
                            height: `${Math.max(1, (row.amount / max) * 100)}%`,
                          }}
                        />
                      </div>
                      {spendingBy === 'dogs' ? (
                        <DogPortrait
                          dog={profileDogs.find((d) => d.id === row.id)!}
                        />
                      ) : (
                        <CareImage src={row.asset} alt="" />
                      )}
                      <span>{row.label}</span>
                    </button>
                  ))}
                </div>
                {spendingBy === 'dogs' && (
                  <Notice>
                    {money(donor.used - dogAttributed)} SEK of recorded spending
                    is awaiting beneficiary details. No dog assignment is
                    invented for the imported workbook.
                  </Notice>
                )}
                <div className="cp-impact-totals">
                  <span>
                    <b>{products.length}</b> funded items & records
                  </span>
                  <span>
                    <b>{dogIds.length}</b> supported dogs
                  </span>
                  <span>
                    <b>{posts.length}</b> story moments
                  </span>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch('');
                    setAllTransactions(true);
                  }}
                >
                  Explore the underlying records <ArrowUpRight size={16} />
                </Button>
              </section>
            )}
            {view === 'community' && (
              <>
                <GoalSummary
                  state={state}
                  onDonate={donation}
                  onShare={() => void share()}
                />
                <section className="cp-rewards">
                  <div className="cp-section-title">
                    <div>
                      <span className="cp-eyebrow">LITTLE MILESTONES</span>
                      <h2>Moments worth keeping</h2>
                    </div>
                  </div>
                  <div>
                    {rewards.map((r) => (
                      <article
                        key={r.label}
                        className={r.earned ? 'earned' : ''}
                      >
                        <r.icon size={25} />
                        <strong>{r.label}</strong>
                        <p>{r.detail}</p>
                        <span>
                          {r.earned ? 'Part of your story' : 'A chapter ahead'}
                        </span>
                      </article>
                    ))}
                  </div>
                  <p className="cp-fine-print">
                    These keepsakes celebrate participation. They have no
                    financial value and are not traded.
                  </p>
                </section>
                <section className="cp-help-grid">
                  <a
                    href="https://hundstallet.se/engagera-dig/jourhem/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Home size={22} />
                    <h3>Open your home</h3>
                    <p>Learn about becoming a foster family.</p>
                    <ArrowUpRight size={18} />
                  </a>
                  <a
                    href="https://hundstallet.se/insamlingar/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Users size={22} />
                    <h3>Bring people together</h3>
                    <p>Start a fundraiser through Hundstallet.</p>
                    <ArrowUpRight size={18} />
                  </a>
                </section>
              </>
            )}
          </div>
          <aside className="cp-dogs-column">
            <section className="cp-roster">
              <div className="cp-section-title">
                <h2>Shelter dogs</h2>
                <span>{dogIds.length}</span>
              </div>
              {dogIds.map((id) => {
                const d = profileDogs.find((d) => d.id === id)!;
                return (
                  <button key={id} onClick={() => setSelectedDog(id)}>
                    <DogPortrait dog={d} />
                    <span>
                      <DogName name={d.name} />
                      <small>{d.breed}</small>
                      <small>
                        {dogStage(state, id) === 'home'
                          ? 'Home at last'
                          : d.location}
                      </small>
                    </span>
                  </button>
                );
              })}
              {!dogIds.length && (
                <p>Companions appear when staff links funded care to a dog.</p>
              )}
            </section>
            <section className="cp-following">
              <span className="cp-eyebrow">STORIES YOU FOLLOW</span>
              {followed
                .filter((id) => !dogIds.includes(id))
                .map((id) => {
                  const d = profileDogs.find((d) => d.id === id);
                  return d ? (
                    <button key={id} onClick={() => setSelectedDog(id)}>
                      <CareImage src={d.sprite} alt="" />
                      {d.name}
                      <Heart size={13} />
                    </button>
                  ) : null;
                })}
              <p>
                Follow a dog to keep their next chapter close, whether or not
                you have donated.
              </p>
            </section>
            <div className="cp-small-community">
              <Users size={22} />
              <strong>Small gifts add up.</strong>
              <p>Join the shared care goal.</p>
              <button onClick={() => setView('community')}>
                See what we can do together <ArrowUpRight size={14} />
              </button>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
      <DonationDialog
        open={donateOpen}
        onClose={() => setDonateOpen(false)}
        store={store}
        donorId={donorId}
        onPreview={(p) => {
          setPreview(p);
          setView('shelter');
        }}
        onSuccess={(text) => {
          setMessage(text);
          setPreview(null);
        }}
      />
      <DogDialog
        dogId={selectedDog}
        state={state}
        donorId={donorId}
        onClose={() => setSelectedDog(null)}
        onFollow={(id) =>
          void store.send({ type: 'follow', donorId, dogId: id })
        }
        onDonate={() => {
          setSelectedDog(null);
          donation();
        }}
        onPhoto={openPhoto}
      />
      <Modal
        open={!!photo}
        onClose={() => setPhoto(null)}
        title={photo?.title ?? 'Care moment'}
        description={
          photo
            ? `${dateLabel(photo.occurredAt)} · ${photo.source === 'demo' ? 'Demo story' : 'Care update'}`
            : undefined
        }
      >
        {photo && (
          <>
            <CareImage
              className="cp-full-photo"
              src={photo.photo?.url ?? photo.demoPhoto}
              alt={photo.title}
            />
            <span className="cp-tag">{categoryFor(photo.category).label}</span>
            <p>{photo.note}</p>
            <div className="cp-photo-dogs">
              {photo.dogIds.map((id) => {
                const d = profileDogs.find((d) => d.id === id)!;
                return (
                  <button
                    key={id}
                    onClick={() => {
                      setPhoto(null);
                      setSelectedDog(id);
                    }}
                  >
                    <CareImage src={d.sprite} alt="" />
                    <DogName name={d.name} />
                  </button>
                );
              })}
            </div>
            {photo.productIds.map((id) => {
              const r = state.receipts.find((r) =>
                r.products.some((p) => p.id === id),
              );
              const p = r?.products.find((p) => p.id === id);
              return r && p ? (
                <button
                  className="cp-linked-product"
                  key={id}
                  onClick={() => {
                    setPhoto(null);
                    setReceipt(r);
                  }}
                >
                  <CategoryIcon category={p.category} />
                  <span>
                    {p.description}
                    <small>
                      {money(p.amountOre)} SEK ·{' '}
                      {r.state === 'voided'
                        ? 'Corrected receipt'
                        : 'Funded care'}
                    </small>
                  </span>
                  <ArrowUpRight size={15} />
                </button>
              ) : null;
            })}
          </>
        )}
      </Modal>
      <Modal
        wide
        open={allTransactions}
        onClose={() => {
          setAllTransactions(false);
          setSearch('');
        }}
        title="Your care records"
        description="Explore the purchases and shared care funded by your contributions."
      >
        <label className="cp-search">
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search supplier, receipt or product"
            aria-label="Search care records"
          />
        </label>
        <div className="cp-record-table">
          {transactions.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setAllTransactions(false);
                setReceipt(r);
              }}
            >
              <span>
                <strong>
                  {r.source === 'workbook'
                    ? r.products[0].description
                    : r.supplier}
                </strong>
                <small>
                  {dateLabel(r.purchasedAt, false)} · {r.reference}
                </small>
              </span>
              <span>
                {money(
                  r.products
                    .flatMap((p) => p.shares)
                    .filter((s) => s.donorId === donorId)
                    .reduce((n, s) => n + s.amountOre, 0),
                )}{' '}
                SEK
                <small>
                  {r.state === 'voided'
                    ? 'Corrected'
                    : r.source === 'workbook'
                      ? 'Workbook record'
                      : 'Funded'}
                </small>
              </span>
              <ArrowUpRight size={15} />
            </button>
          ))}
          {!transactions.length && <p>No matching records.</p>}
        </div>
      </Modal>
      <Modal
        open={!!receipt}
        onClose={() => setReceipt(null)}
        title={receipt?.supplier ?? 'Care record'}
        description={
          receipt
            ? `${receipt.reference} · ${dateLabel(receipt.purchasedAt, false)}`
            : undefined
        }
      >
        {receipt && (
          <>
            <div className="cp-receipt-total">
              <span>Receipt total</span>
              <strong>{money(receipt.totalOre)} SEK</strong>
              <span className="cp-tag">
                {receipt.state === 'voided'
                  ? 'Corrected — funds returned'
                  : receipt.source === 'workbook'
                    ? 'Imported workbook'
                    : 'Funded care'}
              </span>
            </div>
            {receipt.state === 'voided' && <Notice>{receipt.reason}</Notice>}
            {receipt.products.map((p) => {
              const share = p.shares.find((s) => s.donorId === donorId);
              return (
                <div className="cp-product-detail" key={p.id}>
                  <CategoryIcon category={p.category} />
                  <span>
                    <strong>{p.description}</strong>
                    <small>
                      {money(p.amountOre)} SEK total · {p.shares.length}{' '}
                      {p.shares.length === 1 ? 'contributor' : 'contributors'}
                    </small>
                  </span>
                  <b>
                    {share ? `${money(share.amountOre)} SEK` : '—'}
                    <small>{share ? 'your contribution' : ''}</small>
                  </b>
                </div>
              );
            })}
            {receipt.file ? (
              <a
                className="cp-text-link"
                href={receipt.file.url}
                target="_blank"
                rel="noreferrer"
              >
                Open receipt document <ArrowUpRight size={16} />
              </a>
            ) : (
              <p className="cp-fine-print">
                {receipt.source === 'workbook'
                  ? 'The supplied spreadsheet contains dates, categories and totals. No receipt or product breakdown was supplied.'
                  : 'This is a sample purchase. No original receipt is attached.'}
              </p>
            )}
            {receipt.proofId && (
              <Primary onClick={() => setProofId(receipt.proofId!)}>
                <ShieldCheck size={17} /> Follow the evidence
              </Primary>
            )}
          </>
        )}
      </Modal>
      <ProofDialog
        key={proofId ?? 'closed'}
        proof={state.proofs.find((p) => p.id === proofId) ?? null}
        receipt={receipt ?? undefined}
        onClose={() => setProofId(null)}
        onRefresh={() => void store.refresh()}
      />
      <Modal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        title="Your little shelter"
        description="Make this corner of care feel like yours."
      >
        <label className="cp-field">
          Your name
          <input
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="cp-field">
          Shelter name
          <input
            value={shelterName}
            maxLength={60}
            onChange={(e) => setShelterName(e.target.value)}
          />
        </label>
        <Primary
          disabled={store.busy}
          onClick={async () => {
            if (
              await store.send({ type: 'profile', donorId, name, shelterName })
            )
              setProfileOpen(false);
          }}
        >
          Save profile
        </Primary>
        {store.error && <Notice kind="error">{store.error}</Notice>}
        <details className="cp-details">
          <summary>Explore another sample supporter</summary>
          <select
            aria-label="Sample supporter"
            value={donorId}
            onChange={(e) => {
              setDonorId(e.target.value);
              setProfileOpen(false);
              setPreview(null);
            }}
          >
            {state.donors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <p>Separate sample portfolios in this local demonstration.</p>
        </details>
      </Modal>
    </div>
  );
}
