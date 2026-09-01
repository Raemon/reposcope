'use client';

import { enumPref, usePref } from './localPref';

export type DiffSort = 'comments' | 'diff' | 'diffAll' | 'folder';

const SORTS: DiffSort[] = ['comments', 'diff', 'diffAll', 'folder'];

const sortPref = enumPref<DiffSort>('reposcope.diffSort', SORTS, 'comments');

export function setDiffSort(sort: DiffSort): void {
  sortPref.set(sort);
}

export function useDiffSort(): DiffSort {
  return usePref(sortPref);
}
