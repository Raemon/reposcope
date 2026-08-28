import type { DiffSort } from './diffSortStore';
import { sortByFolder } from './fileTree';
import type { ChangedFile } from './pullRequests';
import type { ReviewThread } from './reviewThreads';

export function commentCountsOf(threads: ReviewThread[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const thread of threads) {
    counts.set(thread.path, (counts.get(thread.path) ?? 0) + thread.comments.length);
  }
  return counts;
}

export function sortChangedFiles(files: ChangedFile[], sort: DiffSort, comments: Map<string, number>): ChangedFile[] {
  const base = sortByFolder(files);
  if (sort === 'folder') return base;
  if (sort === 'diffAll') return byDescending(base, allDiffCount);
  if (sort === 'diff') return byDescending(base, nonImportDiffCount);
  return byDescending(base, (file) => comments.get(file.filename) ?? 0, nonImportDiffCount);
}

function byDescending(files: ChangedFile[], ...ranks: ((file: ChangedFile) => number)[]): ChangedFile[] {
  const scored = files.map((file) => ({ file, scores: ranks.map((rank) => rank(file)) }));
  scored.sort((a, b) => firstDifference(b.scores, a.scores));
  return scored.map((entry) => entry.file);
}

function firstDifference(a: number[], b: number[]): number {
  return a.reduce((held, score, at) => held || score - (b[at] ?? 0), 0);
}

function allDiffCount(file: ChangedFile): number {
  return file.additions + file.deletions;
}

export function nonImportDiffCount(file: ChangedFile): number {
  if (file.patch === null) return allDiffCount(file);
  let counted = 0;
  let inImport = false;
  for (const line of file.patch.split('\n')) {
    const read = readPatchLine(line, inImport);
    inImport = read.inImport;
    if (read.counts) counted += 1;
  }
  return counted;
}

function readPatchLine(line: string, inImport: boolean): { counts: boolean; inImport: boolean } {
  const changed = isChangedLine(line);
  if (!changed && !line.startsWith(' ')) return { counts: false, inImport: false };
  const text = line.slice(1).trim();
  const importing = inImport || IMPORT_OPEN.test(text);
  return { counts: changed && !importing, inImport: importing && IMPORT_CONTINUES.test(text) };
}

function isChangedLine(line: string): boolean {
  return (line.startsWith('+') || line.startsWith('-')) && !line.startsWith('+++') && !line.startsWith('---');
}

const IMPORT_OPEN =
  /^(import[\s({"']|export\s+(\*|\{[^}]*\}|type\s+\{[^}]*\})\s+from\s|\}\s+from\s+['"]|from\s+\S+\s+import[\s(]|(const|let|var)\s+[^=]+=\s*require\s*\(|require\s+['"]|use\s+\S+;|#include[\s<"]|using\s+\S+;)/;
const IMPORT_CONTINUES = /[,{(]\s*$/;
