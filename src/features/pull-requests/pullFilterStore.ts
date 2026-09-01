'use client';

import { localPref, usePref } from './localPref';
import { attentionRank, type PullAttention } from './pullAttention';
import type { PullState } from './pullPaths';
import type { PullRequestSummary } from './pullRequests';
import type { PullSort } from './pullSortStore';

export interface PullFilters {
  state: PullState;
  onlyMine: boolean;
}

const OPEN_ONLY: PullFilters = { state: 'open', onlyMine: false };

const filterPref = localPref<PullFilters>('reposcope.pullFilters', OPEN_ONLY, decodePullFilters);

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

export function listedPulls<T extends PullRequestSummary>(
  pulls: T[],
  filters: PullFilters,
  isOwnAuthor: (author: string) => boolean,
): T[] {
  return filters.onlyMine ? pulls.filter((pull) => isOwnAuthor(pull.author)) : pulls;
}

export function sortListedPulls<T extends PullRequestSummary>(
  pulls: T[],
  sort: PullSort,
  attentionOf: (pull: T) => PullAttention,
): T[] {
  if (sort === 'updated') return pulls;
  const ranked = pulls.map((pull) => ({ pull, rank: attentionRank(attentionOf(pull)) }));
  ranked.sort((a, b) => a.rank - b.rank || b.pull.updatedAt.localeCompare(a.pull.updatedAt));
  return ranked.map((entry) => entry.pull);
}

function decodePullFilters(stored: unknown): PullFilters | undefined {
  if (typeof stored !== 'object' || stored === null) return undefined;
  const held = stored as Record<string, unknown>;
  return { state: decodeState(held.state), onlyMine: held.onlyMine === true };
}

function decodeState(stored: unknown): PullState {
  return stored === 'closed' || stored === 'all' ? stored : 'open';
}
