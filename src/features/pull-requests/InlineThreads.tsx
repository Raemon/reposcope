'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { anchorThreads, stackedTops, type AnchoredThread } from './commentAnchors';
import { ROW_HEIGHT } from './diffMetrics';
import type { DiffLine } from './diffLines';
import { useFileThreads } from './reviewThreadStore';
import type { DiffRow } from './splitDiff';
import { ThreadCard } from './ThreadCard';

const CARD_GAP = 4;

export function InlineThreads({
  path,
  rows,
  lines,
  nearest,
  onOverflow,
}: {
  path: string;
  rows: DiffRow[];
  lines: DiffLine[];
  nearest: boolean;
  onOverflow: (pixels: number) => void;
}) {
  const threads = useFileThreads(path);
  const anchors = useMemo(() => anchorThreads(threads, rows, lines, nearest), [threads, rows, lines, nearest]);
  const [heights, setHeights] = useState<Record<number, number>>({});
  const measure = useCallback((rootId: number, height: number) => {
    setHeights((held) => (held[rootId] === height ? held : { ...held, [rootId]: height }));
  }, []);
  const tops = stackedTops(anchors, heights, CARD_GAP);
  const overflow = overflowBelow(anchors, tops, heights, lines.length * ROW_HEIGHT);

  useEffect(() => onOverflow(overflow), [overflow, onOverflow]);

  if (anchors.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-[min(22rem,45%)]">
      {anchors.map(({ thread }, index) => (
        <FloatingCard key={thread.rootId} top={tops[index] ?? 0} onHeight={(height) => measure(thread.rootId, height)}>
          <ThreadCard thread={thread} />
        </FloatingCard>
      ))}
    </div>
  );
}

function overflowBelow(
  anchors: AnchoredThread[],
  tops: number[],
  heights: Record<number, number>,
  diffHeight: number,
): number {
  const bottoms = anchors.map(({ thread }, index) => (tops[index] ?? 0) + (heights[thread.rootId] ?? 0));
  return Math.max(0, Math.max(0, ...bottoms) - diffHeight);
}

function FloatingCard({
  top,
  onHeight,
  children,
}: {
  top: number;
  onHeight: (height: number) => void;
  children: ReactNode;
}) {
  const node = useRef<HTMLDivElement | null>(null);
  const latest = useRef(onHeight);
  latest.current = onHeight;

  useLayoutEffect(() => {
    const element = node.current;
    if (!element) return;
    const observer = new ResizeObserver(() => latest.current(element.offsetHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={node}
      style={{ top }}
      className="pointer-events-auto absolute right-0 w-full transition-[top] duration-150"
    >
      {children}
    </div>
  );
}
