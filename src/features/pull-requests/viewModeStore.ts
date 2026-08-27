'use client';

import { localPref, usePref } from './localPref';

export type ViewMode = 'columns' | 'central';

const viewPref = localPref<ViewMode>('reposcope.viewMode', 'columns', decodeViewMode);

export function setViewMode(mode: ViewMode): void {
  viewPref.set(mode);
}

export function useViewMode(): ViewMode {
  return usePref(viewPref);
}

function decodeViewMode(stored: unknown): ViewMode | undefined {
  return stored === 'columns' || stored === 'central' ? stored : undefined;
}
