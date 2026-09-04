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
  blockLeft: number;
  textChunks: Buffer[] | null;
  probedBytes: number;
  binary: boolean;
  newlines: number;
  lastByte: number;
}

export async function countTarballLines(body: ReadableStream<Uint8Array> | null): Promise<Record<string, number>> {
  const counter = new TarLineCounter();
  if (body === null) return counter.lines;
  for await (const chunk of gunzipped(body)) counter.push(chunk as Buffer);
  return counter.lines;
}

function gunzipped(body: ReadableStream<Uint8Array>): Readable {
  return Readable.fromWeb(body as NodeReadableStream<Uint8Array>).pipe(createGunzip());
}

class TarLineCounter {
  readonly lines: Record<string, number> = {};
  private header = Buffer.alloc(0);
  private entry: OpenEntry | null = null;
  private longName: string | null = null;
  private unpacked = 0;
  private ended = false;

  push(chunk: Buffer): void {
    this.guardSize(chunk);
    for (let at = 0; at < chunk.length && !this.ended; ) at = this.feedFrom(chunk, at);
  }

  private guardSize(chunk: Buffer): void {
    this.unpacked += chunk.length;
    if (this.unpacked > MAX_UNPACKED_BYTES) throw new GithubRequestError(413, 'Repository too large to count lines');
  }

  private feedFrom(chunk: Buffer, at: number): number {
    return this.entry ? this.feedEntry(this.entry, chunk, at) : this.feedHeader(chunk, at);
  }

  private feedHeader(chunk: Buffer, at: number): number {
    const take = Math.min(BLOCK - this.header.length, chunk.length - at);
    this.header = Buffer.concat([this.header, chunk.subarray(at, at + take)]);
    if (this.header.length === BLOCK) this.beginEntry(this.header);
    return at + take;
  }

  private beginEntry(header: Buffer): void {
    this.header = Buffer.alloc(0);
    if (header[0] === 0 || ((header[124] ?? 0) & BASE_256_SIZE_BIT) !== 0) this.ended = true;
    else this.entry = entryFromHeader(header);
  }

  private feedEntry(entry: OpenEntry, chunk: Buffer, at: number): number {
    const take = Math.min(entry.blockLeft, chunk.length - at);
    takeContent(entry, chunk.subarray(at, at + Math.min(take, entry.contentLeft)));
    entry.blockLeft -= take;
    if (entry.blockLeft === 0) this.closeEntry(entry);
    return at + take;
  }

  private closeEntry(entry: OpenEntry): void {
    this.entry = null;
    const nameAhead = longNameIn(entry);
    if (countable(entry, nameAhead)) this.lines[withoutRoot(this.longName ?? entry.name)] = lineCount(entry);
    this.longName = nameAhead;
  }
}

function entryFromHeader(header: Buffer): OpenEntry {
  const head = headerFields(header);
  return { ...head, contentLeft: head.size, blockLeft: Math.ceil(head.size / BLOCK) * BLOCK, ...blankCounts(head.flag) };
}

function headerFields(header: Buffer): { name: string; flag: string; size: number } {
  const prefix = field(header, 345, 155);
  const name = field(header, 0, 100);
  const flag = String.fromCharCode(header[156] ?? 0);
  return { name: prefix ? `${prefix}/${name}` : name, flag, size: parseInt(field(header, 124, 12), 8) || 0 };
}

function blankCounts(flag: string) {
  const holdsText = flag === PAX_HEADER_FLAG || flag === GNU_LONG_NAME_FLAG;
  return { textChunks: holdsText ? [] : null, probedBytes: 0, binary: false, newlines: 0, lastByte: 0 };
}

function takeContent(entry: OpenEntry, bytes: Buffer): void {
  if (bytes.length === 0) return;
  entry.contentLeft -= bytes.length;
  if (entry.textChunks) entry.textChunks.push(Buffer.from(bytes));
  else countContent(entry, bytes);
}

function countContent(entry: OpenEntry, bytes: Buffer): void {
  probeBinary(entry, bytes);
  entry.newlines += countNewlines(bytes);
  entry.lastByte = bytes[bytes.length - 1] ?? 0;
}

function probeBinary(entry: OpenEntry, bytes: Buffer): void {
  if (entry.binary || entry.probedBytes >= BINARY_PROBE_BYTES) return;
  const probe = bytes.subarray(0, BINARY_PROBE_BYTES - entry.probedBytes);
  entry.binary = probe.includes(0);
  entry.probedBytes += probe.length;
}

function countNewlines(bytes: Buffer): number {
  let count = 0;
  for (let at = bytes.indexOf(NEWLINE); at !== -1; at = bytes.indexOf(NEWLINE, at + 1)) count += 1;
  return count;
}

function countable(entry: OpenEntry, nameAhead: string | null): boolean {
  return nameAhead === null && REGULAR_FILE_FLAGS.includes(entry.flag) && !entry.binary;
}

function lineCount(entry: OpenEntry): number {
  if (entry.size === 0) return 0;
  return entry.lastByte === NEWLINE ? entry.newlines : entry.newlines + 1;
}

function longNameIn(entry: OpenEntry): string | null {
  if (entry.textChunks === null) return null;
  const text = Buffer.concat(entry.textChunks);
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
