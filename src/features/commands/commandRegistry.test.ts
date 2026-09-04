import assert from 'node:assert/strict';
import { test } from 'node:test';
import { commandBindings, commandForPress, dedupeCommands, type Command } from './commandRegistry';

const noop = () => {};

const commands: Command[] = [
  { id: 'nav.down', title: 'Move down', group: 'Navigate', keys: ['ArrowDown', 'j'], run: noop },
  { id: 'go.home', title: 'Go home', group: 'Go', keys: ['g h'], run: noop },
  { id: 'palette.open', title: 'Open palette', group: 'Palette', keys: ['mod+k'], run: noop },
  { id: 'later', title: 'Later registration wins', group: 'Go', keys: ['j'], run: noop },
];

test('commandBindings flattens every key of every command in order', () => {
  assert.deepEqual(
    commandBindings(commands).map((binding) => binding.keys),
    ['ArrowDown', 'j', 'g h', 'mod+k', 'j'],
  );
});

test('commandForPress resolves a chord to the last command bound to it', () => {
  const first = commandForPress([], 'j', commands);
  assert.equal(first.command?.id, 'later');
  assert.deepEqual(first.pressed, []);
});

test('dedupeCommands keeps the last command per id in first-seen order', () => {
  const first = { id: 'a', title: 'first', group: 'Go', run: noop };
  const second = { id: 'a', title: 'second', group: 'Go', run: noop };
  const other = { id: 'b', title: 'other', group: 'Go', run: noop };
  assert.deepEqual(dedupeCommands([first, other, second]).map((held) => held.title), ['second', 'other']);
});

test('commandForPress carries a pending sequence and finishes it', () => {
  const pending = commandForPress([], 'g', commands);
  assert.equal(pending.command, null);
  assert.deepEqual(pending.pressed, ['g']);
  assert.equal(commandForPress(pending.pressed, 'h', commands).command?.id, 'go.home');
});
