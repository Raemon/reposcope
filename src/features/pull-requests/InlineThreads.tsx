'use client';

import { useMemo } from 'react';
import { anchorThreads } from './commentAnchors';
import type { DiffLine } from './diffLines';
import { useNarrowViewport } from './narrowViewport';
import type { ReviewThread } from './reviewThreads';
import type { DiffRow } from './splitDiff';
import { ThreadColumn } from './ThreadColumn';
import { ThreadMarkers } from './ThreadMarkers';

export function InlineThreads({
  threads,
  rows,
  lines,
  onOverflow,
}: {
  threads: ReviewThread[];
  rows: DiffRow[];
  lines: DiffLine[];
  onOverflow: (pixels: number) => void;
}) {
  const narrow = useNarrowViewport();
  const anchors = useMemo(() => anchorThreads(threads, rows, lines), [threads, rows, lines]);
  if (narrow) return <ThreadMarkers anchors={anchors} onOverflow={onOverflow} />;
  return <ThreadColumn anchors={anchors} lines={lines} onOverflow={onOverflow} />;
}
