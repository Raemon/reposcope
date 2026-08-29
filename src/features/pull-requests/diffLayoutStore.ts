'use client';

import { localPref, usePref } from './localPref';
import { useNarrowViewport } from './narrowViewport';

export type DiffLayout = 'split' | 'unified';

const layoutPref = localPref<DiffLayout>('reposcope.diffLayout', 'split', decodeLayout);

export function setDiffLayout(layout: DiffLayout): void {
  layoutPref.set(layout);
}

export function useDiffLayout(): DiffLayout {
  const stored = usePref(layoutPref);
  return useNarrowViewport() ? 'unified' : stored;
}

function decodeLayout(stored: unknown): DiffLayout | undefined {
  return stored === 'split' || stored === 'unified' ? stored : undefined;
}
