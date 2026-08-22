import { githubToken } from './githubToken';

export class GithubRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function githubJson<T>(url: string): Promise<T> {
  const response = await githubFetch(url);
  return (await response.json()) as T;
}

export async function githubBytes(url: string): Promise<Uint8Array> {
  const response = await githubFetch(url);
  return new Uint8Array(await response.arrayBuffer());
}

async function githubFetch(url: string): Promise<Response> {
  const response = await fetch(url, { headers: githubHeaders('application/vnd.github+json') });
  if (response.ok) return response;
  throw new GithubRequestError(response.status, describeFailure(response, url));
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
