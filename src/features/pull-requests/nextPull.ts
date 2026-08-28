'use client';

import { standingPulls, type PullTarget } from './pullActionStore';
import { listedPulls, readPullFilters, type PullFilters } from './pullFilterStore';
import { allPullsRoute, pullRoute, repoPullsPath } from './pullPaths';
import type { CrossRepoPulls, PullRequestSummary } from './pullRequests';
import { allPullsCacheKey } from './useAllPullRequests';
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

function cachedRepoPulls({ owner, repo }: PullTarget, token: string | null, filters: PullFilters): PullTarget[] {
  const pulls = readCachedJson<PullRequestSummary[]>(repoPullsPath(owner, repo, filters.state), token) ?? [];
  return listedPulls(pulls, filters, ownAuthorCheck(token)).map((pull) => ({ owner, repo, number: pull.number }));
}

function cachedAllPulls(token: string | null, filters: PullFilters): PullTarget[] {
  const found = readCachedJson<CrossRepoPulls>(allPullsCacheKey(filters.state), token);
  return listedPulls(found?.pulls ?? [], filters, ownAuthorCheck(token));
}

function samePull(a: PullTarget, b: PullTarget): boolean {
  return a.owner === b.owner && a.repo === b.repo && a.number === b.number;
}
