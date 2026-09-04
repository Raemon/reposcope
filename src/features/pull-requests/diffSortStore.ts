'use client';

import { enumPref, usePref } from './localPref';

const SORTS = ['comments', 'diff', 'diffAll', 'folder'] as const;

export type DiffSort = (typeof SORTS)[number];

const sortPref = enumPref<DiffSort>('reposcope.diffSort', SORTS, 'comments');

export const DIFF_SORT_LABEL: Record<DiffSort, string> = {
  comments: 'inline comments',
  diff: 'line-diff, excluding imports',
  diffAll: 'line-diff, all lines',
  folder: 'alphabetical folder',
};

export function diffSortTitle(sort: DiffSort): string {
  return `Sort files by ${DIFF_SORT_LABEL[sort]}`;
}

export function setDiffSort(sort: DiffSort): void {
  sortPref.set(sort);
}

export function useDiffSort(): DiffSort {
  return usePref(sortPref);
}
