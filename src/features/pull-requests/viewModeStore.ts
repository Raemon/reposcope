'use client';

import { enumPref, usePref } from './localPref';

const VIEW_MODES = ['columns', 'central'] as const;

export type ViewMode = (typeof VIEW_MODES)[number];

const viewPref = enumPref<ViewMode>('reposcope.viewMode', VIEW_MODES, 'columns');

export function nextViewMode(mode: ViewMode): ViewMode {
  return mode === 'central' ? 'columns' : 'central';
}

export function viewModeSwitchLabel(mode: ViewMode): string {
  return `Switch to the ${nextViewMode(mode)} layout`;
}

export function setViewMode(mode: ViewMode): void {
  viewPref.set(mode);
}

export function useViewMode(): ViewMode {
  return usePref(viewPref);
}
