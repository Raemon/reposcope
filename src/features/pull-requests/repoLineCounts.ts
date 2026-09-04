import { gunzipSync } from 'node:zlib';
import { githubDerived } from '@/features/codebases/githubRequest';

export interface RepoLineCounts {
  ref: string;
  lines: Record<string, number>;
}

const API = 'https://api.github.com';
const BLOCK = 512;
const BINARY_PROBE_BYTES = 8000;
const REGULAR_FILE_FLAGS = ['0', '\0'];
const PAX_HEADER_FLAG = 'x';
const GNU_LONG_NAME_FLAG = 'L';

export async function countRepoLines(owner: string, name: string, ref: string): Promise<RepoLineCounts> {
  const url = `${API}/repos/${owner}/${name}/tarball/${ref.split('/').map(encodeURIComponent).join('/')}`;
  return { ref, lines: await githubDerived(url, 'application/vnd.github+json', tarballLineCounts) };
}

export function tarballLineCounts(gzipped: Buffer): Record<string, number> {
  const lines: Record<string, number> = {};
  for (const { path, body } of tarFiles(gunzipSync(gzipped))) {
    if (!looksBinary(body)) lines[path] = lineCount(body);
  }
  return lines;
}

function* tarFiles(tar: Buffer): Generator<{ path: string; body: Buffer }> {
  let longName: string | null = null;
  for (let at = 0; at + BLOCK <= tar.length && tar[at] !== 0; at += BLOCK) {
    const size = parseInt(field(tar, at, 124, 12), 8) || 0;
    const flag = String.fromCharCode(tar[at + 156] ?? 0);
    const body = tar.subarray(at + BLOCK, at + BLOCK + size);
    if (flag === PAX_HEADER_FLAG) longName = paxPath(body);
    else if (flag === GNU_LONG_NAME_FLAG) longName = field(tar, at + BLOCK, 0, size);
    else {
      if (REGULAR_FILE_FLAGS.includes(flag)) yield { path: withoutRoot(longName ?? headerName(tar, at)), body };
      longName = null;
    }
    at += Math.ceil(size / BLOCK) * BLOCK;
  }
}

function headerName(tar: Buffer, at: number): string {
  const prefix = field(tar, at, 345, 155);
  const name = field(tar, at, 0, 100);
  return prefix ? `${prefix}/${name}` : name;
}

function field(tar: Buffer, at: number, offset: number, length: number): string {
  const raw = tar.subarray(at + offset, at + offset + length);
  const end = raw.indexOf(0);
  return raw.subarray(0, end === -1 ? raw.length : end).toString('utf8');
}

function paxPath(body: Buffer): string | null {
  const match = body.toString('utf8').match(/^\d+ path=(.*)$/m);
  return match?.[1] ?? null;
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
