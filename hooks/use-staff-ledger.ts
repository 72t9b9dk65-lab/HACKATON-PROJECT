'use client';

import { useEffect, useState } from 'react';
import {
  GIVING_STORAGE_KEY,
  readGivingLedger,
  type GivingLedger,
} from '@/lib/donation-spending';
import { SHELL_STORAGE_KEY } from '@/lib/donation-shell';
import { workbookLedger } from '@/lib/workbook-transactions';
import {
  PROFILE_STORAGE_KEY,
  defaultShelterProfile,
  readShelterProfile,
} from '@/lib/shelter-profile';
import {
  donorPortfolios,
  emptyStaffLedger,
  readStaffLedger,
  STAFF_STORAGE_KEY,
  type StaffLedger,
} from '@/lib/staff-portal';

const changedEvent = 'hundstallet:portfolios-updated';
function readCurrent() {
  const staff = readStaffLedger(localStorage.getItem(STAFF_STORAGE_KEY));
  const base = readGivingLedger(
    localStorage.getItem(GIVING_STORAGE_KEY),
    localStorage.getItem(SHELL_STORAGE_KEY),
  );
  donorPortfolios(staff, base);
  return {
    staff,
    base,
    personalName: readShelterProfile(localStorage.getItem(PROFILE_STORAGE_KEY))
      .name,
  };
}
export function useStaffLedger() {
  const [snapshot, setSnapshot] = useState(() => ({
    staff: emptyStaffLedger(),
    base: workbookLedger(),
    personalName: defaultShelterProfile.name,
  }));
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const read = () => {
      try {
        setSnapshot(readCurrent());
        setReady(true);
        setError('');
      } catch (cause) {
        setReady(false);
        setError(
          cause instanceof Error
            ? cause.message
            : 'Local records are unavailable.',
        );
      }
    };
    const storage = (event: StorageEvent) => {
      if (
        !event.key ||
        [STAFF_STORAGE_KEY, GIVING_STORAGE_KEY, PROFILE_STORAGE_KEY].includes(
          event.key,
        )
      )
        read();
    };
    const visible = () => {
      if (!document.hidden) read();
    };
    read();
    window.addEventListener('storage', storage);
    window.addEventListener(changedEvent, read);
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.removeEventListener('storage', storage);
      window.removeEventListener(changedEvent, read);
      document.removeEventListener('visibilitychange', visible);
    };
  }, []);

  async function commit(
    kind: 'staff' | 'base',
    update: (
      current: ReturnType<typeof readCurrent>,
    ) => StaffLedger | GivingLedger,
  ) {
    if (!ready || busy) return 'The local records are not ready yet.';
    setBusy(true);
    try {
      if (!navigator.locks)
        throw new Error(
          'Use a browser with local locking support to update shared donor balances.',
        );
      await navigator.locks.request('hundstallet-portfolio-ledger', () => {
        const current = readCurrent();
        const next = update(current);
        const raw = JSON.stringify(next);
        if (kind === 'staff') {
          const validated = readStaffLedger(raw);
          donorPortfolios(validated, current.base);
          if (raw.length > 4_000_000)
            throw new Error(
              'Local storage is full. Use smaller receipt and photo files. Nothing was charged.',
            );
        } else {
          donorPortfolios(current.staff, next as GivingLedger);
        }
        // One write commits all receipt lines and allocations together. A quota
        // failure leaves the previous receipt list and every wallet unchanged.
        localStorage.setItem(
          kind === 'staff' ? STAFF_STORAGE_KEY : GIVING_STORAGE_KEY,
          raw,
        );
        window.dispatchEvent(new Event(changedEvent));
      });
      return null;
    } catch (cause) {
      return cause instanceof Error
        ? cause.message
        : 'Could not save. Existing records were kept.';
    } finally {
      setBusy(false);
    }
  }
  return {
    ...snapshot,
    ready,
    error,
    busy,
    updateStaff: (
      change: (staff: StaffLedger, base: GivingLedger) => StaffLedger,
    ) => commit('staff', ({ staff, base }) => change(staff, base)),
    updateBase: (change: (base: GivingLedger) => GivingLedger) =>
      commit('base', ({ base }) => change(base)),
  };
}
