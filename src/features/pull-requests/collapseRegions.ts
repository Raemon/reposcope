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

type Side = 'left' | 'right';

const JS_IMPORT = /^\s*(import[\s({"']|export\s.*\sfrom\s|require\s*\(|\w[\w.]*\s*=\s*require\s*\()/;
const C_INCLUDE = /^\s*#\s*include[\s<"]/;
const PLAIN_IMPORT = /^\s*import\s/;

const IMPORT_BY_EXTENSION: Record<string, RegExp> = {
  ts: JS_IMPORT,
  tsx: JS_IMPORT,
  js: JS_IMPORT,
  jsx: JS_IMPORT,
  mjs: JS_IMPORT,
  cjs: JS_IMPORT,
  mts: JS_IMPORT,
  cts: JS_IMPORT,
  vue: JS_IMPORT,
  svelte: JS_IMPORT,
  py: /^\s*(import\s|from\s+\S+\s+import[\s(])/,
  go: /^\s*import[\s(]/,
  java: PLAIN_IMPORT,
  kt: PLAIN_IMPORT,
  kts: PLAIN_IMPORT,
  swift: PLAIN_IMPORT,
  scala: PLAIN_IMPORT,
  c: C_INCLUDE,
  h: C_INCLUDE,
  cc: C_INCLUDE,
  cpp: C_INCLUDE,
  hpp: C_INCLUDE,
  m: C_INCLUDE,
  mm: C_INCLUDE,
  rs: /^\s*(use\s+[\w:{*]|extern\s+crate\s)/,
  php: /^\s*(use\s+[\w\\]|require|include)/,
  cs: /^\s*(using\s+\w|global\s+using\s)/,
  rb: /^\s*require/,
};

export function collapseRegions(rows: DiffRow[], contiguous: boolean, filename: string): CollapseRegion[] {
  const side: Side = rows.some((row) => row.right) ? 'right' : 'left';
  const brackets = bracketSpans(rows, side, contiguous);
  const importLine = IMPORT_BY_EXTENSION[extensionOf(filename)];
  const imports = importLine ? importRuns(rows, side, importCoveredRows(rows, side, brackets, importLine), importLine, contiguous) : [];
  const wideEnough = brackets.filter((span) => span.end - span.start >= 2);
  return finalize(rows, [...imports, ...wideEnough]);
}

function extensionOf(filename: string): string {
  return filename.slice(filename.lastIndexOf('.') + 1).toLowerCase();
}

function textOf(row: DiffRow | undefined, side: Side): string | null {
  return row?.[side]?.text ?? null;
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

function bracketSpans(rows: DiffRow[], side: Side, contiguous: boolean): Span[] {
  const spans: Span[] = [];
  const state: ScanState = { inBlockComment: false, inTemplate: false };
  const stack: OpenBracket[] = [];
  rows.forEach((row, index) => {
    if (row.kind === 'hunk') {
      if (!contiguous) resetScan(state, stack);
      return;
    }
    const text = textOf(row, side);
    if (text === null) return;
    for (const bracket of bracketsIn(text, state)) applyBracket(bracket, index, stack, spans);
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
    if (state.inBlockComment) at = pastBlockComment(text, at, state);
    else if (state.inTemplate) at = pastTemplate(text, at, state);
    else at = plainCode(text, at, state, found);
  }
  return found;
}

function pastBlockComment(text: string, at: number, state: ScanState): number {
  const end = text.indexOf('*/', at);
  if (end < 0) return text.length;
  state.inBlockComment = false;
  return end + 2;
}

function pastTemplate(text: string, at: number, state: ScanState): number {
  const end = endOfSpan(text, at, '`');
  if (end !== null) state.inTemplate = false;
  return end ?? text.length;
}

function plainCode(text: string, at: number, state: ScanState, found: string[]): number {
  const char = text[at] ?? '';
  const pair = char + (text[at + 1] ?? '');
  if (pair === '//' || lineCommentHash(text, at)) return text.length;
  if (pair === '/*') {
    state.inBlockComment = true;
    return at + 2;
  }
  if (char === "'" || char === '"') return endOfSpan(text, at + 1, char) ?? text.length;
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

function endOfSpan(text: string, at: number, close: string): number | null {
  for (let scan = at; scan < text.length; scan += 1) {
    if (text[scan] === '\\') scan += 1;
    else if (text[scan] === close) return scan + 1;
  }
  return null;
}

function importCoveredRows(rows: DiffRow[], side: Side, brackets: Span[], importLine: RegExp): Set<number> {
  const covered = new Set<number>();
  for (const span of brackets) {
    if (!importLine.test(textOf(rows[span.start], side) ?? '')) continue;
    for (let row = span.start; row <= span.end; row += 1) covered.add(row);
  }
  return covered;
}

function importRuns(rows: DiffRow[], side: Side, covered: Set<number>, importLine: RegExp, contiguous: boolean): Span[] {
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
    const text = textOf(row, side);
    if (covered.has(index) || (text !== null && importLine.test(text))) {
      if (start < 0) start = index;
      last = index;
    } else if (start < 0 || (text !== null && text.trim() !== '')) {
      flush();
    }
  });
  flush();
  return runs;
}

function finalize(rows: DiffRow[], spans: Span[]): CollapseRegion[] {
  const byStart = new Map<number, Span>();
  for (const span of spans) byStart.set(span.start, preferredSpan(byStart.get(span.start), span));
  return [...byStart.values()].sort((a, b) => a.start - b.start).map((span) => regionOf(rows, span));
}

function preferredSpan(held: Span | undefined, candidate: Span): Span {
  if (!held) return candidate;
  if (candidate.end !== held.end) return candidate.end > held.end ? candidate : held;
  return candidate.imports ? candidate : held;
}

function regionOf(rows: DiffRow[], span: Span): CollapseRegion {
  const anchor = rows[span.start];
  return {
    ...span,
    key: `${anchor?.left?.line ?? 'x'}:${anchor?.right?.line ?? 'x'}`,
    hasChanges: rows.slice(span.start, span.end + 1).some((row) => row.kind === 'change'),
  };
}
