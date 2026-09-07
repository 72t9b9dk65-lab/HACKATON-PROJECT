'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Moon, Sun, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogTrigger } from '@/components/ui/dialog';
import { DogName } from '@/components/dog-name';
import { DogNeedBadge } from '@/components/dog-need-badge';
import { dogNeeds } from '@/lib/dog-needs';
import {
  expenseActivity,
  expenseCategories,
  expenseHour,
  type ExpenseReplay,
} from '@/lib/donation-spending';
import { kronor } from '@/lib/donation-shell';
import { carePlan, displayDate, type CareProjection } from '@/lib/care-impact';
import {
  activityLabel,
  dogActivity,
  isShelterNight,
  shelterActivityLayout,
  SHELTER_HOUR_MS,
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
  companions,
  projection,
  paused,
  onInspect,
  replay,
  onExitReplay,
}: {
  companions: ShelterCompanion[];
  projection: CareProjection;
  paused: boolean;
  onInspect: (id: string, preview: boolean) => void;
  replay: ExpenseReplay | null;
  onExitReplay: () => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [hour, setHour] = useState(8);
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
    setHour(8);
  }, [projection.date]);
  useEffect(() => {
    setReplayStep(0);
    setHour(replay ? expenseHour(replay.expense) : 8);
  }, [replay?.key]);
  useEffect(() => {
    if (paused || reducedMotion || !visible || focused || replay) return;
    const timer = window.setInterval(
      () => setHour((current) => (current + 1) % 24),
      SHELTER_HOUR_MS,
    );
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion, visible, focused, replay]);
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
  const night = isShelterNight(hour);
  const activities = companions.map((dog, index) =>
    replay
      ? dog.profileId === replay.expense.dogId && replayStep > 0
        ? expenseActivity(replay.expense)
        : night
          ? ('sleep' as const)
          : ('home' as const)
      : dogActivity(index, hour, projection.careId, dog.careScheduled),
  );
  const layout = shelterActivityLayout(width, companions.length, activities);
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
  const atHome = activities.filter(
    (activity) => activity === 'home' || activity === 'sleep',
  ).length;
  const plan = carePlan(projection.careId);

  return (
    <div
      className="shelter-life"
      data-night={night}
      data-paused={paused || reducedMotion || !visible || focused}
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
                companions.find((dog) => dog.profileId === replay.expense.dogId)
                  ?.name
              }{' '}
              · {kronor(replay.expense.amountOre)} SEK used
            </strong>
            <span>
              {
                expenseCategories.find(
                  (category) => category.id === replay.expense.category,
                )!.label
              }{' '}
              · Illustrated replay
            </span>
            <time dateTime={replay.expense.recordedAt}>
              {new Intl.DateTimeFormat('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Stockholm',
              }).format(new Date(replay.expense.recordedAt))}{' '}
              · Stockholm
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
        <span>
          {night ? <Moon size={18} /> : <Sun size={18} />}{' '}
          <strong>
            {String(hour).padStart(2, '0')}:
            {replay
              ? new Intl.DateTimeFormat('en-GB', {
                  minute: '2-digit',
                  timeZone: 'Europe/Stockholm',
                })
                  .format(new Date(replay.expense.recordedAt))
                  .padStart(2, '0')
              : '00'}
          </strong>{' '}
          {night ? 'A quiet night' : 'A day at the shelter'}
        </span>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setHour(night ? 8 : 20)}
          disabled={!!replay}
          aria-label={
            night
              ? 'Preview daytime in the shelter'
              : 'Preview nighttime in the shelter'
          }
        >
          {night ? <Sun size={16} /> : <Moon size={16} />}{' '}
          {night ? 'Day view' : 'Night view'}
        </Button>
      </div>
      <div
        className="shelter-life-viewport"
        ref={viewport}
        tabIndex={0}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            setFocused(false);
        }}
        aria-label="Shelter activity scene. Scroll to explore every activity; choose a dog to see its real profile."
      >
        <div
          className="shelter-life-scene"
          style={{ width: layout.width, height: layout.height }}
        >
          <div
            className="shelter-home"
            style={{ height: layout.activityTop - 20 }}
          >
            <div className="shelter-home-title">
              <strong>The big kennel</strong>
              <span>
                {atHome} {night ? 'sleeping' : 'resting'} ·{' '}
                {night ? 'Sweet dreams' : 'A place to feel at home'}
              </span>
            </div>
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
            A little care, all day long
          </div>
          {layout.stations.map((station) => {
            const count = activities.filter(
              (activity) => activity === station.id,
            ).length;
            const selected = replay
              ? station.id === replay.expense.category
              : station.id === projection.careId && projection.totalUnits > 0;
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
                }}
              >
                <strong>{station.label}</strong>
                <span>
                  {count
                    ? `${count} ${count === 1 ? 'dog' : 'dogs'} here`
                    : night
                      ? 'Closed for the night'
                      : 'Ready for a visit'}
                </span>
                <img src={station.asset} width="126" height="126" alt="" />
                {selected && (
                  <small>
                    {replay
                      ? `${kronor(replay.expense.amountOre)} SEK used`
                      : `${projection.totalUnits} ${plan.unit} planned`}
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
              replaying && replayStep === 1
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
                {dog.profileId && (
                  <span className="shelter-life-need-badges">
                    {dogNeeds(dog.profileId).map((need) => (
                      <DogNeedBadge key={need} need={need} />
                    ))}
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
                <span className="shelter-life-dog-action">{label}</span>
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
                  <DialogTrigger
                    render={<button type="button" />}
                    className="shelter-life-dog"
                    data-preview={dog.preview}
                    onClick={() => onInspect(dog.profileId!, dog.preview)}
                    aria-label={`${dog.name}, ${dog.breed}. ${label}${dog.preview ? ', care preview' : ''}. Open real profile.`}
                  >
                    {body}
                  </DialogTrigger>
                ) : (
                  <div
                    className="shelter-life-dog"
                    data-preview={dog.preview}
                    aria-label={`Illustrative future dog. ${label}. Not matched to a real profile.`}
                  >
                    {body}
                  </div>
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
            : `Daily routine preview · ${displayDate(projection.date)}`}
        </span>
        {width < 760 && (
          <span>Scroll sideways to explore all activities →</span>
        )}
      </div>
    </div>
  );
}
