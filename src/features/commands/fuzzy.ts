export interface FuzzyMatch {
  score: number;
  positions: number[];
}

export interface FuzzyHit<T> {
  item: T;
  match: FuzzyMatch;
}

interface Best {
  score: number;
  at: number;
}

interface ScoreTable {
  scores: Float64Array;
  parents: Int32Array;
  width: number;
}

const BOUNDARY = 8;
const CAMEL = 6;
const CONSECUTIVE = 5;
const PLAIN = 1;
const START = 4;
const GAP = 3;
const LENGTH_TAX = 0.01;
const SEPARATORS = new Set([' ', '/', '_', '-', '.', ':', '#', '@', '(', ')', '[', ']']);
const NOTHING: Best = { score: -Infinity, at: -1 };

export function fuzzyMatch(query: string, text: string): FuzzyMatch | null {
  const tokens = query.split(/\s+/).filter((token) => token !== '');
  if (tokens.length === 0) return { score: 0, positions: [] };
  const held = { score: 0, positions: new Set<number>() };
  for (const token of tokens) {
    const match = matchToken(token.toLowerCase(), text);
    if (!match) return null;
    held.score += match.score;
    match.positions.forEach((at) => held.positions.add(at));
  }
  return { score: held.score - text.length * LENGTH_TAX, positions: [...held.positions].sort((a, b) => a - b) };
}

export function fuzzyRank<T>(query: string, items: T[], textOf: (item: T) => string): FuzzyHit<T>[] {
  const hits: FuzzyHit<T>[] = [];
  for (const item of items) {
    const match = fuzzyMatch(query, textOf(item));
    if (match) hits.push({ item, match });
  }
  return hits.sort((a, b) => b.match.score - a.match.score);
}

function matchToken(token: string, text: string): FuzzyMatch | null {
  const lower = text.toLowerCase();
  if (!isSubsequence(token, lower)) return null;
  return backtrack(scoreTable(token, text, lower), token.length);
}

function isSubsequence(token: string, lower: string): boolean {
  let at = 0;
  for (const char of lower) if (char === token[at]) at += 1;
  return at === token.length;
}

// scores[i][j]: best score with token[i] at text[j]; parents chain the picks back.
function scoreTable(token: string, text: string, lower: string): ScoreTable {
  const cells = token.length * text.length;
  const table = { scores: new Float64Array(cells).fill(-Infinity), parents: new Int32Array(cells).fill(-1), width: text.length };
  for (let i = 0; i < token.length; i += 1) scoreRow(table, i, token, text, lower);
  return table;
}

function scoreRow(table: ScoreTable, i: number, token: string, text: string, lower: string): void {
  let earlier = NOTHING;
  for (let j = 0; j < table.width; j += 1) {
    // earlier ends at j-2; j-1 is the adjacent path, so a gap skips at least one char.
    if (i > 0 && j >= 2) earlier = betterOf(earlier, cellScore(table, i - 1, j - 2), j - 2);
    if (lower[j] !== token[i]) continue;
    if (i === 0) table.scores[cellAt(table, 0, j)] = bonusAt(text, j) + (j === 0 ? START : 0);
    else scoreCell(table, i, j, text, earlier);
  }
}

function scoreCell(table: ScoreTable, i: number, j: number, text: string, earlier: Best): void {
  const adjacent = j >= 1 ? cellScore(table, i - 1, j - 1) + CONSECUTIVE : -Infinity;
  const skipped = earlier.score - GAP;
  if (adjacent === -Infinity && skipped === -Infinity) return;
  table.scores[cellAt(table, i, j)] = bonusAt(text, j) + Math.max(adjacent, skipped);
  table.parents[cellAt(table, i, j)] = adjacent >= skipped ? j - 1 : earlier.at;
}

function cellAt(table: ScoreTable, i: number, j: number): number {
  return i * table.width + j;
}

function cellScore(table: ScoreTable, i: number, j: number): number {
  return table.scores[cellAt(table, i, j)] ?? -Infinity;
}

function betterOf(best: Best, score: number, at: number): Best {
  return score > best.score ? { score, at } : best;
}

function bonusAt(text: string, j: number): number {
  if (j === 0 || SEPARATORS.has(text[j - 1] ?? '')) return BOUNDARY;
  const before = text[j - 1] ?? '';
  const here = text[j] ?? '';
  if (here !== here.toLowerCase() && before === before.toLowerCase() && before !== before.toUpperCase()) return CAMEL;
  return PLAIN;
}

function backtrack(table: ScoreTable, rows: number): FuzzyMatch | null {
  const last = rows - 1;
  const end = bestEndAt(table, last);
  if (end.at < 0) return null;
  return { score: end.score, positions: walkParents(table, last, end.at) };
}

function bestEndAt(table: ScoreTable, row: number): Best {
  let best = NOTHING;
  for (let j = 0; j < table.width; j += 1) best = betterOf(best, cellScore(table, row, j), j);
  return best;
}

function walkParents(table: ScoreTable, row: number, at: number): number[] {
  const positions: number[] = [];
  for (let i = row, j = at; i >= 0; i -= 1) {
    positions.push(j);
    j = table.parents[cellAt(table, i, j)] ?? -1;
  }
  return positions.reverse();
}
