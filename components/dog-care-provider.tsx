'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { CalendarDays } from 'lucide-react';
import {
  DogCareContext,
  useDogCare,
  type DogProfileMode,
} from '@/hooks/use-dog-care';
import {
  CARE_CALENDAR_KEY,
  readCareCalendar,
  validCareUpdate,
  carePhotoLinkError,
  type CareUpdate,
} from '@/lib/care-calendar';
import type { DemoExpense } from '@/lib/donation-spending';
import { profileDogs } from '@/lib/donation-shell';
import { DogProfileDialog } from '@/components/dog-profile-dialog';
import { StaffCareCalendar } from '@/components/staff-care-calendar';

export function DogCareProvider({
  children,
  expenses,
  externalEvents = [],
  onReplay,
}: {
  children: ReactNode;
  expenses: DemoExpense[];
  externalEvents?: CareUpdate[];
  onReplay: (expense: DemoExpense) => void;
}) {
  const [events, setEvents] = useState<CareUpdate[]>([]);
  const [now, setNow] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [inspected, setInspected] = useState<{
    id: string;
    mode: DogProfileMode;
  } | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    const read = () => {
      try {
        setEvents(readCareCalendar(localStorage.getItem(CARE_CALENDAR_KEY)));
        setReady(true);
        setError('');
      } catch {
        setReady(false);
        setError(
          'The local calendar is unavailable. Existing data has been kept.',
        );
      }
    };
    const sync = () => {
      setNow(Date.now());
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === CARE_CALENDAR_KEY || event.key === null) read();
    };
    const onVisible = () => {
      if (!document.hidden) {
        sync();
        read();
      }
    };
    read();
    sync();
    const timer = window.setInterval(() => {
      if (!document.hidden) sync();
    }, 1000);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const persist = (change: (latest: CareUpdate[]) => CareUpdate[]) => {
    if (!ready) return 'Calendar storage is unavailable.';
    try {
      const next = change(
        readCareCalendar(localStorage.getItem(CARE_CALENDAR_KEY)),
      );
      const serialized = JSON.stringify(next);
      readCareCalendar(serialized);
      if (serialized.length > 3_500_000)
        return 'The local photo storage is full. Remove a photo or use an HTTPS photo link.';
      localStorage.setItem(CARE_CALENDAR_KEY, serialized);
      setEvents(next);
      setNow(Date.now());
      setError('');
      return null;
    } catch {
      return 'Could not save this update. Your existing calendar has been kept.';
    }
  };

  return (
    <DogCareContext.Provider
      value={{
        events: [...events, ...externalEvents],
        expenses,
        now,
        ready,
        error,
        inspected,
        openDog: (id, mode = 'supported') => {
          if (profileDogs.some((dog) => dog.id === id))
            setInspected({ id, mode });
        },
        closeDog: () => setInspected(null),
        openCalendar: () => setCalendarOpen(true),
        saveEvent: (event) => {
          if (event.id.startsWith('staff:'))
            return 'Manage receipt photos in the staff workspace.';
          if (!validCareUpdate(event))
            return 'Check the dog, activity, dates and photos.';
          if (event.publishedAt && event.photos.length === 0)
            return 'A published activity needs a staff photo. Save it as a draft until a photo is available.';
          if (event.completedAt && Date.parse(event.completedAt) > Date.now())
            return 'An activity can only be marked completed after it happens.';
          const linkError = carePhotoLinkError(event, expenses);
          if (linkError) return linkError;
          return persist((latest) => [
            ...latest.filter((item) => item.id !== event.id),
            event,
          ]);
        },
        deleteEvent: (id) =>
          id.startsWith('staff:')
            ? 'Manage receipt photos in the staff workspace.'
            : persist((latest) => latest.filter((event) => event.id !== id)),
        replayExpense: (expense) => {
          setInspected(null);
          onReplay(expense);
        },
      }}
    >
      {children}
      <DogProfileDialog />
      <StaffCareCalendar open={calendarOpen} onOpenChange={setCalendarOpen} />
    </DogCareContext.Provider>
  );
}

export function StaffCalendarButton() {
  return (
    <a
      href="/staff"
      target="_blank"
      rel="noreferrer"
      className="staff-calendar-launch"
    >
      <CalendarDays size={17} /> Staff workspace
    </a>
  );
}
