import type { DiffCell, DiffRow } from './splitDiff';

export interface DiffLine {
  kind: DiffRow['kind'];
  label: string;
  side: 'left' | 'right';
  cell: DiffCell | null;
  row: number;
  touched: boolean;
  blank: boolean;
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

// Commented removed lines stay: hiding them would make an open thread vanish silently.
export function resultLines(rows: DiffRow[], commented: Set<number>): DiffLine[] {
  return columnLines(rows, 'right').filter((line) => keptInResult(line, commented));
}

function keptInResult(line: DiffLine, commented: Set<number>): boolean {
  return line.kind === 'hunk' || line.cell !== null || commented.has(line.row);
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
  const flags = { touched: row.touched === true, blank: blankRow(row) };
  return { kind: row.kind, label: row.label, side, cell: row[side], row: index, ...flags };
}

// Judged per row, not per side, so both columns of a split diff stay aligned.
function blankRow(row: DiffRow): boolean {
  return row.kind !== 'hunk' && (row.left?.text ?? '') === '' && (row.right?.text ?? '') === '';
}
