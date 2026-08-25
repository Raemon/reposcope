import { GITHUB_AUTH_HEADER, GITHUB_AUTH_REJECTED } from '@/features/github-auth/githubAuthHeader';
import { freshGithubToken, renewGithubToken } from './githubSession';
import { signOutGithub } from './sourceStore';

const SIGN_IN_EXPIRED = 'GitHub sign-in expired';

interface Call {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiJson<T>(path: string, token: string | null, signal?: AbortSignal): Promise<T> {
  return send<T>(path, token, { signal });
}

export async function apiPost<T>(path: string, token: string | null): Promise<T> {
  return send<T>(path, token, { method: 'POST' });
}

export async function apiPostJson<T>(path: string, token: string | null, body: unknown): Promise<T> {
  return send<T>(path, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function send<T>(path: string, token: string | null, call: Call): Promise<T> {
  const response = await fetch(path, authorized(call, await freshGithubToken(token)));
  if (!tokenRejected(response)) return readJson<T>(response);
  const renewed = await renewGithubToken();
  if (renewed === null) {
    signOutGithub(SIGN_IN_EXPIRED);
    return readJson<T>(response);
  }
  return readJson<T>(await fetch(path, authorized(call, renewed)));
}

function authorized(call: Call, token: string | null): RequestInit {
  return { ...call, headers: { ...call.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) } };
}

function tokenRejected(response: Response): boolean {
  return response.headers.get(GITHUB_AUTH_HEADER) === GITHUB_AUTH_REJECTED;
}

async function readJson<T>(response: Response): Promise<T> {
  const body: unknown = await response.json().catch(() => null);
  if (response.ok) return body as T;
  const message =
    body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string'
      ? (body as { error: string }).error
      : `Request failed (${response.status})`;
  throw new ApiClientError(response.status, message);
}
