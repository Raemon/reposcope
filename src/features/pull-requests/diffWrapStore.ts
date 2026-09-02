'use client';

import { boolPref, usePref } from './localPref';

const wrapPref = boolPref('reposcope.diffWrap', true);

export function setDiffWrap(wrap: boolean): void {
  wrapPref.set(wrap);
}

export function useDiffWrap(): boolean {
  return usePref(wrapPref);
}
