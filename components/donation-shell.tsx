'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import {
  DogCareProvider,
  StaffCalendarButton,
} from '@/components/dog-care-provider';
import { DogJourney } from '@/components/dog-profile-dialog';
import ShelterMap from '@/components/shelter-map';
import { VirtualShelter } from '@/components/virtual-shelter';
import { CarePlanner, CareTimeline } from '@/components/care-planner';
import { ShelterProfile } from '@/components/shelter-profile';
import {
  DonationBalance,
  ExpenseTransactions,
  SpendingBreakdown,
} from '@/components/donation-spending';
import { type DemoExpense } from '@/lib/donation-spending';
import { WORKBOOK_GIFT_ID } from '@/lib/workbook-transactions';
import { useStaffLedger } from '@/hooks/use-staff-ledger';
import { projectDonor } from '@/lib/staff-portal';
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
  giftAllocation,
  SHARED_CARE_ID,
  kronor,
  profileDogs,
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
  const staffStore = useStaffLedger();
  const ledger = staffStore.base;
  const { gifts } = ledger;
  const donorView = projectDonor(staffStore.staff, ledger);
  const { expenses, spending } = donorView;
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [donationOpen, setDonationOpen] = useState(false);
  const [fullImpact, setFullImpact] = useState(true);
  const [previewActive, setPreviewActive] = useState(false);
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
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch {
      setSessionOnly(true);
    }
  }, [profile, ready]);

  const dog = profileDogs.find((item) => item.id === selectedId)!;
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
    setPreviewActive(false);
    setBreakdownOpen(false);
    setSelectedId(expense.dogId);
    setReplay({ expense, key: ++replayCounter.current });
  }
  function closeDonationToShelter(preview = false) {
    setPreviewActive(preview);
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

  async function donate() {
    if (!ready || !staffStore.ready || staffStore.busy || draftOre === null)
      return;
    if (frequency === 'monthly') {
      setProfile((current) => ({
        ...current,
        monthlyPlan: { amountOre: draftOre, careId, startDate },
      }));
      setNotice(
        'Monthly forecast saved to your profile. No payments or automatic charges are scheduled.',
      );
      closeDonationToShelter(true);
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
    const failure = await staffStore.updateBase((current) => ({
      gifts: [...current.gifts, gift],
      expenses: current.expenses,
    }));
    if (failure) {
      setNotice(failure);
      return;
    }
    setReplay(null);
    setNotice(
      `${kronor(draftOre)} SEK donated and pending. Staff receipts will record how it is used.`,
    );
    setSelectedId(recipients[0]);
    setDraftAmount('');
    setTimelineDay(0);
    setStartDate(new Date().toISOString().slice(0, 10));
    closeDonationToShelter();
  }

  return (
    <DogCareProvider
      expenses={expenses}
      externalEvents={donorView.events}
      onReplay={replayExpense}
    >
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
          <StaffCalendarButton />
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
                        setPreviewActive(false);
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
                        onPreview={() => closeDonationToShelter(true)}
                        ready={ready && staffStore.ready && !staffStore.busy}
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
                    transactions={donorView.transactions}
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
                      onSelectDog={selectDog}
                    />
                  ) : (
                    <div className="shelter-scene-anchor">
                      <VirtualShelter
                        funding={funding}
                        residentIds={residentIds}
                        previewIds={previewIds}
                        previewActive={previewActive}
                        onExitPreview={() => setPreviewActive(false)}
                        projection={projection}
                        confirmed={confirmedScene && !fullImpact}
                        fullImpact={fullImpact}
                        onFullImpact={setFullImpact}
                        shelterName={profile.shelterName}
                        onSelectDog={selectDog}
                        replay={replay}
                        onExitReplay={() => setReplay(null)}
                      >
                        {previewActive && (
                          <CareTimeline
                            projection={projection}
                            startDate={startDate}
                            onDay={(day) => {
                              setReplay(null);
                              setTimelineDay(day);
                            }}
                          />
                        )}
                      </VirtualShelter>
                    </div>
                  )}
                </div>
              </div>

              <div
                className="donation-receipt"
                aria-live="polite"
                role="status"
              >
                {notice || staffStore.error ? (
                  <>
                    <Check size={17} />
                    <span>{notice || staffStore.error}</span>
                  </>
                ) : (
                  <>
                    <span className="donation-status-dot" />
                    <span>
                      {amountOre
                        ? `${kronor(spending.usedOre)} SEK used · ${residentIds.length} shelter companions · ${kronor(spending.pendingOre)} SEK pending`
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

          <section className="donation-journey">
            <DogJourney key={dog.id} dog={dog} />
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
    </DogCareProvider>
  );
}
