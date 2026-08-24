'use client';

import { useSyncExternalStore } from 'react';
import { readRenamedItem } from '@/features/storage/renamedStorage';

export type Theme = 'light' | 'dark';

const THEME_KEY = 'shoggoth.theme';
const LEGACY_THEME_KEY = 'reposcope.theme';
const listeners = new Set<() => void>();

export function readTheme(): Theme {
  const stored = readRenamedItem(THEME_KEY, LEGACY_THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return systemTheme();
}

export function setTheme(theme: Theme): void {
  writeItem(THEME_KEY, theme);
  applyTheme(theme);
  for (const listener of listeners) listener();
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, readTheme, () => 'light');
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function writeItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {}
}
