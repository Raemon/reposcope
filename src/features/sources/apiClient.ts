export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiJson<T>(path: string, token: string | null, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal,
  });
  const body: unknown = await response.json().catch(() => null);
  if (response.ok) return body as T;
  const message =
    body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string'
      ? (body as { error: string }).error
      : `Request failed (${response.status})`;
  throw new ApiClientError(response.status, message);
}
