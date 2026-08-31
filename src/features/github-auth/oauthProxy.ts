import { createHmac, timingSafeEqual } from 'node:crypto';
import { requestOrigin } from './requestOrigin';

export function oauthProxy(request?: Request): string | null {
  const proxy = process.env.GITHUB_OAUTH_PROXY_ORIGIN || null;
  return proxy && request && proxy === requestOrigin(request) ? null : proxy;
}

export function relayConfigured(): boolean {
  return Boolean(process.env.GITHUB_OAUTH_RELAY_SECRET);
}

export function signReturn(origin: string): string | null {
  const secret = process.env.GITHUB_OAUTH_RELAY_SECRET;
  return secret ? createHmac('sha256', secret).update(origin).digest('base64url') : null;
}

export function verifiedReturn(origin: string | null, signature: string | null): string | null {
  if (!origin || !signature) return null;
  const expected = signReturn(origin);
  if (!expected) return null;
  const [want, given] = [Buffer.from(expected), Buffer.from(signature)];
  return want.length === given.length && timingSafeEqual(want, given) ? origin : null;
}

export function forwardRefresh(proxy: string, refreshToken: string): Promise<Response> {
  const body = JSON.stringify({ refreshToken });
  return fetch(`${proxy}/api/github/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
    .catch(() => Response.json({ error: 'GitHub refresh proxy failed' }, { status: 502 }));
}
