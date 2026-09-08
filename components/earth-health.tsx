'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  Globe2,
  Heart,
  Users,
  Search,
  Plus,
  Minus,
  RotateCcw,
  Maximize2,
  ChevronRight,
  Info,
  Move,
  MapPin,
  ShieldCheck,
  Sprout,
  Layers3,
  X,
  CircleHelp,
  HandHeart,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  AccountDialog,
  DonationDialog,
  DonationDocument,
  Avatar,
} from '@/components/donation-flow';
import { ImpactProfile, CommunityPanel } from '@/components/impact-profile';
import {
  STORAGE_KEY,
  parseSavedState,
  addedFunds,
  newDonation,
  categoryFunding,
} from '@/lib/donation-model';
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from '@/components/ui/command';
import { flushSync } from 'react-dom';
import EarthGlobe, { categoryIcons } from '@/components/earth-globe';
import {
  categories,
  territories,
  cities,
  continents,
  needColor,
  needLabel,
  categoryScore,
  money,
  type Territory,
  type CategoryId,
  type MapMode,
  type MapLevel,
  type Donation,
  type Profile,
  allTerritories,
} from '@/lib/earth-data';

export default function EarthHealth() {
  const [mode, setMode] = useState<MapMode>('needs');
  const [level, setLevel] = useState<MapLevel>('countries');
  const [category, setCategory] = useState<CategoryId | 'all'>('all');
  const [selected, setSelected] = useState<Territory>(territories[0]);
  const [zoom, setZoom] = useState(1.02);
  const [focus, setFocus] = useState({
    coords: [19, 12] as [number, number],
    key: 0,
  });
  const [detail, setDetail] = useState<CategoryId | null>(null);
  const [info, setInfo] = useState(false);
  const [countryList, setCountryList] = useState<Territory[]>(territories);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState('explore');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [accountOpen, setAccountOpen] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState('');
  const [impactSelected, setImpactSelected] = useState<Territory | null>(null);
  const profileRef = useRef<Profile | null>(null);
  const donationsRef = useRef<Donation[]>([]);
  const extraRaised = useMemo(() => addedFunds(donations), [donations]);
  const mapFunds = useMemo(
    () =>
      Object.fromEntries(
        allTerritories.map((t) => [
          t.id,
          category === 'all'
            ? t.raised + (extraRaised[t.id] ?? 0)
            : categoryFunding(t, category, donations),
        ]),
      ),
    [category, donations, extraRaised],
  );
  const activeDocument = donations.find((d) => d.id === documentId);
  const totalDonated = donations.reduce((s, d) => s + d.amount, 0);
  useEffect(() => {
    try {
      const state = parseSavedState(localStorage.getItem(STORAGE_KEY));
      setProfile(state.profile);
      profileRef.current = state.profile;
      setDonations(state.donations);
      donationsRef.current = state.donations;
    } catch {
      setStorageWarning(
        'Unable to read your local profile. You can create a new shelter profile.',
      );
    }
  }, []);
  function persist(p: Profile | null, records: Donation[]) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 1, profile: p, donations: records }),
      );
      setStorageWarning('');
    } catch {
      setStorageWarning(
        'Your browser does not allow local storage. Your profile and donations will only remain available until you close the page.',
      );
    }
  }
  function createProfile(p: Profile) {
    profileRef.current = p;
    setProfile(p);
    persist(p, donationsRef.current);
  }
  function recordDonation(amount: number) {
    if (!profileRef.current || !detail)
      throw Error('Create your anonymous profile first.');
    const d = newDonation(
      selected,
      detail,
      amount,
      'EH-' + crypto.randomUUID().slice(0, 8).toUpperCase(),
    );
    const records = [d, ...donationsRef.current];
    donationsRef.current = records;
    setDonations(records);
    persist(profileRef.current, records);
    return d;
  }
  function advanceDocument() {
    if (!documentId) return;
    const records = donationsRef.current.map((d) =>
      d.id === documentId ? { ...d, stage: Math.min(3, d.stage + 1) } : d,
    );
    donationsRef.current = records;
    setDonations(records);
    persist(profileRef.current, records);
  }
  function changePage(next: string) {
    setPage(next);
    setExpanded(false);
    if (next === 'community') setMode('impact');
  }
  function explore() {
    changePage('explore');
    setMode('needs');
  }

  const choose = useCallback(
    (t: Territory) => {
      setSelected(t);
      if (mode === 'impact' && t.score >= 0) setImpactSelected(t);
    },
    [mode],
  );
  const navigate = useCallback((t: Territory) => {
    setSelected(t);
    setFocus({ coords: t.coordinates, key: Date.now() });
    setSearchOpen(false);
    setQuery('');
    if (t.countryId) {
      setLevel('cities');
      setZoom(12);
    } else if (continents.some((c) => c.id === t.id)) {
      setLevel('continents');
      setZoom(0.85);
    } else {
      setLevel('countries');
      setZoom(2.1);
    }
  }, []);
  const changeZoom = useCallback((z: number) => {
    setZoom(z);
    const next = z < 0.97 ? 'continents' : z > 3.8 ? 'cities' : 'countries';
    setLevel(next);
    setSelected((t) =>
      next === 'continents'
        ? (continents.find((c) => c.id === t.continent) ?? t)
        : continents.some((c) => c.id === t.id)
          ? (territories.find((c) => c.continent === t.id) ?? t)
          : t,
    );
  }, []);
  function changeLevel(l: MapLevel) {
    setLevel(l);
    setZoom(l === 'continents' ? 0.86 : l === 'countries' ? 1.15 : 5);
    if (l === 'continents') {
      const c = continents.find((c) => c.id === selected.continent);
      if (c) setSelected(c);
    } else if (
      l === 'countries' &&
      continents.some((c) => c.id === selected.id)
    ) {
      setSelected(territories.find((t) => t.continent === selected.id)!);
    }
    if (l === 'cities')
      setFocus({ coords: selected.coordinates, key: Date.now() });
  }
  const actionsRef = useRef({ navigate });
  actionsRef.current = { navigate };
  useEffect(() => {
    type Tool = {
      name: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean };
      execute: (input: unknown) => unknown;
    };
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: Tool,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: 'navigate_earthhealth_territory',
            description:
              'Open a territory on the globe and show its needs. Does not create profiles or donations.',
            inputSchema: {
              type: 'object',
              properties: {
                territoryId: {
                  type: 'string',
                  enum: allTerritories.map((t) => t.id),
                },
              },
              required: ['territoryId'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false },
            execute(input) {
              if (
                !input ||
                typeof input !== 'object' ||
                !('territoryId' in input) ||
                Object.keys(input).some((k) => k !== 'territoryId')
              )
                throw Error('territoryId is required.');
              const t = allTerritories.find(
                (t) => t.id === (input as { territoryId: unknown }).territoryId,
              );
              if (!t) throw Error('Territory is unavailable.');
              flushSync(() => {
                setPage('explore');
                setMode('needs');
                actionsRef.current.navigate(t);
              });
              return { territory: t.name, territoryId: t.id, demo: true };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {
      /* Unsupported contexts leave the visible UI fully usable. */
    }
    return () => lifecycle.abort();
  }, []);

  const cityOptions = cities.filter(
    (c) => c.countryId === (selected.countryId ?? selected.id),
  );
  const searchResults = (
    query === '' && level === 'cities'
      ? cities
      : [...continents, ...countryList, ...cities]
  )
    .filter((t) =>
      t.name.toLocaleLowerCase('it').includes(query.toLocaleLowerCase('it')),
    )
    .slice(0, 12);
  return (
    <div className="app-shell">
      <header className="site-header">
        <button
          className="brand"
          onClick={explore}
          aria-label="earthealth, go to the globe"
        >
          <span className="brand-mark">
            <Globe2 size={24} />
          </span>
          <span>
            eart<span className="brand-light">health</span>
            <span className="brand-dot">.</span>
          </span>
        </button>
        <Tabs
          value={page}
          onValueChange={(v) => changePage(String(v))}
          className="main-nav"
        >
          <TabsList variant="line">
            <TabsTrigger value="explore">
              <Globe2 />
              Explore the world
            </TabsTrigger>
            <TabsTrigger value="profile">
              <Heart />
              My impact
            </TabsTrigger>
            <TabsTrigger value="community">
              <Users />
              Community
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="header-actions">
          <button
            className="icon-button help"
            aria-label="How earthealth works"
            onClick={() => setInfo(true)}
          >
            <CircleHelp size={20} />
          </button>
          <button
            className="primary-button profile-button"
            onClick={() =>
              profile ? changePage('profile') : setAccountOpen(true)
            }
          >
            {profile ? <Avatar index={profile.avatar} size={24} /> : null}
            <span>
              {profile ? '@' + profile.username : 'Create your profile'}
            </span>
            {profile ? null : <ArrowUpRight size={17} />}
          </button>
        </div>
      </header>
      <main>
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <span className="tiny-star">✳</span> ONE PLANET, ONE COMMUNITY
            </div>
            <h1>
              {page === 'profile'
                ? 'Your contribution, its story'
                : page === 'community'
                  ? 'Kindness multiplies'
                  : 'Help where it is needed'}
              <span>.</span>
            </h1>
            <p>
              {page === 'profile'
                ? 'Follow every step of your contribution.'
                : page === 'community'
                  ? 'Many different names. One planet to help.'
                  : 'Explore the world. Choose a cause. Make a difference.'}
            </p>
          </div>
          <button className="demo-badge" onClick={() => setInfo(true)}>
            <span />
            Explore care
            <Info size={14} />
          </button>
        </div>
        {storageWarning && (
          <div className="storage-warning" role="status">
            <Info size={17} />
            {storageWarning}
          </div>
        )}
        {page === 'profile' && (
          <ImpactProfile
            profile={profile}
            donations={donations}
            onCreate={() => setAccountOpen(true)}
            onExplore={explore}
            onDocument={(d) => setDocumentId(d.id)}
            onLocate={(id) => {
              const t = allTerritories.find((t) => t.id === id);
              if (t) {
                changePage('explore');
                setMode('impact');
                navigate(t);
              }
            }}
          />
        )}
        <div hidden={page === 'profile'}>
          <div className={`explorer ${expanded ? 'expanded' : ''}`}>
            <section className="map-stage" aria-label="Explore territories">
              <div className="map-topbar">
                <Tabs
                  value={mode}
                  onValueChange={(v) => {
                    setMode(v as MapMode);
                    if (v === 'needs' && page === 'community')
                      setPage('explore');
                  }}
                  className="map-mode"
                >
                  <TabsList>
                    <TabsTrigger value="needs">
                      <Globe2 />
                      Map of needs
                    </TabsTrigger>
                    <TabsTrigger value="impact">
                      <Heart />
                      Aid around the world
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <button
                  className="map-search"
                  onClick={() => setSearchOpen(true)}
                >
                  <Search size={17} />
                  <span>Search for a place</span>
                  <span className="search-shortcut">⌕</span>
                </button>
              </div>
              <div className="category-rail" aria-label="Filter categories">
                <span className="rail-label">
                  {mode === 'needs' ? 'NEEDS' : 'AID'}
                </span>
                <button
                  aria-pressed={category === 'all'}
                  className={category === 'all' ? 'active' : ''}
                  onClick={() => setCategory('all')}
                  title="All needs"
                  aria-label="All needs"
                >
                  <Layers3 size={20} />
                </button>
                {categories.map((c) => {
                  const Icon = categoryIcons[c.id];
                  return (
                    <button
                      key={c.id}
                      className={category === c.id ? 'active' : ''}
                      aria-pressed={category === c.id}
                      aria-label={c.label}
                      title={c.label}
                      onClick={() => setCategory(c.id)}
                    >
                      <Icon size={20} />
                    </button>
                  );
                })}
              </div>
              <div className="map-context">
                <span className="live-dot" />
                {level === 'cities'
                  ? 'Cities · Approximate project areas'
                  : category !== 'all'
                    ? categories.find((c) => c.id === category)?.label
                    : mode === 'needs'
                      ? 'Every need matters.'
                      : 'Every contribution leaves a trace.'}
              </div>
              <EarthGlobe
                mode={mode}
                level={level}
                category={category}
                selected={selected}
                zoom={zoom}
                onZoom={changeZoom}
                focus={focus}
                onSelect={choose}
                onCategory={(c, t) => {
                  setSelected(t);
                  setDetail(c);
                }}
                raised={mapFunds}
                onCountries={setCountryList}
              />
              <div className="map-bottom">
                <div className="map-legend">
                  <div className="legend-title">
                    {mode === 'needs' ? 'LEVEL OF NEED' : 'FUNDING PROGRESS'}
                    <button
                      aria-label="About the scale"
                      onClick={() => setInfo(true)}
                    >
                      <Info size={13} />
                    </button>
                  </div>
                  <div
                    className={`legend-gradient ${mode === 'impact' ? 'impact-gradient' : ''}`}
                  />
                  <div className="legend-labels">
                    <span>{mode === 'needs' ? 'Critical' : '0%'}</span>
                    <span>{mode === 'needs' ? 'Low' : '100%+'}</span>
                  </div>
                  <div className="no-data">
                    <i />
                    Data unavailable
                  </div>
                </div>
                <div className="map-controls">
                  <button
                    aria-label={expanded ? 'Collapse map' : 'Expand map'}
                    onClick={() => setExpanded(!expanded)}
                  >
                    {expanded ? <X size={18} /> : <Maximize2 size={18} />}
                  </button>
                  <div>
                    <button
                      aria-label="Zoom in"
                      disabled={zoom >= 22}
                      onClick={() => changeZoom(Math.min(22, zoom * 1.45))}
                    >
                      <Plus size={20} />
                    </button>
                    <button
                      aria-label="Zoom out"
                      disabled={zoom <= 0.82}
                      onClick={() => changeZoom(Math.max(0.82, zoom / 1.45))}
                    >
                      <Minus size={20} />
                    </button>
                  </div>
                  <button
                    aria-label="Reset globe view"
                    onClick={() => {
                      setZoom(1.02);
                      setLevel('countries');
                      setFocus({ coords: [19, 12], key: Date.now() });
                    }}
                  >
                    <RotateCcw size={17} />
                  </button>
                </div>
              </div>
              <div className="map-bottomline">
                <span>
                  <Move size={13} />
                  Drag to explore · Scroll to zoom
                </span>
                <span>NATURAL EARTH GEOGRAPHY</span>
              </div>
            </section>
            {page === 'community' ? (
              <CommunityPanel
                profile={profile}
                donations={donations}
                onCreate={() => setAccountOpen(true)}
                onExplore={explore}
              />
            ) : (
              <aside className="territory-panel">
                <div className="panel-breadcrumb">
                  <Globe2 size={14} />
                  <button
                    onClick={() =>
                      navigate(
                        continents.find((c) => c.id === selected.continent) ??
                          continents[0],
                      )
                    }
                  >
                    {selected.continent}
                  </button>
                  <ChevronRight size={13} />
                  <span>{selected.countryName ?? selected.name}</span>
                </div>
                <div className="territory-heading">
                  <div>
                    <span className="overline">
                      {selected.countryId
                        ? 'CLOSE TO PEOPLE'
                        : continents.some((c) => c.id === selected.id)
                          ? 'A LOOK AT THE CONTINENT'
                          : 'ONE TERRITORY, MANY STORIES'}
                    </span>
                    <h2>{selected.name}</h2>
                  </div>
                  <span className="territory-globe">
                    <MapPin size={24} />
                  </span>
                </div>
                {selected.score >= 0 ? (
                  <>
                    <div className="urgency-line">
                      <span
                        className="urgency-tag"
                        style={
                          {
                            '--need': needColor(selected.score),
                          } as React.CSSProperties
                        }
                      >
                        <span />
                        {needLabel(selected.score)} priority
                      </span>
                      <span className="data-caption">Care scenario</span>
                    </div>
                    <p className="territory-description">
                      Everyone deserves water, food, healthcare, and a safe
                      place. Discover where your contribution can reach.
                    </p>
                    <div className="needs-header">
                      <h3>
                        {mode === 'needs'
                          ? 'What is needed'
                          : 'How aid is distributed'}
                      </h3>
                      <span>5 categories</span>
                    </div>
                    <div className="need-list">
                      {categories.map((c) => {
                        const Icon = categoryIcons[c.id];
                        const score = categoryScore(selected.score, c.id);
                        const funds = categoryFunding(
                          selected,
                          c.id,
                          donations,
                        );
                        return (
                          <button
                            key={c.id}
                            className={`need-row ${category === c.id ? 'highlighted' : ''}`}
                            onClick={() => setDetail(c.id)}
                          >
                            <span
                              className="need-icon"
                              style={{ background: c.color + '28' }}
                            >
                              <Icon size={19} />
                            </span>
                            <span className="need-content">
                              <span className="need-name">{c.label}</span>
                              <span className="need-bar">
                                <span
                                  style={{
                                    width: `${mode === 'needs' ? score : Math.min(100, (funds / (selected.raised + (extraRaised[selected.id] ?? 0))) * 100)}%`,
                                    background:
                                      mode === 'needs'
                                        ? needColor(score)
                                        : '#72a88a',
                                  }}
                                />
                              </span>
                            </span>
                            <span
                              className={`need-score ${mode === 'impact' ? 'funds-score' : ''}`}
                            >
                              {mode === 'needs' ? score : money(funds)}
                            </span>
                            <ChevronRight size={15} />
                          </button>
                        );
                      })}
                    </div>
                    <div className="funding-card">
                      <div className="funding-label">
                        <span>Together, so far</span>
                        <HandHeart size={17} />
                      </div>
                      <div className="funding-value">
                        {money(
                          selected.raised + (extraRaised[selected.id] ?? 0),
                        )}
                        <span> of {money(selected.goal)}</span>
                      </div>
                      <Progress
                        value={Math.min(
                          100,
                          ((selected.raised + (extraRaised[selected.id] ?? 0)) /
                            selected.goal) *
                            100,
                        )}
                        aria-label="Percentage of fundraising goal"
                      />
                      <div className="funding-foot">
                        <span>
                          {Math.round(
                            ((selected.raised +
                              (extraRaised[selected.id] ?? 0)) /
                              selected.goal) *
                              100,
                          )}
                          % of the fundraising goal
                        </span>
                        <span>Every contribution counts</span>
                      </div>
                    </div>
                    <button
                      className="donate-button"
                      onClick={() =>
                        setDetail(category === 'all' ? 'water' : category)
                      }
                    >
                      <Heart size={18} />
                      Bring your help here
                      <ArrowUpRight size={19} />
                    </button>
                    <div className="trust-line">
                      <ShieldCheck size={13} />
                      Anonymous to others. Visible through your impact.
                    </div>
                    {cityOptions.length > 0 && (
                      <button
                        className="explore-cities"
                        onClick={() => navigate(cityOptions[0])}
                      >
                        Explore cities in{' '}
                        {selected.countryName ?? selected.name}
                        <ArrowRight size={15} />
                      </button>
                    )}
                  </>
                ) : (
                  <div className="no-territory-data">
                    <Globe2 size={36} />
                    <h3>This place deserves attention.</h3>
                    <p>
                      We have not added a care scenario for {selected.name}.
                      White indicates missing data, not an absence of need.
                    </p>
                    <button
                      className="primary-button"
                      onClick={() => navigate(territories[0])}
                    >
                      Explore a territory
                      <ArrowRight size={17} />
                    </button>
                  </div>
                )}
                <button className="panel-source" onClick={() => setInfo(true)}>
                  <Info size={13} />
                  Where does this data come from?
                </button>
              </aside>
            )}
          </div>
          <div className="explorer-footer">
            <div className="level-select">
              <span>Explore by</span>
              <Tabs
                value={level}
                onValueChange={(v) => changeLevel(v as MapLevel)}
              >
                <TabsList>
                  <TabsTrigger value="continents">Continents</TabsTrigger>
                  <TabsTrigger value="countries">Countries</TabsTrigger>
                  <TabsTrigger value="cities">Cities</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <span className="footer-note">
              <ShieldCheck size={15} />
              Kindness is visible. Every step is documented.
            </span>
          </div>
          <section className="collective-impact">
            <div className="impact-intro">
              <span className="impact-icon">
                <Sprout size={23} />
              </span>
              <div>
                <h3>Small acts. Collective impact.</h3>
                <p>A community bringing people closer.</p>
              </div>
            </div>
            <div className="impact-stat">
              <strong>
                {money(
                  territories.reduce((s, t) => s + t.raised, 0) + totalDonated,
                )}
              </strong>
              <span>simulated aid worldwide</span>
            </div>
            <div className="impact-stat">
              <strong>
                {profile ? 7 : 6}
                {!profile && <span>+ you</span>}
              </strong>
              <span>donors in the community</span>
            </div>
            <div className="impact-stat">
              <strong>{territories.length}</strong>
              <span>territories with care projects</span>
            </div>
            <button
              className="circle-arrow"
              onClick={() => setMode('impact')}
              aria-label="Explore the aid map"
            >
              <ArrowUpRight size={23} />
            </button>
          </section>
        </div>
        <footer className="site-footer">
          <span>© 2026 earthealth</span>
          <span>A better world starts with an act of kindness.</span>
          <button onClick={() => setInfo(true)}>
            Transparency and methodology
            <ArrowUpRight size={13} />
          </button>
        </footer>
      </main>
      <Dialog open={info} onOpenChange={setInfo}>
        <DialogContent className="eh-dialog">
          <DialogTitle>A transparent prototype.</DialogTitle>
          <DialogDescription>
            earthealth connects people with needs around the world. This is an
            early release.
          </DialogDescription>
          <div className="info-block">
            <h3>Example data</h3>
            <p>
              Scores, fundraising totals, rankings, and impact are fictional
              examples for exploring the interface. The leaderboard shows six
              sample profiles plus your local profile; this is not an online
              community. These figures do not represent real assessments or
              humanitarian updates.
            </p>
            <h3>How to read the globe</h3>
            <p>
              Synthetic index from 0–100: dark red 85–100, orange 70–84, sand
              50–69, green 30–49, blue 0–29. The Aid view shows the funded share
              of the fundraising goal. White means data is unavailable.
              Continents aggregate participating countries only; city areas are
              approximate project areas, not municipal boundaries.
            </p>
            <h3>Geography and official channels</h3>
            <p>
              Boundaries from{' '}
              <a
                href="https://github.com/topojson/world-atlas"
                target="_blank"
                rel="noreferrer"
              >
                Natural Earth / World Atlas
              </a>
              . External links lead to official organization websites, with no
              partnership or automatic tracking by earthealth.
            </p>
          </div>
        </DialogContent>
      </Dialog>
      <AccountDialog
        open={accountOpen}
        onOpenChange={setAccountOpen}
        onCreate={createProfile}
      />
      {detail && (
        <DonationDialog
          key={selected.id + detail}
          territory={selected}
          category={detail}
          profile={profile}
          onClose={() => setDetail(null)}
          onCreate={createProfile}
          onDonate={recordDonation}
          onShowProfile={() => changePage('profile')}
        />
      )}
      {activeDocument && profile && (
        <DonationDocument
          donation={activeDocument}
          username={profile.username}
          onClose={() => setDocumentId(null)}
          onAdvance={advanceDocument}
        />
      )}
      <Dialog
        open={impactSelected !== null}
        onOpenChange={(o) => {
          if (!o) setImpactSelected(null);
        }}
      >
        <DialogContent className="eh-dialog">
          {impactSelected && (
            <>
              <span className="dialog-eyebrow">AID AROUND THE WORLD</span>
              <DialogTitle>
                {impactSelected.name}: every contribution adds up.
              </DialogTitle>
              <DialogDescription>
                {money(
                  impactSelected.raised + (extraRaised[impactSelected.id] ?? 0),
                )}{' '}
                in contributions, towards a goal of {money(impactSelected.goal)}
                .
              </DialogDescription>
              <div className="impact-distribution">
                {categories.map((c) => {
                  const Icon = categoryIcons[c.id];
                  const funds = categoryFunding(
                    impactSelected,
                    c.id,
                    donations,
                  );
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelected(impactSelected);
                        setImpactSelected(null);
                        setDetail(c.id);
                      }}
                    >
                      <span style={{ background: c.color + '30' }}>
                        <Icon size={20} />
                      </span>
                      <div>
                        <strong>{c.label}</strong>
                        <Progress
                          value={
                            (funds /
                              (impactSelected.raised +
                                (extraRaised[impactSelected.id] ?? 0))) *
                            100
                          }
                          aria-label={`Category share ${c.label}`}
                        />
                      </div>
                      <b>{money(funds)}</b>
                      <ChevronRight size={16} />
                    </button>
                  );
                })}
              </div>
              <p className="fine-print">
                The allocation is illustrative. Your simulated donations are
                added to the selected category and territory.
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="eh-dialog search-dialog">
          <DialogTitle>Where would you like to help?</DialogTitle>
          <DialogDescription>
            Search for a continent, country, or city.
          </DialogDescription>
          <Command shouldFilter={false} className="place-command">
            <CommandInput
              placeholder="Search for a place…"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>
                No places found. Try a country or a city.
              </CommandEmpty>
              {searchResults.map((t) => (
                <CommandItem
                  key={t.id}
                  value={t.id}
                  onSelect={() => navigate(t)}
                >
                  <MapPin size={17} />
                  <span>
                    {t.name}
                    <small>
                      {t.countryName ?? t.continent}
                      {t.score < 0 ? ' · data unavailable' : ''}
                    </small>
                  </span>
                  <ChevronRight size={17} />
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </div>
  );
}
