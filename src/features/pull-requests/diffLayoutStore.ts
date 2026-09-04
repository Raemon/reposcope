'use client';

import { enumPref, usePref } from './localPref';
import { useNarrowViewport } from './narrowViewport';

const DIFF_LAYOUTS = ['split', 'unified', 'result'] as const;

export type DiffLayout = (typeof DIFF_LAYOUTS)[number];

const layoutPref = enumPref<DiffLayout>('reposcope.diffLayout', DIFF_LAYOUTS, 'split');

export const DIFF_LAYOUT_LABEL: Record<DiffLayout, string> = {
  split: 'Show diffs in a two-column view',
  unified: 'Show diffs in a one-column view',
  result: 'Show the file as it will be, with removed lines hidden',
};

export function setDiffLayout(layout: DiffLayout): void {
  layoutPref.set(layout);
}

export function useDiffLayout(): DiffLayout {
  const stored = usePref(layoutPref);
  return useNarrowViewport() && stored === 'split' ? 'unified' : stored;
}
