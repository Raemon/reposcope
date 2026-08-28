import type { DiffRow } from './splitDiff';

export interface CollapseRegion {
  start: number;
  end: number;
  key: string;
  imports: boolean;
  hasChanges: boolean;
}

interface Span {
  start: number;
  end: number;
  imports: boolean;
}

const IMPORT_LINE =
  /^\s*(import[\s({"']|export\s.*\sfrom\s|from\s+\S+\s+import[\s(]|#include[\s<"]|use\s+[\w:*{]|using\s+\w|require\s*\(|\w[\w.]*\s*=\s*require\s*\()/;

export function collapseRegions(rows: DiffRow[], contiguous: boolean): CollapseRegion[] {
  const brackets = bracketSpans(rows, contiguous);
  const imports = importRuns(rows, importCoveredRows(rows, brackets), contiguous);
  const wideEnough = brackets.filter((span) => span.end - span.start >= 2);
  return finalize(rows, [...imports, ...wideEnough]);
}

function displayText(row: DiffRow | undefined): string {
  return row?.right?.text ?? row?.left?.text ?? '';
}

function isImportLine(text: string): boolean {
  return IMPORT_LINE.test(text);
}

interface ScanState {
  inBlockComment: boolean;
  inTemplate: boolean;
}

interface OpenBracket {
  open: string;
  row: number;
}

const CLOSE_TO_OPEN: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

function bracketSpans(rows: DiffRow[], contiguous: boolean): Span[] {
  const spans: Span[] = [];
  const state: ScanState = { inBlockComment: false, inTemplate: false };
  const stack: OpenBracket[] = [];
  rows.forEach((row, index) => {
    if (row.kind === 'hunk') {
      if (!contiguous) resetScan(state, stack);
      return;
    }
    for (const bracket of bracketsIn(displayText(row), state)) applyBracket(bracket, index, stack, spans);
  });
  return spans;
}

function resetScan(state: ScanState, stack: OpenBracket[]) {
  state.inBlockComment = false;
  state.inTemplate = false;
  stack.length = 0;
}

function applyBracket(bracket: string, row: number, stack: OpenBracket[], spans: Span[]) {
  const expected = CLOSE_TO_OPEN[bracket];
  if (!expected) {
    stack.push({ open: bracket, row });
    return;
  }
  const top = stack.pop();
  if (!top || top.open !== expected) {
    stack.length = 0;
    return;
  }
  if (row > top.row) spans.push({ start: top.row, end: row, imports: false });
}

function bracketsIn(text: string, state: ScanState): string[] {
  const found: string[] = [];
  let at = 0;
  while (at < text.length) {
    if (state.inBlockComment) {
      const end = text.indexOf('*/', at);
      if (end < 0) return found;
      state.inBlockComment = false;
      at = end + 2;
    } else if (state.inTemplate) {
      at = skipTemplate(text, at, state);
    } else {
      const next = plainCode(text, at, state, found);
      if (next < 0) return found;
      at = next;
    }
  }
  return found;
}

function plainCode(text: string, at: number, state: ScanState, found: string[]): number {
  const char = text[at] ?? '';
  const pair = char + (text[at + 1] ?? '');
  if (pair === '//' || lineCommentHash(text, at)) return -1;
  if (pair === '/*') {
    state.inBlockComment = true;
    return at + 2;
  }
  if (char === "'" || char === '"') return skipString(text, at);
  if (char === '`') {
    state.inTemplate = true;
    return at + 1;
  }
  if ('()[]{}'.includes(char)) found.push(char);
  return at + 1;
}

function lineCommentHash(text: string, at: number): boolean {
  return text[at] === '#' && (at === 0 || /\s/.test(text[at - 1] ?? ''));
}

function skipString(text: string, at: number): number {
  const quote = text[at];
  for (let scan = at + 1; scan < text.length; scan += 1) {
    if (text[scan] === '\\') scan += 1;
    else if (text[scan] === quote) return scan + 1;
  }
  return text.length;
}

function skipTemplate(text: string, at: number, state: ScanState): number {
  for (let scan = at; scan < text.length; scan += 1) {
    if (text[scan] === '\\') scan += 1;
    else if (text[scan] === '`') {
      state.inTemplate = false;
      return scan + 1;
    }
  }
  return text.length;
}

function importCoveredRows(rows: DiffRow[], brackets: Span[]): Set<number> {
  const covered = new Set<number>();
  for (const span of brackets) {
    if (!isImportLine(displayText(rows[span.start]))) continue;
    for (let row = span.start; row <= span.end; row += 1) covered.add(row);
  }
  return covered;
}

function importRuns(rows: DiffRow[], covered: Set<number>, contiguous: boolean): Span[] {
  const runs: Span[] = [];
  let start = -1;
  let last = -1;
  const flush = () => {
    if (start >= 0 && last > start) runs.push({ start, end: last, imports: true });
    start = -1;
    last = -1;
  };
  rows.forEach((row, index) => {
    if (row.kind === 'hunk') {
      if (!contiguous) flush();
      return;
    }
    const text = displayText(row);
    if (covered.has(index) || isImportLine(text)) {
      if (start < 0) start = index;
      last = index;
    } else if (start < 0 || text.trim() !== '') {
      flush();
    }
  });
  flush();
  return runs;
}

function finalize(rows: DiffRow[], spans: Span[]): CollapseRegion[] {
  const byStart = new Map<number, Span>();
  for (const span of spans) {
    const held = byStart.get(span.start);
    if (!held || span.end > held.end || (span.end === held.end && span.imports)) byStart.set(span.start, span);
  }
  return [...byStart.values()].sort((a, b) => a.start - b.start).map((span) => regionOf(rows, span));
}

function regionOf(rows: DiffRow[], span: Span): CollapseRegion {
  const anchor = rows[span.start];
  return {
    ...span,
    key: `${anchor?.left?.line ?? 'x'}:${anchor?.right?.line ?? 'x'}`,
    hasChanges: rows.slice(span.start, span.end + 1).some((row) => row.kind === 'change'),
  };
}
