'use client';

import { useSyncExternalStore } from 'react';
import { CURSOR_KEY_HEADER } from './cursorTypes';

const KEY_ITEM = 'reposcope.cursorKey';
const listeners = new Set<() => void>();

export function cursorHeaders(key: string): Record<string, string> {
  return { [CURSOR_KEY_HEADER]: key };
}

export function writeCursorKey(key: string | null): void {
  try {
    if (key === null) window.localStorage.removeItem(KEY_ITEM);
    else window.localStorage.setItem(KEY_ITEM, key);
  } catch {}
  for (const listener of listeners) listener();
}

function readCursorKey(): string | null {
  try {
    return window.localStorage.getItem(KEY_ITEM);
  } catch {
    return null;
  }
}

export function useCursorKey(): string | null {
  return useSyncExternalStore(subscribe, readCursorKey, () => null);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}
