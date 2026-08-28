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

const MARKUP_EXTENSIONS = new Set(['tsx', 'jsx', 'js', 'mjs', 'cjs', 'html', 'htm', 'xml', 'svg', 'vue', 'svelte', 'mdx', 'astro']);

export function collapseRegions(rows: DiffRow[], contiguous: boolean, filename: string): CollapseRegion[] {
  const side: Side = rows.some((row) => row.right) ? 'right' : 'left';
  const extension = extensionOf(filename);
  const brackets = bracketSpans(rows, side, contiguous, MARKUP_EXTENSIONS.has(extension));
  const importLine = IMPORT_BY_EXTENSION[extension];
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
  markup: boolean;
}

interface OpenBracket {
  open: string;
  row: number;
}

interface OpenTag {
  name: string;
  row: number;
}

interface Scan {
  state: ScanState;
  brackets: OpenBracket[];
  tags: OpenTag[];
  pending: { name: string; row: number; depth: number } | null;
}

type Token =
  | { t: 'bracket'; char: string }
  | { t: 'tagStart'; name: string }
  | { t: 'tagClose'; name: string }
  | { t: 'gt' }
  | { t: 'selfGt' }
  | { t: 'tagBreak' };

const CLOSE_TO_OPEN: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

function bracketSpans(rows: DiffRow[], side: Side, contiguous: boolean, markup: boolean): Span[] {
  const spans: Span[] = [];
  const scan: Scan = { state: { inBlockComment: false, inTemplate: false, markup }, brackets: [], tags: [], pending: null };
  rows.forEach((row, index) => {
    if (row.kind === 'hunk') {
      if (!contiguous) resetScan(scan);
      return;
    }
    const text = textOf(row, side);
    if (text === null) return;
    for (const token of tokensIn(text, scan.state)) applyToken(token, index, scan, spans);
  });
  return spans;
}

function resetScan(scan: Scan) {
  scan.state.inBlockComment = false;
  scan.state.inTemplate = false;
  scan.brackets.length = 0;
  scan.tags.length = 0;
  scan.pending = null;
}

function applyToken(token: Token, row: number, scan: Scan, spans: Span[]) {
  if (token.t === 'bracket') {
    trackPendingDepth(scan, token.char);
    applyBracket(token.char, row, scan.brackets, spans);
  } else if (token.t === 'tagStart') {
    scan.pending = { name: token.name, row, depth: 0 };
  } else if (token.t === 'tagClose') {
    scan.pending = null;
    closeTag(token.name, row, scan.tags, spans);
  } else {
    resolvePendingTag(token.t, row, scan, spans);
  }
}

function trackPendingDepth(scan: Scan, char: string) {
  if (!scan.pending) return;
  scan.pending.depth += char in CLOSE_TO_OPEN ? -1 : 1;
  if (scan.pending.depth < 0) scan.pending = null;
}

function resolvePendingTag(kind: 'gt' | 'selfGt' | 'tagBreak', row: number, scan: Scan, spans: Span[]) {
  const pending = scan.pending;
  if (!pending || pending.depth > 0) return;
  if (kind === 'gt') scan.tags.push({ name: pending.name, row: pending.row });
  if (kind === 'selfGt' && row > pending.row) spans.push({ start: pending.row, end: row, imports: false });
  scan.pending = null;
}

function closeTag(name: string, row: number, tags: OpenTag[], spans: Span[]) {
  for (let index = tags.length - 1; index >= 0; index -= 1) {
    const open = tags[index];
    if (!open || open.name !== name) continue;
    if (row > open.row) spans.push({ start: open.row, end: row, imports: false });
    tags.length = index;
    return;
  }
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

function tokensIn(text: string, state: ScanState): Token[] {
  const found: Token[] = [];
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

function plainCode(text: string, at: number, state: ScanState, found: Token[]): number {
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
  if ('()[]{}'.includes(char)) {
    found.push({ t: 'bracket', char });
    return at + 1;
  }
  if (state.markup) return markupCode(text, at, pair, found);
  return at + 1;
}

const TAG_CLOSE = /^<\/\s*([A-Za-z][\w.:$-]*)?\s*>/;
const TAG_START = /^<([A-Za-z][\w.:$-]*)/;

function markupCode(text: string, at: number, pair: string, found: Token[]): number {
  if (pair === '/>') {
    found.push({ t: 'selfGt' });
    return at + 2;
  }
  if (text[at] === '<') return tagToken(text, at, found);
  if (text[at] === '>' && text[at - 1] !== '=') found.push({ t: 'gt' });
  else if (text[at] === ';' || text[at] === '?') found.push({ t: 'tagBreak' });
  return at + 1;
}

function tagToken(text: string, at: number, found: Token[]): number {
  const rest = text.slice(at);
  const close = rest.match(TAG_CLOSE);
  if (close) {
    found.push({ t: 'tagClose', name: close[1] ?? '' });
    return at + close[0].length;
  }
  if (rest.startsWith('<>')) {
    found.push({ t: 'tagStart', name: '' }, { t: 'gt' });
    return at + 2;
  }
  const name = rest.match(TAG_START)?.[1];
  if (name !== undefined) found.push({ t: 'tagStart', name });
  return at + (name === undefined ? 1 : name.length + 1);
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
