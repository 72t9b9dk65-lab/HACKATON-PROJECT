'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Action, FileRecord, Workspace } from '@/lib/platform/types';
export function useCareWorkspace() {
  const [state, setState] = useState<Workspace | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(false);
  const ref = useRef<Workspace | null>(null);
  const mutation = useRef(false);
  const retry = useRef<{ key: string; id: string } | null>(null);
  const accept = useCallback((value: Workspace) => {
    if (!ref.current || value.revision >= ref.current.revision) {
      ref.current = value;
      setState(value);
    }
    setOnline(true);
  }, []);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/platform', { cache: 'no-store' });
      const data = (await response.json()) as Workspace & { error?: string };
      if (!response.ok) {
        if (response.status === 401) {
          setState(null);
          ref.current = null;
          window.location.assign('/signin');
        }
        throw new Error(data.error);
      }
      accept(data);
    } catch (e) {
      setOnline(false);
      if (!ref.current)
        setError(
          e instanceof Error ? e.message : 'Could not load your shelter.',
        );
    }
  }, [accept]);
  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => {
      if (!document.hidden && !mutation.current) void refresh();
    }, 3000);
    const focus = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener('visibilitychange', focus);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
      document.removeEventListener('visibilitychange', focus);
    };
  }, [refresh]);
  async function send(action: Action) {
    if (!ref.current || mutation.current) return false;
    mutation.current = true;
    setBusy(true);
    setError('');
    const key = JSON.stringify(action);
    const commandId =
      retry.current?.key === key ? retry.current.id : crypto.randomUUID();
    retry.current = { key, id: commandId };
    try {
      const response = await fetch('/api/platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: commandId,
          revision: ref.current.revision,
          action,
        }),
      });
      const data = (await response.json()) as Workspace & { error?: string };
      if (!response.ok) {
        if (response.status === 409) await refresh();
        else retry.current = null;
        throw new Error(data.error ?? 'Could not save.');
      }
      accept(data);
      retry.current = null;
      return true;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not save. Your previous records are safe.',
      );
      return false;
    } finally {
      setBusy(false);
      mutation.current = false;
    }
  }
  return {
    state,
    error,
    busy,
    online,
    send,
    refresh,
    clearError: () => setError(''),
  };
}
export async function uploadCareFile(file: File): Promise<FileRecord> {
  const body = new FormData();
  body.set('file', file);
  const response = await fetch('/api/platform/upload', {
    method: 'POST',
    body,
  });
  if (!response.headers.get('content-type')?.includes('application/json'))
    throw new Error(
      `Upload rejected (${response.status}). Choose a file smaller than 12 MB.`,
    );
  const result = (await response.json()) as FileRecord & { error?: string };
  if (!response.ok) throw new Error(result.error);
  return result;
}
export type CareStore = ReturnType<typeof useCareWorkspace>;
