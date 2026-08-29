'use client';

import { localPref, usePref } from './localPref';

export type DiffSort = 'comments' | 'diff' | 'diffAll' | 'folder';

const SORTS: DiffSort[] = ['comments', 'diff', 'diffAll', 'folder'];

const sortPref = localPref<DiffSort>('reposcope.diffSort', 'comments', decodeSort);

export function setDiffSort(sort: DiffSort): void {
  sortPref.set(sort);
}

export function useDiffSort(): DiffSort {
  return usePref(sortPref);
}

function decodeSort(stored: unknown): DiffSort | undefined {
  return SORTS.includes(stored as DiffSort) ? (stored as DiffSort) : undefined;
}
