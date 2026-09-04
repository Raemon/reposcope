'use client';

import { useEffect, useRef, useState } from 'react';
import { apiJson } from './apiClient';
import { readBrowserCache, writeBrowserCache } from './browserCache';
import { errorMessage } from '@/features/sources/errorMessage';

export interface CachedJson<T> {
  data: T | null;
  fresh: boolean;
  error: string | null;
  reload: () => Promise<T>;
}

type HeldJson<T> = { key: string; data: T | null; fresh: boolean; error: string | null };
type Asked = { path: string | null; key: string | null; token: string | null };

const NOTHING: CachedJson<never> = {
  data: null,
  fresh: false,
  error: null,
  reload: () => Promise.reject(new Error('Nothing to reload')),
};
const inFlight = new Map<string, Promise<unknown>>();

export function useCachedJson<T>(
  path: string | null,
  token: string | null,
  ready: boolean,
  key: string | null = path,
): CachedJson<T> {
  const [held, setHeld] = useState<HeldJson<T> | null>(null);
  const asked = useRef<Asked>({ path, key, token });
  asked.current = { path, key, token };

  useEffect(() => {
    if (!ready || path === null || key === null) return;
    let live = true;
    const stale = readBrowserCache<T>(cacheName(key, token));
    setHeld({ key, data: stale, fresh: false, error: null });
    requestJson<T>(path, token, key)
      .then((data) => {
        if (live) setHeld({ key, data, fresh: true, error: null });
      })
      .catch((issue: unknown) => {
        if (live) setHeld({ key, data: stale, fresh: true, error: errorMessage(issue) });
      });
    return () => {
      live = false;
    };
  }, [path, key, token, ready]);

  const reload = () => reloadHeld<T>({ path, key, token }, asked, setHeld);
  if (held !== null && held.key === key) return { data: held.data, fresh: held.fresh, error: held.error, reload };
  return { ...NOTHING, reload };
}

export function prefetchJson(path: string, token: string | null, key: string = path): void {
  if (readBrowserCache(cacheName(key, token)) === null) void requestJson(path, token, key).catch(() => {});
}

export function readCachedJson<T>(key: string, token: string | null): T | null {
  return readBrowserCache<T>(cacheName(key, token));
}

function reloadHeld<T>(
  snapshot: Asked,
  asked: { current: Asked },
  setHeld: (next: HeldJson<T>) => void,
): Promise<T> {
  const { path, key, token } = snapshot;
  if (path === null || key === null) return Promise.reject(new Error('Nothing to reload'));
  return requestJson<T>(withFresh(path), token, key).then((data) => {
    if (asked.current.key === key) setHeld({ key, data, fresh: true, error: null });
    return data;
  });
}

function withFresh(path: string): string {
  return `${path}${path.includes('?') ? '&' : '?'}fresh=1`;
}

function requestJson<T>(path: string, token: string | null, key: string): Promise<T> {
  const flight = `${cacheName(key, token)} ${path}`;
  const running = inFlight.get(flight);
  if (running) return running as Promise<T>;
  const request = apiJson<T>(path, token)
    .then((data) => {
      writeBrowserCache(cacheName(key, token), data);
      return data;
    })
    .finally(() => inFlight.delete(flight));
  inFlight.set(flight, request);
  return request;
}

function cacheName(key: string, token: string | null): string {
  return `${token ? 'signed-in' : 'anonymous'} ${key}`;
}
