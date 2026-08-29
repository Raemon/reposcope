'use client';

import { nextPullAfter, pullListRoute, viewingAcrossRepos } from './nextPull';
import { prefetchPull } from './prefetchPull';
import { trackPullAction, type PullTarget } from './pullActionStore';
import { mergePullPath } from './pullPaths';
import type { MergeResult } from './pullRequests';
import { setStickyColumn } from './stickyColumns';
import { apiPost } from '@/features/sources/apiClient';

export function mergePull(target: PullTarget, token: string | null, navigate: (href: string) => void): void {
  const acrossRepos = viewingAcrossRepos();
  const next = nextPullAfter(target, token, acrossRepos);
  setStickyColumn(acrossRepos ? 'all-pulls' : 'pulls', (size) => ({ ...size, open: true }));
  trackPullAction(target, 'merge', requestMerge(target, token));
  if (!next) return navigate(pullListRoute(target, acrossRepos));
  prefetchPull(next.owner, next.repo, next.number, token);
  navigate(next.href);
}

async function requestMerge(target: PullTarget, token: string | null): Promise<string | null> {
  const result = await apiPost<MergeResult>(mergePullPath(target.owner, target.repo, target.number), token);
  return result.merged ? null : result.message || 'Merge refused';
}
