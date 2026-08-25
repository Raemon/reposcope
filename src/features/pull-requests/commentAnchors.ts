import { ROW_HEIGHT } from './diffMetrics';
import type { DiffLine } from './diffLines';
import type { ReviewThread } from './reviewThreads';
import type { DiffRow } from './splitDiff';

export interface AnchoredThread {
  thread: ReviewThread;
  anchorTop: number;
}

export interface PlacedThread {
  thread: ReviewThread;
  top: number;
  slot: number;
}

export function anchorThreads(
  threads: ReviewThread[],
  rows: DiffRow[],
  lines: DiffLine[],
  nearest = false,
): AnchoredThread[] {
  return threads
    .map((thread) => ({ thread, anchorTop: anchorTopOf(thread, rows, lines, nearest) }))
    .filter((anchored): anchored is AnchoredThread => anchored.anchorTop !== null)
    .sort((a, b) => a.anchorTop - b.anchorTop);
}

export function placeThreads(anchors: AnchoredThread[], heights: Record<number, number>, gap: number, minSlot: number): PlacedThread[] {
  const tops = stackedTops(anchors, heights, gap, minSlot);
  return anchors.map(({ thread }, index) => {
    const top = tops[index] ?? 0;
    const nextTop = index + 1 < tops.length ? tops[index + 1] ?? 0 : Infinity;
    return { thread, top, slot: nextTop - gap - top };
  });
}

function stackedTops(anchors: AnchoredThread[], heights: Record<number, number>, gap: number, minSlot: number): number[] {
  let floor = 0;
  return anchors.map(({ thread, anchorTop }) => {
    const top = Math.max(anchorTop, floor);
    floor = top + Math.min(heights[thread.rootId] ?? ROW_HEIGHT, minSlot) + gap;
    return top;
  });
}

function anchorTopOf(thread: ReviewThread, rows: DiffRow[], lines: DiffLine[], nearest: boolean): number | null {
  const row = rowOf(thread, rows, nearest);
  if (row < 0) return null;
  const index = displayIndexOf(row, thread.side, lines);
  return index < 0 ? null : index * ROW_HEIGHT;
}

function rowOf(thread: ReviewThread, rows: DiffRow[], nearest: boolean): number {
  if (thread.line === null) return -1;
  const exact = rows.findIndex((row) => row[thread.side]?.line === thread.line);
  return exact >= 0 || !nearest ? exact : lastRowAbove(thread.line, thread.side, rows);
}

function lastRowAbove(line: number, side: 'left' | 'right', rows: DiffRow[]): number {
  let above = -1;
  rows.forEach((row, index) => {
    const at = row[side]?.line;
    if (at !== undefined && at <= line) above = index;
  });
  return above;
}

function displayIndexOf(row: number, side: 'left' | 'right', lines: DiffLine[]): number {
  const onSide = lines.findIndex((line) => line.row === row && line.side === side);
  return onSide >= 0 ? onSide : lines.findIndex((line) => line.row === row);
}
