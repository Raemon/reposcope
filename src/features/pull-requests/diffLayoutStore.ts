'use client';

import { enumPref, usePref } from './localPref';
import { useNarrowViewport } from './narrowViewport';

export type DiffLayout = 'split' | 'unified';

const layoutPref = enumPref<DiffLayout>('reposcope.diffLayout', ['split', 'unified'], 'split');

export function setDiffLayout(layout: DiffLayout): void {
  layoutPref.set(layout);
}

export function useDiffLayout(): DiffLayout {
  const stored = usePref(layoutPref);
  return useNarrowViewport() ? 'unified' : stored;
}
