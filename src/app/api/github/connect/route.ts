import { NextResponse } from 'next/server';
import { parseGithubAccess, oauthScope } from '@/features/github-auth/githubAccess';
import { oauthConfig } from '@/features/github-auth/githubOAuthConfig';
import { allowedReturn, oauthProxy } from '@/features/github-auth/oauthProxy';
import { issueOauthState } from '@/features/github-auth/oauthState';
import { requestOrigin } from '@/features/github-auth/requestOrigin';

export async function GET(request: Request) {
  const origin = requestOrigin(request);
  const params = new URL(request.url).searchParams;
  const access = parseGithubAccess(params.get('access'));
  const proxy = oauthProxy(request);
  if (proxy) return NextResponse.redirect(`${proxy}/api/github/connect?access=${access}&return=${encodeURIComponent(origin)}`);
  const fail = (message: string) => NextResponse.redirect(`${origin}/?error=${encodeURIComponent(message)}`);
  const config = oauthConfig();
  if (!config) return fail('GitHub sign-in is not configured: set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET');
  const returnTo = allowedReturn(params.get('return'));
  if (params.has('return') && !returnTo) return fail(`GitHub sign-in cannot return to ${params.get('return')}`);
  const state = await issueOauthState(access, returnTo);
  const query = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: `${origin}/api/github/callback`,
    scope: oauthScope(access),
    state,
  });
  return NextResponse.redirect(`https://github.com/login/oauth/authorize?${query}`);
}
