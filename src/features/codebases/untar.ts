import { gunzipSync } from 'node:zlib';

const BLOCK = 512;

export interface ArchiveEntry {
  path: string;
  source: string;
}

export function untarGzip(archive: Uint8Array, keep: (path: string, size: number) => boolean): ArchiveEntry[] {
  const bytes = gunzipSync(archive);
  const entries: ArchiveEntry[] = [];
  const decoder = new TextDecoder('utf8', { fatal: false });
  let offset = 0;
  let longName: string | null = null;

  while (offset + BLOCK <= bytes.length) {
    const header = bytes.subarray(offset, offset + BLOCK);
    if (header.every((byte) => byte === 0)) break;
    const name = longName ?? ustarPath(header);
    const size = readOctal(header, 124, 12);
    const typeFlag = String.fromCharCode(header[156] ?? 0);
    const body = bytes.subarray(offset + BLOCK, offset + BLOCK + size);
    longName = null;
    if (typeFlag === 'L') longName = decoder.decode(body).replace(/\0+$/, '');
    else if (typeFlag === '0' || typeFlag === '\0') {
      const path = stripArchiveRoot(name);
      if (keep(path, size)) entries.push({ path, source: decoder.decode(body) });
    }
    offset += BLOCK + Math.ceil(size / BLOCK) * BLOCK;
  }
  return entries;
}

function ustarPath(header: Uint8Array): string {
  const name = readString(header, 0, 100);
  if (readString(header, 257, 6).replace(/\0/g, '').trim() !== 'ustar') return name;
  const prefix = readString(header, 345, 155);
  return prefix === '' ? name : `${prefix}/${name}`;
}

function stripArchiveRoot(name: string): string {
  const separator = name.indexOf('/');
  return separator === -1 ? name : name.slice(separator + 1);
}

function readString(block: Uint8Array, start: number, length: number): string {
  const raw = block.subarray(start, start + length);
  const end = raw.indexOf(0);
  return new TextDecoder().decode(end === -1 ? raw : raw.subarray(0, end));
}

function readOctal(block: Uint8Array, start: number, length: number): number {
  const text = readString(block, start, length).trim();
  return text === '' ? 0 : parseInt(text, 8);
}
