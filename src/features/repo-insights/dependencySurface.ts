import { fileNameOf } from './lineScan';
import type { CodebaseFile, InventoryEntry } from '@/features/codebases/codebaseSource';
import type { DependencyEntry, DependencyManifest } from './insightTypes';

const MAX_ENTRIES_PER_MANIFEST = 80;
const MAX_MANIFESTS = 12;

const LOCKFILES: [string, string][] = [
  ['package.json', 'package-lock.json'], ['package.json', 'yarn.lock'], ['package.json', 'pnpm-lock.yaml'], ['package.json', 'bun.lockb'],
  ['pyproject.toml', 'poetry.lock'], ['pyproject.toml', 'uv.lock'], ['requirements.txt', ''],
  ['go.mod', 'go.sum'], ['Cargo.toml', 'Cargo.lock'], ['Gemfile', 'Gemfile.lock'], ['composer.json', 'composer.lock'],
];

export function buildDependencySurface(files: CodebaseFile[], inventory: InventoryEntry[]): DependencyManifest[] {
  const lockfiles = new Set(inventory.map((entry) => entry.path));
  const manifests: DependencyManifest[] = [];
  for (const file of files) {
    const parsed = parseManifest(file);
    if (!parsed || parsed.entries.length === 0) continue;
    manifests.push({ ...parsed, entries: uniqueEntries(parsed.entries), lockfile: lockfileNear(file.path, lockfiles) });
    if (manifests.length >= MAX_MANIFESTS) break;
  }
  countUsage(manifests, files);
  return manifests.sort((left, right) => right.entries.length - left.entries.length);
}

function uniqueEntries(entries: DependencyEntry[]): DependencyEntry[] {
  const seen = new Map<string, DependencyEntry>();
  for (const entry of entries) {
    const key = `${entry.group} ${entry.name}`;
    if (!seen.has(key)) seen.set(key, entry);
  }
  return [...seen.values()];
}

function lockfileNear(manifestPath: string, paths: Set<string>): string | null {
  const dir = manifestPath.includes('/') ? manifestPath.slice(0, manifestPath.lastIndexOf('/') + 1) : '';
  const name = fileNameOf(manifestPath);
  for (const [manifest, lock] of LOCKFILES) {
    if (name !== manifest || lock === '') continue;
    if (paths.has(`${dir}${lock}`)) return lock;
  }
  return null;
}

function parseManifest(file: CodebaseFile): Omit<DependencyManifest, 'lockfile'> | null {
  const name = fileNameOf(file.path);
  if (name === 'package.json') return packageJson(file);
  if (name === 'pyproject.toml') return pyprojectToml(file);
  if (/^requirements[\w.-]*\.txt$/.test(name)) return requirementsTxt(file);
  if (name === 'Pipfile') return pipfile(file);
  if (name === 'go.mod') return goMod(file);
  if (name === 'Cargo.toml') return cargoToml(file);
  if (name === 'Gemfile') return gemfile(file);
  if (name === 'composer.json') return composerJson(file);
  return null;
}

function packageJson(file: CodebaseFile): Omit<DependencyManifest, 'lockfile'> | null {
  let parsed: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  try {
    parsed = JSON.parse(file.source) as typeof parsed;
  } catch {
    return null;
  }
  const entries = [
    ...recordEntries(parsed.dependencies, 'runtime'),
    ...recordEntries(parsed.devDependencies, 'dev'),
  ];
  return { file: file.path, ecosystem: 'npm', entries: entries.slice(0, MAX_ENTRIES_PER_MANIFEST) };
}

function composerJson(file: CodebaseFile): Omit<DependencyManifest, 'lockfile'> | null {
  let parsed: { require?: Record<string, string>; 'require-dev'?: Record<string, string> };
  try {
    parsed = JSON.parse(file.source) as typeof parsed;
  } catch {
    return null;
  }
  const entries = [
    ...recordEntries(parsed.require, 'runtime').filter((entry) => entry.name !== 'php'),
    ...recordEntries(parsed['require-dev'], 'dev'),
  ];
  return { file: file.path, ecosystem: 'composer', entries: entries.slice(0, MAX_ENTRIES_PER_MANIFEST) };
}

