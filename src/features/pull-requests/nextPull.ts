'use client';

import { standingPulls, type PullTarget } from './pullActionStore';
import { attentionReader } from './pullAttention';
import { listedPulls, readPullFilters, sortListedPulls, type PullFilters } from './pullFilterStore';
import { allPullsRoute, pullRoute, repoPullsPath } from './pullPaths';
import type { CrossRepoPulls, PullRequestSummary } from './pullRequests';
import { readPullSort } from './pullSortStore';
import { crossRepoSeenKey, pullSeenKey, readSeenPulls } from './seenPullStore';
import { allPullsCacheKey } from './useAllPullRequests';
import { repoRoute } from '@/features/codebases/repoPaths';
import { ownAuthorCheck } from '@/features/github-auth/useViewerLogin';
import { readCachedJson } from '@/features/sources/useCachedJson';

export function viewingAcrossRepos(): boolean {
  return new URLSearchParams(window.location.search).get('from') === 'all';
}

export function viewingPull(target: PullTarget): boolean {
  return window.location.pathname === pullRoute(target.owner, target.repo, target.number);
}

export function nextPullAfter(
  target: PullTarget,
  token: string | null,
  acrossRepos: boolean,
): (PullTarget & { href: string }) | null {
  const filters = readPullFilters();
  const listed = standingPulls(acrossRepos ? cachedAllPulls(token, filters) : cachedRepoPulls(target, token, filters));
  const index = listed.findIndex((pull) => samePull(pull, target));
  const next = index < 0 ? null : listed[index + 1] ?? listed[index - 1] ?? null;
  if (!next) return null;
  return { ...next, href: acrossRepos ? allPullsRoute(next.owner, next.repo, next.number) : pullRoute(next.owner, next.repo, next.number) };
}

export function pullListRoute(target: PullTarget, acrossRepos: boolean): string {
  return acrossRepos ? '/pulls' : repoRoute(target.owner, target.repo);
}

function cachedRepoPulls({ owner, repo }: PullTarget, token: string | null, filters: PullFilters): PullTarget[] {
  const pulls = readCachedJson<PullRequestSummary[]>(repoPullsPath(owner, repo, filters.state), token) ?? [];
  const listed = listedPulls(pulls, filters, ownAuthorCheck(token));
  const ordered = orderedPulls(listed, (pull) => pullSeenKey(owner, repo, pull.number), token);
  return ordered.map((pull) => ({ owner, repo, number: pull.number }));
}

function cachedAllPulls(token: string | null, filters: PullFilters): PullTarget[] {
  const found = readCachedJson<CrossRepoPulls>(allPullsCacheKey(filters.state), token);
  return orderedPulls(listedPulls(found?.pulls ?? [], filters, ownAuthorCheck(token)), crossRepoSeenKey, token);
}

function orderedPulls<T extends PullRequestSummary>(pulls: T[], keyOf: (pull: T) => string, token: string | null): T[] {
  return sortListedPulls(pulls, readPullSort(), attentionReader(keyOf, readSeenPulls(), ownAuthorCheck(token)));
}

function samePull(a: PullTarget, b: PullTarget): boolean {
  return a.owner === b.owner && a.repo === b.repo && a.number === b.number;
}
