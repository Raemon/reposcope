import type { DiffCell, DiffRow } from './splitDiff';

export interface DiffLine {
  kind: DiffRow['kind'];
  label: string;
  side: 'left' | 'right';
  cell: DiffCell | null;
  row: number;
  touched: boolean;
}

interface PlacedRow {
  row: DiffRow;
  index: number;
}

export function columnLines(rows: DiffRow[], side: 'left' | 'right'): DiffLine[] {
  return rows.map((row, index) => lineOf(row, index, side));
}

export function unifiedLines(rows: DiffRow[]): DiffLine[] {
  return changeRuns(rows).flatMap(runLines);
}

export function visibleLines(lines: DiffLine[], hidden: Set<number>): DiffLine[] {
  if (hidden.size === 0) return lines;
  return lines.filter((line) => line.kind === 'hunk' || !hidden.has(line.row));
}

function changeRuns(rows: DiffRow[]): PlacedRow[][] {
  const runs: PlacedRow[][] = [];
  rows.forEach((row, index) => {
    const open = runs[runs.length - 1];
    if (row.kind === 'change' && open?.[0]?.row.kind === 'change') open.push({ row, index });
    else runs.push([{ row, index }]);
  });
  return runs;
}

function runLines(run: PlacedRow[]): DiffLine[] {
  if (run[0]?.row.kind !== 'change') return run.map(({ row, index }) => lineOf(row, index, 'right'));
  return [...sideLines(run, 'left'), ...sideLines(run, 'right')];
}

function sideLines(run: PlacedRow[], side: 'left' | 'right'): DiffLine[] {
  return run.filter(({ row }) => row[side]).map(({ row, index }) => lineOf(row, index, side));
}

function lineOf(row: DiffRow, index: number, side: 'left' | 'right'): DiffLine {
  return { kind: row.kind, label: row.label, side, cell: row[side], row: index, touched: row.touched === true };
}
