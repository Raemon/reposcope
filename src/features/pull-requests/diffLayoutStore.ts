'use client';

import { enumPref, usePref } from './localPref';
import { useNarrowViewport } from './narrowViewport';

const DIFF_LAYOUTS = ['split', 'unified'] as const;

export type DiffLayout = (typeof DIFF_LAYOUTS)[number];

const layoutPref = enumPref<DiffLayout>('reposcope.diffLayout', DIFF_LAYOUTS, 'split');

export function setDiffLayout(layout: DiffLayout): void {
  layoutPref.set(layout);
}

export function useDiffLayout(): DiffLayout {
  const stored = usePref(layoutPref);
  return useNarrowViewport() ? 'unified' : stored;
}
