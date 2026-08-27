'use client';

import { createLocalSetting } from '@/features/surface-ui/localSetting';

export type Theme = 'light' | 'dark';

const theme = createLocalSetting<Theme>({
  key: 'reposcope.theme',
  values: ['light', 'dark'],
  fallback: systemTheme,
  serverValue: 'light',
  apply: applyTheme,
});

export const readTheme = theme.read;
export const setTheme = theme.set;
export const useTheme = theme.use;

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
