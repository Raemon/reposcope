import { createHmac, timingSafeEqual } from 'node:crypto';
import { requestOrigin } from './requestOrigin';

export function oauthProxy(request?: Request): string | null {
  const proxy = process.env.GITHUB_OAUTH_PROXY_ORIGIN || null;
  return proxy && request && proxy === requestOrigin(request) ? null : proxy;
}

export function signReturn(origin: string): string {
  return createHmac('sha256', process.env.GITHUB_OAUTH_RELAY_SECRET ?? '').update(origin).digest('base64url');
}

export function verifiedReturn(origin: string | null, signature: string | null): string | null {
  if (!process.env.GITHUB_OAUTH_RELAY_SECRET || !origin || !signature) return null;
  const [expected, given] = [Buffer.from(signReturn(origin)), Buffer.from(signature)];
  return expected.length === given.length && timingSafeEqual(expected, given) ? origin : null;
}

export function forwardRefresh(proxy: string, refreshToken: string): Promise<Response> {
  const body = JSON.stringify({ refreshToken });
  return fetch(`${proxy}/api/github/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
    .catch(() => Response.json({ error: 'GitHub refresh proxy failed' }, { status: 502 }));
}
