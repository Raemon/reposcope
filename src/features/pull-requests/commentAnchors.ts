import { ROW_HEIGHT } from './diffMetrics';
import type { DiffLine } from './diffLines';
import type { ReviewThread } from './reviewThreads';
import type { DiffRow } from './splitDiff';

export interface AnchoredThread {
  thread: ReviewThread;
  anchorTop: number;
}

export function anchorThreads(threads: ReviewThread[], rows: DiffRow[], lines: DiffLine[]): AnchoredThread[] {
  return threads
    .map((thread) => ({ thread, anchorTop: anchorTopOf(thread, rows, lines) }))
    .filter((anchored): anchored is AnchoredThread => anchored.anchorTop !== null)
    .sort((a, b) => a.anchorTop - b.anchorTop);
}

export function stackedTops(anchors: AnchoredThread[], heights: Record<number, number>, gap: number): number[] {
  let floor = 0;
  return anchors.map(({ thread, anchorTop }) => {
    const top = Math.max(anchorTop, floor);
    floor = top + (heights[thread.rootId] ?? ROW_HEIGHT) + gap;
    return top;
  });
}

function anchorTopOf(thread: ReviewThread, rows: DiffRow[], lines: DiffLine[]): number | null {
  const row = rowOf(thread, rows);
  if (row < 0) return null;
  const index = displayIndexOf(row, thread.side, lines);
  return index < 0 ? null : index * ROW_HEIGHT;
}

function rowOf(thread: ReviewThread, rows: DiffRow[]): number {
  if (thread.line === null) return -1;
  return rows.findIndex((row) => row[thread.side]?.line === thread.line);
}

function displayIndexOf(row: number, side: 'left' | 'right', lines: DiffLine[]): number {
  const onSide = lines.findIndex((line) => line.row === row && line.side === side);
  return onSide >= 0 ? onSide : lines.findIndex((line) => line.row === row);
}
