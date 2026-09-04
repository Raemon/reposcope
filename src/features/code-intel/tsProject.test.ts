import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LIB_REF, type Source } from './codeIntelTypes';
import { createProjects } from './tsProject';

const LIBS: Record<string, string> = {
  'lib.esnext.d.ts': '/// <reference lib="es5" />\n',
  'lib.es5.d.ts': [
    'interface Array<T> { length: number; map<U>(fn: (item: T) => U): U[]; }',
    'interface Boolean {} interface Function {} interface IArguments {} interface Number {}',
    'interface Object {} interface RegExp {} interface String {} interface Symbol {}',
  ].join('\n'),
  'lib.dom.d.ts': '',
  'lib.dom.iterable.d.ts': '',
};

const REPO: Record<string, string> = {
  'tsconfig.json': '{ "extends": "./tsconfig.base.json", "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }',
  'tsconfig.base.json': '{ "compilerOptions": { "baseUrl": "." } }',
  'src/a.ts': [
    "import { greet } from './b';",
    "import { count } from '@/c';",
    "export const shout = greet('x') + count;",
    'const doubled = [1, 2].map((n) => n * 2);',
  ].join('\n'),
  'src/b.ts': ['// says hello', 'export function greet(name: string): string {', '  return `hi ${name}`;', '}'].join('\n'),
  'src/c.ts': 'export const count = 3;',
  'src/chain1.ts': "import { twice } from './chain2';\nexport const four = twice(2);",
  'src/chain2.ts': "import { greet } from './b';\nexport const twice = (n: number) => n * 2;\nexport const hello = greet('a');",
  'src/deep1.ts': "import './deep2';",
  'src/deep2.ts': "import './deep3';",
  'src/deep3.ts': 'export const deep = 3;',
  'src/uses-ghost.ts': "import { ghost } from './ghost';\nexport const seen = ghost;",
};

const LISTED = [...Object.keys(REPO), 'src/ghost.ts'];
const V2: Record<string, string> = { ...REPO, 'src/a.ts': 'export const shout = 1;' };

function fakeSource(reads: string[] = []): Source {
  return {
    async listing(ref) {
      return ref === 'main' || ref === 'v2' || /^r\d$/.test(ref) ? { files: LISTED, truncated: false } : null;
    },
    async read(ref, paths) {
      reads.push(...paths.map((path) => `${ref}:${path}`));
      const store = ref === LIB_REF ? LIBS : ref === 'v2' ? V2 : REPO;
      return paths.map((path) => store[path] ?? null);
    },
  };
}

test('walk loads relative imports and tsconfig path aliases', async () => {
  const reads: string[] = [];
  const projects = createProjects(fakeSource(reads));
  await projects.query({ op: 'hover', ref: 'main', path: 'src/a.ts', line: 3, column: 13 });
  assert.ok(reads.includes('main:src/b.ts'));
  assert.ok(reads.includes('main:src/c.ts'));
});

test('walk stops at the per-request budget', async () => {
  const reads: string[] = [];
  const projects = createProjects(fakeSource(reads), { budget: 1 });
  await projects.query({ op: 'hover', ref: 'main', path: 'src/deep1.ts', line: 1, column: 8 });
  assert.ok(reads.includes('main:src/deep2.ts'));
  assert.ok(!reads.includes('main:src/deep3.ts'));
});

test('definition of an imported symbol lands on the declaration span', async () => {
  const projects = createProjects(fakeSource());
  const sites = await projects.query({ op: 'definition', ref: 'main', path: 'src/a.ts', line: 3, column: 21 });
  assert.deepEqual(sites, [{ path: 'src/b.ts', ref: 'main', nameLine: 2, startLine: 2, endLine: 4 }]);
});

test('definition resolves once the target is loaded by a later walk', async () => {
  const projects = createProjects(fakeSource(), { budget: 1 });
  const before = await projects.query({ op: 'definition', ref: 'main', path: 'src/chain1.ts', line: 2, column: 21 });
  assert.equal(before[0]?.path, 'src/chain2.ts');
  const sites = await projects.query({ op: 'definition', ref: 'main', path: 'src/chain2.ts', line: 3, column: 22 });
  assert.equal(sites[0]?.path, 'src/b.ts');
});

test('hover shows the resolved signature', async () => {
  const projects = createProjects(fakeSource());
  const info = await projects.query({ op: 'hover', ref: 'main', path: 'src/a.ts', line: 3, column: 21 });
  assert.ok(info?.signature.includes('greet(name: string): string'), info?.signature);
});

test('references list the definition and each use with line text', async () => {
  const projects = createProjects(fakeSource());
  const refs = await projects.query({ op: 'references', ref: 'main', path: 'src/a.ts', line: 3, column: 21 });
  assert.deepEqual(
    refs.map((site) => [site.path, site.line, site.definition, site.text]),
    [
      ['src/a.ts', 1, false, "import { greet } from './b';"],
      ['src/a.ts', 3, false, "export const shout = greet('x') + count;"],
      ['src/b.ts', 2, true, 'export function greet(name: string): string {'],
    ],
  );
});

