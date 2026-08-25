'use client';

import { useSyncExternalStore } from 'react';

export type DiffLayout = 'split' | 'unified';

const LAYOUT_KEY = 'reposcope.diffLayout';
const listeners = new Set<() => void>();

export function setDiffLayout(layout: DiffLayout): void {
  writeItem(LAYOUT_KEY, layout);
  for (const listener of listeners) listener();
}

export function useDiffLayout(): DiffLayout {
  return useSyncExternalStore(subscribe, readLayout, () => 'split');
}

function readLayout(): DiffLayout {
  return readItem(LAYOUT_KEY) === 'unified' ? 'unified' : 'split';
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
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
