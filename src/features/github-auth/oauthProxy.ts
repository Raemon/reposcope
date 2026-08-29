import { requestOrigin } from './requestOrigin';

export function oauthProxy(request?: Request): string | null {
  const proxy = process.env.GITHUB_OAUTH_PROXY_ORIGIN || null;
  return proxy && request && proxy === requestOrigin(request) ? null : proxy;
}

export function allowedReturn(raw: string | null): string | null {
  const suffixes = (process.env.GITHUB_OAUTH_RETURN_HOSTS ?? '').split(',').filter(Boolean);
  const url = raw?.startsWith('https://') ? URL.parse(raw) : null;
  return url?.origin === raw && suffixes.some((suffix) => url.host.endsWith(suffix)) ? raw : null;
}

export function forwardRefresh(proxy: string, refreshToken: string): Promise<Response> {
  const body = JSON.stringify({ refreshToken });
  return fetch(`${proxy}/api/github/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
    .catch(() => Response.json({ error: 'GitHub refresh proxy failed' }, { status: 502 }));
}
