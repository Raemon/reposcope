import { NextResponse } from 'next/server';
import { parseGithubAccess, oauthScope, type GithubAccess } from '@/features/github-auth/githubAccess';
import { oauthConfig } from '@/features/github-auth/githubOAuthConfig';
import { allowedReturnOrigin, oauthProxyFor, proxyConnectUrl } from '@/features/github-auth/oauthProxy';
import { issueOauthState } from '@/features/github-auth/oauthState';
import { requestOrigin } from '@/features/github-auth/requestOrigin';

export async function GET(request: Request) {
  const origin = requestOrigin(request);
  const query = new URL(request.url).searchParams;
  const access = parseGithubAccess(query.get('access'));
  const proxy = oauthProxyFor(request);
  if (proxy) return NextResponse.redirect(proxyConnectUrl(proxy, access, origin));

  const config = oauthConfig();
  if (!config) return errorAt(origin, 'GitHub sign-in is not configured: set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET');
  const requested = query.get('return');
  const returnOrigin = allowedReturnOrigin(requested);
  if (requested && !returnOrigin) return errorAt(origin, `GitHub sign-in cannot return to ${requested}`);
  const state = await issueOauthState(access, returnOrigin);
  return NextResponse.redirect(authorizeUrl(config.clientId, `${origin}/api/github/callback`, access, state));
}

function authorizeUrl(clientId: string, redirectUri: string, access: GithubAccess, state: string): string {
  const query = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, scope: oauthScope(access), state });
  return `https://github.com/login/oauth/authorize?${query}`;
}

function errorAt(origin: string, message: string): NextResponse {
  return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(message)}`);
}
