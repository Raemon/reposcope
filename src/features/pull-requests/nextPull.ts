'use client';

import { standingPulls, type PullTarget } from './pullActionStore';
import { allPullsRoute, pullRoute, repoPullsPath } from './pullPaths';
import type { CrossRepoPulls, PullRequestSummary } from './pullRequests';
import { ALL_PULLS_CACHE_KEY } from './useAllPullRequests';
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
  const listed = standingPulls(acrossRepos ? cachedAllPulls(token) : cachedRepoPulls(target, token));
  const index = listed.findIndex((pull) => samePull(pull, target));
  const next = index < 0 ? null : listed[index + 1] ?? listed[index - 1] ?? null;
  if (!next) return null;
  return { ...next, href: acrossRepos ? allPullsRoute(next.owner, next.repo, next.number) : pullRoute(next.owner, next.repo, next.number) };
}

function cachedRepoPulls({ owner, repo }: PullTarget, token: string | null): PullTarget[] {
  const pulls = readCachedJson<PullRequestSummary[]>(repoPullsPath(owner, repo), token) ?? [];
  return pulls.map((pull) => ({ owner, repo, number: pull.number }));
}

function cachedAllPulls(token: string | null): PullTarget[] {
  const found = readCachedJson<CrossRepoPulls>(ALL_PULLS_CACHE_KEY, token);
  return (found?.pulls ?? []).map((pull) => ({ owner: pull.owner, repo: pull.repo, number: pull.number }));
}

function samePull(a: PullTarget, b: PullTarget): boolean {
  return a.owner === b.owner && a.repo === b.repo && a.number === b.number;
}
