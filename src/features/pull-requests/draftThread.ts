import type { DraftAnchor } from './draftThreadStore';
import type { ReviewThread } from './reviewThreads';

export const DRAFT_ROOT_ID = 0;

export function isDraftThread(thread: ReviewThread): boolean {
  return thread.comments.length === 0;
}

export function withDraftThread(threads: ReviewThread[], anchor: DraftAnchor | null, path: string): ReviewThread[] {
  if (anchor === null || anchor.path !== path) return threads;
  return [...threads, draftThread(anchor)];
}

function draftThread(anchor: DraftAnchor): ReviewThread {
  return {
    rootId: DRAFT_ROOT_ID,
    threadId: null,
    path: anchor.path,
    line: anchor.line,
    side: anchor.side,
    outdated: false,
    resolved: false,
    canResolve: false,
    comments: [],
  };
}
