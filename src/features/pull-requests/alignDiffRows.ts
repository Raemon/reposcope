import type { DiffCell, DiffRow } from './splitDiff';

const MAX_ALIGN_CELLS = 250000;
const MAX_SCORE_CELLS = 10000;
const MIN_PAIR_MATCH_SHARE = 0.5;
const WORD = /\s+|[A-Za-z0-9_$]+|[^\s]/gu;

interface Anchor {
  left: number;
  right: number;
}

/**
 * Pairs the removed/added lines of a change block. Lines that are equal after
 * trimming become anchors (so unwrapping/reindenting shows as indent-only
 * changes plus pure deletes), and the gaps between anchors zip by index —
 * unless the zipped pairs would share too little content, in which case the
 * gap renders as a block delete followed by a block insert.
 */
export function alignedChangeRows(removed: DiffCell[], added: DiffCell[]): DiffRow[] {
  const rows: DiffRow[] = [];
  let gapStart: Anchor = { left: 0, right: 0 };
  for (const anchor of trimEqualAnchors(removed, added)) {
    gapRows(rows, removed.slice(gapStart.left, anchor.left), added.slice(gapStart.right, anchor.right));
    rows.push(changeRow(removed[anchor.left] ?? null, added[anchor.right] ?? null));
    gapStart = { left: anchor.left + 1, right: anchor.right + 1 };
  }
  gapRows(rows, removed.slice(gapStart.left), added.slice(gapStart.right));
  return rows;
}

function gapRows(rows: DiffRow[], removed: DiffCell[], added: DiffCell[]): void {
  if (pairsShareEnough(removed, added)) zipRows(rows, removed, added);
  else unpairedRows(rows, removed, added);
}

function zipRows(rows: DiffRow[], removed: DiffCell[], added: DiffCell[]): void {
  for (let index = 0; index < Math.max(removed.length, added.length); index += 1) {
    rows.push(changeRow(removed[index] ?? null, added[index] ?? null));
  }
}

function unpairedRows(rows: DiffRow[], removed: DiffCell[], added: DiffCell[]): void {
  for (const cell of removed) rows.push(changeRow(cell, null));
  for (const cell of added) rows.push(changeRow(null, cell));
}

function changeRow(left: DiffCell | null, right: DiffCell | null): DiffRow {
  return { kind: 'change', label: '', left, right };
}

function pairsShareEnough(removed: DiffCell[], added: DiffCell[]): boolean {
  let matched = 0;
  let total = 0;
  for (let index = 0; index < Math.min(removed.length, added.length); index += 1) {
    const before = removed[index]?.text ?? '';
    const after = added[index]?.text ?? '';
    matched += 2 * sharedContentChars(before, after);
    total += contentChars(before) + contentChars(after);
  }
  return matched >= total * MIN_PAIR_MATCH_SHARE;
}

function contentChars(line: string): number {
  return line.replace(/\s+/gu, '').length;
}

/** Non-whitespace chars the two lines share, by word-level weighted LCS. */
function sharedContentChars(before: string, after: string): number {
  const beforeWords = before.match(WORD) ?? [];
  const afterWords = after.match(WORD) ?? [];
  if (beforeWords.length * afterWords.length > MAX_SCORE_CELLS) return 0;
  const { table } = weightTable(beforeWords, afterWords, wordWeight);
  return table[0] ?? 0;
}

function wordWeight(before: string | undefined, after: string | undefined): number {
  return before !== undefined && before.trim() !== '' && before === after ? before.length : 0;
}

function trimEqualAnchors(removed: DiffCell[], added: DiffCell[]): Anchor[] {
  if (removed.length === 0 || added.length === 0) return [];
  if (removed.length * added.length > MAX_ALIGN_CELLS) return [];
  const before = removed.map((cell) => cell.text.trim());
  const after = added.map((cell) => cell.text.trim());
  return backtrackAnchors(before, after, weightTable(before, after, matchWeight));
}

/** Length-weighting keeps stray `}`/`>` lines from anchoring over real content. */
function matchWeight(before: string | undefined, after: string | undefined): number {
  return before !== undefined && before !== '' && before === after ? before.length : 0;
}

type Weigh = (before: string | undefined, after: string | undefined) => number;

interface WeightTable {
  table: Uint32Array;
  stride: number;
}

/** Weighted-LCS table over suffixes, read as `table[i * stride + j]`. */
function weightTable(before: string[], after: string[], weigh: Weigh): WeightTable {
  const stride = after.length + 1;
  const table = new Uint32Array((before.length + 1) * stride);
  for (let i = before.length - 1; i >= 0; i -= 1) {
    for (let j = after.length - 1; j >= 0; j -= 1) {
      const weight = weigh(before[i], after[j]);
      const skipBefore = table[(i + 1) * stride + j] ?? 0;
      const skipAfter = table[i * stride + j + 1] ?? 0;
      const matched = weight === 0 ? 0 : weight + (table[(i + 1) * stride + j + 1] ?? 0);
      table[i * stride + j] = Math.max(matched, skipBefore, skipAfter);
    }
  }
  return { table, stride };
}

function backtrackAnchors(before: string[], after: string[], { table, stride }: WeightTable): Anchor[] {
  const anchors: Anchor[] = [];
  let i = 0;
  let j = 0;
  while (i < before.length && j < after.length) {
    const weight = matchWeight(before[i], after[j]);
    const skipBefore = table[(i + 1) * stride + j] ?? 0;
    const skipAfter = table[i * stride + j + 1] ?? 0;
    const matchIsOptimal = weight > 0 && table[i * stride + j] === weight + (table[(i + 1) * stride + j + 1] ?? 0);
    if (matchIsOptimal) {
      anchors.push({ left: i, right: j });
      i += 1;
      j += 1;
    } else if (skipBefore >= skipAfter) i += 1;
    else j += 1;
  }
  return anchors;
}
