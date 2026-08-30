'use client';

import { localPref, usePref } from './localPref';

const editModePref = localPref<boolean>('reposcope.diffEditMode', false, (stored) =>
  typeof stored === 'boolean' ? stored : undefined,
);

export function setDiffEditMode(on: boolean): void {
  editModePref.set(on);
}

export function diffEditModeOn(): boolean {
  return editModePref.read();
}

export function useDiffEditMode(): boolean {
  return usePref(editModePref);
}
