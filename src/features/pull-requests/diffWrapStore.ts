'use client';

import { localPref, usePref } from './localPref';

const wrapPref = localPref<boolean>('reposcope.diffWrap', true, (stored) =>
  typeof stored === 'boolean' ? stored : undefined,
);

export function setDiffWrap(wrap: boolean): void {
  wrapPref.set(wrap);
}

export function useDiffWrap(): boolean {
  return usePref(wrapPref);
}
