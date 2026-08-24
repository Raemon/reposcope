import { cacheKey, dropCachedScope, readCachedResponse, writeCachedResponse, type CachedResponse } from './githubCache';
import { githubToken, githubTokenIdentity } from './githubToken';

export class GithubRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const ACCEPT = 'application/vnd.github+json';
const DEFAULT_FRESHNESS_MS = 30_000;
const IMMUTABLE_PATTERNS = [/\/commits\/[0-9a-f]{7,40}$/, /\/(?:tarball|zipball)\/[0-9a-f]{7,40}$/, /\/git\/blobs\//];
const STALE_ON_STATUS = [403, 408, 429, 500, 502, 503, 504];

const inFlight = new Map<string, Promise<CachedResponse>>();

export async function githubJson<T>(url: string): Promise<T> {
  return JSON.parse(decodeBody(await cachedResponse(url)).toString('utf8')) as T;
}

export async function githubBytes(url: string): Promise<Uint8Array> {
  return new Uint8Array(decodeBody(await cachedResponse(url)));
}

export async function githubSend<T>(url: string, method: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    cache: 'no-store',
    headers: { ...githubHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  await dropCachedScope(scopeOf(url));
  if (!response.ok) throw new GithubRequestError(response.status, await describeSendFailure(response, url));
  return (await response.json()) as T;
}

async function cachedResponse(url: string): Promise<CachedResponse> {
  const scope = scopeOf(url);
  const key = cacheKey([githubTokenIdentity(), url, ACCEPT]);
  const held = await readCachedResponse(scope, key);
  if (held && Date.now() - held.storedAt < freshnessOf(url)) return held;
  return shareInFlight(scope + key, () => revalidate(url, scope, key, held));
}

function shareInFlight(key: string, work: () => Promise<CachedResponse>): Promise<CachedResponse> {
  const running = inFlight.get(key);
  if (running) return running;
  const pending = work().finally(() => inFlight.delete(key));
  inFlight.set(key, pending);
  return pending;
}

async function revalidate(
  url: string,
  scope: string,
  key: string,
  held: CachedResponse | null,
): Promise<CachedResponse> {
  const response = await fetch(url, { cache: 'no-store', headers: conditionalHeaders(held) }).catch(() => null);
  if (!response) {
    if (held) return held;
    throw new GithubRequestError(503, `GitHub is unreachable for ${url}`);
  }
  if (response.status === 304 && held) return store(scope, key, { ...held, storedAt: Date.now() });
  if (!response.ok) {
    if (held && STALE_ON_STATUS.includes(response.status)) return held;
    throw new GithubRequestError(response.status, describeFailure(response, url));
  }
  return store(scope, key, await capture(response));
}

async function capture(response: Response): Promise<CachedResponse> {
  const body = Buffer.from(await response.arrayBuffer());
  const textual = /json|text|javascript/.test(response.headers.get('content-type') ?? '');
  return {
    status: response.status,
    etag: response.headers.get('etag'),
    lastModified: response.headers.get('last-modified'),
    storedAt: Date.now(),
    encoding: textual ? 'utf8' : 'base64',
    body: textual ? body.toString('utf8') : body.toString('base64'),
  };
}

async function store(scope: string, key: string, entry: CachedResponse): Promise<CachedResponse> {
  await writeCachedResponse(scope, key, entry);
  return entry;
}

function decodeBody(entry: CachedResponse): Buffer {
  return Buffer.from(entry.body, entry.encoding);
}

function freshnessOf(url: string): number {
  return IMMUTABLE_PATTERNS.some((pattern) => pattern.test(pathOf(url)))
    ? Number.POSITIVE_INFINITY
    : DEFAULT_FRESHNESS_MS;
}

function scopeOf(url: string): string {
  const segments = pathOf(url).split('/').filter(Boolean);
  if (segments[0] === 'repos' && segments[1] && segments[2]) return `repos/${segments[1]}/${segments[2]}`;
  return segments[0] ?? 'root';
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function conditionalHeaders(held: CachedResponse | null): Record<string, string> {
  const headers = githubHeaders();
  if (held?.etag) headers['If-None-Match'] = held.etag;
  else if (held?.lastModified) headers['If-Modified-Since'] = held.lastModified;
  return headers;
}

async function describeSendFailure(response: Response, url: string): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  const message = (body as { message?: unknown } | null)?.message;
  return typeof message === 'string' && message ? message : describeFailure(response, url);
}

function describeFailure(response: Response, url: string): string {
  const exhausted = response.headers.get('x-ratelimit-remaining') === '0';
  if (exhausted) return `GitHub rate limit exhausted (${response.status} for ${url}); connect GitHub or set GITHUB_TOKEN`;
  return `GitHub ${response.status} for ${url}`;
}

function githubHeaders(): Record<string, string> {
  const token = githubToken();
  return {
    Accept: ACCEPT,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'reposcope',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
