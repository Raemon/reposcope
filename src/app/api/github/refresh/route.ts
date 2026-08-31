import { oauthConfig } from '@/features/github-auth/githubOAuthConfig';
import { GrantRejectedError, refreshGrant } from '@/features/github-auth/githubOAuthTokens';
import { forwardRefresh, oauthProxy } from '@/features/github-auth/oauthProxy';
import { NOT_CONFIGURED } from '@/features/github-auth/oauthRoute';

export async function POST(request: Request) {
  const refreshToken = (((await request.json().catch(() => null)) as { refreshToken?: unknown } | null)?.refreshToken) ?? null;
  if (typeof refreshToken !== 'string' || !refreshToken) {
    return Response.json({ error: 'Missing refreshToken' }, { status: 400 });
  }
  const proxy = oauthProxy(request);
  if (proxy) return forwardRefresh(proxy, refreshToken);
  const config = oauthConfig();
  if (!config) return Response.json({ error: NOT_CONFIGURED }, { status: 500 });
  try {
    return Response.json(await refreshGrant(refreshToken, config));
  } catch (error) {
    const status = error instanceof GrantRejectedError ? 401 : 502;
    return Response.json({ error: error instanceof Error ? error.message : 'GitHub refresh failed' }, { status });
  }
}
