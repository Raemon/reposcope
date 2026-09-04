import type { DiffRow } from './splitDiff';

export const CONTEXT_BLOCKS = 35;

// A ceiling for the block budget, so a file with few folds to count still truncates.
const MAX_CONTEXT_ROWS = 150;

// A shorter run would trade about as many drawn rows as it saves for its own strip.
const MIN_RUN_ROWS = 3;

export interface Truncation {
  runOf: Map<number, number>;
  sizeOf: Map<number, number>;
}

export const NO_TRUNCATION: Truncation = { runOf: new Map(), sizeOf: new Map() };

export interface TruncationInput {
  rows: DiffRow[];
  folded: Set<number>;
  anchored: Set<number>;
  expanded: ReadonlySet<number>;
}

interface Shown {
  starts: number[];
  ends: number[];
  blocksBefore: number[];
  blockAt: number[];
}

interface Run {
  first: number;
  last: number;
}

export function truncateFarRows({ rows, folded, anchored, expanded }: TruncationInput): Truncation {
  const shown = shownRows(rows, folded);
  const near = nearInterest(rows, shown, anchored);
  // Nothing to be far from: a whole file with no diff would otherwise truncate entirely.
  if (!near.includes(true)) return NO_TRUNCATION;
  const truncation: Truncation = { runOf: new Map(), sizeOf: new Map() };
  for (const run of farRuns(shown, near)) cutRun(truncation, shown, run, expanded);
  return truncation;
}

// Folded rows fold into the shown row above, so a collapsed block counts as the one line it draws.
function shownRows(rows: DiffRow[], folded: Set<number>): Shown {
  const starts: number[] = [];
  rows.forEach((_row, index) => {
    if (!folded.has(index)) starts.push(index);
  });
  const ends = starts.map((_start, at) => (starts[at + 1] ?? rows.length) - 1);
  return { starts, ends, ...blockIndex(starts, ends) };
}

// A drawn row is a collapsed block when rows are folded under it; blank and loose rows are neither.
function blockIndex(starts: number[], ends: number[]): { blocksBefore: number[]; blockAt: number[] } {
  const blocksBefore = [0];
  const blockAt: number[] = [];
  starts.forEach((start, at) => {
    if ((ends[at] ?? start) > start) blockAt.push(at);
    blocksBefore.push(blockAt.length);
  });
  return { blocksBefore, blockAt };
}

function nearInterest(rows: DiffRow[], shown: Shown, anchored: Set<number>): boolean[] {
  return withinEdges(interestEdges(rows, shown, anchored));
}

// A difference array keeps marking the context around every change linear in file size.
function interestEdges(rows: DiffRow[], shown: Shown, anchored: Set<number>): number[] {
  const edges = new Array<number>(shown.starts.length + 1).fill(0);
  shown.starts.forEach((start, at) => {
    if (coversInterest(rows, start, shown.ends[at] ?? start, anchored)) widen(edges, shown, at);
  });
  return edges;
}

function withinEdges(edges: number[]): boolean[] {
  let depth = 0;
  return edges.map((edge) => (depth += edge) > 0);
}

function widen(edges: number[], shown: Shown, at: number) {
  const from = backOff(shown, at);
  const to = Math.min(edges.length - 1, aheadOf(shown, at) + 1);
  edges[from] = (edges[from] ?? 0) + 1;
  edges[to] = (edges[to] ?? 0) - 1;
}

// The window reaches the 35th collapsed block either side, or the row ceiling, whichever is nearer.
function aheadOf(shown: Shown, at: number): number {
  const past = shown.blockAt[blocksBefore(shown, at + 1) + CONTEXT_BLOCKS];
  const stop = Math.min(past ?? shown.starts.length, at + MAX_CONTEXT_ROWS + 1);
  return stop - 1;
}

function backOff(shown: Shown, at: number): number {
  const first = shown.blockAt[blocksBefore(shown, at) - CONTEXT_BLOCKS];
  return Math.max(first ?? 0, at - MAX_CONTEXT_ROWS, 0);
}

function blocksBefore(shown: Shown, at: number): number {
  return shown.blocksBefore[at] ?? 0;
}

function coversInterest(rows: DiffRow[], start: number, end: number, anchored: Set<number>): boolean {
  for (let row = start; row <= end; row += 1) {
    if (rows[row]?.kind === 'change' || anchored.has(row)) return true;
  }
  return false;
}

function farRuns(shown: Shown, near: boolean[]): Run[] {
  const runs: Run[] = [];
  shown.starts.forEach((_start, at) => {
    if (near[at]) return;
    const open = runs[runs.length - 1];
    if (open && open.last === at - 1) open.last = at;
    else runs.push({ first: at, last: at });
  });
  return runs;
}

function cutRun(truncation: Truncation, shown: Shown, run: Run, expanded: ReadonlySet<number>) {
  if (run.last - run.first + 1 < MIN_RUN_ROWS) return;
  const from = shown.starts[run.first] ?? 0;
  const to = shown.ends[run.last] ?? from;
  if (expanded.has(from)) return;
  for (let row = from; row <= to; row += 1) truncation.runOf.set(row, from);
  truncation.sizeOf.set(from, to - from + 1);
}
