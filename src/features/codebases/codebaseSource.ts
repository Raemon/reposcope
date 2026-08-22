import { githubBytes } from './githubRequest';
import { githubTokenIdentity } from './githubToken';
import { untarGzip } from './untar';

export interface CodebaseFile {
  path: string;
  source: string;
}

export interface InventoryEntry {
  path: string;
  size: number;
}

export interface Codebase {
  owner: string;
  repo: string;
  files: CodebaseFile[];
  inventory: InventoryEntry[];
  truncated: boolean;
}

const JAVASCRIPT_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'];

const CODE_EXTENSIONS = [
  ...JAVASCRIPT_EXTENSIONS,
  '.vue', '.svelte', '.astro',
  '.py', '.go', '.rs', '.rb', '.php', '.java', '.kt', '.kts', '.cs', '.swift', '.scala',
  '.ex', '.exs', '.erl', '.hs', '.lua', '.r', '.jl', '.zig', '.dart', '.clj', '.cljs',
  '.c', '.h', '.cpp', '.hpp', '.cc', '.hh', '.m', '.mm',
  '.sh', '.bash', '.zsh', '.ps1',
  '.sql', '.proto', '.graphql', '.gql', '.prisma',
];

const CONFIG_EXTENSIONS = ['.json', '.yml', '.yaml', '.toml', '.ini', '.cfg', '.conf', '.tf', '.hcl'];

const NOTABLE_FILENAMES = [
  'dockerfile', 'makefile', 'justfile', 'gemfile', 'rakefile', 'procfile',
  '.env.example', '.env.sample', '.env.template', '.env.dist', '.flaskenv', '.nvmrc',
];

const LOCKFILE_NAMES = [
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb', 'cargo.lock',
  'poetry.lock', 'uv.lock', 'pipfile.lock', 'gemfile.lock', 'composer.lock', 'go.sum',
];

const EXCLUDED_SEGMENTS = ['node_modules/', '.next/', 'dist/', 'build/', 'vendor/', 'coverage/', '.yarn/', '.venv/', '__pycache__/', 'target/debug/', 'target/release/'];
const MAX_FILE_BYTES = 400_000;
const MAX_FILES = 6000;
const MAX_INVENTORY = 30_000;
const MAX_CACHED = 4;

const cache = new Map<string, Codebase>();

export async function loadCodebase(owner: string, repo: string): Promise<Codebase> {
  const key = `${githubTokenIdentity()}:${owner}/${repo}`;
  const held = cache.get(key);
  if (held) return held;
  const archive = await githubBytes(`https://api.github.com/repos/${owner}/${repo}/tarball`);
  const inventory: InventoryEntry[] = [];
  const entries = untarGzip(archive, (path, size) => {
    if (inventory.length < MAX_INVENTORY && !excluded(path)) inventory.push({ path, size });
    return keepArchiveEntry(path, size);
  });
  const readable = entries.filter((entry) => !entry.source.includes('\u0000'));
  const codebase: Codebase = {
    owner,
    repo,
    files: prioritized(readable),
    inventory,
    truncated: readable.length > MAX_FILES,
  };
  cache.set(key, codebase);
  while (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value as string);
  return codebase;
}

export function codeFileExtensions(): readonly string[] {
  return CODE_EXTENSIONS;
}

function prioritized(entries: CodebaseFile[]): CodebaseFile[] {
  if (entries.length <= MAX_FILES) return entries;
  const code = entries.filter((entry) => hasExtension(entry.path, CODE_EXTENSIONS));
  const rest = entries.filter((entry) => !hasExtension(entry.path, CODE_EXTENSIONS));
  return [...code, ...rest].slice(0, MAX_FILES);
}

function keepArchiveEntry(path: string, size: number): boolean {
  if (size > MAX_FILE_BYTES) return false;
  if (excluded(path)) return false;
  if (path.endsWith('.d.ts') || path.endsWith('.min.js') || path.endsWith('.min.css')) return false;
  const name = path.split('/').at(-1)!.toLowerCase();
  if (LOCKFILE_NAMES.includes(name)) return false;
  if (NOTABLE_FILENAMES.some((notable) => name === notable || name.startsWith(`${notable}.`))) return true;
  if (name === 'readme.md' || name === 'readme' || name === 'pipfile' || /^requirements[\w.-]*\.txt$/.test(name)) return true;
  if (path.includes('.github/workflows/')) return hasExtension(name, ['.yml', '.yaml']);
  return hasExtension(name, CODE_EXTENSIONS) || hasExtension(name, CONFIG_EXTENSIONS);
}

function excluded(path: string): boolean {
  return EXCLUDED_SEGMENTS.some((segment) => path.includes(segment));
}

function hasExtension(path: string, extensions: readonly string[]): boolean {
  return extensions.some((extension) => path.endsWith(extension));
}
