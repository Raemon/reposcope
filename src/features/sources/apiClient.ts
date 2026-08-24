export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiJson<T>(path: string, token: string | null, signal?: AbortSignal): Promise<T> {
  return readJson<T>(await fetch(path, { headers: authHeaders(token), signal }));
}

export async function apiPost<T>(path: string, token: string | null): Promise<T> {
  return readJson<T>(await fetch(path, { method: 'POST', headers: authHeaders(token) }));
}

export async function apiPostJson<T>(path: string, token: string | null, body: unknown): Promise<T> {
  return readJson<T>(
    await fetch(path, {
      method: 'POST',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

function authHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
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
