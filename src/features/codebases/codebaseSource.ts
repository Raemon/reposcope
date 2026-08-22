import { githubBytes } from './githubRequest';
import { githubTokenIdentity } from './githubToken';
import { untarGzip } from './untar';

export interface CodebaseFile {
  path: string;
  source: string;
}

export interface Codebase {
  owner: string;
  repo: string;
  files: CodebaseFile[];
  truncated: boolean;
}

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'];
const EXCLUDED_SEGMENTS = ['node_modules/', '.next/', 'dist/', 'build/', 'vendor/', 'coverage/', '.yarn/'];
const MAX_FILE_BYTES = 400_000;
const MAX_FILES = 6000;
const MAX_CACHED = 4;

const cache = new Map<string, Codebase>();

export async function loadCodebase(owner: string, repo: string): Promise<Codebase> {
  const key = `${githubTokenIdentity()}:${owner}/${repo}`;
  const held = cache.get(key);
  if (held) return held;
  const archive = await githubBytes(`https://api.github.com/repos/${owner}/${repo}/tarball`);
  const entries = untarGzip(archive, keepArchiveEntry);
  const codebase: Codebase = {
    owner,
    repo,
    files: entries.slice(0, MAX_FILES),
    truncated: entries.length > MAX_FILES,
  };
  cache.set(key, codebase);
  while (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value as string);
  return codebase;
}

function keepArchiveEntry(path: string, size: number): boolean {
  if (size > MAX_FILE_BYTES) return false;
  if (EXCLUDED_SEGMENTS.some((segment) => path.includes(segment))) return false;
  if (path.endsWith('.d.ts')) return false;
  return SOURCE_EXTENSIONS.some((extension) => path.endsWith(extension));
}
