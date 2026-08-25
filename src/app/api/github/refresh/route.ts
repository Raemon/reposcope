import { oauthConfig } from '@/features/github-auth/githubOAuthConfig';
import { refreshGrant } from '@/features/github-auth/githubOAuthTokens';

export async function POST(request: Request) {
  const config = oauthConfig();
  if (!config) return Response.json({ error: 'GitHub sign-in is not configured' }, { status: 500 });
  const refreshToken = (((await request.json().catch(() => null)) as { refreshToken?: unknown } | null)?.refreshToken) ?? null;
  if (typeof refreshToken !== 'string' || !refreshToken) {
    return Response.json({ error: 'Missing refreshToken' }, { status: 400 });
  }
  try {
    return Response.json(await refreshGrant(refreshToken, config));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'GitHub refresh failed' }, { status: 401 });
  }
}
