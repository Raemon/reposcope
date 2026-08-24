'use client';

import { nextPullAfter, viewingAcrossRepos, viewingPull } from './nextPull';
import { prefetchPull } from './prefetchPull';
import { trackPullAction, type PullTarget } from './pullActionStore';
import { closePullPath } from './pullPaths';
import type { CloseResult } from './pullRequests';
import { apiPost } from '@/features/sources/apiClient';

export function closePull(target: PullTarget, token: string | null, navigate: (href: string) => void): void {
  const next = viewingPull(target) ? nextPullAfter(target, token, viewingAcrossRepos()) : null;
  trackPullAction(target, 'close', requestClose(target, token));
  if (next) {
    prefetchPull(next.owner, next.repo, next.number, token);
    navigate(next.href);
  }
}

async function requestClose(target: PullTarget, token: string | null): Promise<string | null> {
  const result = await apiPost<CloseResult>(closePullPath(target.owner, target.repo, target.number), token);
  return result.closed ? null : 'Close refused';
}
