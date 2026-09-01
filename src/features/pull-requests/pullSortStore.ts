'use client';

import { localPref, usePref } from './localPref';

export type PullSort = 'attention' | 'updated';

const sortPref = localPref<PullSort>('reposcope.pullSort', 'attention', decodeSort);

export function setPullSort(sort: PullSort): void {
  sortPref.set(sort);
}

export function usePullSort(): PullSort {
  return usePref(sortPref);
}

export function readPullSort(): PullSort {
  return sortPref.read();
}

function decodeSort(stored: unknown): PullSort | undefined {
  return stored === 'attention' || stored === 'updated' ? stored : undefined;
}
