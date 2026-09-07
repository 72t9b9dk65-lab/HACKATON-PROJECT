'use client';

import { useEffect, useRef, useState } from 'react';
import {
  PawPrint,
  Globe2,
  Heart,
  ArrowUpRight,
  ArrowRight,
  MapPin,
  Plus,
  Minus,
  RotateCcw,
  ShieldCheck,
  Check,
  Bookmark,
  Sparkles,
  FileText,
  Download,
  LockKeyhole,
  Users,
  Move,
  Info,
  ChevronRight,
  CircleCheck,
} from 'lucide-react';
import EarthGlobe from './earth-globe';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import {
  dogs,
  shelters,
  sweden,
  journeyStages,
  careCategories,
  sek,
  officialDonationUrl,
  fundingSourceUrl,
} from '@/lib/hundstallet-data';
import {
  HUND_STORAGE_KEY,
  emptySupporter,
  loadSupporter,
  createReceipt,
  allocate,
  verifyReceipts,
  badges,
  amountInOre,
  type SupporterState,
  type Receipt,
} from '@/lib/hundstallet-model';
import type { MapMode } from '@/lib/earth-data';

export default function Hundstallet() {
  const [page, setPage] = useState('explore');
  const [dogId, setDogId] = useState('luna');
  const [zoom, setZoom] = useState(1.06);
  const [focus, setFocus] = useState({
    coords: [15, 56] as [number, number],
    key: 0,
  });
  const [mode, setMode] = useState<MapMode>('needs');
  const [state, setState] = useState<SupporterState>(emptySupporter);
  const stateRef = useRef(state);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [donateOpen, setDonateOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [amount, setAmount] = useState('100');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState<string | null>(null);
  const dog = dogs.find((d) => d.id === dogId)!;
  const shelter = shelters.find((s) => s.id === dog.shelterId)!;
  const stage = state.stages[dog.id] ?? dog.stage;
  const total = state.receipts.reduce((s, r) => s + r.amountOre, 0);
  const funds = Object.fromEntries(
    shelters.map((s) => [
      s.id,
      s.raised +
        state.receipts
          .filter((r) => dogs.find((d) => d.id === r.dogId)?.shelterId === s.id)
          .reduce((a, r) => a + r.amountOre / 100, 0),
    ]),
  );
  funds['752'] = sweden.raised + total / 100;
  const earnedBadges = badges(state);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const saved = await loadSupporter(
          localStorage.getItem(HUND_STORAGE_KEY),
        );
        if (active) {
          stateRef.current = saved;
          setState(saved);
          setReady(true);
        }
      } catch (e) {
        if (active)
          setStorageError(
            e instanceof Error ? e.message : 'Local storage is unavailable.',
          );
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  function persist(next: SupporterState) {
    // Save before showing success, so a failed write never creates a phantom receipt.
    try {
      localStorage.setItem(HUND_STORAGE_KEY, JSON.stringify(next));
    } catch {
      throw Error(
        'Your browser could not save this change. Please allow local storage and try again.',
      );
    }
    stateRef.current = next;
    setState(next);
    setError('');
  }
  function update(action: (s: SupporterState) => SupporterState) {
    if (!ready) return;
    try {
      persist(action(stateRef.current));
    } catch (e) {
      setStorageError(e instanceof Error ? e.message : 'Unable to save.');
    }
  }
  function chooseDog(id: string, fly = true) {
    const selected = dogs.find((d) => d.id === id);
    if (!selected) return;
    setDogId(id);
    setError('');
    if (fly) {
      const s = shelters.find((s) => s.id === selected.shelterId)!;
      setZoom(7);
      setFocus({ coords: s.coordinates, key: Date.now() });
    }
  }
  function readUpdate() {
    update((s) => ({ ...s, read: [...new Set([...s.read, dog.id])] }));
    setUpdateOpen(true);
  }
  async function donate() {
    if (pending.current || !ready) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const previous = stateRef.current.receipts.at(-1)?.hash ?? 'GENESIS';
      const created = await createReceipt(dog.id, Number(amount), previous);
      persist({
        ...stateRef.current,
        receipts: [...stateRef.current.receipts, created],
      });
      setDonateOpen(false);
      setReceipt(created);
      setVerified(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Unable to record contribution.',
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function downloadReceipt(r: Receipt) {
    const data = {
      notice:
        'HACKATHON DEMO. No payment, purchase, blockchain transaction, or verified dog outcome.',
      ...r,
      currency: 'SEK',
      allocations: allocate(r.amountOre),
      integrity:
        'Local SHA-256 hash chain only. A fully rewritten chain cannot be detected without an independent anchor.',
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `hundstallet-demo-${r.id}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  let preview: ReturnType<typeof allocate> | null = null;
  try {
    preview = allocate(amountInOre(Number(amount)));
  } catch {}
  return (
    <div className="app-shell hs-shell">
      <header className="site-header">
        <button
          className="brand hs-brand"
          onClick={() => setPage('explore')}
          aria-label="Hundstallet, explore shelters"
        >
          <span className="brand-mark">
            <PawPrint size={25} />
          </span>
          <span>
            hundstallet<small>A SECOND CHANCE, TOGETHER</small>
          </span>
        </button>
        <Tabs
          value={page}
          onValueChange={(v) => setPage(String(v))}
          className="main-nav"
        >
          <TabsList variant="line">
            <TabsTrigger value="explore">
              <Globe2 />
              Explore shelters
            </TabsTrigger>
            <TabsTrigger value="impact">
              <Heart />
              My impact
            </TabsTrigger>
            <TabsTrigger value="community">
              <Users />
              The pack
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          variant="outline"
          className="hs-demo"
          onClick={() => setInfoOpen(true)}
        >
          <Info size={15} />
          Hackathon demo
        </Button>
      </header>
      <main>
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <PawPrint size={15} /> SMALL ACTS. SECOND CHANCES.
            </div>
            <h1>
              {page === 'explore'
                ? 'A world of difference. For one dog.'
                : page === 'impact'
                  ? 'Your kindness, followed through.'
                  : 'Good things happen in a pack.'}
            </h1>
            <p>
              {page === 'explore'
                ? 'Explore a shelter. Meet a dog. Follow the journey from care to home.'
                : page === 'impact'
                  ? 'See your demo contributions, their allocation, and the stories you follow.'
                  : 'Connect, learn, and celebrate the steps that matter.'}
            </p>
          </div>
          <div className="hs-scope">
            <span className="live-dot" />3 Swedish shelter locations
            <small>Fictional dog stories & funding</small>
          </div>
        </div>
        {storageError && (
          <p className="hs-warning" role="alert">
            {storageError}
          </p>
        )}
        {page === 'explore' && (
          <>
            <div className="explorer hs-explorer">
              <section
                className="map-stage hs-map"
                aria-label="Explore Hundstallet shelter locations on the globe"
              >
                <div className="map-topbar">
                  <Tabs
                    value={mode}
                    onValueChange={(v) => setMode(v as MapMode)}
                    className="map-mode"
                  >
                    <TabsList>
                      <TabsTrigger value="needs">
                        <PawPrint />
                        Care needs
                      </TabsTrigger>
                      <TabsTrigger value="impact">
                        <Heart />
                        Community support
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <button
                    className="hs-sweden"
                    onClick={() => {
                      setZoom(4);
                      setFocus({ coords: [15, 58], key: Date.now() });
                    }}
                  >
                    <MapPin size={15} />
                    Sweden
                    <ArrowUpRight size={15} />
                  </button>
                </div>
                <div className="map-context">
                  <span className="live-dot" />A safe place. A fresh start.
                </div>
                <EarthGlobe
                  mode={mode}
                  level="countries"
                  category="all"
                  selected={shelter}
                  zoom={zoom}
                  onZoom={(z) => setZoom(Math.max(0.82, Math.min(14, z)))}
                  focus={focus}
                  locations={{ countries: [sweden], points: shelters }}
                  markerIcon={PawPrint}
                  raised={funds}
                  onSelect={(t) => {
                    if (t.id === '752') {
                      setZoom(4);
                      setFocus({ coords: [15, 58], key: Date.now() });
                    } else {
                      const d = dogs.find((d) => d.shelterId === t.id);
                      if (d) chooseDog(d.id);
                    }
                  }}
                  onCategory={(_, t) => {
                    const d = dogs.find((d) => d.shelterId === t.id);
                    if (d) chooseDog(d.id, false);
                    setDonateOpen(true);
                  }}
                />
                <div className="hs-map-note">
                  <span>ONE MISSION</span>
                  <strong>
                    A second chance
                    <br />
                    starts somewhere.
                  </strong>
                  <p>Zoom into Sweden to explore the shelters.</p>
                </div>
                <div
                  className="hs-shelter-picker"
                  aria-label="Choose a shelter"
                >
                  {shelters.map((s) => (
                    <button
                      key={s.id}
                      aria-pressed={s.id === shelter.id}
                      onClick={() =>
                        chooseDog(dogs.find((d) => d.shelterId === s.id)!.id)
                      }
                    >
                      <span>
                        <PawPrint size={17} />
                      </span>
                      <div>
                        <strong>{s.name}</strong>
                        <small>
                          {dogs.find((d) => d.shelterId === s.id)!.name}’s demo
                          story
                        </small>
                      </div>
                      <ChevronRight size={15} />
                    </button>
                  ))}
                </div>
                <div className="hs-globe-controls">
                  <button
                    aria-label="Zoom in"
                    disabled={zoom >= 14}
                    onClick={() => setZoom(Math.min(14, zoom * 1.5))}
                  >
                    <Plus />
                  </button>
                  <button
                    aria-label="Zoom out"
                    disabled={zoom <= 0.82}
                    onClick={() => setZoom(Math.max(0.82, zoom / 1.5))}
                  >
                    <Minus />
                  </button>
                  <button
                    aria-label="Reset globe"
                    onClick={() => {
                      setZoom(1.06);
                      setFocus({ coords: [15, 56], key: Date.now() });
                    }}
                  >
                    <RotateCcw size={18} />
                  </button>
                </div>
                <div className="map-bottomline">
                  <span>
                    <Move size={13} />
                    Drag to explore · Scroll to zoom
                  </span>
                  <span>SAMPLE FUNDING · NATURAL EARTH</span>
                </div>
              </section>
              <aside className="hs-dog-panel">
                <div className="hs-dog-photo">
                  {dog.image ? (
                    <img
                      src={dog.image}
                      alt="Illustrative portrait of Luna, a golden mixed-breed dog"
                    />
                  ) : (
                    <div className={`hs-dog-illustration ${dog.id}`}>
                      <PawPrint size={85} />
                      <span>{dog.name}’s story</span>
                    </div>
                  )}
                  <span className="hs-photo-label">
                    Fictional dog · Illustrative story
                  </span>
                  <button
                    className="hs-follow"
                    disabled={!ready}
                    aria-label={
                      state.followed.includes(dog.id)
                        ? `Unfollow ${dog.name}`
                        : `Follow ${dog.name}`
                    }
                    aria-pressed={state.followed.includes(dog.id)}
                    onClick={() =>
                      update((s) => ({
                        ...s,
                        followed: s.followed.includes(dog.id)
                          ? s.followed.filter((id) => id !== dog.id)
                          : [...s.followed, dog.id],
                      }))
                    }
                  >
                    <Bookmark
                      size={19}
                      fill={
                        state.followed.includes(dog.id)
                          ? 'currentColor'
                          : 'none'
                      }
                    />
                  </button>
                </div>
                <div className="hs-dog-content">
                  <div className="hs-location">
                    <MapPin size={14} />
                    {shelter.name}, Sweden<span>{dog.age}</span>
                  </div>
                  <div className="hs-dog-title">
                    <h2>
                      Meet {dog.name}
                      <span>.</span>
                    </h2>
                    <PawPrint size={28} />
                  </div>
                  <p className="hs-personality">{dog.personality}</p>
                  <p className="hs-dog-description">{dog.description}</p>
                  <div className="hs-journey-mini">
                    <span>
                      <i />
                      {journeyStages[stage]}
                    </span>
                    <small>Demo journey · {stage + 1}/4</small>
                  </div>
                  <Progress
                    value={(stage + 1) * 25}
                    aria-label={`${dog.name} demo journey progress`}
                  />
                  <button className="hs-update" onClick={readUpdate}>
                    <span className="hs-update-icon">
                      <FileText size={18} />
                    </span>
                    <span>
                      <small>
                        {dog.updates[stage].day} · Example care update
                      </small>
                      <strong>{dog.updates[stage].title}</strong>
                    </span>
                    <ArrowUpRight size={19} />
                  </button>
                  <div className="hs-funding">
                    <div>
                      <span>Sample shelter care fund</span>
                      <strong>
                        {sek(funds[shelter.id])}
                        <small> of {sek(shelter.goal)}</small>
                      </strong>
                    </div>
                    <Progress
                      value={Math.min(
                        100,
                        (funds[shelter.id] / shelter.goal) * 100,
                      )}
                      aria-label="Sample shelter care funding"
                    />
                  </div>
                  <Button
                    className="hs-primary"
                    disabled={!ready}
                    onClick={() => {
                      setError('');
                      setDonateOpen(true);
                    }}
                  >
                    <Heart size={18} />
                    Support care like {dog.name}’s
                    <ArrowUpRight size={18} />
                  </Button>
                  <p className="hs-footnote">
                    Simulated contribution · No money charged
                  </p>
                </div>
              </aside>
            </div>
            <section className="hs-bottom-strip">
              <div className="hs-bottom-intro">
                <span>
                  <ShieldCheck />
                </span>
                <div>
                  <h3>Follow the care behind the kindness.</h3>
                  <p>Every example contribution has a clear allocation.</p>
                </div>
              </div>
              <div>
                <strong>{sek(sweden.raised + total / 100)}</strong>
                <span>sample care fund</span>
              </div>
              <div>
                <strong>03</strong>
                <span>demo dog journeys</span>
              </div>
              <button
                onClick={() => setPage('impact')}
                aria-label="View your impact dashboard"
              >
                <ArrowUpRight size={24} />
              </button>
            </section>
          </>
        )}
        {page === 'impact' && (
          <section className="hs-dashboard">
            <div className="hs-stats">
              <Stat
                icon={<Heart />}
                value={sek(total / 100)}
                label="Your simulated contributions"
              />
              <Stat
                icon={<PawPrint />}
                value={String(new Set(state.receipts.map((r) => r.dogId)).size)}
                label="Dog stories you supported"
              />
              <Stat
                icon={<Bookmark />}
                value={String(state.followed.length)}
                label="Journeys you follow"
              />
            </div>
            <div className="hs-dashboard-grid">
              <section className="hs-card">
                <div className="hs-section-heading">
                  <div>
                    <h2>Where your contribution goes</h2>
                    <p>Illustrative care allocation, in Swedish kronor.</p>
                  </div>
                  <ShieldCheck />
                </div>
                {allocate(total).map((c) => (
                  <div className="hs-allocation" key={c.id}>
                    <div>
                      <span>
                        <i style={{ background: c.color }} />
                        {c.name}
                      </span>
                      <strong>{sek(c.amountOre / 100)}</strong>
                    </div>
                    <Progress
                      value={c.share}
                      aria-label={`${c.name}: ${c.share}%`}
                    />
                    <small>{c.share}% of your demo contributions</small>
                  </div>
                ))}
                <p className="hs-note">
                  These percentages are a proposed demo model, not Hundstallet’s
                  reported spending.
                </p>
              </section>
              <section className="hs-card">
                <div className="hs-section-heading">
                  <div>
                    <h2>Your contribution trail</h2>
                    <p>Recorded locally. Open any receipt to inspect it.</p>
                  </div>
                  <FileText />
                </div>
                {state.receipts.length === 0 ? (
                  <Empty
                    text="Your first contribution starts a trail you can follow."
                    action={() => setPage('explore')}
                  />
                ) : (
                  state.receipts
                    .slice()
                    .reverse()
                    .map((r) => (
                      <button
                        className="hs-receipt-row"
                        key={r.id}
                        onClick={() => {
                          setReceipt(r);
                          setVerified(null);
                        }}
                      >
                        <span className="hs-receipt-icon">
                          <Heart size={18} />
                        </span>
                        <span>
                          <strong>
                            Care like {dogs.find((d) => d.id === r.dogId)!.name}
                            ’s
                          </strong>
                          <small>
                            {new Date(r.createdAt).toLocaleDateString('en-GB')}{' '}
                            · Demo receipt
                          </small>
                        </span>
                        <b>{sek(r.amountOre / 100)}</b>
                        <ChevronRight size={16} />
                      </button>
                    ))
                )}
              </section>
            </div>
            <section className="hs-card">
              <div className="hs-section-heading">
                <div>
                  <h2>Stories you are part of</h2>
                  <p>A little attention goes a long way.</p>
                </div>
              </div>
              {state.followed.length === 0 ? (
                <Empty
                  text="Follow a dog to keep its care journey close."
                  action={() => setPage('explore')}
                />
              ) : (
                <div className="hs-followed-grid">
                  {dogs
                    .filter((d) => state.followed.includes(d.id))
                    .map((d) => (
                      <button
                        key={d.id}
                        onClick={() => {
                          chooseDog(d.id);
                          setPage('explore');
                        }}
                      >
                        <PawPrint />
                        <span>
                          <strong>{d.name}</strong>
                          <small>
                            {journeyStages[state.stages[d.id] ?? d.stage]}
                          </small>
                        </span>
                        <ArrowUpRight />
                      </button>
                    ))}
                </div>
              )}
            </section>
          </section>
        )}
        {page === 'community' && (
          <section className="hs-dashboard">
            <div className="hs-pack-hero">
              <div>
                <span className="eyebrow">THE PACK · LOCAL DEMO</span>
                <h2>
                  More than a donation.
                  <br />A connection.
                </h2>
                <p>
                  Follow a story. Understand the care. Be there for the next
                  chapter.
                </p>
                <Button
                  className="hs-primary"
                  onClick={() => setPage('explore')}
                >
                  Find a dog to follow
                  <ArrowRight size={18} />
                </Button>
              </div>
              <div className="hs-pack-symbol">
                <PawPrint size={95} />
                <Sparkles size={35} />
              </div>
            </div>
            <div className="hs-section-heading">
              <div>
                <h2>Small steps, worth celebrating</h2>
                <p>
                  Earn each badge once. No spending ranks, streak pressure, or
                  tradable rewards.
                </p>
              </div>
              <span>
                {earnedBadges.filter((b) => b.earned).length}/3 earned
              </span>
            </div>
            <div className="hs-badges">
              {earnedBadges.map((b, i) => (
                <article
                  className={`hs-card hs-badge ${b.earned ? 'earned' : ''}`}
                  key={b.name}
                >
                  <span>
                    {b.earned ? (
                      <CircleCheck size={30} />
                    ) : i === 0 ? (
                      <Bookmark size={30} />
                    ) : i === 1 ? (
                      <FileText size={30} />
                    ) : (
                      <Heart size={30} />
                    )}
                  </span>
                  <h3>{b.name}</h3>
                  <p>{b.description}</p>
                  <small>
                    {b.earned
                      ? 'Earned on this device'
                      : 'Your next small step'}
                  </small>
                </article>
              ))}
            </div>
            <section className="hs-card hs-community-goal">
              <div>
                <h2>A shared curiosity challenge</h2>
                <p>Let’s understand 30 dog-care stories together.</p>
                <p className="hs-note">
                  27 fictional community reads + {state.read.length} from you.
                  Demo only; no live community is connected.
                </p>
              </div>
              <div>
                <strong>
                  {27 + state.read.length}
                  <small>/30 stories</small>
                </strong>
                <Progress
                  value={((27 + state.read.length) / 30) * 100}
                  aria-label="Demo community care-story challenge"
                />
              </div>
            </section>
          </section>
        )}
        <footer className="site-footer">
          <span>Hundstallet · Independent hackathon concept</span>
          <span>Fictional dogs. Real reasons to care.</span>
          <a href={officialDonationUrl} target="_blank" rel="noreferrer">
            Donate through Hundstallet
            <ArrowUpRight size={14} />
          </a>
        </footer>
      </main>
      <Dialog
        open={donateOpen}
        onOpenChange={(o) => {
          if (!busy) setDonateOpen(o);
        }}
      >
        <DialogContent className="hs-dialog">
          <span className="hs-dialog-icon">
            <PawPrint size={30} />
          </span>
          <DialogTitle>Help care like {dog.name}’s go further.</DialogTitle>
          <DialogDescription>
            Try a contribution to the sample shelter care fund. Following a
            dog’s story does not reserve a real donation for that dog.
          </DialogDescription>
          <RadioGroup
            className="hs-amounts"
            aria-label="Demo contribution amount in Swedish kronor"
            value={amount}
            onValueChange={(v) => setAmount(String(v))}
          >
            {[50, 100, 250, 500].map((a) => (
              <label key={a} className={amount === String(a) ? 'selected' : ''}>
                <RadioGroupItem value={String(a)} aria-label={`${a} SEK`} />
                <span>{a} kr</span>
              </label>
            ))}
          </RadioGroup>
          <label className="hs-amount-field">
            Your amount (SEK)
            <input
              type="number"
              min="10"
              max="25000"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <div className="hs-demo-breakdown">
            <h3>Your illustrative allocation</h3>
            {preview ? (
              preview.map((c) => (
                <div key={c.id}>
                  <span>{c.name}</span>
                  <strong>{sek(c.amountOre / 100)}</strong>
                </div>
              ))
            ) : (
              <p>Enter SEK 10–25,000, with up to two decimal places.</p>
            )}
          </div>
          {error && (
            <p role="alert" className="hs-warning">
              {error}
            </p>
          )}
          <Button
            className="hs-primary"
            disabled={!ready || busy || !preview}
            onClick={donate}
          >
            {busy
              ? 'Recording…'
              : `Simulate ${preview ? sek(Number(amount)) : 'contribution'}`}
            <ArrowRight size={18} />
          </Button>
          <p className="hs-footnote">No payment. Saved only in this browser.</p>
          <a
            className="hs-official"
            href={officialDonationUrl}
            target="_blank"
            rel="noreferrer"
          >
            Make a real gift on Hundstallet’s website
            <ArrowUpRight size={16} />
          </a>
        </DialogContent>
      </Dialog>
      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent className="hs-dialog">
          <span className="eyebrow">
            {dog.name.toUpperCase()}’S JOURNEY · FICTIONAL STORY
          </span>
          <DialogTitle>{dog.updates[stage].title}</DialogTitle>
          <DialogDescription>{dog.updates[stage].text}</DialogDescription>
          <ol className="hs-timeline">
            {journeyStages.map((label, i) => (
              <li key={label} className={i <= stage ? 'done' : ''}>
                <span>{i <= stage ? <Check size={16} /> : i + 1}</span>
                <div>
                  <strong>{label}</strong>
                  <small>
                    {dog.updates[i].day} ·{' '}
                    {i <= stage
                      ? 'Example update available'
                      : 'Upcoming demo chapter'}
                  </small>
                </div>
              </li>
            ))}
          </ol>
          <p className="hs-note">
            These are example care updates, not a live shelter feed. A donation
            does not advance a dog’s rehabilitation or guarantee rehoming.
          </p>
          <Button
            className="hs-primary"
            disabled={stage >= 3 || !ready}
            onClick={() =>
              update((s) => ({
                ...s,
                stages: {
                  ...s.stages,
                  [dog.id]: Math.min(3, (s.stages[dog.id] ?? dog.stage) + 1),
                },
              }))
            }
          >
            {stage === 3 ? 'Demo story complete' : 'Preview next demo chapter'}
            <ArrowRight size={17} />
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={receipt !== null}
        onOpenChange={(o) => {
          if (!o) setReceipt(null);
        }}
      >
        <DialogContent className="hs-dialog">
          {receipt && (
            <>
              <span className="hs-dialog-icon">
                <Check size={30} />
              </span>
              <DialogTitle>Your kindness has a record.</DialogTitle>
              <DialogDescription>
                {sek(receipt.amountOre / 100)} simulated for care like{' '}
                {dogs.find((d) => d.id === receipt.dogId)!.name}’s. No payment
                was taken.
              </DialogDescription>
              <div className="hs-demo-breakdown">
                {allocate(receipt.amountOre).map((c) => (
                  <div key={c.id}>
                    <span>{c.name}</span>
                    <strong>{sek(c.amountOre / 100)}</strong>
                  </div>
                ))}
              </div>
              <div className="hs-hash">
                <span>
                  <LockKeyhole size={16} />
                  Local receipt fingerprint
                </span>
                <code>{receipt.hash}</code>
                <small>
                  SHA-256 linked record · Not a blockchain transaction
                </small>
              </div>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const valid = await verifyReceipts(
                      stateRef.current.receipts,
                    );
                    setVerified(
                      valid
                        ? 'Local receipt chain is consistent. No independent blockchain verification has occurred.'
                        : 'Receipt integrity check failed.',
                    );
                  } catch {
                    setVerified('Unable to verify the local receipt chain.');
                  }
                }}
              >
                Check local receipt integrity
                <ShieldCheck size={17} />
              </Button>
              {verified && (
                <p role="status" className="hs-note">
                  {verified}
                </p>
              )}
              <Button
                className="hs-primary"
                onClick={() => downloadReceipt(receipt)}
              >
                <Download size={17} />
                Download demo receipt
              </Button>
              <p className="hs-footnote">
                Not proof of purchase, delivery, or tax-deductible giving.
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="hs-dialog">
          <DialogTitle>Trust begins with clear boundaries.</DialogTitle>
          <DialogDescription>
            An independent hackathon prototype inspired by Hundstallet’s
            mission.
          </DialogDescription>
          <div className="hs-info">
            <h3>The real mission</h3>
            <p>
              Hundstallet provides care, rehabilitation, and help finding new
              homes for vulnerable dogs. Shelter locations here are approximate
              city-level markers.{' '}
              <a
                href="https://hundstallet.se/var-verksamhet/"
                target="_blank"
                rel="noreferrer"
              >
                Official source ↗
              </a>
            </p>
            <h3>The demo</h3>
            <p>
              Dog identities, stories, care updates, funding totals,
              percentages, and rewards are illustrative. There are no real
              payments, accounts, live case records, or shared community
              activity. The Luna portrait is AI-generated.
            </p>
            <h3>Transparent spending</h3>
            <p>
              The proposed categories reflect types of care, not verified
              allocations to individual dogs. Real operating costs include staff
              and overhead.{' '}
              <a href={fundingSourceUrl} target="_blank" rel="noreferrer">
                How Hundstallet uses donations ↗
              </a>
            </p>
            <h3>About blockchain</h3>
            <p>
              This prototype checks locally linked SHA-256 receipts. It does not
              submit transactions to a blockchain. A rewritten local chain
              cannot be detected without an independent anchor. A production
              system would need verified accounting records, payment
              reconciliation, staff-approved updates, and independently anchored
              proofs.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="hs-card hs-stat">
      {icon}
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
function Empty({ text, action }: { text: string; action: () => void }) {
  return (
    <div className="hs-empty">
      <PawPrint size={32} />
      <p>{text}</p>
      <Button variant="outline" onClick={action}>
        Explore the shelters
        <ArrowRight size={16} />
      </Button>
    </div>
  );
}
