'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { anchorThreads, placeThreads, type PlacedThread } from './commentAnchors';
import { ROW_HEIGHT } from './diffMetrics';
import type { DiffLine } from './diffLines';
import { useFileThreads } from './reviewThreadStore';
import type { DiffRow } from './splitDiff';
import { ThreadCard } from './ThreadCard';

const CARD_GAP = 4;
const EXPAND_BAR = 15;
// Smallest useful clamped card: comment header plus the expand bar.
const MIN_SLOT = 37;

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
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const measure = useCallback((rootId: number, height: number) => {
    setHeights((held) => (held[rootId] === height ? held : { ...held, [rootId]: height }));
  }, []);
  const cards = placeThreads(anchors, heights, CARD_GAP, MIN_SLOT);
  const overflow = overflowBelow(cards, heights, expanded, lines.length * ROW_HEIGHT);

  useEffect(() => onOverflow(overflow), [overflow, onOverflow]);

  if (cards.length === 0) return null;
  return (
    <div className="relative w-[40%] shrink-0">
      {cards.map(({ thread, top, slot }) => (
        <FloatingCard
          key={thread.rootId}
          top={top}
          clampTo={(heights[thread.rootId] ?? 0) > slot ? slot : null}
          expanded={expanded[thread.rootId] ?? false}
          onToggle={() => setExpanded((held) => ({ ...held, [thread.rootId]: !held[thread.rootId] }))}
          onHeight={(height) => measure(thread.rootId, height)}
        >
          <ThreadCard thread={thread} />
        </FloatingCard>
      ))}
    </div>
  );
}

function shownHeight(card: PlacedThread, heights: Record<number, number>, expanded: Record<number, boolean>): number {
  const natural = heights[card.thread.rootId] ?? ROW_HEIGHT;
  if (natural <= card.slot) return natural;
  return expanded[card.thread.rootId] ? natural + EXPAND_BAR : card.slot;
}

function overflowBelow(
  cards: PlacedThread[],
  heights: Record<number, number>,
  expanded: Record<number, boolean>,
  diffHeight: number,
): number {
  const bottoms = cards.map((card) => card.top + shownHeight(card, heights, expanded));
  return Math.max(0, Math.max(0, ...bottoms) - diffHeight);
}

function FloatingCard({
  top,
  clampTo,
  expanded,
  onToggle,
  onHeight,
  children,
}: {
  top: number;
  clampTo: number | null;
  expanded: boolean;
  onToggle: () => void;
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

  const clipped = clampTo !== null && !expanded;
  return (
    <div style={{ top }} className={`absolute inset-x-0 max-w-[500px] transition-[top] duration-150 ${expanded ? 'z-10' : ''}`}>
      <div className={clipped ? 'overflow-hidden' : undefined} style={clipped ? { maxHeight: clampTo - EXPAND_BAR } : undefined}>
        <div ref={node}>{children}</div>
      </div>
      {clampTo !== null && (
        <button
          type="button"
          onClick={onToggle}
          className="block h-[15px] w-full rounded-b border border-t-0 border-panel-edge bg-panel px-1.5 text-left text-[9px] italic leading-[13px] text-ink-dim hover:text-ink"
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      )}
    </div>
  );
}
