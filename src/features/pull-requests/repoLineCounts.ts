import { gunzipSync } from 'node:zlib';
import { encodePath } from './repoFiles';
import { githubDerived, githubJson } from '@/features/codebases/githubRequest';

export interface RepoLineCounts {
  lines: Record<string, number>;
}

const API = 'https://api.github.com';
const BLOCK = 512;
const MAX_UNPACKED_BYTES = 512 * 1024 * 1024;
const BINARY_PROBE_BYTES = 8000;
const REGULAR_FILE_FLAGS = ['0', '\0'];
const PAX_HEADER_FLAG = 'x';
const GNU_LONG_NAME_FLAG = 'L';
const BASE_256_SIZE_BIT = 0x80;

interface TarEntry {
  flag: string;
  name: string;
  body: Buffer;
}

export async function countRepoLines(owner: string, name: string, ref: string): Promise<RepoLineCounts> {
  const { sha } = await githubJson<{ sha: string }>(`${API}/repos/${owner}/${name}/commits/${encodePath(ref)}`);
  return { lines: await githubDerived(`${API}/repos/${owner}/${name}/tarball/${sha}`, 'line-counts', tarballLineCounts) };
}

function tarballLineCounts(gzipped: Buffer): Record<string, number> {
  const lines: Record<string, number> = {};
  for (const { path, body } of tarFiles(gunzipSync(gzipped, { maxOutputLength: MAX_UNPACKED_BYTES }))) {
    if (!looksBinary(body)) lines[path] = lineCount(body);
  }
  return lines;
}

function* tarFiles(tar: Buffer): Generator<{ path: string; body: Buffer }> {
  let longName: string | null = null;
  for (let at = 0; hasHeader(tar, at); at = afterEntry(at, tarSize(tar, at))) {
    const entry = tarEntry(tar, at);
    const nameAhead = longNameIn(entry);
    if (nameAhead === null && REGULAR_FILE_FLAGS.includes(entry.flag)) yield { path: withoutRoot(longName ?? entry.name), body: entry.body };
    longName = nameAhead;
  }
}

function hasHeader(tar: Buffer, at: number): boolean {
  return at + BLOCK <= tar.length && tar[at] !== 0 && ((tar[at + 124] ?? 0) & BASE_256_SIZE_BIT) === 0;
}

function tarSize(tar: Buffer, at: number): number {
  return parseInt(field(tar, at, 124, 12), 8) || 0;
}

function afterEntry(at: number, size: number): number {
  return at + BLOCK + Math.ceil(size / BLOCK) * BLOCK;
}

function tarEntry(tar: Buffer, at: number): TarEntry {
  const size = tarSize(tar, at);
  const prefix = field(tar, at, 345, 155);
  const name = field(tar, at, 0, 100);
  return {
    flag: String.fromCharCode(tar[at + 156] ?? 0),
    name: prefix ? `${prefix}/${name}` : name,
    body: tar.subarray(at + BLOCK, at + BLOCK + size),
  };
}

function longNameIn(entry: TarEntry): string | null {
  if (entry.flag === PAX_HEADER_FLAG) return entry.body.toString('utf8').match(/^\d+ path=(.*)$/m)?.[1] ?? null;
  if (entry.flag === GNU_LONG_NAME_FLAG) return field(entry.body, 0, 0, entry.body.length);
  return null;
}

function field(tar: Buffer, at: number, offset: number, length: number): string {
  const raw = tar.subarray(at + offset, at + offset + length);
  const end = raw.indexOf(0);
  return raw.subarray(0, end === -1 ? raw.length : end).toString('utf8');
}

function withoutRoot(path: string): string {
  return path.slice(path.indexOf('/') + 1);
}

function looksBinary(body: Buffer): boolean {
  return body.subarray(0, BINARY_PROBE_BYTES).includes(0);
}

function lineCount(body: Buffer): number {
  if (body.length === 0) return 0;
  let count = 0;
  for (const byte of body) if (byte === 10) count += 1;
  return body[body.length - 1] === 10 ? count : count + 1;
}
