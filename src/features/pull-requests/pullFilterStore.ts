'use client';

import { localPref, usePref } from './localPref';
import type { PullState } from './pullPaths';
import type { PullRequestSummary } from './pullRequests';
import { useIsOwnAuthor } from '@/features/github-auth/useViewerLogin';

export interface PullFilters {
  onlyOpen: boolean;
  onlyClosed: boolean;
  onlyMine: boolean;
}

export const PULL_FILTERS: { key: keyof PullFilters; label: string }[] = [
  { key: 'onlyOpen', label: 'only open PRs' },
  { key: 'onlyClosed', label: 'only closed PRs' },
  { key: 'onlyMine', label: 'only my PRs' },
];

const OPEN_ONLY: PullFilters = { onlyOpen: true, onlyClosed: false, onlyMine: false };

const OPPOSITE: Partial<Record<keyof PullFilters, keyof PullFilters>> = {
  onlyOpen: 'onlyClosed',
  onlyClosed: 'onlyOpen',
};

const filterPref = localPref<PullFilters>('reposcope.pullFilters', OPEN_ONLY, decodePullFilters);

export function usePullFilters(): PullFilters {
  return usePref(filterPref);
}

export function readPullFilters(): PullFilters {
  return filterPref.read();
}

export function setPullFilter(key: keyof PullFilters, on: boolean): void {
  filterPref.set(withFilter(filterPref.read(), key, on));
}

function withFilter(filters: PullFilters, key: keyof PullFilters, on: boolean): PullFilters {
  const opposite = OPPOSITE[key];
  if (!on || !opposite) return { ...filters, [key]: on };
  return { ...filters, [key]: true, [opposite]: false };
}

export function pullQueryState(filters: PullFilters): PullState {
  if (filters.onlyOpen) return 'open';
  return filters.onlyClosed ? 'closed' : 'all';
}

export function usePullQueryState(): PullState {
  return pullQueryState(usePullFilters());
}

export function listedPulls<T extends PullRequestSummary>(
  pulls: T[],
  filters: PullFilters,
  isOwnAuthor: (author: string) => boolean,
): T[] {
  return pulls.filter((pull) => passesFilters(pull, filters, isOwnAuthor));
}

export function useListedPulls<T extends PullRequestSummary>(pulls: T[]): T[] {
  return listedPulls(pulls, usePullFilters(), useIsOwnAuthor());
}

function passesFilters(
  pull: PullRequestSummary,
  filters: PullFilters,
  isOwnAuthor: (author: string) => boolean,
): boolean {
  if (filters.onlyOpen && pull.state !== 'open') return false;
  if (filters.onlyClosed && pull.state === 'open') return false;
  return !filters.onlyMine || isOwnAuthor(pull.author);
}

function decodePullFilters(stored: unknown): PullFilters | undefined {
  if (typeof stored !== 'object' || stored === null) return undefined;
  const held = stored as Record<string, unknown>;
  const onlyOpen = held.onlyOpen === true;
  return { onlyOpen, onlyClosed: !onlyOpen && held.onlyClosed === true, onlyMine: held.onlyMine === true };
}
