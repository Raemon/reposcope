import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chordOf, formatBinding, matchBindings, stepSequence } from './keyChords';

const press = (key: string, extra: Partial<Parameters<typeof chordOf>[0]> = {}) => ({
  key,
  code: '',
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...extra,
});

test('a bare printable key is its own chord, shift included', () => {
  assert.equal(chordOf(press('g'), true), 'g');
  assert.equal(chordOf(press('?', { shiftKey: true }), true), '?');
  assert.equal(chordOf(press('['), true), '[');
});

test('named keys keep their names', () => {
  assert.equal(chordOf(press('ArrowDown'), true), 'ArrowDown');
  assert.equal(chordOf(press('Escape'), true), 'Escape');
});

test('modifier-only presses are not chords', () => {
  assert.equal(chordOf(press('Shift', { shiftKey: true }), true), null);
  assert.equal(chordOf(press('Meta', { metaKey: true }), true), null);
});

test('mod is meta on a mac and ctrl elsewhere', () => {
  assert.equal(chordOf(press('k', { metaKey: true }), true), 'mod+k');
  assert.equal(chordOf(press('k', { ctrlKey: true }), false), 'mod+k');
  assert.equal(chordOf(press('k', { ctrlKey: true }), true), 'ctrl+k');
  assert.equal(chordOf(press('k', { metaKey: true }), false), 'meta+k');
});

test('modified chords name their modifiers in a fixed order and lowercase the key', () => {
  assert.equal(chordOf(press('P', { metaKey: true, shiftKey: true }), true), 'mod+shift+p');
  assert.equal(chordOf(press('1', { altKey: true, code: 'Digit1' }), false), 'alt+1');
});

test('alt on a mac types a symbol, so the physical key wins', () => {
  assert.equal(chordOf(press('¡', { altKey: true, code: 'Digit1' }), true), 'alt+1');
  assert.equal(chordOf(press('˚', { altKey: true, code: 'KeyK' }), true), 'alt+k');
});

test('punctuation keys keep their symbol under alt, and named keys keep their case', () => {
  assert.equal(chordOf(press('“', { altKey: true, code: 'BracketLeft' }), true), 'alt+[');
  assert.equal(chordOf(press('ArrowDown', { shiftKey: true }), true), 'shift+ArrowDown');
});

test('matchBindings finds exact hits and tells whether longer sequences are still possible', () => {
  const bindings = ['g h', 'g p', 'g', 'mod+k'];
  assert.deepEqual(matchBindings(['g'], bindings), { exact: [2], pending: true });
  assert.deepEqual(matchBindings(['g', 'h'], bindings), { exact: [0], pending: false });
  assert.deepEqual(matchBindings(['mod+k'], bindings), { exact: [3], pending: false });
  assert.deepEqual(matchBindings(['x'], bindings), { exact: [], pending: false });
});

test('stepSequence prefers a finished sequence, waits on a prefix, and restarts on a dead end', () => {
  const bindings = ['g h', 'j'];
  assert.deepEqual(stepSequence([], 'g', bindings), { pressed: ['g'], hit: null });
  assert.deepEqual(stepSequence(['g'], 'h', bindings), { pressed: [], hit: 0 });
  assert.deepEqual(stepSequence(['g'], 'j', bindings), { pressed: [], hit: 1 });
  assert.deepEqual(stepSequence(['g'], 'x', bindings), { pressed: [], hit: null });
});

test('formatBinding shows platform glyphs', () => {
  assert.equal(formatBinding('mod+k', true), '⌘K');
  assert.equal(formatBinding('mod+shift+p', false), 'Ctrl+Shift+P');
  assert.equal(formatBinding('g h', true), 'g h');
  assert.equal(formatBinding('ArrowDown', true), '↓');
});
