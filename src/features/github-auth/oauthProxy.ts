import type { GithubAccess } from './githubAccess';
import { requestOrigin } from './requestOrigin';

export function oauthProxyConfigured(): string | null {
  return process.env.GITHUB_OAUTH_PROXY_ORIGIN?.replace(/\/+$/, '') || null;
}

export function oauthProxyFor(request: Request): string | null {
  const proxy = oauthProxyConfigured();
  return proxy && proxy !== requestOrigin(request) ? proxy : null;
}

export function proxyConnectUrl(proxy: string, access: GithubAccess, returnOrigin: string): string {
  const query = new URLSearchParams({ access, return: returnOrigin });
  return `${proxy}/api/github/connect?${query}`;
}

export function allowedReturnOrigin(origin: string | null | undefined): string | null {
  if (!origin) return null;
  const host = originHost(origin);
  return host && returnHostSuffixes().some((suffix) => host === suffix || host.endsWith(suffix)) ? origin : null;
}

export async function forwardRefresh(proxy: string, refreshToken: string): Promise<Response> {
  const response = await fetch(`${proxy}/api/github/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  return Response.json(await response.json().catch(() => ({ error: 'GitHub refresh proxy failed' })), { status: response.status });
}

function originHost(origin: string): string | null {
  try {
    const url = new URL(origin);
    return url.protocol === 'https:' && url.origin === origin ? url.host : null;
  } catch {
    return null;
  }
}

function returnHostSuffixes(): string[] {
  return (process.env.GITHUB_OAUTH_RETURN_HOSTS ?? '').split(',').map((entry) => entry.trim()).filter(Boolean);
}
