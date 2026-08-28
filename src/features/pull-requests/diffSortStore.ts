'use client';

import { localPref, usePref } from './localPref';

export type DiffSort = 'comments' | 'diff' | 'diffAll';

const sortPref = localPref<DiffSort>('reposcope.diffSort', 'comments', decodeSort);

export function setDiffSort(sort: DiffSort): void {
  sortPref.set(sort);
}

export function useDiffSort(): DiffSort {
  return usePref(sortPref);
}

function decodeSort(stored: unknown): DiffSort | undefined {
  return stored === 'comments' || stored === 'diff' || stored === 'diffAll' ? stored : undefined;
}
