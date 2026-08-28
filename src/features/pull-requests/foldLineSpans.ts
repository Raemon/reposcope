import type { LineRule } from './foldDialects';
import { pushSpan, scanRows, type Side, type Span } from './foldSpan';
import type { DiffRow } from './splitDiff';

interface TrackedRule {
  rule: LineRule;
  stack: number[];
}

export function lineRuleSpans(
  rows: DiffRow[],
  side: Side,
  contiguous: boolean,
  rules: LineRule[],
  covered: Set<number>,
): Span[] {
  if (rules.length === 0) return [];
  const spans: Span[] = [];
  const tracked = rules.map((rule) => ({ rule, stack: [] as number[] }));
  scanRows(
    rows,
    side,
    contiguous,
    () => tracked.forEach((held) => (held.stack.length = 0)),
    (text, index) => {
      if (!covered.has(index)) tracked.forEach((held) => applyLineRule(held, text, index, spans));
    },
  );
  return spans;
}

function applyLineRule(held: TrackedRule, text: string, row: number, spans: Span[]) {
  const { rule, stack } = held;
  if (rule.skip?.test(text)) return;
  if (rule.close.test(text)) {
    const open = stack.pop();
    if (open !== undefined) pushSpan(spans, open, row, rule.kind);
  }
  if (rule.open.test(text) && !rule.selfClosed?.test(text)) stack.push(row);
}

interface IndentScan {
  levels: { indent: number; row: number }[];
  lastContent: number;
}

const INDENT_COMMENT = /^\s*(#|\/\/|--)/;

export function indentSpans(rows: DiffRow[], side: Side, contiguous: boolean, covered: Set<number>): Span[] {
  const spans: Span[] = [];
  const scan: IndentScan = { levels: [], lastContent: -1 };
  scanRows(
    rows,
    side,
    contiguous,
    () => flushIndent(scan, spans),
    (text, index) => {
      if (!covered.has(index) && text.trim() !== '' && !INDENT_COMMENT.test(text)) {
        indentLine(indentOf(text), index, scan, spans);
      }
    },
  );
  flushIndent(scan, spans);
  return spans;
}

function indentLine(indent: number, row: number, scan: IndentScan, spans: Span[]) {
  while ((scan.levels[scan.levels.length - 1]?.indent ?? -1) >= indent) {
    const open = scan.levels.pop();
    if (open) pushSpan(spans, open.row, scan.lastContent, 'block');
  }
  scan.levels.push({ indent, row });
  scan.lastContent = row;
}

function flushIndent(scan: IndentScan, spans: Span[]) {
  while (scan.levels.length > 0) {
    const open = scan.levels.pop();
    if (open) pushSpan(spans, open.row, scan.lastContent, 'block');
  }
  scan.lastContent = -1;
}

function indentOf(text: string): number {
  const leading = text.match(/^[ \t]*/)?.[0] ?? '';
  return leading.replace(/\t/g, '        ').length;
}

interface MarkdownScan {
  sections: { level: number; row: number }[];
  lastContent: number;
  fenced: boolean;
}

export function markdownSpans(rows: DiffRow[], side: Side, contiguous: boolean): Span[] {
  const spans: Span[] = [];
  const scan: MarkdownScan = { sections: [], lastContent: -1, fenced: false };
  scanRows(
    rows,
    side,
    contiguous,
    () => resetMarkdown(scan, spans),
    (text, index) => markdownLine(text, index, scan, spans),
  );
  flushHeadings(scan, spans);
  return spans;
}

function resetMarkdown(scan: MarkdownScan, spans: Span[]) {
  flushHeadings(scan, spans);
  scan.lastContent = -1;
  scan.fenced = false;
}

function markdownLine(text: string, row: number, scan: MarkdownScan, spans: Span[]) {
  if (/^\s*(```|~~~)/.test(text)) {
    scan.fenced = !scan.fenced;
    scan.lastContent = row;
    return;
  }
  if (scan.fenced) {
    scan.lastContent = row;
    return;
  }
  const heading = /^(#{1,6})\s/.exec(text);
  if (heading) headingLine(heading[1]?.length ?? 1, row, scan, spans);
  else if (text.trim() !== '') scan.lastContent = row;
}

function headingLine(level: number, row: number, scan: MarkdownScan, spans: Span[]) {
  while ((scan.sections[scan.sections.length - 1]?.level ?? 0) >= level) {
    const open = scan.sections.pop();
    if (open) pushSpan(spans, open.row, scan.lastContent, 'section');
  }
  scan.sections.push({ level, row });
  scan.lastContent = row;
}

function flushHeadings(scan: MarkdownScan, spans: Span[]) {
  while (scan.sections.length > 0) {
    const open = scan.sections.pop();
    if (open) pushSpan(spans, open.row, scan.lastContent, 'section');
  }
}
