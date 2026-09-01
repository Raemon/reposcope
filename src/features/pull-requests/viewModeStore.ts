'use client';

import { enumPref, usePref } from './localPref';

export type ViewMode = 'columns' | 'central';

const viewPref = enumPref<ViewMode>('reposcope.viewMode', ['columns', 'central'], 'columns');

export function setViewMode(mode: ViewMode): void {
  viewPref.set(mode);
}

export function useViewMode(): ViewMode {
  return usePref(viewPref);
}
