'use client';

import { type CSSProperties } from 'react';
import { clampedPref, usePref } from './localPref';
import { clampWidth, type ColumnSize } from './ResizableColumn';
import { useReviewTarget } from './reviewThreadStore';

export const DEFAULT_COMMENT_WIDTH = 380;

const EMPTY_WIDTH = 100;
// Outweighs the diff's flex-shrink so the comment column gives up room first.
const SHRINK_FIRST = 100;

const widthPref = clampedPref<null>('reposcope.commentColumnWidth', null, clampWidth);

export function useCommentColumnStyle(): CSSProperties {
  const { threads } = useReviewTarget();
  const stored = usePref(widthPref);
  if (threads.length === 0) return { width: EMPTY_WIDTH, flexShrink: 0 };
  if (stored === null) return { flexBasis: DEFAULT_COMMENT_WIDTH, flexShrink: SHRINK_FIRST, minWidth: EMPTY_WIDTH };
  return { width: stored, flexShrink: 0 };
}

export function setCommentColumnWidth(next: ColumnSize): void {
  widthPref.set(clampWidth(next.width));
}
