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
        'Non è stato possibile leggere il profilo locale. Puoi creare un nuovo profilo demo.',
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
        'Il browser non consente il salvataggio locale. Il profilo e le donazioni resteranno disponibili solo fino alla chiusura della pagina.',
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
      throw Error('Crea prima il tuo profilo anonimo.');
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
              'Apri sul globo un territorio demo e mostra i suoi bisogni. Non crea profili né donazioni.',
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
                throw Error('territoryId richiesto.');
              const t = allTerritories.find(
                (t) => t.id === (input as { territoryId: unknown }).territoryId,
              );
              if (!t) throw Error('Territorio demo non disponibile.');
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
          aria-label="EarthHealth, vai al globo"
        >
          <span className="brand-mark">
            <Globe2 size={24} />
          </span>
          <span>
            earth<span className="brand-light">health</span>
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
              Esplora il mondo
            </TabsTrigger>
            <TabsTrigger value="profile">
              <Heart />
              Il mio impatto
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
            aria-label="Come funziona EarthHealth"
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
              {profile ? '@' + profile.username : 'Crea il tuo profilo'}
            </span>
            {profile ? null : <ArrowUpRight size={17} />}
          </button>
        </div>
      </header>
      <main>
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <span className="tiny-star">✳</span> UN PIANETA, UNA COMMUNITY
            </div>
            <h1>
              {page === 'profile'
                ? 'Il tuo gesto, la sua storia'
                : page === 'community'
                  ? 'Il bene si moltiplica'
                  : 'L’aiuto, dove serve'}
              <span>.</span>
            </h1>
            <p>
              {page === 'profile'
                ? 'Segui ogni passo del tuo aiuto.'
                : page === 'community'
                  ? 'Tanti nomi diversi. Un solo pianeta da aiutare.'
                  : 'Esplora il mondo. Scegli una causa. Fai la differenza.'}
            </p>
          </div>
          <button className="demo-badge" onClick={() => setInfo(true)}>
            <span />
            Prototipo · Dati dimostrativi
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
            <section className="map-stage" aria-label="Esplora i territori">
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
                      Mappa dei bisogni
                    </TabsTrigger>
                    <TabsTrigger value="impact">
                      <Heart />
                      Gli aiuti nel mondo
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <button
                  className="map-search"
                  onClick={() => setSearchOpen(true)}
                >
                  <Search size={17} />
                  <span>Cerca un luogo</span>
                  <span className="search-shortcut">⌕</span>
                </button>
              </div>
              <div className="category-rail" aria-label="Filtra le categorie">
                <span className="rail-label">
                  {mode === 'needs' ? 'BISOGNI' : 'AIUTI'}
                </span>
                <button
                  aria-pressed={category === 'all'}
                  className={category === 'all' ? 'active' : ''}
                  onClick={() => setCategory('all')}
                  title="Tutti i bisogni"
                  aria-label="Tutti i bisogni"
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
                  ? 'Città demo · Aree di progetto indicative'
                  : category !== 'all'
                    ? categories.find((c) => c.id === category)?.label
                    : mode === 'needs'
                      ? 'Ogni bisogno conta.'
                      : 'Ogni aiuto lascia una traccia.'}
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
                    {mode === 'needs'
                      ? 'LIVELLO DI NECESSITÀ'
                      : 'OBIETTIVO SOSTENUTO'}
                    <button
                      aria-label="Informazioni sulla scala"
                      onClick={() => setInfo(true)}
                    >
                      <Info size={13} />
                    </button>
                  </div>
                  <div
                    className={`legend-gradient ${mode === 'impact' ? 'impact-gradient' : ''}`}
                  />
                  <div className="legend-labels">
                    <span>{mode === 'needs' ? 'Critico' : '0%'}</span>
                    <span>{mode === 'needs' ? 'Contenuto' : '100%+'}</span>
                  </div>
                  <div className="no-data">
                    <i />
                    Dati non disponibili
                  </div>
                </div>
                <div className="map-controls">
                  <button
                    aria-label={expanded ? 'Riduci mappa' : 'Espandi mappa'}
                    onClick={() => setExpanded(!expanded)}
                  >
                    {expanded ? <X size={18} /> : <Maximize2 size={18} />}
                  </button>
                  <div>
                    <button
                      aria-label="Aumenta zoom"
                      disabled={zoom >= 22}
                      onClick={() => changeZoom(Math.min(22, zoom * 1.45))}
                    >
                      <Plus size={20} />
                    </button>
                    <button
                      aria-label="Diminuisci zoom"
                      disabled={zoom <= 0.82}
                      onClick={() => changeZoom(Math.max(0.82, zoom / 1.45))}
                    >
                      <Minus size={20} />
                    </button>
                  </div>
                  <button
                    aria-label="Ripristina vista del globo"
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
                  Trascina per esplorare · Scorri per zoomare
                </span>
                <span>GEOGRAFIA NATURAL EARTH</span>
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
                        ? 'VICINO ALLE PERSONE'
                        : continents.some((c) => c.id === selected.id)
                          ? 'UNO SGUARDO AL CONTINENTE'
                          : 'UN TERRITORIO, TANTE STORIE'}
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
                        {needLabel(selected.score)} priorità
                      </span>
                      <span className="data-caption">Scenario demo</span>
                    </div>
                    <p className="territory-description">
                      Ogni persona merita acqua, cibo, cure e un luogo sicuro.
                      Scopri dove il tuo aiuto può arrivare.
                    </p>
                    <div className="needs-header">
                      <h3>
                        {mode === 'needs'
                          ? 'Di cosa c’è bisogno'
                          : 'Come si distribuiscono gli aiuti'}
                      </h3>
                      <span>5 categorie</span>
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
                        <span>Insieme, fin qui</span>
                        <HandHeart size={17} />
                      </div>
                      <div className="funding-value">
                        {money(
                          selected.raised + (extraRaised[selected.id] ?? 0),
                        )}
                        <span> su {money(selected.goal)}</span>
                      </div>
                      <Progress
                        value={Math.min(
                          100,
                          ((selected.raised + (extraRaised[selected.id] ?? 0)) /
                            selected.goal) *
                            100,
                        )}
                        aria-label="Percentuale obiettivo raccolta dimostrativa"
                      />
                      <div className="funding-foot">
                        <span>
                          {Math.round(
                            ((selected.raised +
                              (extraRaised[selected.id] ?? 0)) /
                              selected.goal) *
                              100,
                          )}
                          % dell’obiettivo demo
                        </span>
                        <span>Ogni gesto conta</span>
                      </div>
                    </div>
                    <button
                      className="donate-button"
                      onClick={() =>
                        setDetail(category === 'all' ? 'water' : category)
                      }
                    >
                      <Heart size={18} />
                      Porta il tuo aiuto qui
                      <ArrowUpRight size={19} />
                    </button>
                    <div className="trust-line">
                      <ShieldCheck size={13} />
                      Anonimo per gli altri. Visibile nell’impatto.
                    </div>
                    {cityOptions.length > 0 && (
                      <button
                        className="explore-cities"
                        onClick={() => navigate(cityOptions[0])}
                      >
                        Esplora le città di{' '}
                        {selected.countryName ?? selected.name}
                        <ArrowRight size={15} />
                      </button>
                    )}
                  </>
                ) : (
                  <div className="no-territory-data">
                    <Globe2 size={36} />
                    <h3>Questo luogo merita attenzione.</h3>
                    <p>
                      Non abbiamo ancora inserito uno scenario dimostrativo per{' '}
                      {selected.name}. Il bianco indica dati mancanti, non
                      assenza di bisogni.
                    </p>
                    <button
                      className="primary-button"
                      onClick={() => navigate(territories[0])}
                    >
                      Esplora un territorio demo
                      <ArrowRight size={17} />
                    </button>
                  </div>
                )}
                <button className="panel-source" onClick={() => setInfo(true)}>
                  <Info size={13} />
                  Da dove arrivano questi dati?
                </button>
              </aside>
            )}
          </div>
          <div className="explorer-footer">
            <div className="level-select">
              <span>Esplora per</span>
              <Tabs
                value={level}
                onValueChange={(v) => changeLevel(v as MapLevel)}
              >
                <TabsList>
                  <TabsTrigger value="continents">Continenti</TabsTrigger>
                  <TabsTrigger value="countries">Nazioni</TabsTrigger>
                  <TabsTrigger value="cities">Città</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <span className="footer-note">
              <ShieldCheck size={15} />
              Il bene si vede. Ogni passo è documentato.
            </span>
          </div>
          <section className="collective-impact">
            <div className="impact-intro">
              <span className="impact-icon">
                <Sprout size={23} />
              </span>
              <div>
                <h3>Piccoli gesti. Impatto collettivo.</h3>
                <p>Una community che accorcia le distanze.</p>
              </div>
            </div>
            <div className="impact-stat">
              <strong>
                {money(
                  territories.reduce((s, t) => s + t.raised, 0) + totalDonated,
                )}
              </strong>
              <span>aiuti simulati nel mondo</span>
            </div>
            <div className="impact-stat">
              <strong>
                {profile ? 7 : 6}
                {!profile && <span>+ te</span>}
              </strong>
              <span>donatori nella community demo</span>
            </div>
            <div className="impact-stat">
              <strong>{territories.length}</strong>
              <span>territori con scenari demo</span>
            </div>
            <button
              className="circle-arrow"
              onClick={() => setMode('impact')}
              aria-label="Esplora la mappa degli aiuti"
            >
              <ArrowUpRight size={23} />
            </button>
          </section>
        </div>
        <footer className="site-footer">
          <span>© 2026 EarthHealth</span>
          <span>Un mondo migliore comincia da un gesto.</span>
          <button onClick={() => setInfo(true)}>
            Trasparenza e metodologia
            <ArrowUpRight size={13} />
          </button>
        </footer>
      </main>
      <Dialog open={info} onOpenChange={setInfo}>
        <DialogContent className="eh-dialog">
          <DialogTitle>Un prototipo, con trasparenza.</DialogTitle>
          <DialogDescription>
            EarthHealth collega le persone ai bisogni del mondo. Questa è una
            prima esperienza dimostrativa.
          </DialogDescription>
          <div className="info-block">
            <h3>Dati di esempio</h3>
            <p>
              Punteggi, raccolte, classifica e impatto sono inventati per
              esplorare l’interfaccia. La classifica mostra sei profili di
              esempio più il tuo profilo locale; non è una community online. Non
              rappresentano valutazioni reali né aggiornamenti umanitari.
            </p>
            <h3>Come leggere il globo</h3>
            <p>
              Indice sintetico 0–100: rosso scuro 85–100, arancio 70–84, sabbia
              50–69, verde 30–49, blu 0–29. La vista Aiuti indica la quota
              dell’obiettivo demo sostenuta. Bianco: dati non disponibili. I
              continenti aggregano soltanto i paesi demo; le aree cittadine sono
              indicative, non confini comunali.
            </p>
            <h3>Geografia e canali ufficiali</h3>
            <p>
              Confini da{' '}
              <a
                href="https://github.com/topojson/world-atlas"
                target="_blank"
                rel="noreferrer"
              >
                Natural Earth / World Atlas
              </a>
              . I canali esterni sono siti ufficiali delle organizzazioni, senza
              partnership o tracciamento automatico da parte di EarthHealth.
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
              <span className="dialog-eyebrow">GLI AIUTI NEL MONDO · DEMO</span>
              <DialogTitle>
                {impactSelected.name}: ogni gesto si somma.
              </DialogTitle>
              <DialogDescription>
                {money(
                  impactSelected.raised + (extraRaised[impactSelected.id] ?? 0),
                )}{' '}
                di contributi dimostrativi, su un obiettivo di{' '}
                {money(impactSelected.goal)}.
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
                          aria-label={`Quota demo ${c.label}`}
                        />
                      </div>
                      <b>{money(funds)}</b>
                      <ChevronRight size={16} />
                    </button>
                  );
                })}
              </div>
              <p className="fine-print">
                La ripartizione è illustrativa. Le tue donazioni simulate si
                aggiungono alla categoria e al territorio scelti.
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="eh-dialog search-dialog">
          <DialogTitle>Dove vuoi portare il tuo aiuto?</DialogTitle>
          <DialogDescription>
            Cerca un continente, una nazione o una città dimostrativa.
          </DialogDescription>
          <Command shouldFilter={false} className="place-command">
            <CommandInput
              placeholder="Cerca un luogo…"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>
                Nessun luogo trovato. Prova una nazione o una città demo.
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
                      {t.score < 0 ? ' · senza dati demo' : ''}
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
