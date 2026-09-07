'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Camera, Check } from 'lucide-react';
import ShelterMap from '@/components/shelter-map';
import { VirtualShelter } from '@/components/virtual-shelter';
import { CarePlanner, CareTimeline } from '@/components/care-planner';
import { ShelterProfile } from '@/components/shelter-profile';
import { PixelCareIcon } from '@/components/pixel-care-icon';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import {
  giftAllocation,
  careKinds,
  exampleGifts,
  fundingSummary,
  SHARED_CARE_ID,
  kronor,
  profileDogs,
  readDemoGifts,
  SHELL_STORAGE_KEY,
  type DemoGift,
} from '@/lib/donation-shell';
import {
  parseDonationAmount,
  previewCareRecipients,
} from '@/lib/virtual-shelter';
import {
  daysBetween,
  forecastDays,
  projectCare,
  type CarePlanId,
  type GivingFrequency,
} from '@/lib/care-impact';
import {
  defaultShelterProfile,
  PROFILE_STORAGE_KEY,
  readShelterProfile,
  type ShelterProfile as Profile,
} from '@/lib/shelter-profile';

export default function DonationShell() {
  const [selectedId, setSelectedId] = useState('ake');
  const [draftAmount, setDraftAmount] = useState('500');
  const [careId, setCareId] = useState<CarePlanId>('food');
  const [frequency, setFrequency] = useState<GivingFrequency>('once');
  const [timelineDay, setTimelineDay] = useState(0);
  const [startDate, setStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [profile, setProfile] = useState<Profile>(defaultShelterProfile);
  const [gifts, setGifts] = useState<DemoGift[]>(exampleGifts);
  const [ready, setReady] = useState(false);
  const [sessionOnly, setSessionOnly] = useState(false);
  const [notice, setNotice] = useState('');
  const [celebrate, setCelebrate] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      setGifts(readDemoGifts(localStorage.getItem(SHELL_STORAGE_KEY)));
      const savedProfile = readShelterProfile(
        localStorage.getItem(PROFILE_STORAGE_KEY),
      );
      setProfile(savedProfile);
      if (savedProfile.monthlyPlan) {
        const plan = savedProfile.monthlyPlan;
        setDraftAmount(String(plan.amountOre / 100));
        setCareId(plan.careId);
        setFrequency('monthly');
        setStartDate(plan.startDate);
        setTimelineDay(
          Math.min(
            forecastDays(plan.startDate),
            Math.max(
              0,
              daysBetween(
                plan.startDate,
                new Date().toISOString().slice(0, 10),
              ),
            ),
          ),
        );
      }
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
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch {
      setSessionOnly(true);
    }
  }, [profile, ready]);

  const dog = profileDogs.find((item) => item.id === selectedId)!;
  const funding = fundingSummary(gifts);
  const { amountOre, allocation } = funding;
  const myGifts = gifts.filter((gift) => gift.id !== 'example');
  const personalFunding = fundingSummary(myGifts);
  const residentIds = profileDogs
    .filter(
      (item) => !item.group && personalFunding.byDog[item.id].amountOre > 0,
    )
    .map((item) => item.id);
  const latestGift = myGifts.at(-1);
  const helpedDogs = profileDogs.filter(
    (item) => funding.byDog[item.id].amountOre > 0,
  );
  const draftOre = parseDonationAmount(draftAmount);
  const confirmedScene =
    draftAmount === '' &&
    frequency === 'once' &&
    latestGift?.carePlanId === careId;
  const projection = projectCare({
    amountOre: draftOre ?? (confirmedScene ? latestGift.amountOre : null),
    careId,
    frequency,
    startDate,
    day: timelineDay,
  });
  const previewIds = confirmedScene
    ? (latestGift.recipientIds ?? [latestGift.dogId])
    : previewCareRecipients(projection.dogCount, personalFunding, careId);

  function changeAmount(value: string) {
    setDraftAmount(value);
    setNotice('');
  }
  function changeCare(id: CarePlanId) {
    setCareId(id);
    setTimelineDay(0);
  }
  function changeFrequency(value: GivingFrequency) {
    setFrequency(value);
    setStartDate(new Date().toISOString().slice(0, 10));
    setTimelineDay(0);
  }

  function selectDog(id: string) {
    setSelectedId(id);
    setNotice('');
    setCelebrate(false);
  }
  function donate() {
    if (!ready || draftOre === null) return;
    if (frequency === 'monthly') {
      setProfile((current) => ({
        ...current,
        monthlyPlan: { amountOre: draftOre, careId, startDate },
      }));
      setNotice(
        'Monthly forecast saved to your profile. No payments or automatic charges are scheduled.',
      );
      return;
    }
    if (gifts.length >= 1000) return;
    const recipients = previewIds.length
      ? previewIds
      : previewCareRecipients(1, personalFunding, careId);
    const gift = {
      id: crypto.randomUUID(),
      dogId: SHARED_CARE_ID,
      recipientIds: [...recipients],
      amountOre: draftOre,
      carePlanId: careId,
      createdAt: new Date().toISOString(),
    };
    setGifts((current) => [...current, gift]);
    setNotice(
      `${kronor(draftOre)} SEK added to demo care. ${projection.totalUnits ? 'Your care companions are now part of your shelter.' : 'This contribution is below the cost of a full care unit.'}`,
    );
    setSelectedId(recipients[0]);
    setDraftAmount('');
    setTimelineDay(0);
    setStartDate(new Date().toISOString().slice(0, 10));
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
        <ShelterProfile
          profile={profile}
          onSave={setProfile}
          ready={ready}
          sessionOnly={sessionOnly}
        />
        <section
          className="donation-main donation-main-personal"
          aria-label="Your virtual shelter and real shelters"
        >
          <section
            className="donation-panel donation-panel-total donation-panel-personal"
            aria-label="Your giving and personal shelter"
          >
            <div className="donation-balance">
              <div className="donation-balance-label">
                <h2>Your total donated</h2>
                <span className="donation-demo-label">DEMO</span>
              </div>
              <div
                className={`donation-value ${celebrate ? 'donation-value-pop' : ''}`}
              >
                <strong>{kronor(amountOre)}</strong>
                <span>SEK</span>
                {celebrate && (
                  <span className="donation-float">
                    +{kronor(latestGift?.amountOre ?? 0)}{' '}
                    <PixelCareIcon kind="heart" width="18" height="18" />
                  </span>
                )}
              </div>
              <div className="donation-allocation-bar" aria-hidden="true">
                {careKinds.map((kind) => (
                  <span
                    key={kind.id}
                    style={{
                      width: `${amountOre ? (allocation[kind.id] / amountOre) * 100 : kind.share}%`,
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
                Demo giving by category · includes earlier illustrative splits
              </p>
            </div>

            <div className="personal-care-workspace">
              <CarePlanner
                amount={draftAmount}
                careId={careId}
                frequency={frequency}
                onAmount={changeAmount}
                onCare={changeCare}
                onFrequency={changeFrequency}
                onConfirm={donate}
                ready={ready}
                atLimit={gifts.length >= 1000}
                monthlyPlan={profile.monthlyPlan}
                onCancelMonthly={() => {
                  setProfile((current) => ({ ...current, monthlyPlan: null }));
                  setNotice(
                    'Monthly preview removed. Your donation history is unchanged.',
                  );
                }}
              />
              <div className="personal-care-scene">
                <VirtualShelter
                  funding={funding}
                  residentIds={residentIds}
                  previewIds={previewIds}
                  projection={projection}
                  confirmed={confirmedScene}
                  shelterName={profile.shelterName}
                  onSelectDog={selectDog}
                >
                  <CareTimeline
                    projection={projection}
                    startDate={startDate}
                    onDay={setTimelineDay}
                  />
                </VirtualShelter>
              </div>
            </div>

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
                      ? `${kronor(amountOre)} SEK supporting ${helpedDogs.length} profiles through shared care`
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
          </section>
          <div className="donation-map">
            <ShelterMap
              selectedDogId={selectedId}
              funding={funding}
              onSelectDog={selectDog}
            />
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
            <CarouselContent className="donation-photo-track">
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
                        {kronor(giftAllocation(latestGift).food)} for food,{' '}
                        {kronor(giftAllocation(latestGift).health)} for vet
                        care, and {kronor(giftAllocation(latestGift).comfort)}{' '}
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
