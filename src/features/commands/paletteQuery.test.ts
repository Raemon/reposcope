import assert from 'node:assert/strict';
import { test } from 'node:test';
import { KIND_PREFIX, parsePaletteQuery } from './paletteQuery';

test('a bare query has no kind', () => {
  assert.deepEqual(parsePaletteQuery('foo'), { kind: null, text: 'foo' });
  assert.deepEqual(parsePaletteQuery(''), { kind: null, text: '' });
});

test('a leading prefix picks the kind and is stripped, with surrounding whitespace', () => {
  assert.deepEqual(parsePaletteQuery('>the'), { kind: 'command', text: 'the' });
  assert.deepEqual(parsePaletteQuery('# 12 '), { kind: 'pull', text: '12' });
  assert.deepEqual(parsePaletteQuery('  @owner'), { kind: 'repo', text: 'owner' });
  assert.deepEqual(parsePaletteQuery('/src'), { kind: 'file', text: 'src' });
  assert.deepEqual(parsePaletteQuery(':fix'), { kind: 'commit', text: 'fix' });
  assert.deepEqual(parsePaletteQuery('~main'), { kind: 'branch', text: 'main' });
});

test('every kind has a distinct single-character prefix', () => {
  const prefixes = Object.values(KIND_PREFIX);
  assert.equal(new Set(prefixes).size, prefixes.length);
  assert.ok(prefixes.every((prefix) => prefix.length === 1));
});

test('a prefix later in the text is plain text', () => {
  assert.deepEqual(parsePaletteQuery('a#1'), { kind: null, text: 'a#1' });
});
