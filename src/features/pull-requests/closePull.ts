'use client';

import { nextPullAfter, viewingAcrossRepos, viewingPull, type PullTarget } from './nextPull';
import { prefetchPull } from './prefetchPull';
import { failureMessage, notePullAction } from './pullActionStore';
import { closePullPath } from './pullPaths';
import type { CloseResult } from './pullRequests';
import { apiPost } from '@/features/sources/apiClient';

export function closePull(target: PullTarget, token: string | null, navigate: (href: string) => void): void {
  const next = viewingPull(target) ? nextPullAfter(target, token, viewingAcrossRepos()) : null;
  notePullAction({ ...target, kind: 'close', state: 'running', message: '' });
  if (next) {
    prefetchPull(next.owner, next.repo, next.number, token);
    navigate(next.href);
  }
  apiPost<CloseResult>(closePullPath(target.owner, target.repo, target.number), token)
    .then((result) => {
      if (result.closed) notePullAction({ ...target, kind: 'close', state: 'done', message: '' });
      else notePullAction({ ...target, kind: 'close', state: 'failed', message: 'Close refused' });
    })
    .catch((issue: unknown) => {
      notePullAction({ ...target, kind: 'close', state: 'failed', message: failureMessage(issue) });
    });
}
