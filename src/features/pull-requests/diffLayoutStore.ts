'use client';

import { localPref, usePref } from './localPref';
import { useNarrowViewport } from './narrowViewport';

export type DiffLayout = 'split' | 'unified' | 'result';

const layoutPref = localPref<DiffLayout>('reposcope.diffLayout', 'split', decodeLayout);

export function setDiffLayout(layout: DiffLayout): void {
  layoutPref.set(layout);
}

export function useDiffLayout(): DiffLayout {
  const stored = usePref(layoutPref);
  return useNarrowViewport() && stored === 'split' ? 'unified' : stored;
}

const LAYOUTS: DiffLayout[] = ['split', 'unified', 'result'];

function decodeLayout(stored: unknown): DiffLayout | undefined {
  return LAYOUTS.find((layout) => layout === stored);
}
