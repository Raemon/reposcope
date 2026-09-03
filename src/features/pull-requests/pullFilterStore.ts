'use client';

import { localPref, usePref } from './localPref';
import type { PullState } from './pullPaths';
import type { PullRequestSummary } from './pullRequests';
import type { AuthorCheck } from '@/features/github-auth/useViewerLogin';

export type PullAuthor = 'mine' | 'anyone';

export interface PullFilters {
  state: PullState;
  author: PullAuthor;
}

export const PULL_AUTHOR_LABELS: Record<PullAuthor, string> = { mine: 'Mine', anyone: 'Anyone' };

const DEFAULT_FILTERS: PullFilters = { state: 'open', author: 'mine' };

const filterPref = localPref<PullFilters>('reposcope.pullFilters', DEFAULT_FILTERS, decodePullFilters);

export function usePullFilters(): PullFilters {
  return usePref(filterPref);
}

export function readPullFilters(): PullFilters {
  return filterPref.read();
}

export function setPullState(state: PullState, on: boolean): void {
  filterPref.set({ ...filterPref.read(), state: on ? state : 'all' });
}

export function setPullAuthor(author: PullAuthor): void {
  filterPref.set({ ...filterPref.read(), author });
}

export function clearPullFilters(): void {
  filterPref.set(DEFAULT_FILTERS);
}

export function isDefaultPullFilters(filters: PullFilters): boolean {
  return filters.state === DEFAULT_FILTERS.state && filters.author === DEFAULT_FILTERS.author;
}

export function listedPulls<T extends PullRequestSummary>(
  pulls: T[],
  filters: PullFilters,
  isOwnAuthor: AuthorCheck | null,
): T[] {
  return filters.author === 'mine' && isOwnAuthor ? pulls.filter((pull) => isOwnAuthor(pull.author)) : pulls;
}

function decodePullFilters(stored: unknown): PullFilters | undefined {
  if (typeof stored !== 'object' || stored === null) return undefined;
  const held = stored as Record<string, unknown>;
  return { state: decodeState(held.state), author: held.author === 'anyone' ? 'anyone' : 'mine' };
}

function decodeState(stored: unknown): PullState {
  return stored === 'closed' || stored === 'all' ? stored : 'open';
}
