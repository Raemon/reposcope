'use client';

import { booleanPref, usePref } from './localPref';

const editModePref = booleanPref('reposcope.diffEditMode', false);

export function setDiffEditMode(on: boolean): void {
  editModePref.set(on);
}

export function diffEditModeOn(): boolean {
  return editModePref.read();
}

export function useDiffEditMode(): boolean {
  return usePref(editModePref);
}
