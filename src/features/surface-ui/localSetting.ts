'use client';

import { useSyncExternalStore } from 'react';

export function createLocalSetting<T extends string>({
  key,
  values,
  fallback,
  serverValue,
  apply,
}: {
  key: string;
  values: readonly T[];
  fallback: () => T;
  serverValue: T;
  apply?: (value: T) => void;
}) {
  const listeners = new Set<() => void>();

  function read(): T {
    const stored = readItem(key);
    return values.includes(stored as T) ? (stored as T) : fallback();
  }

  function set(value: T): void {
    writeItem(key, value);
    apply?.(value);
    for (const listener of listeners) listener();
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    window.addEventListener('storage', listener);
    return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', listener);
    };
  }

  return { read, set, use: () => useSyncExternalStore(subscribe, read, () => serverValue) };
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
