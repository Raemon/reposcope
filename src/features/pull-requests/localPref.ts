'use client';

import { useSyncExternalStore } from 'react';

export interface LocalPref<T> {
  fallback: T;
  read(): T;
  set(next: T): void;
  subscribe(listener: () => void): () => void;
}

export function localPref<T>(key: string, fallback: T, decode: (stored: unknown) => T | undefined): LocalPref<T> {
  const listeners = new Set<() => void>();
  // caching by raw keeps read() referentially stable; useSyncExternalStore loops otherwise
  let cached: { raw: string; value: T } | null = null;
  return {
    fallback,
    read() {
      const raw = readItem(key);
      if (raw === null) return fallback;
      if (cached?.raw !== raw) cached = { raw, value: decode(parseRaw(raw)) ?? fallback };
      return cached.value;
    },
    set(next: T) {
      writeItem(key, JSON.stringify(next));
      for (const listener of listeners) listener();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      window.addEventListener('storage', listener);
      return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', listener);
      };
    },
  };
}

export function usePref<T>(pref: LocalPref<T>): T {
  return useSyncExternalStore(pref.subscribe, pref.read, () => pref.fallback);
}

function parseRaw(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw; // pre-JSON prefs stored bare strings; dropping this resets them
  }
}

function readItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {}
}
