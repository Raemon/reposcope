'use client';

import { pullSubject } from '@/features/pull-requests/pullPaths';
import { conflictPrompt } from './conflictPrompt';
import { startThread } from './startThread';
import { openStickyColumn } from '@/features/pull-requests/stickyColumns';

export interface ConflictFix {
  owner: string;
  repo: string;
  number: number;
  headRef: string;
  baseRef: string;
  headSha: string | null;
  key: string;
  model: string;
}

export function fixConflicts(fix: ConflictFix): void {
  const { owner, repo, number, headRef, headSha, key, model } = fix;
  startThread({
    subject: pullSubject(owner, repo, number),
    owner,
    repo,
    number,
    headRef,
    headSha,
    cursorKey: key,
    model,
    purpose: 'merge-conflicts',
    prompt: conflictPrompt(fix),
  });
  openStickyColumn('ai-chat');
}