test('references walk from seed files as well', async () => {
  const projects = createProjects(fakeSource());
  const refs = await projects.query({
    op: 'references',
    ref: 'main',
    path: 'src/b.ts',
    line: 2,
    column: 16,
    seeds: ['src/chain2.ts'],
  });
  assert.ok(refs.some((site) => site.path === 'src/chain2.ts'));
});

test('hover on an array method resolves against the lib store', async () => {
  const projects = createProjects(fakeSource());
  const info = await projects.query({ op: 'hover', ref: 'main', path: 'src/a.ts', line: 4, column: 23 });
  assert.ok(info?.signature.includes('map<'), info?.signature);
  const sites = await projects.query({ op: 'definition', ref: 'main', path: 'src/a.ts', line: 4, column: 23 });
  assert.deepEqual(sites, [{ path: 'lib.es5.d.ts', ref: LIB_REF, nameLine: 1, startLine: 1, endLine: 1 }]);
});

test('lib walk follows reference directives', async () => {
  const reads: string[] = [];
  const projects = createProjects(fakeSource(reads));
  await projects.query({ op: 'warm', ref: 'main' });
  assert.ok(reads.includes(`${LIB_REF}:lib.esnext.d.ts`));
  assert.ok(reads.includes(`${LIB_REF}:lib.es5.d.ts`));
});

test('an unreadable file is fetched once and never treated as an empty module', async () => {
  const reads: string[] = [];
  const projects = createProjects(fakeSource(reads));
  const at = { ref: 'main', path: 'src/uses-ghost.ts', line: 2, column: 21 };
  await projects.query({ op: 'definition', ...at });
  const sites = await projects.query({ op: 'definition', ...at });
  assert.equal(reads.filter((read) => read === 'main:src/ghost.ts').length, 1);
  assert.ok(!sites.some((site) => site.path === 'src/ghost.ts'), JSON.stringify(sites));
});

test('a ref without a file listing rejects instead of answering empty', async () => {
  const projects = createProjects(fakeSource());
  await assert.rejects(projects.query({ op: 'warm', ref: 'other' }), /no file listing for other/);
});

test('warm with seeds loads the seeds and their imports before any click', async () => {
  const reads: string[] = [];
  const projects = createProjects(fakeSource(reads));
  await projects.query({ op: 'warm', ref: 'main', seeds: ['src/chain1.ts'] });
  assert.ok(reads.includes('main:src/chain1.ts'));
  assert.ok(reads.includes('main:src/chain2.ts'));
  assert.ok(reads.includes('main:src/b.ts'));
});

test('the same path at two refs keeps separate text', async () => {
  const projects = createProjects(fakeSource());
  const atMain = await projects.query({ op: 'hover', ref: 'main', path: 'src/a.ts', line: 3, column: 13 });
  const atV2 = await projects.query({ op: 'hover', ref: 'v2', path: 'src/a.ts', line: 1, column: 13 });
  assert.match(atMain?.signature ?? '', /shout: string/);
  assert.match(atV2?.signature ?? '', /shout: 1$/);
});

test('a missing lib file rejects instead of running with empty libs', async () => {
  const withoutDom: Source = {
    listing: fakeSource().listing,
    read: async (ref, paths) => (ref === LIB_REF ? paths.map((path) => (path === 'lib.dom.d.ts' ? null : LIBS[path] ?? null)) : fakeSource().read(ref, paths)),
  };
  const projects = createProjects(withoutDom);
  await assert.rejects(projects.query({ op: 'warm', ref: 'main' }), /lib\.dom\.d\.ts is missing/);
});

test('a project evicted while its query runs still answers', async () => {
  const slow: Source = {
    listing: fakeSource().listing,
    read: async (ref, paths) => {
      if (ref === 'main') await new Promise((done) => setTimeout(done, 40));
      return fakeSource().read(ref, paths);
    },
  };
  const projects = createProjects(slow);
  const pending = projects.query({ op: 'hover', ref: 'main', path: 'src/a.ts', line: 3, column: 13 });
  await Promise.all(['r1', 'r2', 'r3', 'r4'].map((ref) => projects.query({ op: 'warm', ref })));
  assert.match((await pending)?.signature ?? '', /shout: string/);
});

test('a failed dependency read is skipped, logged by the caller, and retried on the next walk', async () => {
  const reads: string[] = [];
  let failOnce = true;
  const flaky: Source = {
    listing: fakeSource().listing,
    read: async (ref, paths) => {
      const texts = await fakeSource(reads).read(ref, paths);
      return texts.map((text, at) => {
        if (paths[at] !== 'src/b.ts' || !failOnce) return text;
        failOnce = false;
        return { error: 'GitHub 404' };
      });
    },
  };
  const projects = createProjects(flaky);
  const first = await projects.query({ op: 'hover', ref: 'main', path: 'src/a.ts', line: 3, column: 13 });
  assert.ok(first);
  await projects.query({ op: 'hover', ref: 'main', path: 'src/a.ts', line: 3, column: 13 });
  assert.equal(reads.filter((read) => read === 'main:src/b.ts').length, 2);
});
