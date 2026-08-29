'use client';

import { useReviewTarget } from './reviewThreadStore';

const EMPTY_WIDTH = '100px';
const COMMENTED_WIDTH = 'min(380px, 45vw)';

export function useCommentColumnWidth(): string {
  const { threads } = useReviewTarget();
  return threads.length === 0 ? EMPTY_WIDTH : COMMENTED_WIDTH;
}
