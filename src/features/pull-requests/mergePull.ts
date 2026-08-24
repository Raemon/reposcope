'use client';

import { noteMergeAttempt, standingPulls } from './mergeStore';
import { prefetchPull } from './prefetchPull';
import { allPullsRoute, mergePullPath, pullRoute, repoPullsPath } from './pullPaths';
import type { CrossRepoPulls, MergeResult, PullRequestSummary } from './pullRequests';
import { setStickyColumn } from './stickyColumns';
import { ALL_PULLS_CACHE_KEY } from './useAllPullRequests';
import { apiPost } from '@/features/sources/apiClient';
import { readCachedJson } from '@/features/sources/useCachedJson';

export interface PullTarget {
  owner: string;
  repo: string;
  number: number;
}

export function mergePull(target: PullTarget, token: string | null, navigate: (href: string) => void): void {
  const acrossRepos = new URLSearchParams(window.location.search).get('from') === 'all';
  const next = nextPullAfter(target, token, acrossRepos);
  noteMergeAttempt({ ...target, state: 'merging', message: '' });
  setStickyColumn(acrossRepos ? 'all-pulls' : 'pulls', (size) => ({ ...size, open: true }));
  if (next) {
    prefetchPull(next.owner, next.repo, next.number, token);
    navigate(next.href);
  }
  apiPost<MergeResult>(mergePullPath(target.owner, target.repo, target.number), token)
    .then((result) => {
      if (result.merged) noteMergeAttempt({ ...target, state: 'merged', message: '' });
      else noteMergeAttempt({ ...target, state: 'failed', message: result.message || 'Merge refused' });
    })
    .catch((issue: unknown) => {
      noteMergeAttempt({ ...target, state: 'failed', message: issue instanceof Error ? issue.message : String(issue) });
    });
}

function nextPullAfter(target: PullTarget, token: string | null, acrossRepos: boolean): (PullTarget & { href: string }) | null {
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
