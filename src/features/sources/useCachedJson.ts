'use client';

import { useEffect, useState } from 'react';
import { apiJson } from './apiClient';
import { readBrowserCache, writeBrowserCache } from './browserCache';

export interface CachedJson<T> {
  data: T | null;
  fresh: boolean;
  error: string | null;
}

const NOTHING: CachedJson<never> = { data: null, fresh: false, error: null };
const inFlight = new Map<string, Promise<unknown>>();

export function useCachedJson<T>(
  path: string | null,
  token: string | null,
  ready: boolean,
  key: string | null = path,
): CachedJson<T> {
  const [held, setHeld] = useState<(CachedJson<T> & { key: string }) | null>(null);

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
        if (live) setHeld({ key, data: stale, fresh: true, error: describe(issue) });
      });
    return () => {
      live = false;
    };
  }, [path, key, token, ready]);

  return held !== null && held.key === key ? held : NOTHING;
}

export function prefetchJson(path: string, token: string | null, key: string = path): void {
  if (readBrowserCache(cacheName(key, token)) === null) void requestJson(path, token, key).catch(() => {});
}

function requestJson<T>(path: string, token: string | null, key: string): Promise<T> {
  const name = cacheName(key, token);
  const running = inFlight.get(`${name} ${path}`);
  if (running) return running as Promise<T>;
  const request = apiJson<T>(path, token)
    .then((data) => {
      writeBrowserCache(name, data);
      return data;
    })
    .finally(() => inFlight.delete(`${name} ${path}`));
  inFlight.set(`${name} ${path}`, request);
  return request;
}

function cacheName(key: string, token: string | null): string {
  return `${token ? 'signed-in' : 'anonymous'} ${key}`;
}

function describe(issue: unknown): string {
  return issue instanceof Error ? issue.message : String(issue);
}
