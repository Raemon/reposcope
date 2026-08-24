import { githubToken } from './githubToken';

export class GithubRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface FreshJson<T> {
  value: T;
  etag: string | null;
}

export async function githubJson<T>(url: string): Promise<T> {
  const response = await githubFetch(url);
  return (await response.json()) as T;
}

export async function githubJsonIfChanged<T>(url: string, etag: string | null): Promise<FreshJson<T> | null> {
  const headers = githubHeaders('application/vnd.github+json');
  if (etag) headers['If-None-Match'] = etag;
  const response = await fetch(url, { headers });
  if (response.status === 304) return null;
  if (!response.ok) throw new GithubRequestError(response.status, describeFailure(response, url));
  return { value: (await response.json()) as T, etag: response.headers.get('etag') };
}

export async function githubSend<T>(url: string, method: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { ...githubHeaders('application/vnd.github+json'), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new GithubRequestError(response.status, await describeSendFailure(response, url));
  return (await response.json()) as T;
}

export async function githubGraphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const url = 'https://api.github.com/graphql';
  const response = await fetch(url, {
    method: 'POST',
    headers: { ...githubHeaders('application/json'), 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new GithubRequestError(response.status, await describeSendFailure(response, url));
  const payload = (await response.json()) as { data?: T; errors?: { message?: string }[] };
  const failure = payload.errors?.[0]?.message;
  if (failure) throw new GithubRequestError(response.status, failure);
  return payload.data as T;
}

export async function githubBytes(url: string, accept = 'application/vnd.github+json'): Promise<Uint8Array> {
  const response = await githubFetch(url, accept);
  return new Uint8Array(await response.arrayBuffer());
}

async function githubFetch(url: string, accept = 'application/vnd.github+json'): Promise<Response> {
  const response = await fetch(url, { headers: githubHeaders(accept) });
  if (response.ok) return response;
  throw new GithubRequestError(response.status, describeFailure(response, url));
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

function githubHeaders(accept: string): Record<string, string> {
  const token = githubToken();
  return {
    Accept: accept,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'reposcope',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
