import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fuzzyMatch, fuzzyRank } from './fuzzy';

test('an empty query matches everything with no positions', () => {
  assert.deepEqual(fuzzyMatch('', 'anything'), { score: 0, positions: [] });
});

test('characters must appear in order', () => {
  assert.deepEqual(fuzzyMatch('abc', 'a-b-c')?.positions, [0, 2, 4]);
  assert.equal(fuzzyMatch('acb', 'a-b-c'), null);
});

test('matching ignores case', () => {
  assert.deepEqual(fuzzyMatch('CN', 'columnNav')?.positions, [0, 6]);
});

test('consecutive characters beat scattered mid-word ones', () => {
  assert.ok(score('bar', 'foobar') > score('bar', 'bxaxr'));
});

test('word and camel starts beat mid-word characters', () => {
  assert.ok(score('cn', 'src/columnNav.tsx') > score('cn', 'acne.ts'));
  assert.deepEqual(fuzzyMatch('cn', 'src/columnNav.tsx')?.positions, [4, 10]);
});

test('a match at the start beats the same match later', () => {
  assert.ok(score('nav', 'navColumn') > score('nav', 'columnNav'));
});

test('shorter text wins a tie', () => {
  assert.ok(score('pull', 'pullPaths.ts') > score('pull', 'pullRequestList.tsx'));
});

test('whitespace splits the query into tokens that all must match, in any order', () => {
  assert.equal(fuzzyMatch('paths pull', 'pullPaths.ts')?.positions.length, 9);
  assert.equal(fuzzyMatch('paths zebra', 'pullPaths.ts'), null);
});

test('fuzzyRank drops non-matches and sorts by score', () => {
  const ranked = fuzzyRank('cn', ['acne.ts', 'zzz', 'columnNav.tsx'], (item) => item);
  assert.deepEqual(
    ranked.map((hit) => hit.item),
    ['columnNav.tsx', 'acne.ts'],
  );
});

function score(query: string, text: string): number {
  const match = fuzzyMatch(query, text);
  assert.ok(match, `${query} should match ${text}`);
  return match.score;
}
