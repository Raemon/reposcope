import type { DiffRow } from './splitDiff';

export interface Span {
  start: number;
  end: number;
  kind: string;
  imports: boolean;
}

export type Side = 'left' | 'right';

export function textOf(row: DiffRow | undefined, side: Side): string | null {
  return row?.[side]?.text ?? null;
}

export function scanSide(rows: DiffRow[]): Side {
  return rows.some((row) => row.right) ? 'right' : 'left';
}

export function pushSpan(spans: Span[], start: number, end: number, kind: string) {
  if (end > start) spans.push({ start, end, kind, imports: false });
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

export function scanRowsFlushing(
  rows: DiffRow[],
  side: Side,
  contiguous: boolean,
  flush: () => void,
  onLine: (text: string, index: number) => void,
) {
  scanRows(rows, side, contiguous, flush, onLine);
  flush();
}

export function addRowRange(covered: Set<number>, start: number, end: number) {
  for (let row = start; row <= end; row += 1) covered.add(row);
}

export function innerRows(span: { start: number; end: number }): number[] {
  const rows: number[] = [];
  for (let row = span.start + 1; row <= span.end; row += 1) rows.push(row);
  return rows;
}

export interface ScanSegment {
  lineRows: number[];
  text: string;
}

export function scanSegments(rows: DiffRow[], side: Side, contiguous: boolean): ScanSegment[] {
  const segments: ScanSegment[] = [];
  let lineRows: number[] = [];
  let lines: string[] = [];
  const close = () => {
    if (lineRows.length > 0) segments.push({ lineRows, text: lines.join('\n') });
    lineRows = [];
    lines = [];
  };
  scanRowsFlushing(rows, side, contiguous, close, (text, index) => {
    lineRows.push(index);
    lines.push(text);
  });
  return segments;
}
