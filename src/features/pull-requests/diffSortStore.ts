'use client';

import { enumPref, usePref } from './localPref';

const SORTS = ['comments', 'diff', 'diffAll', 'folder'] as const;

export type DiffSort = (typeof SORTS)[number];

const sortPref = enumPref<DiffSort>('reposcope.diffSort', SORTS, 'comments');

export function setDiffSort(sort: DiffSort): void {
  sortPref.set(sort);
}

export function useDiffSort(): DiffSort {
  return usePref(sortPref);
}
