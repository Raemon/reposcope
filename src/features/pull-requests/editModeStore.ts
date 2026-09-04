'use client';

import { boolPref, usePref } from './localPref';

const editModePref = boolPref('reposcope.diffEditMode', false);

export function setDiffEditMode(on: boolean): void {
  editModePref.set(on);
}

export function diffEditModeOn(): boolean {
  return editModePref.read();
}

export function useDiffEditMode(): boolean {
  return usePref(editModePref);
}
