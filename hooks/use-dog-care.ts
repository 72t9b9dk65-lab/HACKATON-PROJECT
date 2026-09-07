'use client';

import { createContext, useContext } from 'react';
import type { CareUpdate } from '@/lib/care-calendar';
import type { DemoExpense } from '@/lib/donation-spending';

export type DogProfileMode = 'supported' | 'preview' | 'waiting';
export type DogCareContextValue = {
  events: CareUpdate[];
  expenses: DemoExpense[];
  now: number;
  ready: boolean;
  error: string;
  inspected: { id: string; mode: DogProfileMode } | null;
  openDog: (id: string, mode?: DogProfileMode) => void;
  closeDog: () => void;
  openCalendar: () => void;
  saveEvent: (event: CareUpdate) => string | null;
  deleteEvent: (id: string) => string | null;
  replayExpense: (expense: DemoExpense) => void;
};
export const DogCareContext = createContext<DogCareContextValue | null>(null);
export function useDogCare() {
  const context = useContext(DogCareContext);
  if (!context) throw new Error('Dog care must be inside its provider.');
  return context;
}
