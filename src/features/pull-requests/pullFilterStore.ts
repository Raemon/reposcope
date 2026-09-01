'use client';

import { localPref, usePref } from './localPref';
import type { PullState } from './pullPaths';
import type { PullRequestSummary } from './pullRequests';

export type PullSort = 'attention' | 'updated';

export interface PullFilters {
  state: PullState;
  onlyMine: boolean;
  sort: PullSort;
}

const OPEN_BY_ATTENTION: PullFilters = { state: 'open', onlyMine: false, sort: 'attention' };

const filterPref = localPref<PullFilters>('reposcope.pullFilters', OPEN_BY_ATTENTION, decodePullFilters);

export function usePullFilters(): PullFilters {
  return usePref(filterPref);
}

export function readPullFilters(): PullFilters {
  return filterPref.read();
}

export function setPullState(state: PullState, on: boolean): void {
  filterPref.set({ ...filterPref.read(), state: on ? state : 'all' });
}

export function setOnlyMine(onlyMine: boolean): void {
  filterPref.set({ ...filterPref.read(), onlyMine });
}

export function setPullSort(sort: PullSort): void {
  filterPref.set({ ...filterPref.read(), sort });
}

export function listedPulls<T extends PullRequestSummary>(
  pulls: T[],
  filters: PullFilters,
  isOwnAuthor: (author: string) => boolean,
): T[] {
  return filters.onlyMine ? pulls.filter((pull) => isOwnAuthor(pull.author)) : pulls;
}

function decodePullFilters(stored: unknown): PullFilters | undefined {
  if (typeof stored !== 'object' || stored === null) return undefined;
  const held = stored as Record<string, unknown>;
  return { state: decodeState(held.state), onlyMine: held.onlyMine === true, sort: decodeSort(held.sort) };
}

function decodeState(stored: unknown): PullState {
  return stored === 'closed' || stored === 'all' ? stored : 'open';
}

function decodeSort(stored: unknown): PullSort {
  return stored === 'updated' ? 'updated' : 'attention';
}
