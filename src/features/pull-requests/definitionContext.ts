import { declarationPattern, roughSite, MAX_ROUGH_SITES, type DefinitionSite } from './definitionResolver';
import { expandDiff, splitLines } from './expandDiff';
import { splitDiff, type DiffRow } from './splitDiff';
import type { ChangedFile, ChangedFileSet } from './pullRequests';

export interface PeekView {
  rows: DiffRow[];
  changedInPull: boolean;
  truncated: boolean;
  sides: PeekSides;
}

export interface PeekSides {
  leftRef: string | null;
  leftPath: string;
  rightRef: string;
  rightPath: string;
}

export type PeekReadFile = (ref: string, path: string) => Promise<string | null>;

const MAX_PEEK_LINES = 60;

export async function definitionView(
  site: DefinitionSite,
  fileSet: ChangedFileSet | null,
  readFile: PeekReadFile,
): Promise<PeekView | null> {
  const changed = changedEntry(site, fileSet);
  if (changed?.patch && fileSet) {
    const overlaid = await diffView(site, changed, fileSet, readFile);
    if (overlaid) return overlaid;
  }
  const text = await readFile(site.ref, site.path);
  return text === null ? null : plainView(site, splitLines(text));
}

export function scanChangedFiles(fileSet: ChangedFileSet, word: string, excludePath: string): DefinitionSite[] {
  const pattern = declarationPattern(word);
  const sites: DefinitionSite[] = [];
  for (const file of fileSet.files) {
    if (file.filename === excludePath || !file.patch) continue;
    collectPatchSites(file, fileSet.headRef, pattern, sites);
    if (sites.length >= MAX_ROUGH_SITES) break;
  }
  return sites.slice(0, MAX_ROUGH_SITES);
}

function collectPatchSites(file: ChangedFile, headRef: string, pattern: RegExp, sites: DefinitionSite[]) {
  for (const row of splitDiff(file.patch ?? '')) {
    if (row.right && pattern.test(row.right.text)) sites.push(roughSite(file.filename, headRef, row.right.line));
  }
}

function changedEntry(site: DefinitionSite, fileSet: ChangedFileSet | null): ChangedFile | null {
  if (!fileSet) return null;
  if (site.ref === fileSet.headRef) return fileSet.files.find((file) => file.filename === site.path) ?? null;
  if (site.ref !== fileSet.baseRef) return null;
  return fileSet.files.find((file) => (file.previousFilename ?? file.filename) === site.path) ?? null;
}

async function diffView(
  site: DefinitionSite,
  changed: ChangedFile,
  fileSet: ChangedFileSet,
  readFile: PeekReadFile,
): Promise<PeekView | null> {
  const rows = await wholeFileRows(changed, fileSet, readFile);
  if (rows === null) return null;
  const side = site.ref === fileSet.baseRef ? 'left' : 'right';
  const sides = {
    leftRef: fileSet.baseRef,
    leftPath: changed.previousFilename ?? changed.filename,
    rightRef: fileSet.headRef,
    rightPath: changed.filename,
  };
  return slicedView(rows, side, clampSpan(site), sides);
}

async function wholeFileRows(
  changed: ChangedFile,
  fileSet: ChangedFileSet,
  readFile: PeekReadFile,
): Promise<DiffRow[] | null> {
  const patchRows = splitDiff(changed.patch ?? '');
  const [base, head] = await Promise.all([
    readFile(fileSet.baseRef, changed.previousFilename ?? changed.filename),
    readFile(fileSet.headRef, changed.filename),
  ]);
  if (base === null || head === null) return patchRows;
  return expandDiff(patchRows, splitLines(base), splitLines(head));
}

interface Span {
  start: number;
  end: number;
  truncated: boolean;
}

function clampSpan(site: DefinitionSite): Span {
  const end = Math.min(site.endLine, site.startLine + MAX_PEEK_LINES - 1);
  return { start: site.startLine, end, truncated: end < site.endLine };
}

function slicedView(rows: DiffRow[], side: 'left' | 'right', span: Span, sides: PeekSides): PeekView | null {
  const within = rows.flatMap((row, at) => {
    const line = row[side]?.line;
    return line !== undefined && line >= span.start && line <= span.end ? [at] : [];
  });
  const first = within[0];
  const last = within[within.length - 1];
  if (first === undefined || last === undefined) return null;
  const sliced = rows.slice(first, last + 1).filter((row) => row.kind !== 'hunk');
  return { rows: sliced, changedInPull: sliced.some((row) => row.kind === 'change'), truncated: span.truncated, sides };
}

function plainView(site: DefinitionSite, lines: string[]): PeekView {
  const span = clampSpan(site);
  const rows = lines.slice(span.start - 1, span.end).map((text, at) => contextRow(span.start + at, text));
  const sides = { leftRef: null, leftPath: site.path, rightRef: site.ref, rightPath: site.path };
  return { rows, changedInPull: false, truncated: span.truncated && span.end < lines.length, sides };
}

function contextRow(line: number, text: string): DiffRow {
  return { kind: 'context', label: '', left: null, right: { line, text } };
}
