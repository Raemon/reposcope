import type { DiffRow } from './splitDiff';

export interface Span {
  start: number;
  end: number;
  imports: boolean;
}

export type Side = 'left' | 'right';

export function textOf(row: DiffRow | undefined, side: Side): string | null {
  return row?.[side]?.text ?? null;
}

export function pushSpan(spans: Span[], start: number, end: number) {
  if (end > start) spans.push({ start, end, imports: false });
}

export function scanRows(
  rows: DiffRow[],
  side: Side,
  contiguous: boolean,
  onBreak: () => void,
  onLine: (text: string, index: number) => void,
) {
  rows.forEach((row, index) => {
    if (row.kind === 'hunk') {
      if (!contiguous) onBreak();
      return;
    }
    const text = textOf(row, side);
    if (text !== null) onLine(text, index);
  });
}
