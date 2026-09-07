'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Camera,
  Check,
  LocateFixed,
  Minus,
  Plus,
} from 'lucide-react';
import SwedenMap from '@/components/sweden-map';
import { PixelCareIcon } from '@/components/pixel-care-icon';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import {
  careAllocation,
  careKinds,
  DEMO_GIFT_ORE,
  exampleGifts,
  fundingSummary,
  SHARED_CARE_ID,
  kronor,
  profileDogs,
  readDemoGifts,
  SHELL_STORAGE_KEY,
  type DemoGift,
} from '@/lib/donation-shell';
import { MAX_SWEDEN_ZOOM } from '@/lib/sweden-map';

export default function DonationShell() {
  const [selectedId, setSelectedId] = useState('ake');
  const [dogsCarousel, setDogsCarousel] = useState<CarouselApi>();
  const [gifts, setGifts] = useState<DemoGift[]>(exampleGifts);
  const [ready, setReady] = useState(false);
  const [sessionOnly, setSessionOnly] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [resetKey, setResetKey] = useState(0);
  const [notice, setNotice] = useState('');
  const [celebrate, setCelebrate] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      setGifts(readDemoGifts(localStorage.getItem(SHELL_STORAGE_KEY)));
    } catch {
      setSessionOnly(true);
    }
    setReady(true);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(SHELL_STORAGE_KEY, JSON.stringify(gifts));
    } catch {
      setSessionOnly(true);
    }
  }, [gifts, ready]);

  const dog = profileDogs.find((item) => item.id === selectedId)!;
  const funding = fundingSummary(gifts);
  const { amountOre, allocation } = funding;
  const myGifts = gifts.filter((gift) => gift.id !== 'example');
  const latestGift = myGifts.at(-1);
  const helpedDogs = profileDogs.filter(
    (item) => funding.byDog[item.id].amountOre > 0,
  );
  const markers = profileDogs.map((item) => ({
    ...item,
    ...funding.byDog[item.id],
  }));

  useEffect(() => {
    const index = helpedDogs.findIndex((item) => item.id === selectedId);
    if (index >= 0) dogsCarousel?.scrollTo(index);
  }, [selectedId, dogsCarousel, helpedDogs.map((item) => item.id).join(',')]);

  function selectDog(id: string) {
    setSelectedId(id);
    setNotice('');
    setCelebrate(false);
  }
  function donate() {
    if (!ready || gifts.length >= 1000) return;
    const gift = {
      id: crypto.randomUUID(),
      dogId: SHARED_CARE_ID,
      amountOre: DEMO_GIFT_ORE,
      createdAt: new Date().toISOString(),
    };
    setGifts((current) => [...current, gift]);
    setNotice(
      '250 SEK added to shared care for the dogs.',
    );
    setCelebrate(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCelebrate(false), 1800);
  }

  return (
    <div className="donation-shell">
      <header className="donation-header">
        <a href="/" className="donation-brand" aria-label="Hundstallet home">
          <span>
            <PixelCareIcon kind="heart" width="24" height="24" />
          </span>
          HUNDSTALLET
          <span className="donation-brand-divider" />{' '}
          <small>A little care goes a long way.</small>
        </a>
        <span className="donation-prototype">
          <span /> Interactive prototype
        </span>
      </header>

      <main className="donation-workspace">
        <section className="donation-main" aria-label="Map and donation">
          <aside
            className="donation-panel donation-panel-total"
            aria-label="Your giving"
          >
            <div className="donation-balance">
              <div className="donation-balance-label">
                <h1>Your total donated</h1>
                <span className="donation-demo-label">DEMO</span>
              </div>
              <div
                className={`donation-value ${celebrate ? 'donation-value-pop' : ''}`}
              >
                <strong>{kronor(amountOre)}</strong>
                <span>SEK</span>
                {celebrate && (
                  <span className="donation-float">
                    +250 <PixelCareIcon kind="heart" width="18" height="18" />
                  </span>
                )}
              </div>
              <div className="donation-allocation-bar" aria-hidden="true">
                {careKinds.map((kind) => (
                  <span
                    key={kind.id}
                    style={{
                      width: `${kind.share}%`,
                      background: kind.color,
                      opacity: amountOre ? 1 : 0.22,
                    }}
                  />
                ))}
              </div>
              <div className="donation-breakdown">
                {careKinds.map((kind) => (
                  <div
                    key={kind.id}
                    className={`donation-care donation-care-${kind.id}`}
                  >
                    <PixelCareIcon kind={kind.id} width="36" height="36" />
                    <strong>
                      {kronor(allocation[kind.id])}
                      <small> SEK</small>
                    </strong>
                    <span>{kind.label}</span>
                  </div>
                ))}
              </div>
              <p className="donation-allocation-note">
                Illustrative split · food 50% / vet 30% / daily care 20%
              </p>
            </div>

            <Carousel
              setApi={setDogsCarousel}
              opts={{ align: 'start', containScroll: 'trimSnaps' }}
              className="donation-helped-carousel"
              aria-label="Dogs helped through shared care"
            >
              <div className="donation-helped-heading">
                <h2>Dogs you’re helping</h2>
                <div className="donation-carousel-controls">
                  <CarouselPrevious aria-label="Previous helped dog" />
                  <CarouselNext aria-label="Next helped dog" />
                </div>
              </div>
              {helpedDogs.length ? (
                <CarouselContent className="donation-helped-track">
                  {helpedDogs.map((item) => (
                    <CarouselItem
                      key={item.id}
                      className="donation-helped-item"
                    >
                      <button
                        className="donation-helped-dog"
                        aria-pressed={item.id === dog.id}
                        aria-label={`Follow ${item.name}’s journey`}
                        onClick={() => selectDog(item.id)}
                      >
                        <span className="donation-sprite-frame">
                          <img
                            src={item.sprite}
                            alt={item.spriteDescription}
                            width="160"
                            height="160"
                            draggable="false"
                          />
                        </span>
                        <strong>{item.name}</strong>
                        <span>{item.location}</span>
                      </button>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              ) : (
                <p className="donation-helped-empty">
                  Your first donation will start a shared care trail.
                </p>
              )}
              <p className="donation-helped-note">
                One donation, shared care. Illustrated avatars · demo
                beneficiaries.
              </p>
            </Carousel>

            <Button
              className="donation-primary"
              onClick={donate}
              disabled={!ready || gifts.length >= 1000}
            >
              <PixelCareIcon kind="heart" width="23" height="23" /> Donate 250
              SEK <span>↗</span>
            </Button>
            <p className="donation-payment-note">
              Try it out. No payment is taken.
            </p>
            <div className="donation-receipt" aria-live="polite" role="status">
              {notice ? (
                <>
                  <Check size={17} />
                  <span>{notice}</span>
                </>
              ) : (
                <>
                  <span className="donation-status-dot" />
                  <span>
                    {amountOre
                      ? `${kronor(amountOre)} SEK supporting ${helpedDogs.length} dogs through shared care`
                      : 'Your first gift starts a shared care trail'}
                  </span>
                </>
              )}
            </div>
            <div className="donation-ledger-meta">
              <span>
                {latestGift
                  ? `${myGifts.length} demo ${myGifts.length === 1 ? 'gift' : 'gifts'}${gifts.some((gift) => gift.id === 'example') ? ' + 500 SEK example' : ''}`
                  : amountOre
                    ? '500 SEK example included'
                    : 'No demo gifts yet'}
              </span>
              <span>
                {sessionOnly ? 'This session only' : 'Saved on this device'}
              </span>
            </div>
          </aside>
          <div className="donation-map">
            <div className="donation-map-heading">
              <span className="donation-eyebrow">A SECOND CHANCE, MAPPED</span>
              <h2>Your kindness, across Sweden.</h2>
              <p>Follow the dogs your giving helps.</p>
            </div>
            <SwedenMap
              selectedId={dog.shelterId}
              mode="impact"
              zoom={zoom}
              onZoom={setZoom}
              resetKey={resetKey}
              raised={{}}
              dogMarkers={markers}
              onSelect={(shelter) => {
                const next = profileDogs.find(
                  (item) => item.shelterId === shelter,
                );
                if (next) selectDog(next.id);
              }}
            />
            <div className="donation-map-region">
              <span className="donation-north">N ↑</span> SWEDEN
            </div>
            <div className="donation-map-key">
              <span /> Dogs at Hundstallet <small>City-level locations</small>
            </div>
            <div className="donation-map-controls" aria-label="Map controls">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Zoom in"
                disabled={zoom >= MAX_SWEDEN_ZOOM}
                onClick={() =>
                  setZoom((z) => Math.min(MAX_SWEDEN_ZOOM, z * 1.3))
                }
              >
                <Plus />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Zoom out"
                disabled={zoom <= 1}
                onClick={() => setZoom((z) => Math.max(1, z / 1.3))}
              >
                <Minus />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Show all of Sweden"
                onClick={() => {
                  setZoom(1);
                  setResetKey((k) => k + 1);
                }}
              >
                <LocateFixed />
              </Button>
            </div>
            <a
              className="donation-map-credit"
              href="https://www.naturalearthdata.com/"
              target="_blank"
              rel="noreferrer"
            >
              Geography: Natural Earth
            </a>
          </div>
        </section>

        <section
          className="donation-journey"
          aria-label={`${dog.name}’s photo journey`}
        >
          <Carousel
            key={dog.id}
            opts={{ align: 'start', containScroll: 'trimSnaps' }}
            className="donation-carousel"
          >
            <div className="donation-journey-heading">
              <div>
                <span className="donation-eyebrow">THE LITTLE MOMENTS</span>
                <h2>{dog.name}’s journey</h2>
                <p>
                  {dog.location} · {dog.breed} · Photos from Hundstallet
                </p>
              </div>
              <div className="donation-carousel-controls">
                <CarouselPrevious />
                <CarouselNext />
              </div>
            </div>
            <CarouselContent className="donation-timeline">
              {dog.photos.map((photo, index) => (
                <CarouselItem
                  key={photo.src}
                  className="donation-timeline-item"
                >
                  <div className="donation-timeline-stop">
                    <span />
                    Profile photo{' '}
                    <small>{String(index + 1).padStart(2, '0')}</small>
                  </div>
                  <figure>
                    <div className="donation-photo">
                      <img
                        src={photo.src}
                        alt={photo.caption}
                        loading="lazy"
                        width="420"
                        height="280"
                      />
                      <span className="donation-photo-credit">Hundstallet</span>
                    </div>
                    <figcaption>
                      <h3>{photo.caption}</h3>
                      <a href={dog.source} target="_blank" rel="noreferrer">
                        From the published profile <ArrowUpRight size={13} />
                      </a>
                    </figcaption>
                  </figure>
                </CarouselItem>
              ))}
              {latestGift && (
                <CarouselItem className="donation-timeline-item">
                  <div className="donation-timeline-stop">
                    <span />
                    {new Intl.DateTimeFormat('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    }).format(new Date(latestGift.createdAt))}
                    <small>DEMO GIFT</small>
                  </div>
                  <figure>
                    <div className="donation-photo donation-photo-placeholder donation-gift-moment">
                      <PixelCareIcon kind="heart" width="46" height="46" />
                      <strong>
                        You added {kronor(latestGift.amountOre)} SEK
                      </strong>
                      <p>
                        {kronor(careAllocation(latestGift.amountOre).food)} for
                        food,{' '}
                        {kronor(careAllocation(latestGift.amountOre).health)}{' '}
                        for vet care, and{' '}
                        {kronor(careAllocation(latestGift.amountOre).comfort)}{' '}
                        for daily care.
                      </p>
                      <span>Simulated allocation · awaiting a care update</span>
                    </div>
                    <figcaption>
                      <h3>A little more shared care</h3>
                      <p>
                        {myGifts.length} demo{' '}
                        {myGifts.length === 1 ? 'gift' : 'gifts'} on this device
                      </p>
                    </figcaption>
                  </figure>
                </CarouselItem>
              )}
              <CarouselItem className="donation-timeline-item donation-upcoming">
                <div className="donation-timeline-stop">
                  <span />
                  Next chapter <small>UPCOMING</small>
                </div>
                <figure>
                  <div className="donation-photo donation-photo-placeholder">
                    <div>
                      <PixelCareIcon kind="food" width="52" height="52" />
                      <Camera size={25} />
                    </div>
                    <strong>A meal. A photo. An update.</strong>
                    <p>
                      A future shelter update could show {dog.name} enjoying the
                      food your gift helped fund.
                    </p>
                    <span>Awaiting a connected update</span>
                  </div>
                  <figcaption>
                    <h3>See your care arrive</h3>
                    <p>Placeholder · no purchase or delivery verified</p>
                  </figcaption>
                </figure>
              </CarouselItem>
            </CarouselContent>
          </Carousel>
          <p className="donation-journey-note">
            Profile photos are undated and aren’t evidence of these demo
            allocations. A dated care timeline will appear here when shelter
            updates are connected.
          </p>
        </section>
      </main>
      <footer className="donation-footer">
        <p>
          Independent prototype · dog profiles checked 7 Sep 2026 · donations
          and spending simulated
        </p>
        <a
          href="https://hundstallet.se/hundar/"
          target="_blank"
          rel="noreferrer"
        >
          Hundstallet’s official website <ArrowUpRight size={14} />
        </a>
      </footer>
    </div>
  );
}
