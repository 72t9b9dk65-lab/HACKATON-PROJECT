'use client';
/* oxlint-disable next/no-img-element -- Staff photo uploads and existing pixel assets use native images without a remote optimization service. */

import { useState } from 'react';
import {
  ArrowUpRight,
  Camera,
  Clock3,
  MapPin,
  Play,
  Heart,
  ChevronDown,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel';
import { DogPortrait } from '@/components/dog-portrait';
import { DogName } from '@/components/dog-name';
import { useDogCare } from '@/hooks/use-dog-care';
import {
  calendarActivities,
  careDateLabel,
  careUpdateStatus,
  dogCareBasket,
  linkedCareExpense,
  visibleCareUpdates,
  type CareUpdate,
} from '@/lib/care-calendar';
import {
  expenseCategories,
  expenseDateLabel,
  expenseLabel,
  type DemoExpense,
  type ExpenseCategory,
} from '@/lib/donation-spending';
import { kronor, profileDogs, type ProfileDog } from '@/lib/donation-shell';

export function CarePhoto({ src, caption }: { src: string; caption: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className="care-update-photo">
      {failed ? (
        <div className="care-photo-unavailable">
          <Camera size={24} /> Photo unavailable
        </div>
      ) : (
        <img
          src={src}
          alt={caption || 'Photo attached to this care update'}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

export function DogProfileDialog() {
  const { inspected, closeDog } = useDogCare();
  const dog = profileDogs.find((item) => item.id === inspected?.id);
  return (
    <Dialog
      open={!!dog}
      onOpenChange={(open) => {
        if (!open) closeDog();
      }}
    >
      {dog && (
        <DialogContent className="donation-shell dog-profile-dialog">
          <DogProfileContent key={dog.id} dog={dog} />
        </DialogContent>
      )}
    </Dialog>
  );
}

function DogProfileContent({ dog }: { dog: ProfileDog }) {
  const { expenses, inspected, events, now } = useDogCare();
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const basket = dogCareBasket(expenses, dog.id);
  const total = basket.reduce((sum, item) => sum + item.amountOre, 0);
  const updates = visibleCareUpdates(events, now).filter(
    (event) => event.dogId === dog.id,
  );
  const next = updates
    .filter((event) => Date.parse(event.startsAt) > now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
  const selected = basket.find((item) => item.id === category);
  return (
    <>
      <div className="dog-profile-top">
        <DogPortrait dog={dog} />
        <div className="dog-profile-intro">
          <span className="donation-eyebrow">
            {inspected?.mode === 'preview'
              ? 'DONATION PREVIEW'
              : total > 0
                ? 'PART OF YOUR SHELTER'
                : 'MEET YOUR NEXT FRIEND'}
          </span>
          <DialogTitle>
            <DogName name={dog.name} />
          </DialogTitle>
          <p className="dog-profile-breed">
            {dog.breed} · {dog.group ? 'Group profile' : dog.age}
          </p>
          <p className="dog-profile-location">
            <MapPin size={16} /> {dog.location} <span>· {dog.status}</span>
          </p>
          <DialogDescription>{dog.description}</DialogDescription>
          <a
            className="dog-profile-official"
            href={dog.source}
            target="_blank"
            rel="noreferrer"
          >
            Full profile on Hundstallet <ArrowUpRight size={17} />
          </a>
        </div>
      </div>
      {inspected?.mode === 'preview' && (
        <p className="dog-profile-preview">
          A possible care recipient for your proposed gift. Preview amounts are
          not included in this dog’s care basket.
        </p>
      )}
      <div className="dog-profile-middle">
        <section
          className="dog-care-basket-section"
          aria-label={`Your care basket for ${dog.name}`}
        >
          <div className="dog-care-section-heading">
            <h3>Your care basket</h3>
            <span>
              <strong>{kronor(total)}</strong> SEK used
            </span>
          </div>
          <div
            className="dog-care-basket"
            aria-label="Goods and services you contributed to"
          >
            {basket.length ? (
              basket.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() =>
                    setCategory(category === item.id ? null : item.id)
                  }
                  aria-pressed={category === item.id}
                  aria-label={`${item.label}, ${kronor(item.amountOre)} SEK. Show these transactions.`}
                  title={item.label}
                >
                  <img src={item.asset} alt="" width="68" height="68" />
                  <strong>
                    {kronor(item.amountOre)} <small>SEK</small>
                  </strong>
                </button>
              ))
            ) : (
              <div className="dog-basket-empty">
                <Heart size={28} />
                <strong>A little care starts here</strong>
                <span>No recorded spending for {dog.name} yet.</span>
              </div>
            )}
          </div>
          <p className="dog-basket-caption" aria-live="polite">
            {selected
              ? `${selected.label} · ${selected.count} recorded ${selected.count === 1 ? 'expense' : 'expenses'}`
              : 'Every item comes from your recorded care expenses.'}
          </p>
          {selected && (
            <Button variant="ghost" onClick={() => setCategory(null)}>
              Show all care
            </Button>
          )}
        </section>
        <section className="dog-profile-at-a-glance">
          <h3>A little more about {dog.name}</h3>
          <dl>
            <div>
              <dt>Home shelter</dt>
              <dd>{dog.location}</dd>
            </div>
            <div>
              <dt>Food</dt>
              <dd>{dog.food}</dd>
            </div>
            <div>
              <dt>Profile status</dt>
              <dd>{dog.status}</dd>
            </div>
            <div>
              <dt>Your contribution</dt>
              <dd>
                {basket.reduce((sum, item) => sum + item.count, 0)} recorded
                care expenses
              </dd>
            </div>
          </dl>
          <div className="dog-next-update">
            <Clock3 size={20} />
            <div>
              <strong>
                {next ? 'Next on the calendar' : 'The next little moment'}
              </strong>
              <p>
                {next
                  ? next.title
                  : 'New care updates and photos will appear here when the shelter adds them.'}
              </p>
              {next && (
                <time dateTime={next.startsAt}>
                  {careDateLabel(next.startsAt)} · Stockholm
                </time>
              )}
            </div>
          </div>
        </section>
      </div>
      <DogJourney
        key={`${dog.id}-${category ?? 'all'}`}
        dog={dog}
        category={category}
      />
      <p className="dog-profile-provenance">
        Real profiles and undated photos from Hundstallet. Spending and calendar
        updates in this prototype are demo data.
      </p>
    </>
  );
}

type JourneyEntry = {
  id: string;
  at: string;
  event?: CareUpdate;
  expense?: DemoExpense;
};

export function DogJourney({
  dog,
  category = null,
}: {
  dog: ProfileDog;
  category?: ExpenseCategory | null;
}) {
  const { events, expenses, now, replayExpense } = useDogCare();
  const [limit, setLimit] = useState(6);
  const published = visibleCareUpdates(events, now).filter(
    (entry) => entry.dogId === dog.id,
  );
  const past = published.filter((entry) => Date.parse(entry.startsAt) <= now);
  const linkedIds = new Set(
    past.map((entry) => linkedCareExpense(entry, expenses)?.id).filter(Boolean),
  );
  const history: JourneyEntry[] = [
    ...past.map((event) => ({
      id: event.id,
      at: event.startsAt,
      event,
      expense: linkedCareExpense(event, expenses),
    })),
    ...expenses
      .filter(
        (expense) => expense.dogId === dog.id && !linkedIds.has(expense.id),
      )
      .map((expense) => ({ id: expense.id, at: expense.recordedAt, expense })),
  ]
    .filter((entry) => !category || entry.expense?.category === category)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const upcoming = published
    .filter((entry) => Date.parse(entry.startsAt) > now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return (
    <section
      className="dog-journey-timeline"
      aria-label={`${dog.name}’s care timeline`}
    >
      <div className="dog-care-section-heading">
        <h3>{dog.name}’s journey</h3>
        <span className="care-live-label">
          <i /> Updates from the care calendar
        </span>
      </div>
      {!category && (
        <>
          <Carousel
            className="dog-profile-photos"
            opts={{ align: 'start', containScroll: 'trimSnaps' }}
          >
            <div className="dog-profile-photo-heading">
              <p className="care-photo-source">
                From {dog.name}’s official profile · photos are undated
              </p>
              <div className="donation-carousel-controls">
                <CarouselPrevious />
                <CarouselNext />
              </div>
            </div>
            <CarouselContent>
              {dog.photos.map((photo) => (
                <CarouselItem
                  className="dog-profile-photo-item"
                  key={photo.src}
                >
                  <CarePhoto {...photo} />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </>
      )}
      {!category && upcoming.length > 0 && (
        <details className="dog-upcoming">
          <summary>
            <Clock3 size={16} /> {upcoming.length} upcoming{' '}
            {upcoming.length === 1 ? 'moment' : 'moments'}{' '}
            <ChevronDown size={16} />
          </summary>
          <ol>
            {upcoming.map((entry) => (
              <li key={entry.id}>
                <time dateTime={entry.startsAt}>
                  {careDateLabel(entry.startsAt)}
                </time>
                <strong>{entry.title}</strong>
                <span>Planned · Stockholm</span>
              </li>
            ))}
          </ol>
        </details>
      )}
      <ol className="dog-care-history">
        {history.slice(0, limit).map(({ id, at, event, expense }) => {
          const activity = event
            ? calendarActivities.find((item) => item.id === event.activity)!
            : expenseCategories.find((item) => item.id === expense!.category)!;
          return (
            <li key={id}>
              <span className="care-history-dot">
                <img src={activity.asset} alt="" width="38" height="38" />
              </span>
              <article>
                <div className="care-history-meta">
                  <time dateTime={at}>
                    {event
                      ? `${careDateLabel(at)} · Stockholm`
                      : expenseDateLabel(expense!)}
                  </time>
                  <span>
                    {event
                      ? careUpdateStatus(event, now)
                      : 'Recorded demo expense'}
                  </span>
                </div>
                <div className="care-history-title">
                  <h4>{event?.title ?? expenseLabel(expense!)}</h4>
                  {expense && <strong>{kronor(expense.amountOre)} SEK</strong>}
                </div>
                {event?.note && <p>{event.note}</p>}
                {!!event?.photos.length && (
                  <div className="care-history-photos">
                    {event.photos.map((photo, index) => (
                      <CarePhoto
                        key={`${id}-${index}-${photo.src}`}
                        {...photo}
                      />
                    ))}
                  </div>
                )}
                {expense && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => replayExpense(expense)}
                  >
                    <Play size={14} /> Replay care moment
                  </Button>
                )}
              </article>
            </li>
          );
        })}
      </ol>
      {history.length === 0 && (
        <div className="care-history-empty">
          <Camera size={22} />
          <p>
            {category
              ? 'No updates for this care category yet.'
              : `No dated care moments yet. ${dog.name}’s photos and activities will collect here, update by update.`}
          </p>
        </div>
      )}
      {history.length > limit && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setLimit((value) => value + 12)}
        >
          Show more moments <ChevronDown size={16} />
        </Button>
      )}
    </section>
  );
}
