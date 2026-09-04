import type { ReviewThread } from './reviewThreads';

export const DRAFT_ROOT_ID = 0;

export interface DraftAnchor {
  owner: string;
  repo: string;
  number: number;
  commitId: string;
  path: string;
  line: number;
  side: 'left' | 'right';
}

export type DraftPlace = Pick<DraftAnchor, 'owner' | 'repo' | 'path'> & { number: number | null };

export function isDraftThread(thread: ReviewThread): boolean {
  return thread.rootId === DRAFT_ROOT_ID;
}

export function withDraftThread(threads: ReviewThread[], anchor: DraftAnchor | null, place: DraftPlace): ReviewThread[] {
  if (anchor === null || !samePlace(anchor, place)) return threads;
  return [...threads, draftThread(anchor)];
}

function samePlace(anchor: DraftAnchor, place: DraftPlace): boolean {
  return (
    anchor.owner === place.owner &&
    anchor.repo === place.repo &&
    anchor.number === place.number &&
    anchor.path === place.path
  );
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
