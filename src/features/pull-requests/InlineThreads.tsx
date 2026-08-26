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
// Keep in sync with the rendered height of a ThreadCard header row.
const CARD_HEADER = 22;
const MIN_SLOT = CARD_HEADER + EXPAND_BAR;

export function InlineThreads({
  path,
  rows,
  lines,
  onOverflow,
}: {
  path: string;
  rows: DiffRow[];
  lines: DiffLine[];
  onOverflow: (pixels: number) => void;
}) {
  const threads = useFileThreads(path);
  const anchors = useMemo(() => anchorThreads(threads, rows, lines), [threads, rows, lines]);
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
      {cards.map((card) => (
        <PlacedCard
          key={card.thread.rootId}
          top={card.top}
          clampTo={clampFor(card, heights)}
          expanded={expanded[card.thread.rootId] ?? false}
          onToggle={() => setExpanded((held) => ({ ...held, [card.thread.rootId]: !held[card.thread.rootId] }))}
          onHeight={(height) => measure(card.thread.rootId, height)}
        >
          <ThreadCard thread={card.thread} />
        </PlacedCard>
      ))}
    </div>
  );
}

function clampFor(card: PlacedThread, heights: Record<number, number>): number | null {
  const natural = heights[card.thread.rootId] ?? ROW_HEIGHT;
  return natural > card.slot ? card.slot : null;
}

function shownHeight(card: PlacedThread, heights: Record<number, number>, expanded: Record<number, boolean>): number {
  const natural = heights[card.thread.rootId] ?? ROW_HEIGHT;
  const clampTo = clampFor(card, heights);
  if (clampTo === null) return natural;
  return expanded[card.thread.rootId] ? natural + EXPAND_BAR : clampTo;
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

function PlacedCard({
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
  const overlaid = clampTo !== null && expanded;
  return (
    <div style={{ top }} className={`absolute inset-x-0 max-w-[500px] transition-[top] duration-150 ${overlaid ? 'z-10' : ''}`}>
      <div className={clipped ? 'overflow-hidden' : undefined} style={clipped ? { maxHeight: clampTo - EXPAND_BAR } : undefined}>
        <div ref={node}>{children}</div>
      </div>
      {clampTo !== null && (
        <button
          type="button"
          onClick={onToggle}
          style={{ height: EXPAND_BAR }}
          className="block w-full rounded-b border border-t-0 border-panel-edge bg-panel px-1.5 text-left text-[9px] italic leading-[13px] text-ink-dim hover:text-ink"
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      )}
    </div>
  );
}
