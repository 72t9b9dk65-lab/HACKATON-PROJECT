'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Camera, Check } from 'lucide-react';
import ShelterMap from '@/components/shelter-map';
import { VirtualShelter } from '@/components/virtual-shelter';
import { CarePlanner, CareTimeline } from '@/components/care-planner';
import { ShelterProfile } from '@/components/shelter-profile';
import {
  DonationBalance,
  ExpenseTransactions,
  SpendingBreakdown,
} from '@/components/donation-spending';
import {
  firstCareExpenses,
  GIVING_STORAGE_KEY,
  readGivingLedger,
  spendingSummary,
  type DemoExpense,
  type GivingLedger,
} from '@/lib/donation-spending';
import { WORKBOOK_GIFT_ID, workbookLedger } from '@/lib/workbook-transactions';
import { PixelCareIcon } from '@/components/pixel-care-icon';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import {
  giftAllocation,
  SHARED_CARE_ID,
  kronor,
  profileDogs,
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
  const [ledger, setLedger] = useState<GivingLedger>(workbookLedger);
  const { gifts, expenses } = ledger;
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [donationOpen, setDonationOpen] = useState(false);
  const [fullImpact, setFullImpact] = useState(true);
  const [replay, setReplay] = useState<{
    expense: DemoExpense;
    key: number;
  } | null>(null);
  const replayCounter = useRef(0);
  const sceneAnchor = useRef<HTMLDivElement>(null);
  const focusShelterOnClose = useRef(false);
  const [ready, setReady] = useState(false);
  const [sessionOnly, setSessionOnly] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    try {
      setLedger(
        readGivingLedger(
          localStorage.getItem(GIVING_STORAGE_KEY),
          localStorage.getItem(SHELL_STORAGE_KEY),
        ),
      );
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
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(GIVING_STORAGE_KEY, JSON.stringify(ledger));
    } catch {
      setSessionOnly(true);
    }
  }, [ledger, ready]);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch {
      setSessionOnly(true);
    }
  }, [profile, ready]);

  const dog = profileDogs.find((item) => item.id === selectedId)!;
  const spending = spendingSummary(ledger);
  const { funding, residentIds } = spending;
  const amountOre = spending.totalOre;
  const myGifts = gifts.filter(
    (gift) => gift.id !== 'example' && gift.id !== WORKBOOK_GIFT_ID,
  );
  const openingFunding = gifts.find((gift) => gift.id === WORKBOOK_GIFT_ID);
  const latestGift = myGifts.at(-1);
  const latestExpenses = expenses.filter(
    (expense) => expense.giftId === latestGift?.id,
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
    ? fullImpact
      ? (latestGift.recipientIds ?? [latestGift.dogId]).slice(
          0,
          projection.dogCount,
        )
      : [...new Set(latestExpenses.map((expense) => expense.dogId))]
    : previewCareRecipients(projection.dogCount, funding, careId);

  function changeAmount(value: string) {
    setReplay(null);
    setDraftAmount(value);
    setNotice('');
  }
  function changeCare(id: CarePlanId) {
    setReplay(null);
    setCareId(id);
    setTimelineDay(0);
  }
  function changeFrequency(value: GivingFrequency) {
    setReplay(null);
    setFrequency(value);
    setStartDate(new Date().toISOString().slice(0, 10));
    setTimelineDay(0);
  }

  function selectDog(id: string) {
    setSelectedId(id);
    setNotice('');
  }
  function replayExpense(expense: DemoExpense) {
    setBreakdownOpen(false);
    setSelectedId(expense.dogId);
    setReplay({ expense, key: ++replayCounter.current });
  }
  function closeDonationToShelter() {
    setFullImpact(true);
    focusShelterOnClose.current = true;
    setDonationOpen(false);
    setBreakdownOpen(false);
    setReplay(null);
  }
  useEffect(() => {
    if (!replay) return;
    sceneAnchor.current?.focus({ preventScroll: true });
    sceneAnchor.current?.scrollIntoView({
      block: 'start',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  }, [replay]);

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
      closeDonationToShelter();
      return;
    }
    if (gifts.length >= 1000) return;
    const recipients = previewIds.length
      ? previewIds
      : previewCareRecipients(1, funding, careId);
    const gift: DemoGift = {
      id: crypto.randomUUID(),
      dogId: SHARED_CARE_ID,
      recipientIds: [...recipients],
      amountOre: draftOre,
      carePlanId: careId,
      createdAt: new Date().toISOString(),
    };
    const careExpenses = firstCareExpenses(gift);
    const spent = careExpenses.reduce(
      (sum, expense) => sum + expense.amountOre,
      0,
    );
    setLedger((current) => ({
      gifts: [...current.gifts, gift],
      expenses: [...current.expenses, ...careExpenses],
    }));
    setReplay(null);
    setNotice(
      `${kronor(draftOre)} SEK donated. ${kronor(spent)} SEK used in first-care demo expenses; ${kronor(draftOre - spent)} SEK pending.`,
    );
    setSelectedId(recipients[0]);
    setDraftAmount('');
    setTimelineDay(0);
    setStartDate(new Date().toISOString().slice(0, 10));
    closeDonationToShelter();
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
            <div className="personal-care-workspace personal-giving-workspace">
              <aside
                className="personal-giving-sidebar"
                aria-label="Your donations and care transactions"
              >
                <Dialog
                  open={donationOpen}
                  onOpenChange={(open) => {
                    setDonationOpen(open);
                    if (open) {
                      focusShelterOnClose.current = false;
                      setBreakdownOpen(false);
                      setReplay(null);
                    }
                  }}
                  onOpenChangeComplete={(open) => {
                    if (!open && focusShelterOnClose.current) {
                      sceneAnchor.current?.scrollIntoView({
                        block: 'start',
                        behavior: window.matchMedia(
                          '(prefers-reduced-motion: reduce)',
                        ).matches
                          ? 'auto'
                          : 'smooth',
                      });
                    }
                  }}
                >
                  <DialogTrigger
                    data-slot="button"
                    render={
                      <Button
                        type="button"
                        className="donation-primary donation-launch"
                        disabled={!ready}
                      />
                    }
                  >
                    <PixelCareIcon kind="heart" width="28" height="28" />
                    Donate
                    <ArrowUpRight size={25} />
                  </DialogTrigger>
                  <DialogContent
                    className="donation-shell donation-dialog"
                    finalFocus={() =>
                      focusShelterOnClose.current ? sceneAnchor.current : true
                    }
                  >
                    <DialogTitle>
                      What could your gift make possible?
                    </DialogTitle>
                    <DialogDescription>
                      Choose an example or enter your own amount. Preview the
                      impact in your shelter before confirming.
                    </DialogDescription>
                    <CarePlanner
                      amount={draftAmount}
                      careId={careId}
                      frequency={frequency}
                      onAmount={changeAmount}
                      onCare={changeCare}
                      onFrequency={changeFrequency}
                      onConfirm={donate}
                      onPreview={closeDonationToShelter}
                      ready={ready}
                      atLimit={gifts.length >= 1000}
                      monthlyPlan={profile.monthlyPlan}
                      onCancelMonthly={() => {
                        setProfile((current) => ({
                          ...current,
                          monthlyPlan: null,
                        }));
                        setNotice(
                          'Monthly preview removed. Your donation history is unchanged.',
                        );
                      }}
                    />
                  </DialogContent>
                </Dialog>
                <DonationBalance
                  spending={spending}
                  open={breakdownOpen}
                  onToggle={() => setBreakdownOpen((value) => !value)}
                />
                <ExpenseTransactions
                  expenses={expenses}
                  selectedId={replay?.expense.id}
                  onReplay={replayExpense}
                />
              </aside>
              <div
                className="personal-care-scene"
                id="personal-shelter-view"
                role="region"
                aria-label={
                  breakdownOpen ? 'Your spending' : 'Your personal shelter'
                }
                ref={sceneAnchor}
                tabIndex={-1}
              >
                {breakdownOpen ? (
                  <SpendingBreakdown
                    spending={spending}
                    onClose={() => {
                      setBreakdownOpen(false);
                      sceneAnchor.current?.focus({ preventScroll: true });
                    }}
                    onSelectDog={(id) => {
                      const expense = [...expenses]
                        .reverse()
                        .find((item) => item.dogId === id);
                      if (expense) replayExpense(expense);
                    }}
                  />
                ) : (
                  <div className="shelter-scene-anchor">
                    <VirtualShelter
                      funding={funding}
                      residentIds={residentIds}
                      previewIds={previewIds}
                      projection={projection}
                      confirmed={confirmedScene && !fullImpact}
                      fullImpact={fullImpact}
                      onFullImpact={setFullImpact}
                      shelterName={profile.shelterName}
                      onSelectDog={selectDog}
                      replay={replay}
                      onExitReplay={() => setReplay(null)}
                    >
                      <CareTimeline
                        projection={projection}
                        startDate={startDate}
                        onDay={(day) => {
                          setReplay(null);
                          setTimelineDay(day);
                        }}
                      />
                    </VirtualShelter>
                  </div>
                )}
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
                      ? `${kronor(spending.usedOre)} SEK used for ${residentIds.length} shelter companions · ${kronor(spending.pendingOre)} SEK pending`
                      : 'Your first gift starts a shared care trail'}
                  </span>
                </>
              )}
            </div>
            <div className="donation-ledger-meta">
              <span>
                {openingFunding &&
                  `${kronor(openingFunding.amountOre)} SEK sample opening funding`}
                {myGifts.length > 0 &&
                  ` · ${myGifts.length} demo ${myGifts.length === 1 ? 'gift' : 'gifts'} added`}
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
