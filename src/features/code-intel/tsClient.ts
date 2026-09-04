import type {
  CodeIntelQuery,
  FileRead,
  CodeIntelResult,
  CodePosition,
  DefinitionSite,
  FromWorker,
  HoverInfo,
  ReferenceSite,
  ToWorker,
} from './codeIntelTypes';
import { once } from './once';
import type { ResolverFiles } from '@/features/pull-requests/definitionResolver';

export interface CodeIntelClient {
  attach(files: ResolverFiles): void;
  warm(ref: string, seeds?: string[]): Promise<void>;
  definition(at: CodePosition): Promise<DefinitionSite[]>;
  hover(at: CodePosition): Promise<HoverInfo | null>;
  references(at: CodePosition, seeds?: string[]): Promise<ReferenceSite[]>;
}

interface Pending {
  resolve: (value: unknown) => void;
  reject: (issue: Error) => void;
}

const MAX_CLIENTS = 2;
const MAX_CACHED_RESULTS = 2000;
const clients = new Map<string, { client: CodeIntelClient; link: WorkerLink }>();

export function codeIntelClient(owner: string, repo: string): CodeIntelClient {
  const key = `${owner}/${repo}`;
  const known = clients.get(key);
  if (known) {
    clients.delete(key);
    clients.set(key, known);
    return known.client;
  }
  const made = makeClient();
  clients.set(key, made);
  dropOldestClients();
  return made.client;
}

function dropOldestClients() {
  while (clients.size > MAX_CLIENTS) {
    const oldest = clients.keys().next().value;
    if (oldest === undefined) return;
    clients.get(oldest)?.link.stop();
    clients.delete(oldest);
  }
}

function makeClient(): { client: CodeIntelClient; link: WorkerLink } {
  const link = new WorkerLink();
  const cache = new Map<string, Promise<unknown>>();
  const cached = <Q extends CodeIntelQuery>(query: Q): Promise<CodeIntelResult<Q>> => {
    const result = once(cache, keyOf(query), () => link.query(query)) as Promise<CodeIntelResult<Q>>;
    dropOldestResults(cache);
    return result;
  };
  return { link, client: clientOver(link, cached) };
}

function dropOldestResults(cache: Map<string, Promise<unknown>>) {
  while (cache.size > MAX_CACHED_RESULTS) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) return;
    cache.delete(oldest);
  }
}

function clientOver(link: WorkerLink, cached: <Q extends CodeIntelQuery>(query: Q) => Promise<CodeIntelResult<Q>>): CodeIntelClient {
  return {
    attach: (files) => link.attach(files),
    warm: async (ref, seeds) => void (await cached({ op: 'warm', ref, seeds })),
    definition: (at) => cached({ op: 'definition', ...at }),
    hover: (at) => cached({ op: 'hover', ...at }),
    references: (at, seeds) => cached({ op: 'references', ...at, seeds }),
  };
}

class WorkerLink {
  private files: ResolverFiles | null = null;
  private worker: Worker | null = null;
  private readonly pending = new Map<number, Pending>();
  private nextId = 0;

  attach(files: ResolverFiles) {
    this.files = files;
  }

  query(query: CodeIntelQuery): Promise<unknown> {
    if (!this.files) return Promise.reject(new Error('code intel has no file source attached'));
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject });
      this.send({ kind: 'query', id, query });
    });
  }

  private send(message: ToWorker) {
    this.worker ??= this.spawn();
    this.worker.postMessage(message);
  }

  private spawn(): Worker {
    const worker = new Worker(new URL('./tsLanguage.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<FromWorker>) => void this.receive(event.data);
    worker.onerror = (event) => this.failAll(new Error(event.message || 'code intel worker failed'));
    return worker;
  }

  private async receive(message: FromWorker) {
    switch (message.kind) {
      case 'result':
        return this.settle(message.id, (held) => held.resolve(message.result));
      case 'error':
        return this.settle(message.id, (held) => held.reject(new Error(message.message)));
      case 'need':
        return this.send(await this.filesReply(message.id, message.ref, message.paths));
      case 'listing':
        return this.send(await this.listingReply(message.id, message.ref));
    }
  }

  private async filesReply(id: number, ref: string, paths: string[]): Promise<ToWorker> {
    const files = this.source();
    const texts = await mapLimited(paths, MAX_PARALLEL_READS, (path) => readWithRetry(files, ref, path));
    warnAboutFailedReads(ref, paths, texts);
    return { kind: 'files', id, texts };
  }

  private async listingReply(id: number, ref: string): Promise<ToWorker> {
    try {
      return { kind: 'listing', id, listing: await this.source().listFiles(ref) };
    } catch (issue: unknown) {
      return { kind: 'listing', id, listing: null, error: describe(issue) };
    }
  }

  private source(): ResolverFiles {
    if (!this.files) throw new Error('code intel has no file source attached');
    return this.files;
  }

  private settle(id: number, finish: (held: Pending) => void) {
    const held = this.pending.get(id);
    this.pending.delete(id);
    if (held) finish(held);
  }

  stop() {
    this.failAll(new Error('code intel worker stopped'));
  }

  private failAll(issue: Error) {
    for (const held of this.pending.values()) held.reject(issue);
    this.pending.clear();
    this.worker?.terminate();
    this.worker = null;
  }
}

const RETRY_DELAY_MS = 300;
const MAX_PARALLEL_READS = 6;

async function mapLimited<T, R>(items: T[], limit: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const lane = async () => {
    for (let at = next++; at < items.length; at = next++) results[at] = await work(items[at] as T);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
  return results;
}

async function readWithRetry(files: ResolverFiles, ref: string, path: string): Promise<FileRead> {
  try {
    return await files.readFile(ref, path);
  } catch {
    await new Promise((done) => setTimeout(done, RETRY_DELAY_MS));
    return files.readFile(ref, path).catch((issue: unknown) => ({ error: describe(issue) }));
  }
}

function warnAboutFailedReads(ref: string, paths: string[], texts: FileRead[]) {
  const failed = texts.flatMap((text, at) => (typeof text === 'object' && text !== null ? [`${paths[at]} (${text.error})`] : []));
  if (failed.length > 0) console.warn(`code intel could not read ${failed.length} file(s) at ${ref}, first: ${failed[0]}`);
}

function describe(issue: unknown): string {
  return issue instanceof Error ? issue.message : String(issue);
}

function keyOf(query: CodeIntelQuery): string {
  const seeds = query.op === 'warm' || query.op === 'references' ? (query.seeds ?? []).join(',') : '';
  if (query.op === 'warm') return `warm|${query.ref}|${seeds}`;
  return `${query.op}|${query.ref}|${query.path}|${query.line}|${query.column}|${seeds}`;
}
