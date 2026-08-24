export interface CharRange {
  start: number;
  end: number;
}

export interface IntralineRanges {
  before: CharRange[];
  after: CharRange[];
}

const WORD = /\s+|[A-Za-z0-9_$]+|[^\s]/g;
const MAX_WORD_PAIRS = 40000;
const MAX_CHANGED_SHARE = 0.7;

interface Word {
  text: string;
  start: number;
}

function splitWords(line: string): Word[] {
  return [...line.matchAll(WORD)].map((match) => ({ text: match[0], start: match.index }));
}

function textAt(words: Word[], index: number): string | null {
  return words[index]?.text ?? null;
}

function commonPrefix(before: Word[], after: Word[]): number {
  let count = 0;
  while (count < before.length && count < after.length && textAt(before, count) === textAt(after, count)) {
    count += 1;
  }
  return count;
}

function commonSuffix(before: Word[], after: Word[], prefix: number): number {
  let count = 0;
  const limit = Math.min(before.length, after.length) - prefix;
  while (
    count < limit &&
    textAt(before, before.length - 1 - count) === textAt(after, after.length - 1 - count)
  ) {
    count += 1;
  }
  return count;
}

/** Longest-common-subsequence table read as `table[i * stride + j]`. */
function lcsTable(before: Word[], after: Word[]): { table: Uint16Array; stride: number } {
  const stride = after.length + 1;
  const table = new Uint16Array((before.length + 1) * stride);
  for (let i = before.length - 1; i >= 0; i -= 1) {
    for (let j = after.length - 1; j >= 0; j -= 1) {
      const skipBefore = table[(i + 1) * stride + j] ?? 0;
      const skipAfter = table[i * stride + j + 1] ?? 0;
      table[i * stride + j] =
        textAt(before, i) === textAt(after, j)
          ? (table[(i + 1) * stride + j + 1] ?? 0) + 1
          : Math.max(skipBefore, skipAfter);
    }
  }
  return { table, stride };
}

/** Word indices that differ, for the stretch between the shared prefix and suffix. */
function diffWords(before: Word[], after: Word[]): { before: number[]; after: number[] } {
  const beforeChanged: number[] = [];
  const afterChanged: number[] = [];
  if (before.length * after.length > MAX_WORD_PAIRS) {
    return { before: before.map((_, index) => index), after: after.map((_, index) => index) };
  }
  const { table, stride } = lcsTable(before, after);
  let i = 0;
  let j = 0;
  while (i < before.length && j < after.length) {
    if (textAt(before, i) === textAt(after, j)) {
      i += 1;
      j += 1;
    } else if ((table[(i + 1) * stride + j] ?? 0) >= (table[i * stride + j + 1] ?? 0)) {
      beforeChanged.push(i);
      i += 1;
    } else {
      afterChanged.push(j);
      j += 1;
    }
  }
  for (; i < before.length; i += 1) beforeChanged.push(i);
  for (; j < after.length; j += 1) afterChanged.push(j);
  return { before: beforeChanged, after: afterChanged };
}

function toRanges(words: Word[], changedIndices: number[]): CharRange[] {
  const ranges: CharRange[] = [];
  for (const index of changedIndices) {
    const word = words[index];
    if (!word) continue;
    const end = word.start + word.text.length;
    const previous = ranges[ranges.length - 1];
    if (previous && previous.end === word.start) previous.end = end;
    else ranges.push({ start: word.start, end });
  }
  return ranges;
}

function changedChars(ranges: CharRange[]): number {
  return ranges.reduce((total, range) => total + (range.end - range.start), 0);
}

/**
 * Character ranges that actually differ between a removed line and its paired
 * added line. Returns null when the two lines share too little to make
 * word-level highlighting meaningful, leaving the whole line highlighted.
 */
export function intralineRanges(before: string, after: string): IntralineRanges | null {
  if (before === after || !before.trim() || !after.trim()) return null;

  const beforeWords = splitWords(before);
  const afterWords = splitWords(after);
  const prefix = commonPrefix(beforeWords, afterWords);
  const suffix = commonSuffix(beforeWords, afterWords, prefix);
  const beforeMiddle = beforeWords.slice(prefix, beforeWords.length - suffix);
  const afterMiddle = afterWords.slice(prefix, afterWords.length - suffix);

  const changed = diffWords(beforeMiddle, afterMiddle);
  const beforeRanges = toRanges(beforeMiddle, changed.before);
  const afterRanges = toRanges(afterMiddle, changed.after);
  if (!beforeRanges.length && !afterRanges.length) return null;

  const mostlyChanged =
    changedChars(beforeRanges) > before.length * MAX_CHANGED_SHARE &&
    changedChars(afterRanges) > after.length * MAX_CHANGED_SHARE;
  if (mostlyChanged) return null;

  return { before: beforeRanges, after: afterRanges };
}