function recordEntries(record: Record<string, string> | undefined, group: 'runtime' | 'dev'): DependencyEntry[] {
  return Object.entries(record ?? {}).map(([name, version]) => ({ name, version, group, usedIn: 0 }));
}

function pyprojectToml(file: CodebaseFile): Omit<DependencyManifest, 'lockfile'> {
  const entries: DependencyEntry[] = [];
  let section: 'runtime' | 'dev' | null = null;
  let inArray = false;
  for (const raw of file.source.split(/\r?\n/)) {
    const line = raw.trim();
    if (/^dependencies\s*=\s*\[/.test(line)) {
      section = 'runtime';
      inArray = !line.includes(']');
      collectPythonSpecs(line, 'runtime', entries);
      continue;
    }
    if (/^\[(?:tool\.poetry\.)?(?:dependency-groups|project\.optional-dependencies|tool\.poetry\.dev-dependencies|tool\.uv)/.test(line) || /^\[dependency-groups\]/.test(line)) {
      section = 'dev';
      inArray = false;
      continue;
    }
    if (line.startsWith('[')) {
      section = /^\[tool\.poetry\.dependencies\]/.test(line) ? 'runtime' : null;
      inArray = false;
      continue;
    }
    if (inArray && section) {
      collectPythonSpecs(line, section, entries);
      if (line.includes(']')) inArray = false;
      continue;
    }
    if (section && /^[\w-]+\s*=\s*\[/.test(line)) {
      collectPythonSpecs(line, section, entries);
      inArray = !line.includes(']');
      continue;
    }
    if (section && /^[\w.-]+\s*=/.test(line) && !line.startsWith('python')) {
      const match = line.match(/^([\w.-]+)\s*=\s*["']?([^"',}]*)/);
      if (match) entries.push({ name: match[1]!, version: match[2] ?? '', group: section, usedIn: 0 });
    }
  }
  return { file: file.path, ecosystem: 'pypi', entries: entries.slice(0, MAX_ENTRIES_PER_MANIFEST) };
}

function collectPythonSpecs(line: string, group: 'runtime' | 'dev', entries: DependencyEntry[]): void {
  for (const match of line.matchAll(/["']([A-Za-z0-9][\w.-]*)\s*([^"']*)["']/g)) {
    entries.push({ name: match[1]!, version: (match[2] ?? '').trim(), group, usedIn: 0 });
  }
}

function requirementsTxt(file: CodebaseFile): Omit<DependencyManifest, 'lockfile'> {
  const entries: DependencyEntry[] = [];
  for (const raw of file.source.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#') || line.startsWith('-')) continue;
    const match = line.match(/^([A-Za-z0-9][\w.-]*)\s*(?:\[[^\]]*\])?\s*(.*)$/);
    if (match) entries.push({ name: match[1]!, version: (match[2] ?? '').split('#')[0]!.trim(), group: 'runtime', usedIn: 0 });
  }
  return { file: file.path, ecosystem: 'pypi', entries: entries.slice(0, MAX_ENTRIES_PER_MANIFEST) };
}

function pipfile(file: CodebaseFile): Omit<DependencyManifest, 'lockfile'> {
  const entries: DependencyEntry[] = [];
  let section: 'runtime' | 'dev' | null = null;
  for (const raw of file.source.split(/\r?\n/)) {
    const line = raw.trim();
    if (/^\[packages\]/.test(line)) section = 'runtime';
    else if (/^\[dev-packages\]/.test(line)) section = 'dev';
    else if (line.startsWith('[')) section = null;
    else if (section) {
      const match = line.match(/^([\w.-]+)\s*=\s*["']?([^"'{]*)/);
      if (match) entries.push({ name: match[1]!, version: (match[2] ?? '').trim(), group: section, usedIn: 0 });
    }
  }
  return { file: file.path, ecosystem: 'pypi', entries: entries.slice(0, MAX_ENTRIES_PER_MANIFEST) };
}

function goMod(file: CodebaseFile): Omit<DependencyManifest, 'lockfile'> {
  const entries: DependencyEntry[] = [];
  let inRequire = false;
  for (const raw of file.source.split(/\r?\n/)) {
    const line = raw.trim();
    if (/^require\s*\($/.test(line)) {
      inRequire = true;
      continue;
    }
    if (inRequire && line === ')') {
      inRequire = false;
      continue;
    }
    const single = line.match(/^require\s+([\w./-]+)\s+(\S+)/);
    const grouped = inRequire ? line.match(/^([\w./-]+)\s+(\S+)/) : null;
    const match = single ?? grouped;
    if (match && !line.includes('// indirect')) {
      entries.push({ name: match[1]!, version: match[2]!, group: 'runtime', usedIn: 0 });
    }
  }
  return { file: file.path, ecosystem: 'go', entries: entries.slice(0, MAX_ENTRIES_PER_MANIFEST) };
}

function cargoToml(file: CodebaseFile): Omit<DependencyManifest, 'lockfile'> {
  const entries: DependencyEntry[] = [];
  let section: 'runtime' | 'dev' | null = null;
  for (const raw of file.source.split(/\r?\n/)) {
    const line = raw.trim();
    if (/^\[dependencies\]/.test(line)) {
      section = 'runtime';
      continue;
    }
    if (/^\[dev-dependencies\]/.test(line) || /^\[build-dependencies\]/.test(line)) {
      section = 'dev';
      continue;
    }
    if (line.startsWith('[')) {
      section = null;
      continue;
    }
    if (!section) continue;
    const match = line.match(/^([\w-]+)\s*=\s*(?:"([^"]*)"|\{.*version\s*=\s*"([^"]*)".*\}|\{)/);
    if (match) entries.push({ name: match[1]!, version: match[2] ?? match[3] ?? '', group: section, usedIn: 0 });
  }
  return { file: file.path, ecosystem: 'crates', entries: entries.slice(0, MAX_ENTRIES_PER_MANIFEST) };
}

function gemfile(file: CodebaseFile): Omit<DependencyManifest, 'lockfile'> {
  const entries: DependencyEntry[] = [];
  for (const raw of file.source.split(/\r?\n/)) {
    const match = raw.trim().match(/^gem\s+['"]([\w-]+)['"](?:\s*,\s*['"]([^'"]+)['"])?/);
    if (match) entries.push({ name: match[1]!, version: match[2] ?? '', group: 'runtime', usedIn: 0 });
  }
  return { file: file.path, ecosystem: 'rubygems', entries: entries.slice(0, MAX_ENTRIES_PER_MANIFEST) };
}

const IMPORT_LINE = /^\s*(?:import|from|require|use|using|include)\b/;

function countUsage(manifests: DependencyManifest[], files: CodebaseFile[]): void {
  const watched = new Map<string, DependencyEntry[]>();
  for (const manifest of manifests) {
    for (const entry of manifest.entries) {
      const key = usageKey(entry.name, manifest.ecosystem);
      if (key === null) continue;
      const held = watched.get(key) ?? [];
      held.push(entry);
      watched.set(key, held);
    }
  }
  if (watched.size === 0) return;
  for (const file of files) {
    const seen = new Set<string>();
    for (const line of file.source.split(/\r?\n/)) {
      if (!IMPORT_LINE.test(line) && !line.includes('require(')) continue;
      for (const key of watched.keys()) {
        if (!seen.has(key) && line.includes(key)) seen.add(key);
      }
    }
    for (const key of seen) {
      for (const entry of watched.get(key)!) entry.usedIn += 1;
    }
  }
}

function usageKey(name: string, ecosystem: string): string | null {
  const key = ecosystem === 'pypi' || ecosystem === 'crates' ? name.toLowerCase().replace(/-/g, '_') : name;
  return key.length < 3 ? null : key;
}
