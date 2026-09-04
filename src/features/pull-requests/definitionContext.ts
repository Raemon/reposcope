import { declarationPattern, roughSite, MAX_ROUGH_SITES, type DefinitionSite } from './definitionResolver';
import { expandDiff, splitLines } from './expandDiff';
import { memoPromise } from './promiseMemo';
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

export interface PeekSources {
  readFile: PeekReadFile;
  changedRows(changed: ChangedFile, fileSet: ChangedFileSet): Promise<DiffRow[] | null>;
}

const MAX_PEEK_LINES = 60;

export function peekSources(readFile: PeekReadFile): PeekSources {
  const rows = new Map<string, Promise<DiffRow[] | null>>();
  return {
    readFile,
    changedRows: (changed, fileSet) =>
      memoPromise(rows, `${fileSet.baseRef}\0${fileSet.headRef}\0${changed.filename}`, () =>
        wholeFileRows(changed, fileSet, readFile),
      ),
  };
}

export function changedFileSides(file: ChangedFile, baseRef: string, headRef: string): PeekSides {
  return { leftRef: baseRef, leftPath: file.previousFilename ?? file.filename, rightRef: headRef, rightPath: file.filename };
}

export async function definitionView(
  site: DefinitionSite,
  fileSet: ChangedFileSet | null,
  sources: PeekSources,
): Promise<PeekView | null> {
  const changed = changedEntry(site, fileSet);
  if (changed?.patch && fileSet) {
    const overlaid = await diffView(site, changed, fileSet, sources);
    if (overlaid) return overlaid;
  }
  const text = await sources.readFile(site.ref, site.path);
  return text === null ? null : plainView(site, splitLines(text));
}

export function scanChangedFiles(fileSet: ChangedFileSet, word: string, excludePath: string): DefinitionSite[] {
  const pattern = declarationPattern(word);
  const sites: DefinitionSite[] = [];
  for (const { file, rows } of patchRowsOf(fileSet)) {
    if (file.filename === excludePath) continue;
    collectPatchSites(file, rows, fileSet.headRef, pattern, sites);
    if (sites.length >= MAX_ROUGH_SITES) break;
  }
  return sites.slice(0, MAX_ROUGH_SITES);
}

export interface PatchRows {
  file: ChangedFile;
  rows: DiffRow[];
}

const splitPatches = new WeakMap<ChangedFileSet, PatchRows[]>();

export function patchRowsOf(fileSet: ChangedFileSet): PatchRows[] {
  const held = splitPatches.get(fileSet);
  if (held) return held;
  const split = fileSet.files.filter((file) => file.patch).map((file) => ({ file, rows: splitDiff(file.patch ?? '') }));
  splitPatches.set(fileSet, split);
  return split;
}

function collectPatchSites(file: ChangedFile, rows: DiffRow[], headRef: string, pattern: RegExp, sites: DefinitionSite[]) {
  for (const row of rows) {
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
  sources: PeekSources,
): Promise<PeekView | null> {
  const rows = await sources.changedRows(changed, fileSet);
  if (rows === null) return null;
  const side = site.ref === fileSet.baseRef ? 'left' : 'right';
  return slicedView(rows, side, clampSpan(site), changedFileSides(changed, fileSet.baseRef, fileSet.headRef));
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
