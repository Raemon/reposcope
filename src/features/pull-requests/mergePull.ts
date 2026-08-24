'use client';

import { nextPullAfter, viewingAcrossRepos, type PullTarget } from './nextPull';
import { prefetchPull } from './prefetchPull';
import { failureMessage, notePullAction } from './pullActionStore';
import { mergePullPath } from './pullPaths';
import type { MergeResult } from './pullRequests';
import { setStickyColumn } from './stickyColumns';
import { apiPost } from '@/features/sources/apiClient';

export function mergePull(target: PullTarget, token: string | null, navigate: (href: string) => void): void {
  const acrossRepos = viewingAcrossRepos();
  const next = nextPullAfter(target, token, acrossRepos);
  notePullAction({ ...target, kind: 'merge', state: 'running', message: '' });
  setStickyColumn(acrossRepos ? 'all-pulls' : 'pulls', (size) => ({ ...size, open: true }));
  if (next) {
    prefetchPull(next.owner, next.repo, next.number, token);
    navigate(next.href);
  }
  apiPost<MergeResult>(mergePullPath(target.owner, target.repo, target.number), token)
    .then((result) => {
      if (result.merged) notePullAction({ ...target, kind: 'merge', state: 'done', message: '' });
      else notePullAction({ ...target, kind: 'merge', state: 'failed', message: result.message || 'Merge refused' });
    })
    .catch((issue: unknown) => {
      notePullAction({ ...target, kind: 'merge', state: 'failed', message: failureMessage(issue) });
    });
}
