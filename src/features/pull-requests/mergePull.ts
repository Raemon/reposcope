'use client';

import { collapsePullList } from './collapsePullList';
import { nextPullAfter, pullListRoute, viewingAcrossRepos } from './nextPull';
import { prefetchPull } from './prefetchPull';
import { trackPullAction, type PullTarget } from './pullActionStore';
import { mergePullPath } from './pullPaths';
import type { MergeResult, PullRequestCommits } from './pullRequests';
import { setStickyColumn } from './stickyColumns';
import { apiPost } from '@/features/sources/apiClient';

export function canMerge(pull: PullRequestCommits | null): boolean {
  return pull !== null && pull.pull.state === 'open' && !pull.pull.merged && !pull.conflicted;
}

export function mergePull(target: PullTarget, token: string | null, navigate: (href: string) => void): void {
  const acrossRepos = viewingAcrossRepos();
  const list = acrossRepos ? 'all-pulls' : 'pulls';
  const next = nextPullAfter(target, token, acrossRepos);
  trackPullAction(target, 'merge', requestMerge(target, token));
  if (!next) {
    setStickyColumn(list, (size) => ({ ...size, open: true }));
    return navigate(pullListRoute(target, acrossRepos));
  }
  collapsePullList(list);
  prefetchPull(next.owner, next.repo, next.number, token);
  navigate(next.href);
}

async function requestMerge(target: PullTarget, token: string | null): Promise<string | null> {
  const result = await apiPost<MergeResult>(mergePullPath(target.owner, target.repo, target.number), token);
  return result.merged ? null : result.message || 'Merge refused';
}
