import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rankPaletteItems, type PaletteItem } from './paletteItems';

const noop = () => {};
const item = (kind: PaletteItem['kind'], title: string, detail = ''): PaletteItem => ({
  key: `${kind}:${title}`,
  kind,
  title,
  detail,
  run: noop,
});

const items: PaletteItem[] = [
  item('command', 'Go home', 'Go'),
  item('command', 'Toggle theme', 'View'),
  item('repo', 'acme/widgets', 'Widget factory'),
  item('pull', '#12 Fix the home page', 'acme/widgets'),
  item('file', 'src/home/page.tsx'),
  item('file', 'src/util.ts'),
];

test('an empty query lists everything in kind order, capped per kind', () => {
  const ranked = rankPaletteItems('', items, { file: 1 });
  assert.deepEqual(
    ranked.map((hit) => hit.item.title),
    ['Go home', 'Toggle theme', 'acme/widgets', '#12 Fix the home page', 'src/home/page.tsx'],
  );
});

test('a kind prefix narrows to that kind', () => {
  const ranked = rankPaletteItems('>', items, {});
  assert.deepEqual(ranked.map((hit) => hit.item.kind), ['command', 'command']);
  assert.deepEqual(rankPaletteItems('/home', items, {}).map((hit) => hit.item.title), ['src/home/page.tsx']);
});

test('a plain query mixes kinds by score and matches the detail too', () => {
  const ranked = rankPaletteItems('home', items, {});
  const titles = ranked.map((hit) => hit.item.title);
  assert.ok(titles.includes('Go home'));
  assert.ok(titles.includes('#12 Fix the home page'));
  assert.ok(titles.includes('src/home/page.tsx'));
  assert.ok(!titles.includes('src/util.ts'));
  assert.deepEqual(rankPaletteItems('widget', items, {}).map((hit) => hit.item.title), ['acme/widgets', '#12 Fix the home page']);
});

test('match positions are split between title and detail', () => {
  const [hit] = rankPaletteItems('factory', items, {});
  assert.equal(hit?.item.title, 'acme/widgets');
  assert.deepEqual(hit?.titlePositions, []);
  assert.deepEqual(hit?.detailPositions, [7, 8, 9, 10, 11, 12, 13]);
});
