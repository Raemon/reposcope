'use client';

import { allPullHref } from './AllPullRequestList';
import { mergeAttempts, mergedAway, noteMergeAttempt } from './mergeStore';
import { prefetchPull } from './prefetchPull';
import { repoPullsPath } from './pullPaths';
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
  const acrossRepos = window.location.search.includes('from=all');
  const next = nextPullAfter(target, token, acrossRepos);
  noteMergeAttempt({ ...target, state: 'merging', message: '' });
  setStickyColumn(acrossRepos ? 'all-pulls' : 'pulls', (size) => ({ ...size, open: true }));
  if (next) {
    prefetchPull(next.owner, next.repo, next.number, token);
    navigate(next.href);
  }
  apiPost<MergeResult>(mergePath(target), token)
    .then((result) => {
      if (result.merged) noteMergeAttempt({ ...target, state: 'merged', message: '' });
      else noteMergeAttempt({ ...target, state: 'failed', message: result.message || 'Merge refused' });
    })
    .catch((issue: unknown) => {
      noteMergeAttempt({ ...target, state: 'failed', message: issue instanceof Error ? issue.message : String(issue) });
    });
}

function mergePath({ owner, repo, number }: PullTarget): string {
  return `/api/github/merge?owner=${encodeURIComponent(owner)}&name=${encodeURIComponent(repo)}&number=${number}`;
}

function nextPullAfter(target: PullTarget, token: string | null, acrossRepos: boolean): (PullTarget & { href: string }) | null {
  const listed = acrossRepos ? cachedAllPulls(token) : cachedRepoPulls(target, token);
  const standingPulls = listed.filter((pull) => !mergedAway(mergeAttempts(), pull.owner, pull.repo, pull.number));
  const index = standingPulls.findIndex((pull) => samePull(pull, target));
  const next = index < 0 ? null : standingPulls[index + 1] ?? standingPulls[index - 1] ?? null;
  if (!next) return null;
  return { ...next, href: acrossRepos ? allPullHref(next) : `/repo/${next.owner}/${next.repo}/pull/${next.number}` };
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
