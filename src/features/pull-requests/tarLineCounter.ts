import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { createGunzip } from 'node:zlib';
import { GithubRequestError } from '@/features/codebases/githubRequest';

const BLOCK = 512;
const MAX_UNPACKED_BYTES = 512 * 1024 * 1024;
const BINARY_PROBE_BYTES = 8000;
const NEWLINE = 10;
const REGULAR_FILE_FLAGS = ['0', '\0'];
const PAX_HEADER_FLAG = 'x';
const GNU_LONG_NAME_FLAG = 'L';
const BASE_256_SIZE_BIT = 0x80;

interface OpenEntry {
  name: string;
  flag: string;
  size: number;
  contentLeft: number;
  left: number;
  text: Buffer[] | null;
  probed: number;
  binary: boolean;
  newlines: number;
  lastByte: number;
}

export async function countTarballLines(body: ReadableStream<Uint8Array> | null): Promise<Record<string, number>> {
  const counter = new TarLineCounter();
  if (body === null) return counter.lines;
  const unpacked = Readable.fromWeb(body as NodeReadableStream<Uint8Array>).pipe(createGunzip());
  for await (const chunk of unpacked) counter.push(chunk as Buffer);
  return counter.lines;
}

class TarLineCounter {
  readonly lines: Record<string, number> = {};
  private header = Buffer.alloc(0);
  private entry: OpenEntry | null = null;
  private longName: string | null = null;
  private unpacked = 0;
  private ended = false;

  push(chunk: Buffer): void {
    this.unpacked += chunk.length;
    if (this.unpacked > MAX_UNPACKED_BYTES) throw new GithubRequestError(413, 'Repository too large to count lines');
    let at = 0;
    while (at < chunk.length && !this.ended) at = this.entry ? this.feedEntry(chunk, at) : this.feedHeader(chunk, at);
  }

  private feedHeader(chunk: Buffer, at: number): number {
    const take = Math.min(BLOCK - this.header.length, chunk.length - at);
    this.header = Buffer.concat([this.header, chunk.subarray(at, at + take)]);
    if (this.header.length === BLOCK) this.openEntry(this.header);
    return at + take;
  }

  private openEntry(header: Buffer): void {
    this.header = Buffer.alloc(0);
    if (header[0] === 0 || ((header[124] ?? 0) & BASE_256_SIZE_BIT) !== 0) this.ended = true;
    else this.entry = openEntry(header);
  }

  private feedEntry(chunk: Buffer, at: number): number {
    const entry = this.entry!;
    const take = Math.min(entry.left, chunk.length - at);
    const content = Math.min(take, entry.contentLeft);
    if (content > 0) consume(entry, chunk.subarray(at, at + content));
    entry.contentLeft -= content;
    entry.left -= take;
    if (entry.left === 0) this.closeEntry(entry);
    return at + take;
  }

  private closeEntry(entry: OpenEntry): void {
    this.entry = null;
    const nameAhead = longNameIn(entry);
    if (nameAhead === null && REGULAR_FILE_FLAGS.includes(entry.flag) && !entry.binary) {
      this.lines[withoutRoot(this.longName ?? entry.name)] = lineCount(entry);
    }
    this.longName = nameAhead;
  }
}

function openEntry(header: Buffer): OpenEntry {
  const flag = String.fromCharCode(header[156] ?? 0);
  const size = parseInt(field(header, 124, 12), 8) || 0;
  const prefix = field(header, 345, 155);
  const name = field(header, 0, 100);
  const holdsText = flag === PAX_HEADER_FLAG || flag === GNU_LONG_NAME_FLAG;
  return {
    name: prefix ? `${prefix}/${name}` : name,
    flag,
    size,
    contentLeft: size,
    left: Math.ceil(size / BLOCK) * BLOCK,
    text: holdsText ? [] : null,
    probed: 0,
    binary: false,
    newlines: 0,
    lastByte: 0,
  };
}

function consume(entry: OpenEntry, bytes: Buffer): void {
  if (entry.text) {
    entry.text.push(Buffer.from(bytes));
    return;
  }
  probeBinary(entry, bytes);
  entry.newlines += countNewlines(bytes);
  entry.lastByte = bytes[bytes.length - 1] ?? 0;
}

function probeBinary(entry: OpenEntry, bytes: Buffer): void {
  if (entry.binary || entry.probed >= BINARY_PROBE_BYTES) return;
  const probe = bytes.subarray(0, BINARY_PROBE_BYTES - entry.probed);
  entry.binary = probe.includes(0);
  entry.probed += probe.length;
}

function countNewlines(bytes: Buffer): number {
  let count = 0;
  for (let at = bytes.indexOf(NEWLINE); at !== -1; at = bytes.indexOf(NEWLINE, at + 1)) count += 1;
  return count;
}

function lineCount(entry: OpenEntry): number {
  if (entry.size === 0) return 0;
  return entry.lastByte === NEWLINE ? entry.newlines : entry.newlines + 1;
}

function longNameIn(entry: OpenEntry): string | null {
  if (entry.text === null) return null;
  const text = Buffer.concat(entry.text);
  if (entry.flag === PAX_HEADER_FLAG) return text.toString('utf8').match(/^\d+ path=(.*)$/m)?.[1] ?? null;
  return field(text, 0, text.length);
}

function field(bytes: Buffer, offset: number, length: number): string {
  const raw = bytes.subarray(offset, offset + length);
  const end = raw.indexOf(0);
  return raw.subarray(0, end === -1 ? raw.length : end).toString('utf8');
}

function withoutRoot(path: string): string {
  return path.slice(path.indexOf('/') + 1);
}
