'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Moon, Sun, X, Pause, Play, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDogCare } from '@/hooks/use-dog-care';
import { dogEventPhoto, liveDogPhoto } from '@/lib/care-calendar';
import { ShelterPhotoDialog } from '@/components/shelter-photo-updates';
import { DogName } from '@/components/dog-name';
import {
  expenseActivity,
  expenseCategories,
  expenseDateLabel,
  expenseHasTime,
  expenseHour,
  expenseLabel,
  type ExpenseReplay,
} from '@/lib/donation-spending';
import { workbookTransaction } from '@/lib/workbook-transactions';
import { kronor } from '@/lib/donation-shell';
import { carePlan, displayDate, type CareProjection } from '@/lib/care-impact';
import {
  activityLabel,
  dogActivity,
  isShelterNight,
  shelterActivityLayout,
  shelterClock,
} from '@/lib/shelter-activities';

export type ShelterCompanion = {
  key: string;
  profileId: string | null;
  name: string;
  breed: string;
  sprite: string;
  preview: boolean;
  careScheduled: boolean;
};

export function ShelterLifeScene({
  residentCount,
  motionPaused,
  onTogglePause,
  companions,
  projection,
  paused,
  onInspect,
  replay,
  onExitReplay,
  fullImpact,
  previewActive,
}: {
  residentCount: number;
  motionPaused: boolean;
  onTogglePause: () => void;
  companions: ShelterCompanion[];
  projection: CareProjection;
  paused: boolean;
  onInspect: (id: string, preview: boolean) => void;
  replay: ExpenseReplay | null;
  onExitReplay: () => void;
  fullImpact: boolean;
  previewActive: boolean;
}) {
  const { events, now } = useDogCare();
  const [photoEventId, setPhotoEventId] = useState<string | null>(null);
  const photoEvent =
    events.find(
      (event) =>
        event.id === photoEventId &&
        event.publishedAt &&
        event.photos.length > 0,
    ) ?? null;
  const viewport = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [clock, setClock] = useState<{ hour: number; minute: number } | null>(
    null,
  );
  const [reducedMotion, setReducedMotion] = useState(false);
  const [visible, setVisible] = useState(true);
  const [focused, setFocused] = useState(false);
  const [replayStep, setReplayStep] = useState(0);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(element);
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onPreference = () => setReducedMotion(preference.matches);
    const onVisibility = () => setVisible(!document.hidden);
    onPreference();
    onVisibility();
    preference.addEventListener('change', onPreference);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      observer.disconnect();
      preference.removeEventListener('change', onPreference);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
  useEffect(() => {
    setReplayStep(0);
  }, [replay?.key]);
  useEffect(() => {
    // Read wall time rather than incrementing a simulation counter. Re-sync
    // immediately on tab return, including sleep/wake and clock adjustments.
    if (!visible) return;
    const sync = () => {
      const next = shelterClock();
      setClock((current) =>
        current?.hour === next.hour && current.minute === next.minute
          ? current
          : next,
      );
    };
    sync();
    const timer = window.setInterval(sync, 1000);
    return () => window.clearInterval(timer);
  }, [visible]);
  useEffect(() => {
    if (!replay || replayStep >= 2 || paused || !visible || focused) return;
    if (reducedMotion) {
      setReplayStep(2);
      return;
    }
    const timer = window.setTimeout(
      () => setReplayStep((step) => step + 1),
      replayStep === 0 ? 600 : 1500,
    );
    return () => window.clearTimeout(timer);
  }, [replay?.key, replayStep, paused, visible, focused, reducedMotion]);
  const hour = replay ? expenseHour(replay.expense) : (clock?.hour ?? 12);
  const night = isShelterNight(hour);
  const sceneDate = replay
    ? new Date(replay.expense.recordedAt)
    : now
      ? new Date(now)
      : null;
  const dateZone =
    replay && !expenseHasTime(replay.expense) ? 'UTC' : 'Europe/Stockholm';
  const liveView = !replay && !previewActive;
  const livePhotos = companions.map((dog) =>
    liveView && dog.profileId
      ? liveDogPhoto(events, dog.profileId, now)
      : undefined,
  );
  const activities = companions.map((dog, index) =>
    replay
      ? dog.profileId === replay.expense.dogId && replayStep > 0
        ? expenseActivity(replay.expense)
        : night
          ? ('sleep' as const)
          : ('home' as const)
      : liveView
        ? (livePhotos[index]?.activity ?? ('home' as const))
        : dogActivity(index, hour, projection.careId, dog.careScheduled),
  );
  const eventPhotos = companions.map((dog, index) => {
    if (liveView) return livePhotos[index];
    if (!dog.profileId || previewActive) return undefined;
    if (replay && (replay.expense.dogId !== dog.profileId || replayStep < 2))
      return undefined;
    return dogEventPhoto(events, dog.profileId, now, replay?.expense.id);
  });
  const layout = shelterActivityLayout(
    width,
    companions.length,
    activities,
    eventPhotos.some(Boolean) ? 132 : 108,
  );
  const replayIndex = replay
    ? companions.findIndex((dog) => dog.profileId === replay.expense.dogId)
    : -1;
  const replayPosition =
    replayIndex >= 0
      ? layout.position(replayIndex, activities[replayIndex])
      : null;
  useEffect(() => {
    const element = viewport.current;
    if (!replay || !replayPosition || !element) return;
    element.scrollTo({
      left: Math.max(0, replayPosition.x - element.clientWidth / 2 + 32),
      top: Math.max(0, replayPosition.y - element.clientHeight / 2 + 50),
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  }, [
    replay?.key,
    replayStep,
    replayPosition?.x,
    replayPosition?.y,
    reducedMotion,
  ]);
  const plan = carePlan(projection.careId);

  return (
    <>
      <div
        className="shelter-life"
        data-night={night}
        data-paused={
          paused || reducedMotion || !visible || focused || !!photoEvent
        }
      >
        {replay && (
          <div className="shelter-expense-replay" role="status">
            <img
              src={
                expenseCategories.find(
                  (category) => category.id === replay.expense.category,
                )!.asset
              }
              alt=""
              width="42"
              height="42"
            />
            <div>
              <strong>
                {
                  companions.find(
                    (dog) => dog.profileId === replay.expense.dogId,
                  )?.name
                }{' '}
                · {kronor(replay.expense.amountOre)} SEK used
              </strong>
              <span>
                {expenseLabel(replay.expense)} · Illustrated replay
                {workbookTransaction(replay.expense) &&
                  ' · Simulated dog match'}
              </span>
              <time dateTime={replay.expense.recordedAt}>
                {expenseDateLabel(replay.expense)}
              </time>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={onExitReplay}
              aria-label="Close replay and return to daily routine"
            >
              <X size={17} /> Back to routine
            </Button>
          </div>
        )}
        <div className="shelter-life-clock">
          <span className="shelter-clock-date-block">
            {night ? <Moon size={24} /> : <Sun size={24} />}
            <span className="shelter-clock-calendar">
              <time dateTime={sceneDate?.toISOString()}>
                <strong>
                  {sceneDate
                    ? new Intl.DateTimeFormat('en-GB', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        timeZone: dateZone,
                      }).format(sceneDate)
                    : 'Today at the shelter'}
                </strong>
                {sceneDate && (
                  <small>
                    {new Intl.DateTimeFormat('en-GB', {
                      year: 'numeric',
                      timeZone: dateZone,
                    }).format(sceneDate)}
                  </small>
                )}
              </time>
              <span className="shelter-clock-time">
                {replay && !expenseHasTime(replay.expense)
                  ? 'Daytime illustration · time not supplied'
                  : sceneDate
                    ? new Intl.DateTimeFormat('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hourCycle: 'h23',
                        timeZone: 'Europe/Stockholm',
                      }).format(sceneDate)
                    : '--:--'}
                {' · '}
                {night ? 'A quiet night' : 'A day at the shelter'}
              </span>
            </span>
          </span>
          <span className="shelter-clock-companions" aria-live="polite">
            <i aria-hidden="true" /> {residentCount} shelter companions
          </span>
          <span>
            <Button
              variant="outline"
              className="virtual-motion-toggle"
              onClick={onTogglePause}
              aria-label={
                motionPaused
                  ? 'Resume shelter animation'
                  : 'Pause shelter animation'
              }
              aria-pressed={motionPaused}
            >
              {motionPaused ? <Play size={16} /> : <Pause size={16} />}
            </Button>
            {replay ? 'Expense replay' : 'Live clock · Stockholm'}
          </span>
        </div>
        <div
          className="shelter-life-viewport"
          ref={viewport}
          tabIndex={0}
          onFocusCapture={() => setFocused(true)}
          onBlurCapture={(event) => {
            if (
              !event.currentTarget.contains(event.relatedTarget as Node | null)
            )
              setFocused(false);
          }}
          aria-label="Shelter activity scene. Scroll to explore every activity; choose a dog to see its real profile."
        >
          <div
            className="shelter-life-scene"
            style={{
              width: layout.width,
              height: layout.height,
            }}
          >
            <div
              className="shelter-home"
              style={{ height: layout.activityTop - 20 }}
            >
              <img
                src="/shelters/pixel-big-kennel.png"
                width="540"
                height="300"
                alt="A large cozy communal dog kennel"
              />
            </div>
            <div
              className="shelter-activity-row-label"
              style={{ top: layout.activityTop - 24 }}
            >
              {liveView
                ? 'Live updates'
                : replay
                  ? 'Expense replay'
                  : 'Donation preview'}
            </div>
            {layout.stations.map((station) => {
              const count = activities.filter(
                (activity) => activity === station.id,
              ).length;
              const selected = replay
                ? station.id === expenseActivity(replay.expense)
                : previewActive &&
                  station.id === projection.careId &&
                  projection.totalUnits > 0;
              return (
                <div
                  key={station.id}
                  className="shelter-activity-station"
                  data-occupied={count > 0}
                  data-funded={selected}
                  style={{
                    left: station.x,
                    top: station.y,
                    width: station.width - 8,
                    height: eventPhotos.some(Boolean)
                      ? layout.height - layout.activityTop - 12
                      : undefined,
                  }}
                >
                  <strong>{station.label}</strong>
                  <span>
                    {count
                      ? liveView
                        ? `${count} ${count === 1 ? 'photo update' : 'photo updates'}`
                        : `${count} ${count === 1 ? 'dog' : 'dogs'} here`
                      : liveView
                        ? 'No recent photo'
                        : night
                          ? 'Closed for the night'
                          : 'Ready for a visit'}
                  </span>
                  <img src={station.asset} width="126" height="126" alt="" />
                  {selected && (
                    <small>
                      {replay
                        ? `${kronor(replay.expense.amountOre)} SEK used`
                        : `${projection.totalUnits} ${plan.unit} ${fullImpact ? 'provided in this estimate' : 'planned'}`}
                    </small>
                  )}
                </div>
              );
            })}
            {companions.map((dog, index) => {
              const activity = activities[index];
              const position = layout.position(index, activity);
              const replaying = replay?.expense.dogId === dog.profileId;
              const label =
                activity === 'home' || activity === 'sleep'
                  ? null
                  : replaying && replayStep === 1
                    ? 'On the way'
                    : activityLabel(activity);
              const body = (
                <>
                  {activity === 'sleep' && (
                    <span className="shelter-sleep-z" aria-hidden="true">
                      <i>z</i>
                      <i>z</i>
                      <i>Z</i>
                    </span>
                  )}
                  <img
                    src={dog.sprite}
                    width="64"
                    height="64"
                    alt=""
                    draggable="false"
                  />
                  <span className="shelter-life-dog-name">
                    {dog.profileId ? <DogName name={dog.name} /> : dog.name}
                  </span>
                  {label && (
                    <span className="shelter-life-dog-action">{label}</span>
                  )}
                </>
              );
              return (
                <div
                  key={dog.key}
                  className="shelter-life-dog-position"
                  data-activity={activity}
                  data-replaying={!!replay && replaying}
                  data-replay-background={!!replay && !replaying}
                  style={
                    {
                      transform: `translate(${position.x}px, ${position.y}px)`,
                      zIndex: 3 + Math.floor(position.y),
                      '--dog-step-delay': `${-(index % 4) * 0.2}s`,
                    } as CSSProperties
                  }
                >
                  {dog.profileId ? (
                    <button
                      type="button"
                      className="shelter-life-dog"
                      data-preview={dog.preview}
                      onClick={() => onInspect(dog.profileId!, dog.preview)}
                      aria-label={`${dog.name}, ${dog.breed}${label ? `, ${label}` : ''}${dog.preview ? ', care preview' : ''}${eventPhotos[index] ? ', event photo available' : ''}. Open real profile.`}
                    >
                      {body}
                    </button>
                  ) : (
                    <div
                      className="shelter-life-dog"
                      data-preview={dog.preview}
                      aria-label={`Illustrative future dog${label ? `, ${label}` : ''}. Not matched to a real profile.`}
                    >
                      {body}
                    </div>
                  )}
                  {eventPhotos[index] && (
                    <button
                      type="button"
                      className="shelter-life-dog-photo"
                      onClick={() => setPhotoEventId(eventPhotos[index]!.id)}
                      aria-label={`View ${dog.name}’s ${activityLabel(activity).toLowerCase()} photo`}
                    >
                      <Camera size={13} aria-hidden="true" /> Photo
                    </button>
                  )}
                </div>
              );
            })}
            {!companions.length && (
              <p className="shelter-life-empty">
                Choose a care amount to bring dogs into your shelter.
              </p>
            )}
          </div>
        </div>
        <div className="shelter-life-caption">
          <span>
            {replay
              ? 'Expense replay · does not change your balance'
              : !previewActive
                ? 'Staff photos guide each activity · updates last 1–2 hours'
                : fullImpact
                  ? 'Full-impact estimate · routines follow Stockholm time'
                  : `Daily care forecast · ${displayDate(projection.date)} · real-time routine`}
          </span>
          {width < 760 && (
            <span>Scroll sideways to explore all activities →</span>
          )}
        </div>
      </div>
      <ShelterPhotoDialog
        event={photoEvent}
        onClose={() => setPhotoEventId(null)}
      />
    </>
  );
}
