'use client';

import { localPref, usePref } from './localPref';

const editModePref = localPref<boolean>('reposcope.diffEditMode', false, decodeEditMode);

export function toggleDiffEditMode(): void {
  editModePref.set(!editModePref.read());
}

export function useDiffEditMode(): boolean {
  return usePref(editModePref);
}

function decodeEditMode(stored: unknown): boolean | undefined {
  return typeof stored === 'boolean' ? stored : undefined;
}
