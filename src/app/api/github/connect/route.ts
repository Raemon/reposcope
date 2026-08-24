import { NextResponse } from 'next/server';
import { parseGithubAccess, oauthScope } from '@/features/github-auth/githubAccess';
import { oauthConfig } from '@/features/github-auth/githubOAuthConfig';
import { issueOauthState } from '@/features/github-auth/oauthState';
import { requestOrigin } from '@/features/github-auth/requestOrigin';

export async function GET(request: Request) {
  const origin = requestOrigin(request);
  const config = oauthConfig();
  if (!config) {
    const message = 'GitHub sign-in is not configured: set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET';
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(message)}`);
  }
  const access = parseGithubAccess(new URL(request.url).searchParams.get('access'));
  const state = await issueOauthState(access);
  const query = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: `${origin}/api/github/callback`,
    scope: oauthScope(access),
    state,
  });
  return NextResponse.redirect(`https://github.com/login/oauth/authorize?${query}`);
}
