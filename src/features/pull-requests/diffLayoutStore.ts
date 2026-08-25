'use client';

import { localPref, usePref } from './localPref';

export type DiffLayout = 'split' | 'unified';

const layoutPref = localPref<DiffLayout>('reposcope.diffLayout', 'split', decodeLayout);

export function setDiffLayout(layout: DiffLayout): void {
  layoutPref.set(layout);
}

export function useDiffLayout(): DiffLayout {
  return usePref(layoutPref);
}

function decodeLayout(stored: unknown): DiffLayout | undefined {
  return stored === 'split' || stored === 'unified' ? stored : undefined;
}
